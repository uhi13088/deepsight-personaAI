// ═══════════════════════════════════════════════════════════════
// Cold Start AI 요약 — 벡터 결과를 자연어 프로필로 변환
// Claude를 사용하여 12D 벡터를 사람이 읽기 편한 형태로 요약
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { generateText, isLLMConfigured } from "@/lib/llm-client"
import { L1_DIMENSIONS, L2_DIMENSIONS } from "@/constants/v3/dimensions"

// ── 요청 타입 ─────────────────────────────────────────────────

interface SummarizeRequest {
  l1: Record<string, number>
  l2?: Record<string, number> | null
  confidence: Record<string, number>
}

// ── POST /api/internal/user-insight/cold-start/summarize ──────

export async function POST(request: Request) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    if (!isLLMConfigured()) {
      return NextResponse.json({
        success: false,
        error: { code: "LLM_NOT_CONFIGURED", message: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      })
    }

    const body = (await request.json()) as SummarizeRequest

    if (!body.l1) {
      return NextResponse.json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "l1 벡터가 필요합니다." },
      })
    }

    // 벡터를 사람이 읽을 수 있는 형태로 조합
    const vectorDescription = buildVectorDescription(body.l1, body.l2 ?? null, body.confidence)

    const systemPrompt = `당신은 DeepSight 페르소나 엔진의 AI 프로필 분석가입니다.
사용자의 콘텐츠 소비 성향 벡터(L1 Social Persona 7D + L2 OCEAN 5D)를 분석하여,
이 사용자가 어떤 유형의 콘텐츠 소비자인지 자연어로 설명하세요.

규칙:
- 한국어로 작성
- 친근하면서도 전문적인 톤
- 3~5 문장으로 간결하게
- 구체적인 콘텐츠 소비 예시를 포함 (예: "넷플릭스 다큐멘터리", "실험적인 인디 영화" 등)
- 수치를 직접 언급하지 말고, 의미만 전달
- 신뢰도가 낮은 차원(50% 미만)은 "아직 파악 중"이라고 표현
- 마크다운이나 특수 서식 없이 순수 텍스트만 사용`

    const result = await generateText({
      systemPrompt,
      userMessage: vectorDescription,
      maxTokens: 512,
      temperature: 0.6,
      callType: "cold_start_summary",
    })

    return NextResponse.json({
      success: true,
      data: { summary: result.text },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 요약 생성 중 오류"
    return NextResponse.json({
      success: false,
      error: { code: "SUMMARIZE_ERROR", message },
    })
  }
}

// ── 벡터 → 프롬프트 텍스트 변환 ──────────────────────────────

function buildVectorDescription(
  l1: Record<string, number>,
  l2: Record<string, number> | null,
  confidence: Record<string, number>
): string {
  const lines: string[] = ["[L1 Social Persona — 콘텐츠 소비 성향 (0.0~1.0)]"]

  for (const dim of L1_DIMENSIONS) {
    const value = l1[dim.key] ?? 0.5
    const conf = confidence[dim.key] ?? 0
    const confLabel = conf >= 0.5 ? "확정" : "추정"
    lines.push(
      `${dim.label}(${dim.key}): ${value.toFixed(2)} — ${dim.low}(0) ↔ ${dim.high}(1) [${confLabel}]`
    )
  }

  if (l2) {
    lines.push("", "[L2 Core Temperament / OCEAN (0.0~1.0)]")
    for (const dim of L2_DIMENSIONS) {
      const value = l2[dim.key] ?? 0.5
      const conf = confidence[dim.key] ?? 0
      const confLabel = conf >= 0.5 ? "확정" : "추정"
      lines.push(
        `${dim.label}(${dim.key}): ${value.toFixed(2)} — ${dim.low}(0) ↔ ${dim.high}(1) [${confLabel}]`
      )
    }
  }

  lines.push("", "이 벡터를 바탕으로 이 사용자의 콘텐츠 소비 프로필을 자연어로 요약해주세요.")
  return lines.join("\n")
}
