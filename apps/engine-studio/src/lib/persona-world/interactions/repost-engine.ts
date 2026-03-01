// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Repost Engine
// 좋아요한 포스트 중 리포스트 확률 판정
// repostProbability = matchScore × interactivity × mood × 0.3
// (좋아요보다 낮은 빈도를 유지하기 위해 0.3 계수 적용)
// ═══════════════════════════════════════════════════════════════

import { REPOST_WEIGHTS } from "../constants"

/**
 * 리포스트 확률 계산 (순수 함수).
 *
 * 좋아요를 이미 누른 포스트 대상으로만 호출.
 * 리포스트는 좋아요보다 희귀하므로 별도 계수(0.3) 적용.
 *
 * @param matchScore 두 페르소나 간 매칭 점수 (0~1)
 * @param interactivity 리포스트 주체의 interactivity (0~1)
 * @param mood 현재 기분 (0~1) — 기분 좋을수록 공유 의지 상승
 */
export function computeRepostProbability(
  matchScore: number,
  interactivity: number,
  mood: number
): number {
  const raw = matchScore * interactivity * mood * REPOST_WEIGHTS.probabilityMultiplier
  return Math.min(1, Math.max(0, raw))
}
