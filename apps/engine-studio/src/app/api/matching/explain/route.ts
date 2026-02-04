import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 6D 벡터 차원별 설명
const DIMENSION_DESCRIPTIONS = {
  depth: {
    name: "분석 깊이",
    lowLabel: "직관적",
    highLabel: "심층적",
    description: {
      low: "표면적인 정보를 빠르게 파악하고 직관적으로 판단합니다.",
      medium: "적절한 수준의 분석과 직관을 균형있게 활용합니다.",
      high: "깊이 있는 배경 분석과 맥락 파악을 중시합니다.",
    },
  },
  lens: {
    name: "판단 렌즈",
    lowLabel: "감성적",
    highLabel: "논리적",
    description: {
      low: "감정과 느낌에 기반한 평가를 선호합니다.",
      medium: "논리와 감성을 적절히 조합하여 판단합니다.",
      high: "객관적 데이터와 논리적 근거를 중시합니다.",
    },
  },
  stance: {
    name: "평가 태도",
    lowLabel: "수용적",
    highLabel: "비판적",
    description: {
      low: "긍정적인 면을 찾아 수용하는 경향이 있습니다.",
      medium: "장단점을 균형있게 평가합니다.",
      high: "날카로운 분석과 비판적 시각을 가집니다.",
    },
  },
  scope: {
    name: "관심 범위",
    lowLabel: "핵심 집중",
    highLabel: "디테일 중시",
    description: {
      low: "핵심 포인트에 집중하여 간결하게 전달합니다.",
      medium: "중요한 내용과 세부사항을 적절히 다룹니다.",
      high: "세세한 디테일까지 꼼꼼히 살펴봅니다.",
    },
  },
  taste: {
    name: "취향 성향",
    lowLabel: "클래식",
    highLabel: "실험적",
    description: {
      low: "검증된 클래식한 콘텐츠를 선호합니다.",
      medium: "새로움과 익숙함 사이에서 균형을 찾습니다.",
      high: "새롭고 실험적인 시도를 적극 탐색합니다.",
    },
  },
  purpose: {
    name: "소비 목적",
    lowLabel: "오락 추구",
    highLabel: "의미 추구",
    description: {
      low: "재미와 오락적 가치를 중시합니다.",
      medium: "즐거움과 의미 모두를 추구합니다.",
      high: "깊은 의미와 메시지를 찾고자 합니다.",
    },
  },
}

// 벡터 값에 따른 레벨 결정
function getLevel(value: number): "low" | "medium" | "high" {
  if (value < 0.4) return "low"
  if (value > 0.6) return "high"
  return "medium"
}

