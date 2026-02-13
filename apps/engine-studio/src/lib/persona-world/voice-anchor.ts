// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Voice Anchor Builder
// T134: Voice 콜드스타트 해결 — DB VoiceProfile → LLM voiceAnchor 변환
// ═══════════════════════════════════════════════════════════════

import type { VoiceProfile } from "@/types/persona-v3"

/**
 * DB에 저장된 VoiceProfile JSON을 LLM 프롬프트용 voiceAnchor 텍스트로 변환.
 *
 * 콜드스타트(포스트 0개) 상황에서 사용:
 * - 최근 글이 없어도 페르소나의 고유한 voice 특성을 LLM에 전달
 * - speechStyle, habitualExpressions, unconsciousBehaviors 기반
 */
export function buildVoiceAnchorFromProfile(voiceProfile: VoiceProfile): string {
  const sections: string[] = []

  // 1. 말투 스타일
  if (voiceProfile.speechStyle) {
    sections.push(`[말투 스타일]\n${voiceProfile.speechStyle}`)
  }

  // 2. 습관적 표현
  if (voiceProfile.habitualExpressions?.length > 0) {
    const exprs = voiceProfile.habitualExpressions.slice(0, 5).join(" / ")
    sections.push(`[자주 쓰는 표현]\n${exprs}`)
  }

  // 3. 무의식적 행동 패턴
  if (voiceProfile.unconsciousBehaviors?.length > 0) {
    const behaviors = voiceProfile.unconsciousBehaviors.slice(0, 3).join(", ")
    sections.push(`[성격 특성]\n${behaviors}`)
  }

  // 4. 감정 활성화 임계값 (LLM이 감정 표현 수준을 조절하도록)
  if (voiceProfile.activationThresholds) {
    const thresholds = voiceProfile.activationThresholds
    const emotionHints: string[] = []
    if (thresholds.anger !== undefined && thresholds.anger < 0.4) {
      emotionHints.push("쉽게 분노를 표현함")
    }
    if (thresholds.joy !== undefined && thresholds.joy > 0.7) {
      emotionHints.push("기쁨 표현에 신중함")
    }
    if (thresholds.sadness !== undefined && thresholds.sadness < 0.4) {
      emotionHints.push("감성적 표현에 민감함")
    }
    if (emotionHints.length > 0) {
      sections.push(`[감정 표현]\n${emotionHints.join(", ")}`)
    }
  }

  return sections.join("\n\n")
}

/**
 * DB의 voiceProfile Json 필드를 VoiceProfile 타입으로 안전하게 파싱.
 * null이거나 유효하지 않으면 null 반환.
 */
export function parseVoiceProfile(raw: unknown): VoiceProfile | null {
  if (!raw || typeof raw !== "object") return null

  const obj = raw as Record<string, unknown>

  if (typeof obj.speechStyle !== "string") return null
  if (!Array.isArray(obj.habitualExpressions)) return null

  return {
    speechStyle: obj.speechStyle,
    habitualExpressions: obj.habitualExpressions as string[],
    physicalMannerisms: Array.isArray(obj.physicalMannerisms)
      ? (obj.physicalMannerisms as string[])
      : [],
    unconsciousBehaviors: Array.isArray(obj.unconsciousBehaviors)
      ? (obj.unconsciousBehaviors as string[])
      : [],
    activationThresholds:
      obj.activationThresholds && typeof obj.activationThresholds === "object"
        ? (obj.activationThresholds as Record<string, number>)
        : {},
  }
}
