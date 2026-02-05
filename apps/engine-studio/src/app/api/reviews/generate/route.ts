import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 벡터 값에 따른 스타일 레벨 결정
function getStyleLevel(value: number, dimension: string): string {
  const levelMapping: Record<string, { low: string; high: string }> = {
    depth: { low: "LOW", high: "HIGH" },
    lens: { low: "감성", high: "논리" },
    stance: { low: "수용", high: "비판" },
    scope: { low: "핵심", high: "디테일" },
    taste: { low: "클래식", high: "실험" },
  }

  const mapping = levelMapping[dimension]
  if (!mapping) return "MEDIUM"

  if (value < 0.4) return mapping.low
  if (value > 0.6) return mapping.high
  return "MEDIUM"
}

// 리뷰 스타일 ID 결정 (벡터 기반)
function determineStyleId(vector: {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
}): string {
  // 주요 차원별 가중치 적용하여 스타일 결정
  const depthLevel = vector.depth > 0.5 ? "H" : "L"
  const lensLevel = vector.lens > 0.5 ? "L" : "E" // L=논리, E=감성
  const stanceLevel = vector.stance > 0.5 ? "C" : "A" // C=비판, A=수용
  const scopeLevel = vector.scope > 0.5 ? "D" : "F" // D=디테일, F=핵심

  // 스타일 ID 매핑 (S01~S32 중 선택)
  const styleMap: Record<string, string> = {
    HLCD: "S01", // 심층-논리-비판-디테일
    HLCF: "S02", // 심층-논리-비판-핵심
    HLAD: "S03", // 심층-논리-수용-디테일
    HLAF: "S04", // 심층-논리-수용-핵심
    HECD: "S05", // 심층-감성-비판-디테일
    HECF: "S06", // 심층-감성-비판-핵심
    HEAD: "S07", // 심층-감성-수용-디테일
    HEAF: "S08", // 심층-감성-수용-핵심
    LLCD: "S09", // 직관-논리-비판-디테일
    LLCF: "S10", // 직관-논리-비판-핵심
    LLAD: "S11", // 직관-논리-수용-디테일
    LLAF: "S12", // 직관-논리-수용-핵심
    LECD: "S13", // 직관-감성-비판-디테일
    LECF: "S14", // 직관-감성-비판-핵심
    LEAD: "S15", // 직관-감성-수용-디테일
    LEAF: "S16", // 직관-감성-수용-핵심
  }

  const key = `${depthLevel}${lensLevel}${stanceLevel}${scopeLevel}`
  return styleMap[key] || "S01"
}

// 프롬프트 템플릿 생성
function generateReviewPrompt(
  personaName: string,
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  },
  contentTitle: string,
  contentDescription: string
): string {
  const depthDesc =
    vector.depth > 0.5 ? "깊이 있는 분석과 맥락 파악을 중시하여" : "핵심 정보를 직관적으로 전달하여"
  const lensDesc =
    vector.lens > 0.5
      ? "논리적 근거와 객관적 분석에 기반하여"
      : "감성적 느낌과 주관적 경험에 기반하여"
  const stanceDesc =
    vector.stance > 0.5
      ? "장단점을 냉철하게 분석하고 비판적 시각으로"
      : "긍정적인 면을 부각하고 수용적 태도로"
  const scopeDesc = vector.scope > 0.5 ? "세부적인 디테일까지 꼼꼼하게" : "핵심 포인트를 간결하게"
  const purposeDesc =
    vector.purpose > 0.5 ? "의미와 메시지를 탐구하며" : "재미와 오락적 가치를 중심으로"

  return `당신은 "${personaName}"입니다.

## 리뷰 성향
- ${depthDesc}
- ${lensDesc}
- ${stanceDesc}
- ${scopeDesc}
- ${purposeDesc}

## 리뷰 대상
제목: ${contentTitle}
설명: ${contentDescription}

## 지침
위 콘텐츠에 대해 당신의 성향에 맞는 리뷰를 작성해주세요.
- 150-300자 분량
- 당신만의 관점과 시각 반영
- 금기사항: 스포일러, 비속어, 정치/종교적 편향

## 리뷰 시작`
}

