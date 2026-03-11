// ═══════════════════════════════════════════════════════════════
// PW Arena — 품질 평가 적합성 필터 (T431)
// 유저 토론 데이터 중 엔진 심판 파이프라인에 유의미한 것만 선별
// ═══════════════════════════════════════════════════════════════

import type { PWArenaSessionRecord } from "./pw-arena-types"
import type { QualityFilterResult, QualityEvalScope } from "./pw-arena-types"
import {
  PW_ARENA_MIN_ROUNDS_FOR_EVAL,
  PW_ARENA_MIN_AVG_TOKENS_FOR_FULL_EVAL,
} from "./pw-arena-types"

/**
 * 토론 세션의 품질 평가 적합성을 판별한다.
 *
 * - FULL: 전체 4차원 평가 (characterConsistency, l2Emergence, paradoxEmergence, triggerResponse)
 * - VOICE_ONLY: voiceConsistency(말투 일관성)만 평가
 * - SKIP: 평가 불가 (데이터 부족)
 */
export function evaluateQualityScope(session: PWArenaSessionRecord): QualityFilterResult {
  // 1. 완료되지 않은 세션은 건너뜀
  if (session.status !== "COMPLETED") {
    return { scope: "SKIP", reason: "세션 미완료" }
  }

  // 2. 턴이 없으면 건너뜀
  if (session.turns.length === 0) {
    return { scope: "SKIP", reason: "턴 데이터 없음" }
  }

  // 3. 실제 진행 라운드 수 계산
  const roundNumbers = new Set(session.turns.map((t) => t.roundNumber))
  const completedRounds = roundNumbers.size

  // 4. 평균 발언 토큰 계산
  const totalTokens = session.turns.reduce((sum, t) => sum + t.tokensUsed, 0)
  const avgTokens = totalTokens / session.turns.length

  // 5. 필터 적용
  if (completedRounds < PW_ARENA_MIN_ROUNDS_FOR_EVAL) {
    return {
      scope: "SKIP",
      reason: `라운드 수 부족 (${completedRounds} < ${PW_ARENA_MIN_ROUNDS_FOR_EVAL})`,
    }
  }

  if (avgTokens < PW_ARENA_MIN_AVG_TOKENS_FOR_FULL_EVAL) {
    return {
      scope: "VOICE_ONLY",
      reason: `평균 토큰 부족 (${Math.round(avgTokens)} < ${PW_ARENA_MIN_AVG_TOKENS_FOR_FULL_EVAL}) — 말투 일관성만 평가`,
    }
  }

  return { scope: "FULL", reason: "전체 평가 적합" }
}

/**
 * 세션의 참여 페르소나별 발언을 추출한다.
 * 엔진 아레나 심판에 전달할 형식으로 변환.
 */
export function extractPersonaTurns(
  session: PWArenaSessionRecord
): Map<string, Array<{ roundNumber: number; content: string; tokensUsed: number }>> {
  const result = new Map<
    string,
    Array<{ roundNumber: number; content: string; tokensUsed: number }>
  >()

  for (const turn of session.turns) {
    const existing = result.get(turn.speakerId) ?? []
    existing.push({
      roundNumber: turn.roundNumber,
      content: turn.content,
      tokensUsed: turn.tokensUsed,
    })
    result.set(turn.speakerId, existing)
  }

  return result
}
