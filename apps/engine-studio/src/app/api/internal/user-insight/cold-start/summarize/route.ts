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

export interface ProfileAnalysis {
  typeName: string
  oneLiner: string
  traits: string[]
  examples: string[]
  exploring: string[]
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
구조화된 JSON으로 응답하세요.

출력 형식 (반드시 valid JSON만 출력):
{
  "typeName": "소비자 유형 이름 (4~8자, 예: 감성 탐험가)",
  "oneLiner": "이 사용자를 한 줄로 설명 (15~25자)",
  "traits": ["핵심 성향 키워드 3~5개 (각 2~6자)"],
  "examples": ["이 사용자가 좋아할 콘텐츠 예시 3~4개 (구체적으로)"],
  "exploring": ["신뢰도 낮은 차원 설명 0~3개 (각 10~20자, 없으면 빈 배열)"]
}

규칙:
- 한국어로 작성
- 수치를 직접 언급하지 말고, 의미만 전달
- 신뢰도 50% 미만인 차원은 exploring에 "~은 아직 파악 중" 형태로 포함
- traits는 형용사+명사 조합 (예: "깊이 있는 분석", "감성적 몰입")
- examples는 구체적 콘텐츠명 포함 (예: "넷플릭스 다큐 시리즈", "인디 감성 영화")
- JSON 외 다른 텍스트 절대 출력 금지`

    const result = await generateText({
      systemPrompt,
      userMessage: vectorDescription,
      maxTokens: 512,
      temperature: 0.6,
      callType: "cold_start_summary",
    })

    // JSON 파싱 시도, 실패하면 기존 텍스트 형태로 fallback
    let structured: ProfileAnalysis | null = null
    try {
      const cleaned = result.text.replace(/```json?\n?|\n?```/g, "").trim()
      structured = JSON.parse(cleaned) as ProfileAnalysis
    } catch {
      // JSON 파싱 실패 — 텍스트 그대로 반환
    }

    return NextResponse.json({
      success: true,
      data: structured ? { summary: null, structured } : { summary: result.text, structured: null },
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
