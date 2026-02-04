import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 벡터 분석 (프롬프트 키워드 기반)
function analyzeResponseVector(response: string): {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
} {
  const lowerResponse = response.toLowerCase()
  const wordCount = response.split(/\s+/).length

  // 분석 깊이 (긴 답변 + 분석 키워드)
  const depthKeywords = ["분석", "의미", "맥락", "배경", "이유", "역사", "기원", "근본"]
  const depthCount = depthKeywords.filter((kw) => response.includes(kw)).length
  const depth = Math.min(1, (wordCount / 200 + depthCount * 0.15) / 2)

  // 판단 렌즈 (논리 vs 감성)
  const logicalKeywords = ["논리", "분석", "객관", "데이터", "근거", "사실", "구조"]
  const emotionalKeywords = ["감성", "감정", "느낌", "마음", "아름다", "감동"]
  const logicalCount = logicalKeywords.filter((kw) => response.includes(kw)).length
  const emotionalCount = emotionalKeywords.filter((kw) => response.includes(kw)).length
  const lens =
    logicalCount + emotionalCount > 0 ? logicalCount / (logicalCount + emotionalCount) : 0.5

  // 평가 태도 (비판 vs 수용)
  const criticalKeywords = ["하지만", "아쉬", "단점", "문제", "부족", "비판"]
  const acceptingKeywords = ["좋", "훌륭", "장점", "긍정", "추천", "완벽"]
  const criticalCount = criticalKeywords.filter((kw) => lowerResponse.includes(kw)).length
  const acceptingCount = acceptingKeywords.filter((kw) => lowerResponse.includes(kw)).length
  const stance =
    criticalCount + acceptingCount > 0 ? criticalCount / (criticalCount + acceptingCount) : 0.5

  // 관심 범위 (디테일 vs 핵심)
  const detailKeywords = ["세부", "디테일", "구체", "상세", "모든", "각각"]
  const focusKeywords = ["핵심", "요약", "간단", "주요", "중요"]
  const detailCount = detailKeywords.filter((kw) => response.includes(kw)).length
  const focusCount = focusKeywords.filter((kw) => response.includes(kw)).length
  const scope = detailCount + focusCount > 0 ? detailCount / (detailCount + focusCount) : 0.5

  // 취향 성향 (실험 vs 클래식)
  const experimentalKeywords = ["새로운", "독특", "신선", "혁신", "실험"]
  const classicKeywords = ["전통", "클래식", "검증", "안정", "익숙"]
  const experimentalCount = experimentalKeywords.filter((kw) => response.includes(kw)).length
  const classicCount = classicKeywords.filter((kw) => response.includes(kw)).length
  const taste =
    experimentalCount + classicCount > 0
      ? experimentalCount / (experimentalCount + classicCount)
      : 0.5

  // 소비 목적 (의미 vs 오락)
  const meaningfulKeywords = ["의미", "가치", "메시지", "교훈", "생각", "철학"]
  const entertainingKeywords = ["재미", "흥미", "즐거", "유머", "가볍"]
  const meaningfulCount = meaningfulKeywords.filter((kw) => response.includes(kw)).length
  const entertainingCount = entertainingKeywords.filter((kw) => response.includes(kw)).length
  const purpose =
    meaningfulCount + entertainingCount > 0
      ? meaningfulCount / (meaningfulCount + entertainingCount)
      : 0.5

  return { depth, lens, stance, scope, taste, purpose }
}

// 벡터 유사도 계산
function calculateVectorSimilarity(
  v1: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  },
  v2: { depth: number; lens: number; stance: number; scope: number; taste: number; purpose: number }
): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  for (const dim of dimensions) {
    dotProduct += v1[dim] * v2[dim]
    magnitude1 += v1[dim] ** 2
    magnitude2 += v2[dim] ** 2
  }

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  if (magnitude1 === 0 || magnitude2 === 0) return 0
  return dotProduct / (magnitude1 * magnitude2)
}

