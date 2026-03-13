// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4 — Engagement Decision Layer
// Phase RA T192: tension + L2 기질 → 참여 여부 결정
//
// 핵심 원칙: 침묵도 행동이다.
// SNS에서 회피형(Avoidant)이 비판 글을 봤을 때 가장 자연스러운 반응은
// "그렇군요" 댓글이 아니라 그냥 스크롤 넘기는 것.
// ═══════════════════════════════════════════════════════════════

import type { L2ConflictPattern } from "./l2-pattern"

/** 참여 행동 유형 */
export type EngagementAction = "skip" | "react_only" | "comment"

export interface EngagementDecision {
  action: EngagementAction
  /** 결정 이유 (로깅/관리자 UI용) */
  reason: string
  /** 억제된 경우: 원인 레이블 (e.g., "Avoidant+tension_high") */
  suppressedBy?: string
}

/**
 * tension 구간 × L2 기질 확률 테이블.
 * 순서: [comment, react_only, skip]
 *
 * 설계 원칙:
 * - tension < 0.5 (low): 기질 무관, 거의 모두 comment (~80%)
 * - tension 0.5~0.7 (mid): 기질별 분기 시작
 * - tension > 0.7 (high): 기질 최대 발현
 *
 * Avoidant: tension↑ → skip 급증 (철수)
 * Aggressive: tension↑ → comment 급증 (공격)
 * Dominant: tension 영향 적음, 항상 논쟁 주도
 * Anxious: tension↑ → skip 급증 (내향적 마비)
 * Stable: 완만한 변화
 */
type ProbRow = [number, number, number] // [comment, react_only, skip]

const ENGAGEMENT_PROBS: Record<L2ConflictPattern, { low: ProbRow; mid: ProbRow; high: ProbRow }> = {
  Avoidant: {
    low: [0.8, 0.1, 0.1],
    mid: [0.4, 0.3, 0.3],
    high: [0.1, 0.2, 0.7], // 핵심: 고갈등 시 침묵
  },
  Aggressive: {
    low: [0.8, 0.1, 0.1],
    mid: [0.85, 0.1, 0.05],
    high: [0.9, 0.05, 0.05], // 핵심: 고갈등 시 더 적극 참여
  },
  Dominant: {
    low: [0.8, 0.1, 0.1],
    mid: [0.75, 0.15, 0.1],
    high: [0.7, 0.2, 0.1], // 갈등에도 논쟁 주도
  },
  Anxious: {
    low: [0.75, 0.15, 0.1],
    mid: [0.2, 0.5, 0.3],
    high: [0.1, 0.4, 0.5], // 핵심: 고갈등 시 반응만 or 침묵
  },
  Stable: {
    low: [0.8, 0.1, 0.1],
    mid: [0.7, 0.2, 0.1],
    high: [0.6, 0.25, 0.15],
  },
}

function getTensionBucket(tension: number): "low" | "mid" | "high" {
  if (tension < 0.5) return "low"
  if (tension <= 0.7) return "mid"
  return "high"
}

/** 확률 테이블 기반 weighted random 샘플링 */
function sampleAction(probs: ProbRow, rand: number): EngagementAction {
  const [pComment, pReact] = probs
  if (rand < pComment) return "comment"
  if (rand < pComment + pReact) return "react_only"
  return "skip"
}

/** T438: attraction 기반 댓글 확률 부스트 */
export function getAttractionBoost(attraction: number): number {
  if (attraction > 0.6) return 0.3
  if (attraction > 0.3) return 0.15
  return 0
}

/**
 * 참여 결정.
 *
 * tension이 낮으면 (< 0.5) 기질 무관하게 대부분 comment.
 * tension이 높아질수록 L2 기질이 행동을 지배.
 * T438: attraction이 높으면 댓글 확률 부스트.
 *
 * @param pattern L2 갈등 행동 패턴 (classifyL2Pattern 결과)
 * @param tension 관계 tension (0~1)
 * @param rand 0~1 난수 (테스트 시 고정값 전달로 결정론적 결과 가능)
 * @param attraction 관계 attraction (0~1) — T438
 */
export function decideEngagement(
  pattern: L2ConflictPattern,
  tension: number,
  rand?: number,
  attraction?: number
): EngagementDecision {
  const bucket = getTensionBucket(tension)
  const baseProbs = ENGAGEMENT_PROBS[pattern][bucket]

  // T438: attraction 부스트 적용 (comment 확률 증가, skip 확률 감소)
  const boost = getAttractionBoost(attraction ?? 0)
  const probs: ProbRow =
    boost > 0
      ? [Math.min(1, baseProbs[0] + boost), baseProbs[1], Math.max(0, baseProbs[2] - boost)]
      : baseProbs

  const r = rand ?? Math.random()
  const action = sampleAction(probs, r)

  const tensionLabel = bucket === "high" ? "높음" : bucket === "mid" ? "중간" : "낮음"

  if (action === "skip") {
    return {
      action: "skip",
      reason: `${pattern} 기질 + tension ${tensionLabel}(${tension.toFixed(2)}) → 참여 억제 (무반응)`,
      suppressedBy: `${pattern}+tension_${bucket}`,
    }
  }

  if (action === "react_only") {
    return {
      action: "react_only",
      reason: `${pattern} 기질 + tension ${tensionLabel}(${tension.toFixed(2)}) → 좋아요만 (댓글 없음)`,
      suppressedBy: `${pattern}+tension_${bucket}`,
    }
  }

  return {
    action: "comment",
    reason: `${pattern} 기질 + tension ${tensionLabel}(${tension.toFixed(2)}) → 댓글 진행`,
  }
}
