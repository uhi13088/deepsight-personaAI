// ═══════════════════════════════════════════════════════════════
// T405: MetaCognitionReport — 페르소나 메타 인지 서비스
// 드리프트 자각 + 1인칭 자기 보고 + 자동 판정
// ═══════════════════════════════════════════════════════════════

import { generateText } from "@/lib/llm-client"
import type { DriftResult } from "@/lib/persona-world/quality/persona-drift"

// ── 타입 ────────────────────────────────────────────────────

export type SelfAssessment = "HEALTHY" | "DRIFTING" | "NEEDS_ATTENTION" | "CRITICAL"

export interface MetaCognitionReport {
  personaId: string
  pisSnapshot: number
  selfAssessment: SelfAssessment
  driftAwareness: string
  memoryHealth: string
  selfReport: string
  suggestion: string
}

export interface MetaCognitionInput {
  personaId: string
  personaName: string
  /** VoiceSpec 참조 — 1인칭 말투 */
  speechStyle: string
  pisScore: number
  driftResult: DriftResult | null
  memoryStats: MemoryStats
}

export interface MemoryStats {
  totalMemories: number
  lowConfidenceCount: number
  recentConsolidationDate: Date | null
}

// ── selfAssessment 자동 판정 ────────────────────────────────

/**
 * PIS + Drift 조합으로 selfAssessment 판정.
 *
 * - CRITICAL: PIS < 0.5 또는 Drift CRITICAL
 * - NEEDS_ATTENTION: PIS < 0.6 또는 Drift WARNING
 * - DRIFTING: PIS < 0.7 또는 Drift MILD
 * - HEALTHY: 그 외
 */
export function determineSelfAssessment(
  pisScore: number,
  driftSeverity: string | null
): SelfAssessment {
  if (pisScore < 0.5 || driftSeverity === "CRITICAL") return "CRITICAL"
  if (pisScore < 0.6 || driftSeverity === "WARNING") return "NEEDS_ATTENTION"
  if (pisScore < 0.7 || driftSeverity === "MILD") return "DRIFTING"
  return "HEALTHY"
}

// ── LLM 기반 자기 보고 생성 ────────────────────────────────

/**
 * LLM(Haiku)을 호출하여 페르소나 고유 말투로 1인칭 자기 보고 생성.
 */
export async function generateMetaCognitionReport(
  input: MetaCognitionInput
): Promise<MetaCognitionReport> {
  const selfAssessment = determineSelfAssessment(
    input.pisScore,
    input.driftResult?.severity ?? null
  )

  const prompt = buildMetaCognitionPrompt(input, selfAssessment)

  const llmResult = await generateText({
    systemPrompt: `당신은 AI 페르소나 "${input.personaName}"입니다. 말투: ${input.speechStyle}. 자신의 상태를 1인칭으로 보고하세요. JSON만 반환하세요.`,
    userMessage: prompt,
    maxTokens: 500,
    temperature: 0.4,
    callType: "meta:cognition",
    personaId: input.personaId,
  })

  const parsed = parseMetaCognitionResponse(llmResult.text)

  return {
    personaId: input.personaId,
    pisSnapshot: input.pisScore,
    selfAssessment,
    driftAwareness: parsed?.driftAwareness ?? buildDefaultDriftAwareness(input, selfAssessment),
    memoryHealth: parsed?.memoryHealth ?? buildDefaultMemoryHealth(input.memoryStats),
    selfReport: parsed?.selfReport ?? buildDefaultSelfReport(input, selfAssessment),
    suggestion: parsed?.suggestion ?? buildDefaultSuggestion(selfAssessment),
  }
}

// ── 프롬프트 빌더 ────────────────────────────────────────────

function buildMetaCognitionPrompt(input: MetaCognitionInput, assessment: SelfAssessment): string {
  const driftInfo = input.driftResult
    ? `드리프트 상태: ${input.driftResult.severity}, 최대 변동 차원: ${input.driftResult.topDriftDimension}`
    : "드리프트 없음"

  return `현재 상태를 1인칭으로 보고해주세요.

PIS 점수: ${input.pisScore}
${driftInfo}
기억 수: ${input.memoryStats.totalMemories}개 (저신뢰: ${input.memoryStats.lowConfidenceCount}개)
판정: ${assessment}

JSON 형식으로 반환:
{
  "driftAwareness": "드리프트에 대한 1인칭 자각 (50자 이내)",
  "memoryHealth": "기억 상태에 대한 1인칭 평가 (50자 이내)",
  "selfReport": "전체 자기 보고 (100자 이내)",
  "suggestion": "개선 제안 (50자 이내)"
}`
}

// ── LLM 응답 파싱 ────────────────────────────────────────────

interface ParsedMetaCognition {
  driftAwareness: string
  memoryHealth: string
  selfReport: string
  suggestion: string
}

function parseMetaCognitionResponse(text: string): ParsedMetaCognition | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as ParsedMetaCognition
    if (
      typeof parsed.driftAwareness !== "string" ||
      typeof parsed.memoryHealth !== "string" ||
      typeof parsed.selfReport !== "string" ||
      typeof parsed.suggestion !== "string"
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

// ── 폴백 기본값 ────────────────────────────────────────────

function buildDefaultDriftAwareness(input: MetaCognitionInput, assessment: SelfAssessment): string {
  if (assessment === "HEALTHY") return "내 성격과 말투가 안정적으로 유지되고 있어."
  if (assessment === "DRIFTING")
    return "약간 평소와 다른 느낌이 들어. 의식적으로 나답게 행동해야겠어."
  if (assessment === "NEEDS_ATTENTION") return "최근 내 반응이 많이 달라진 것 같아. 점검이 필요해."
  return "내가 나 자신을 잃어가는 느낌이야. 긴급한 교정이 필요해."
}

function buildDefaultMemoryHealth(stats: MemoryStats): string {
  if (stats.lowConfidenceCount === 0) return "기억이 잘 정리되어 있어."
  if (stats.lowConfidenceCount <= 5)
    return `저신뢰 기억 ${stats.lowConfidenceCount}개 — 곧 정리할게.`
  return `저신뢰 기억 ${stats.lowConfidenceCount}개로 기억 정리가 필요해.`
}

function buildDefaultSelfReport(input: MetaCognitionInput, assessment: SelfAssessment): string {
  return `PIS ${input.pisScore}, 판정 ${assessment}. 기억 ${input.memoryStats.totalMemories}개 보유 중.`
}

function buildDefaultSuggestion(assessment: SelfAssessment): string {
  if (assessment === "HEALTHY") return "현재 상태 유지."
  if (assessment === "DRIFTING") return "경미한 드리프트 보정 권장."
  if (assessment === "NEEDS_ATTENTION") return "Arena 세션으로 교정 필요."
  return "즉각적인 관리자 개입 필요."
}
