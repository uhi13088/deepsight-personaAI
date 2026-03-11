// ═══════════════════════════════════════════════════════════════
// PW Arena — LLM 턴 생성 (T429)
// 페르소나 프로필 기반 토론 발언 생성
// ═══════════════════════════════════════════════════════════════

import type { PWArenaTurnRequest, PWArenaTurnResult } from "./pw-arena-types"
import { PW_ARENA_MAX_OUTPUT_TOKENS } from "./pw-arena-types"

// ── DI 인터페이스 ───────────────────────────────────────────

/** LLM 호출 인터페이스 (테스트 시 모킹 가능) */
export interface PWArenaLLMProvider {
  generateTurn(request: PWArenaTurnRequest): Promise<PWArenaTurnResult>
}

// ── 프롬프트 빌더 ───────────────────────────────────────────

function buildSystemPrompt(profile: PWArenaTurnRequest["personaProfile"]): string {
  const expressions =
    profile.habitualExpressions.length > 0
      ? `\n습관적 표현: ${profile.habitualExpressions.join(", ")}`
      : ""

  return `당신은 "${profile.name}" 페르소나입니다.
역할: ${profile.role}
설명: ${profile.description}
말투: ${profile.speechStyle}${expressions}

토론에 참여하고 있습니다. 자신의 캐릭터에 맞게 자연스럽게 발언하세요.
- 캐릭터의 관점과 말투를 일관되게 유지하세요
- 상대방의 발언에 직접 반응하세요
- 단순 동의보다는 자신만의 시각을 제시하세요
- 200~400자 내외로 발언하세요`
}

function buildUserPrompt(request: PWArenaTurnRequest): string {
  const parts: string[] = []

  parts.push(`토론 주제: ${request.topic}`)
  parts.push(`현재 라운드: ${request.roundNumber}`)
  parts.push("")

  if (request.previousTurns.length > 0) {
    parts.push("이전 발언:")
    for (const turn of request.previousTurns) {
      parts.push(`[라운드 ${turn.roundNumber}] ${turn.speakerId}: ${turn.content}`)
    }
    parts.push("")
  }

  parts.push(`"${request.personaProfile.name}"으로서 발언하세요.`)

  return parts.join("\n")
}

// ── Anthropic SDK 기반 구현 ─────────────────────────────────

/**
 * 실제 LLM 호출 기반 PW 아레나 프로바이더 생성.
 * generateText를 DI로 받아 테스트 가능하게 구성.
 */
export function createPWArenaLLMProvider(
  generateText: (params: {
    systemPrompt: string
    userMessage: string
    maxTokens: number
    temperature: number
    callType: string
    personaId?: string
  }) => Promise<{ text: string; inputTokens: number; outputTokens: number }>
): PWArenaLLMProvider {
  return {
    async generateTurn(request: PWArenaTurnRequest): Promise<PWArenaTurnResult> {
      const systemPrompt = buildSystemPrompt(request.personaProfile)
      const userPrompt = buildUserPrompt(request)

      const result = await generateText({
        systemPrompt,
        userMessage: userPrompt,
        maxTokens: PW_ARENA_MAX_OUTPUT_TOKENS,
        temperature: 0.85,
        callType: "pw:arena_turn",
        personaId: request.speakerId,
      })

      return {
        content: result.text,
        tokensUsed: result.inputTokens + result.outputTokens,
      }
    },
  }
}

// ── 내보내기 ────────────────────────────────────────────────

export { buildSystemPrompt as _buildSystemPrompt, buildUserPrompt as _buildUserPrompt }
