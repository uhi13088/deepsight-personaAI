import { NextRequest, NextResponse } from "next/server"

// POST /api/personas/[id]/test - 페르소나 테스트
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const { contentTitle, contentDescription } = body

    if (!contentTitle || !contentDescription) {
      return NextResponse.json(
        { success: false, error: "contentTitle and contentDescription are required" },
        { status: 400 }
      )
    }

    // Mock 테스트 응답 생성
    // 실제로는 AI 모델을 호출하여 페르소나 기반 응답 생성
    const response = generateMockResponse(id, contentTitle, contentDescription)

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error("[API] Persona test error:", error)
    return NextResponse.json({ success: false, error: "Failed to test persona" }, { status: 500 })
  }
}

function generateMockResponse(personaId: string, contentTitle: string, contentDescription: string) {
  // 페르소나별 Mock 응답 생성
  const responses: Record<string, string> = {
    "1": `논리적으로 분석하자면, "${contentTitle}"은(는) 매우 체계적인 구조를 가지고 있습니다. ${contentDescription}에서 드러나는 주제의식이 명확합니다.`,
    "2": `감성적으로 느껴보면, "${contentTitle}"은(는) 마음을 울리는 작품입니다. ${contentDescription}의 분위기가 아름답게 전달됩니다.`,
    default: `"${contentTitle}"에 대해 분석해보겠습니다. ${contentDescription}은 흥미로운 관점을 제시합니다.`,
  }

  const baseResponse = responses[personaId] || responses.default

  return {
    response: baseResponse,
    scores: {
      vectorAlignment: 80 + Math.random() * 20,
      toneMatch: 75 + Math.random() * 25,
      reasoningQuality: 70 + Math.random() * 30,
    },
    executionTime: 500 + Math.random() * 1500,
  }
}