// 기대 반응과 실제 반응 비교
function compareReactions(
  expected: { dimension: string; expectedValue: string; keywords: string[] }[],
  response: string
): { dimension: string; match: boolean; score: number }[] {
  const lowerResponse = response.toLowerCase()

  return expected.map((exp) => {
    const matchedKeywords = exp.keywords.filter((kw) => lowerResponse.includes(kw.toLowerCase()))
    const score = exp.keywords.length > 0 ? matchedKeywords.length / exp.keywords.length : 0
    return {
      dimension: exp.dimension,
      match: score >= 0.5,
      score: Math.round(score * 100),
    }
  })
}

// POST /api/golden-samples/test - 골든 샘플 테스트 실행
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { personaId, sampleId, response } = body

    // 필수 필드 검증
    if (!personaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PERSONA_ID", message: "personaId는 필수입니다" },
        },
        { status: 400 }
      )
    }

    if (!sampleId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_SAMPLE_ID", message: "sampleId는 필수입니다" } },
        { status: 400 }
      )
    }

    if (!response || typeof response !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_RESPONSE", message: "response는 필수이며 문자열이어야 합니다" },
        },
        { status: 400 }
      )
    }

    // 페르소나 조회
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        vectors: { orderBy: { version: "desc" }, take: 1 },
      },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "PERSONA_NOT_FOUND", message: "페르소나를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 골든 샘플 조회
    const sample = await prisma.goldenSample.findUnique({
      where: { id: sampleId },
    })

    if (!sample) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SAMPLE_NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 응답에서 벡터 추출
    const responseVector = analyzeResponseVector(response)

    // 페르소나 벡터
    const vector = persona.vectors[0]
    const personaVector = vector
      ? {
          depth: Number(vector.depth),
          lens: Number(vector.lens),
          stance: Number(vector.stance),
          scope: Number(vector.scope),
          taste: Number(vector.taste),
          purpose: Number(vector.purpose),
        }
      : {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
        }

    // 벡터 유사도 계산
    const vectorSimilarity = calculateVectorSimilarity(personaVector, responseVector)
    const vectorScore = Math.round(vectorSimilarity * 100)

    // 기대 반응 비교
    let reactionScore = 100
    let reactionResults: { dimension: string; match: boolean; score: number }[] = []

    if (sample.expectedReactions && Array.isArray(sample.expectedReactions)) {
      reactionResults = compareReactions(
        sample.expectedReactions as {
          dimension: string
          expectedValue: string
          keywords: string[]
        }[],
        response
      )
      const matchedCount = reactionResults.filter((r) => r.match).length
      reactionScore = Math.round((matchedCount / reactionResults.length) * 100)
    }

    // 종합 점수 (벡터 50% + 반응 50%)
    const overallScore = Math.round(vectorScore * 0.5 + reactionScore * 0.5)
    const passed = overallScore >= 70

    return NextResponse.json({
      success: true,
      data: {
        personaId,
        sampleId,
        overallScore,
        passed,
        breakdown: {
          vectorAlignment: {
            score: vectorScore,
            personaVector,
            responseVector,
          },
          reactionMatch: {
            score: reactionScore,
            results: reactionResults,
          },
        },
        testedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] POST /api/golden-samples/test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "테스트 실행에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// GET /api/golden-samples/test - 여러 골든 샘플로 일괄 테스트
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")
    const difficulty = searchParams.get("difficulty")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!personaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PERSONA_ID", message: "personaId는 필수입니다" },
        },
        { status: 400 }
      )
    }

    // 페르소나 조회
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "PERSONA_NOT_FOUND", message: "페르소나를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 골든 샘플 조회
    const where: Record<string, unknown> = { isActive: true }
    if (difficulty) {
      where.difficultyLevel = difficulty
    }

    const samples = await prisma.goldenSample.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        personaId,
        persona: {
          id: persona.id,
          name: persona.name,
        },
        samples: samples.map((s) => ({
          id: s.id,
          contentTitle: s.contentTitle,
          contentType: s.contentType,
          genre: s.genre,
          testQuestion: s.testQuestion,
          difficultyLevel: s.difficultyLevel,
        })),
        totalSamples: samples.length,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/golden-samples/test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "테스트 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