// POST /api/reviews/generate - 리뷰 생성
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
    const { personaId, contentId, contentTitle, contentDescription, contentType } = body

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

    if (!contentTitle) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_CONTENT_TITLE", message: "contentTitle은 필수입니다" },
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
    const vector = {
      depth: latestVector ? Number(latestVector.depth) : 0.5,
      lens: latestVector ? Number(latestVector.lens) : 0.5,
      stance: latestVector ? Number(latestVector.stance) : 0.5,
      scope: latestVector ? Number(latestVector.scope) : 0.5,
      taste: latestVector ? Number(latestVector.taste) : 0.5,
      purpose: latestVector ? Number(latestVector.purpose) : 0.5,
    }

    // 스타일 ID 결정
    const styleId = determineStyleId(vector)

    // 리뷰 스타일 조회
    let reviewStyle = await prisma.reviewStyle.findUnique({
      where: { id: styleId },
    })

    // 스타일이 없으면 기본 스타일 사용 또는 생성
    if (!reviewStyle) {
      // 기존 스타일 중 아무거나 사용
      reviewStyle = await prisma.reviewStyle.findFirst()
    }

    // 프롬프트 생성
    const prompt = generateReviewPrompt(
      persona.name,
      vector,
      contentTitle,
      contentDescription || ""
    )

    // 기존 리뷰 확인 (캐시)
    const existingReview = contentId
      ? await prisma.styleContentReview.findUnique({
          where: {
            styleId_contentId: {
              styleId: styleId,
              contentId: contentId,
            },
          },
        })
      : null

    if (existingReview) {
      return NextResponse.json({
        success: true,
        data: {
          review: {
            id: existingReview.id,
            text: existingReview.reviewText,
            summary: existingReview.reviewSummary,
            keywords: existingReview.keywords,
            rating: existingReview.rating ? Number(existingReview.rating) : null,
          },
          persona: {
            id: persona.id,
            name: persona.name,
          },
          styleId,
          cached: true,
          generatedAt: existingReview.generatedAt.toISOString(),
        },
      })
    }

    // 실제 LLM 호출은 여기서 수행 (현재는 템플릿 기반 생성)
    // 실제 구현시 OpenAI/Anthropic API 호출 필요
    const generatedReview = generateTemplateReview(persona.name, vector, contentTitle)

    // 리뷰 저장 (contentId가 있는 경우)
    let savedReview = null
    if (contentId && reviewStyle) {
      savedReview = await prisma.styleContentReview.create({
        data: {
          styleId: styleId,
          contentId: contentId,
          contentType: contentType || null,
          reviewText: generatedReview.text,
          reviewSummary: generatedReview.summary,
          keywords: generatedReview.keywords,
          rating: generatedReview.rating,
          generationTrigger: "API",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        review: {
          id: savedReview?.id || null,
          text: generatedReview.text,
          summary: generatedReview.summary,
          keywords: generatedReview.keywords,
          rating: generatedReview.rating,
        },
        persona: {
          id: persona.id,
          name: persona.name,
        },
        styleId,
        prompt,
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] POST /api/reviews/generate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "리뷰 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// 템플릿 기반 리뷰 생성 (LLM 없이)
function generateTemplateReview(
  personaName: string,
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  },
  contentTitle: string
): { text: string; summary: string; keywords: string[]; rating: number } {
  const templates = {
    high_depth_high_lens: `"${contentTitle}"에 대해 심층적으로 분석해보면, 이 작품의 구조적 완성도와 서사적 전개가 돋보입니다. 특히 캐릭터의 내적 갈등과 성장 과정이 논리적으로 잘 설계되어 있습니다.`,
    high_depth_low_lens: `"${contentTitle}"을 감상하며 깊은 감동을 받았습니다. 작품 속에 담긴 감성적 메시지와 섬세한 감정 표현이 마음을 울립니다. 여운이 오래 남는 작품입니다.`,
    low_depth_high_lens: `"${contentTitle}"은 핵심 요소들이 잘 정리되어 있습니다. 간결하면서도 논리적인 전개가 인상적이며, 효율적으로 메시지를 전달합니다.`,
    low_depth_low_lens: `"${contentTitle}"은 가볍게 즐기기 좋은 작품입니다! 직관적으로 이해하기 쉽고, 편안하게 감상할 수 있어 좋았습니다.`,
  }

  const depthKey = vector.depth > 0.5 ? "high_depth" : "low_depth"
  const lensKey = vector.lens > 0.5 ? "high_lens" : "low_lens"
  const templateKey = `${depthKey}_${lensKey}` as keyof typeof templates

  const baseText = templates[templateKey]

  // 비판적 성향 추가
  const criticAddition =
    vector.stance > 0.6 ? " 다만, 일부 아쉬운 점도 있어 개선의 여지가 있습니다." : ""

  // 디테일 성향 추가
  const detailAddition =
    vector.scope > 0.6 ? " 세부적인 연출과 디테일까지 꼼꼼히 살펴볼 가치가 있습니다." : ""

  const text = baseText + criticAddition + detailAddition

  // 요약 생성
  const summary =
    vector.stance > 0.5
      ? `장단점이 공존하는 ${vector.depth > 0.5 ? "심층적인" : "간결한"} 작품`
      : `${vector.depth > 0.5 ? "깊이 있는" : "가볍게 즐길 수 있는"} 매력적인 작품`

  // 키워드 생성
  const keywords = []
  if (vector.depth > 0.5) keywords.push("심층분석")
  if (vector.lens > 0.5) keywords.push("논리적")
  else keywords.push("감성적")
  if (vector.stance > 0.5) keywords.push("비평적")
  else keywords.push("긍정적")
  if (vector.scope > 0.5) keywords.push("디테일")
  else keywords.push("핵심정리")

  // 평점 계산 (벡터 기반)
  const baseRating = 3.5
  const stanceAdjust = vector.stance > 0.5 ? -0.3 : 0.3
  const rating = Math.min(5, Math.max(1, baseRating + stanceAdjust + Math.random() * 1))

  return {
    text: `[${personaName}의 리뷰]\n\n${text}`,
    summary,
    keywords,
    rating: Math.round(rating * 10) / 10,
  }
}

// GET /api/reviews/generate - 리뷰 스타일 목록 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const styles = await prisma.reviewStyle.findMany({
      orderBy: { id: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        styles: styles.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          levels: {
            depth: s.depthLevel,
            lens: s.lensLevel,
            stance: s.stanceLevel,
            scope: s.scopeLevel,
            taste: s.tasteLevel,
          },
        })),
        total: styles.length,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/reviews/generate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "리뷰 스타일 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