// 코사인 유사도 계산
function cosineSimilarity(v1: Record<string, number>, v2: Record<string, number>): number {
  const dimensions = Object.keys(v1)
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

// 유클리드 거리 계산
function euclideanDistance(v1: Record<string, number>, v2: Record<string, number>): number {
  const dimensions = Object.keys(v1)
  let sum = 0

  for (const dim of dimensions) {
    sum += (v1[dim] - v2[dim]) ** 2
  }

  return Math.sqrt(sum)
}

// 매칭 설명 생성
function generateExplanation(
  personaVector: Record<string, number>,
  userVector: Record<string, number>,
  personaName: string
): {
  summary: string
  dimensionAnalysis: Array<{
    dimension: string
    name: string
    personaValue: number
    userValue: number
    match: boolean
    explanation: string
  }>
  highlights: string[]
  concerns: string[]
} {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
  const dimensionAnalysis: Array<{
    dimension: string
    name: string
    personaValue: number
    userValue: number
    match: boolean
    explanation: string
  }> = []
  const highlights: string[] = []
  const concerns: string[] = []

  for (const dim of dimensions) {
    const personaVal = personaVector[dim]
    const userVal = userVector[dim]
    const diff = Math.abs(personaVal - userVal)
    const match = diff < 0.3

    const dimInfo = DIMENSION_DESCRIPTIONS[dim]
    const personaLevel = getLevel(personaVal)
    const userLevel = getLevel(userVal)

    let explanation: string
    if (match) {
      explanation = `${dimInfo.name}에서 ${personaName}과(와) 사용자 모두 ${dimInfo.description[personaLevel]} 이러한 공통점이 높은 만족도로 이어질 것입니다.`
      highlights.push(
        `${dimInfo.name}: ${personaName}(${Math.round(personaVal * 100)}%)와 사용자(${Math.round(userVal * 100)}%)가 유사합니다.`
      )
    } else {
      if (personaVal > userVal) {
        explanation = `${personaName}은(는) ${dimInfo.highLabel} 성향이 강한 반면, 사용자는 ${dimInfo.lowLabel} 성향입니다. 이 차이가 새로운 관점을 제공할 수 있습니다.`
      } else {
        explanation = `사용자는 ${dimInfo.highLabel} 성향이 강한 반면, ${personaName}은(는) ${dimInfo.lowLabel} 성향입니다. 다양한 시각을 경험할 수 있습니다.`
      }
      if (diff > 0.4) {
        concerns.push(
          `${dimInfo.name}에서 성향 차이(${Math.round(diff * 100)}%)가 있어 조정이 필요할 수 있습니다.`
        )
      }
    }

    dimensionAnalysis.push({
      dimension: dim,
      name: dimInfo.name,
      personaValue: personaVal,
      userValue: userVal,
      match,
      explanation,
    })
  }

  const matchCount = dimensionAnalysis.filter((d) => d.match).length
  let summary: string

  if (matchCount >= 5) {
    summary = `${personaName}은(는) 사용자와 대부분의 성향이 일치하여 매우 높은 매칭입니다. ${matchCount}개 차원에서 유사성을 보이며, 추천 콘텐츠에 대한 만족도가 높을 것으로 예상됩니다.`
  } else if (matchCount >= 3) {
    summary = `${personaName}은(는) 사용자와 주요 성향에서 일치합니다. ${matchCount}개 차원에서 유사성을 보이며, 일부 다른 관점도 경험할 수 있는 좋은 매칭입니다.`
  } else {
    summary = `${personaName}은(는) 사용자와 일부 성향에서 차이가 있습니다. 하지만 이러한 차이가 새로운 관점과 다양한 추천을 제공할 수 있습니다.`
  }

  return { summary, dimensionAnalysis, highlights, concerns }
}

// POST /api/matching/explain - 매칭 설명 생성
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
    const { personaId, userVector, contentInfo } = body

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

    if (!userVector) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_USER_VECTOR", message: "userVector는 필수입니다" },
        },
        { status: 400 }
      )
    }

    // 페르소나 조회 (벡터 포함)
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        vectors: {
          orderBy: { version: "desc" },
          take: 1,
        },
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

    const latestVector = persona.vectors[0]
    const personaVector = {
      depth: latestVector ? Number(latestVector.depth) : 0.5,
      lens: latestVector ? Number(latestVector.lens) : 0.5,
      stance: latestVector ? Number(latestVector.stance) : 0.5,
      scope: latestVector ? Number(latestVector.scope) : 0.5,
      taste: latestVector ? Number(latestVector.taste) : 0.5,
      purpose: latestVector ? Number(latestVector.purpose) : 0.5,
    }

    // 유사도 계산
    const similarity = cosineSimilarity(personaVector, userVector)
    const distance = euclideanDistance(personaVector, userVector)

    // 매칭 점수 (0-100)
    const matchScore = Math.round(similarity * 100)

    // 설명 생성
    const explanation = generateExplanation(personaVector, userVector, persona.name)

    return NextResponse.json({
      success: true,
      data: {
        personaId,
        personaName: persona.name,
        matchScore,
        similarity: Math.round(similarity * 1000) / 1000,
        distance: Math.round(distance * 1000) / 1000,
        vectors: {
          persona: personaVector,
          user: userVector,
        },
        explanation,
        contentInfo: contentInfo || null,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] POST /api/matching/explain error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "매칭 설명 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// GET /api/matching/explain - 다중 페르소나 비교 설명
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
    const depth = parseFloat(searchParams.get("depth") || "0.5")
    const lens = parseFloat(searchParams.get("lens") || "0.5")
    const stance = parseFloat(searchParams.get("stance") || "0.5")
    const scope = parseFloat(searchParams.get("scope") || "0.5")
    const taste = parseFloat(searchParams.get("taste") || "0.5")
    const purpose = parseFloat(searchParams.get("purpose") || "0.5")
    const limit = parseInt(searchParams.get("limit") || "5")

    const userVector = { depth, lens, stance, scope, taste, purpose }

    // 활성 페르소나 조회 (상태가 ACTIVE인 것)
    const personas = await prisma.persona.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        vectors: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    })

    // 각 페르소나별 매칭 점수 및 설명 생성
    const results = personas
      .map((persona) => {
        const latestVector = persona.vectors[0]
        const personaVector = {
          depth: latestVector ? Number(latestVector.depth) : 0.5,
          lens: latestVector ? Number(latestVector.lens) : 0.5,
          stance: latestVector ? Number(latestVector.stance) : 0.5,
          scope: latestVector ? Number(latestVector.scope) : 0.5,
          taste: latestVector ? Number(latestVector.taste) : 0.5,
          purpose: latestVector ? Number(latestVector.purpose) : 0.5,
        }

        const similarity = cosineSimilarity(personaVector, userVector)
        const matchScore = Math.round(similarity * 100)
        const explanation = generateExplanation(personaVector, userVector, persona.name)

        return {
          personaId: persona.id,
          personaName: persona.name,
          matchScore,
          similarity: Math.round(similarity * 1000) / 1000,
          explanation: {
            summary: explanation.summary,
            highlights: explanation.highlights.slice(0, 3),
          },
          personaVector,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: {
        userVector,
        matches: results,
        total: personas.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/matching/explain error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "매칭 설명 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
