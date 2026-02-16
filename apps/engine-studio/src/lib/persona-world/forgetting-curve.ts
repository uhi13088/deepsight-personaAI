// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Forgetting Curve (망각 곡선)
// 에빙하우스 망각 곡선: retention = e^(-t/S)
//
// S = stability (안정성): Poignancy가 높을수록 S 증가 (오래 기억)
// t = elapsed time (경과 시간, 일 단위)
//
// 10년 활동 페르소나의 RAG DB 무한 성장 방지.
// "3년 전 점심 메뉴"까지 기억하는 불쾌한 골짜기 방지.
// LLM 비용: 0 (순수 규칙 기반)
// ═══════════════════════════════════════════════════════════════

// ── 상수 ────────────────────────────────────────────────────────

/** 기본 안정성 (Poignancy 0일 때, 단위: 일) */
export const BASE_STABILITY = 7

/** 최대 안정성 (Poignancy 1.0일 때, 단위: 일) */
export const MAX_STABILITY = 365

/** 핵심 기억 안정성 (Poignancy >= CORE threshold, 단위: 일) */
export const CORE_MEMORY_STABILITY = 3650 // ~10년

/** retention 이 이 값 이하이면 검색에서 사실상 제외 */
export const RETENTION_CUTOFF = 0.05

/** Poignancy 기반 안정성 계산 상수 */
export const STABILITY_CONFIG = {
  /** 핵심 기억 Poignancy 임계값 */
  coreThreshold: 0.8,
  /** 중요 기억 Poignancy 임계값 */
  significantThreshold: 0.5,
  /** 안정성 스케일 팩터 (Poignancy → S 변환 시 지수) */
  scalePower: 2,
} as const

// ── Stability 계산 ──────────────────────────────────────────────

/**
 * Poignancy Score → Stability (S) 변환.
 *
 * 공식: S = BASE + (MAX - BASE) × poignancy^scalePower
 *
 * - poignancy=0 → S=7일 (일상 대화: 1주일이면 희미)
 * - poignancy=0.5 → S≈96일 (~3개월)
 * - poignancy=0.8 → S≈237일 (~8개월)
 * - poignancy>=0.8 (core) → S=3650일 (~10년, 거의 영구)
 *
 * scalePower=2이므로 낮은 poignancy 구간은 빠르게 망각,
 * 높은 구간은 느리게 망각하여 자연스러운 망각 곡선 형성.
 */
export function computeStability(poignancy: number): number {
  // 핵심 기억은 사실상 영구 보존
  if (poignancy >= STABILITY_CONFIG.coreThreshold) {
    return CORE_MEMORY_STABILITY
  }

  const normalizedPoignancy = Math.max(0, Math.min(poignancy, 1))
  const scaledPoignancy = Math.pow(normalizedPoignancy, STABILITY_CONFIG.scalePower)

  return BASE_STABILITY + (MAX_STABILITY - BASE_STABILITY) * scaledPoignancy
}

// ── Retention 계산 ──────────────────────────────────────────────

/**
 * 에빙하우스 망각 곡선: retention = e^(-t/S)
 *
 * @param elapsedDays - 기억 생성 후 경과 일수
 * @param stability - 안정성 S (일 단위)
 * @returns retention 0.0~1.0 (0에 가까울수록 잊혀짐)
 */
export function computeRetention(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1.0
  if (stability <= 0) return 0.0

  return Math.exp(-elapsedDays / stability)
}

/**
 * Poignancy + 경과 시간 → Retention 한 번에 계산.
 */
export function computeRetentionFromPoignancy(poignancy: number, elapsedDays: number): number {
  const stability = computeStability(poignancy)
  return computeRetention(elapsedDays, stability)
}

// ── RAG 검색 가중 적용 ──────────────────────────────────────────

export interface ForgettingCurveInput {
  /** 기억 생성 시점 (Date 또는 timestamp) */
  createdAt: number
  /** 기억의 Poignancy Score */
  poignancy: number
  /** 원래 검색 관련도 점수 */
  relevance: number
}

/**
 * RAG 검색 시 망각 곡선을 적용한 최종 점수.
 *
 * finalScore = relevance × retention
 *
 * - 최근 기억: retention≈1.0 → relevance 유지
 * - 오래된 일상 기억: retention≈0.1 → relevance 대폭 감소
 * - 오래된 감정적 기억: retention≈0.9 → relevance 거의 유지
 */
export function applyForgettingCurve(input: ForgettingCurveInput): {
  adjustedRelevance: number
  retention: number
  stability: number
  elapsedDays: number
  isEffectivelyForgotten: boolean
} {
  const now = Date.now()
  const elapsedMs = now - input.createdAt
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)

  const stability = computeStability(input.poignancy)
  const retention = computeRetention(elapsedDays, stability)
  const adjustedRelevance = input.relevance * retention

  return {
    adjustedRelevance,
    retention,
    stability,
    elapsedDays,
    isEffectivelyForgotten: retention < RETENTION_CUTOFF,
  }
}

/**
 * 여러 기억 항목을 retention 기반으로 정렬.
 *
 * 사실상 잊혀진 기억(retention < RETENTION_CUTOFF)은 제외.
 */
export function filterAndRankByRetention<T extends { createdAt: number; poignancy: number }>(
  memories: T[]
): Array<T & { retention: number; stability: number }> {
  const withRetention = memories.map((memory) => {
    const now = Date.now()
    const elapsedDays = (now - memory.createdAt) / (1000 * 60 * 60 * 24)
    const stability = computeStability(memory.poignancy)
    const retention = computeRetention(elapsedDays, stability)
    return { ...memory, retention, stability }
  })

  return withRetention
    .filter((m) => m.retention >= RETENTION_CUTOFF)
    .sort((a, b) => b.retention - a.retention)
}
