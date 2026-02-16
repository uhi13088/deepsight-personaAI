// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Poignancy Score
// 감정 가중 기억 검색: 감정적으로 중요한 기억이 우선 검색되도록 가중
//
// 공식: poignancy = pressure × (1 + volatility) × emotionalDelta
// LLM 비용: 0 (순수 규칙 기반)
//
// RAG 검색 가중치: recency × 0.3 + similarity × 0.4 + poignancy × 0.3
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@/lib/vector/utils"
import type { PersonaStateData } from "./types"

// ── 상수 ────────────────────────────────────────────────────────

/** RAG 검색 가중치 (v4.0: poignancy 추가) */
export const RAG_SEARCH_WEIGHTS = {
  recency: 0.3,
  similarity: 0.4,
  poignancy: 0.3,
} as const

/** Poignancy 임계값 */
export const POIGNANCY_THRESHOLDS = {
  /** 이 값 이상이면 "감정적으로 중요한 기억"으로 분류 */
  significant: 0.5,
  /** 이 값 이상이면 "핵심 기억"으로 분류 (잊기 어려움) */
  core: 0.8,
  /** 최솟값 (일상 대화의 최소 poignancy) */
  minimum: 0.01,
} as const

// ── Poignancy 계산 ──────────────────────────────────────────────

export interface PoignancyInput {
  /** 현재 압박 수준 (0.0~1.0). PersonaState에서 파생 */
  pressure: number
  /** 감정 폭발성 (0.0~1.0). L3 narrative volatility 또는 활동 특성 */
  volatility: number
  /** 감정 변화량 (0.0~1.0). 이벤트 전후 mood 차이의 절대값 */
  emotionalDelta: number
}

/**
 * Poignancy Score 계산.
 *
 * 공식: `pressure × (1 + volatility) × emotionalDelta`
 *
 * - pressure: 현재 상황의 긴장/압박 수준
 * - volatility: 페르소나의 감정 폭발성 (높을수록 작은 자극에도 강하게 반응)
 * - emotionalDelta: 실제 감정 변화량 (이벤트가 얼마나 감정을 움직였는지)
 *
 * 결과는 0.0~1.0으로 클램핑.
 * LLM 비용 0: 순수 규칙 기반 계산.
 */
export function calculatePoignancy(input: PoignancyInput): number {
  const { pressure, volatility, emotionalDelta } = input
  const raw = pressure * (1 + volatility) * emotionalDelta
  return clamp(raw)
}

// ── PersonaState 기반 Pressure 도출 ─────────────────────────────

/**
 * PersonaState에서 pressure 값을 도출.
 *
 * pressure = paradoxTension 60% + (1 - energy) 20% + (1 - mood가 0.5에서 떨어진 정도) 20%
 * - paradoxTension이 높으면 → 압박 상태
 * - energy가 낮으면 → 피곤할 때 자극이 더 강하게 느껴짐
 * - mood가 극단적이면 → 감정적으로 불안정 = 자극에 민감
 */
export function derivePressureFromState(state: PersonaStateData): number {
  const moodInstability = Math.abs(state.mood - 0.5) * 2 // 0.0~1.0: 중립에서 멀수록 불안정
  const energyDeficit = 1 - state.energy
  const pressure = state.paradoxTension * 0.6 + energyDeficit * 0.2 + moodInstability * 0.2

  return clamp(pressure)
}

// ── 이벤트별 EmotionalDelta 계산 ────────────────────────────────

export type PoignancyEventType =
  | "post_created"
  | "comment_created"
  | "comment_received_positive"
  | "comment_received_negative"
  | "comment_received_aggressive"
  | "comment_received_neutral"
  | "like_received"
  | "paradox_situation"
  | "paradox_resolved"
  | "idle_period"

/**
 * 이벤트별 기본 감정 변화량.
 * 실제 mood 변화량과 결합하여 최종 emotionalDelta를 산출.
 */
const EVENT_EMOTIONAL_IMPACT: Record<PoignancyEventType, number> = {
  post_created: 0.15, // 자기 표현 → 중간 감정 변화
  comment_created: 0.1, // 인터랙션 → 약한 감정 변화
  comment_received_positive: 0.2, // 긍정 피드백 → 중간 감정 변화
  comment_received_negative: 0.35, // 부정 피드백 → 강한 감정 변화
  comment_received_aggressive: 0.5, // 공격적 피드백 → 매우 강한 감정 변화
  comment_received_neutral: 0.05, // 중립 → 미미한 변화
  like_received: 0.08, // 좋아요 → 약한 긍정
  paradox_situation: 0.6, // 역설 상황 → 매우 강한 내적 충돌
  paradox_resolved: 0.4, // 역설 해소 → 강한 안도감
  idle_period: 0.02, // 비활동 → 거의 변화 없음
}

/**
 * 이벤트 타입과 실제 mood 변화를 결합하여 emotionalDelta를 계산.
 *
 * emotionalDelta = max(기본 이벤트 영향, 실제 mood 변화 × 2)
 *
 * 실제 mood 변화가 크면 그것을 반영하고,
 * 작더라도 이벤트 종류에 따른 최소 영향을 보장.
 */
export function computeEmotionalDelta(
  eventType: PoignancyEventType,
  moodBefore: number,
  moodAfter: number
): number {
  const baseImpact = EVENT_EMOTIONAL_IMPACT[eventType]
  const actualMoodChange = Math.abs(moodAfter - moodBefore)
  const amplifiedMoodChange = actualMoodChange * 2

  return clamp(Math.max(baseImpact, amplifiedMoodChange))
}

// ── RAG 검색 점수 계산 ──────────────────────────────────────────

export interface RAGSearchScoreInput {
  /** 시간 기반 최신성 (0.0~1.0) */
  recency: number
  /** 의미 유사도 (0.0~1.0) */
  similarity: number
  /** Poignancy 점수 (0.0~1.0) */
  poignancy: number
}

/**
 * RAG 검색 최종 점수.
 *
 * v3: `recency × 0.5 + similarity × 0.5` (2축)
 * v4: `recency × 0.3 + similarity × 0.4 + poignancy × 0.3` (3축)
 *
 * poignancy가 높은 기억은 오래되어도 상위에 랭크됨.
 */
export function computeRAGSearchScore(input: RAGSearchScoreInput): number {
  const { recency, similarity, poignancy } = input
  return (
    recency * RAG_SEARCH_WEIGHTS.recency +
    similarity * RAG_SEARCH_WEIGHTS.similarity +
    poignancy * RAG_SEARCH_WEIGHTS.poignancy
  )
}

// ── 포스트 생성 시 자동 Poignancy 계산 ──────────────────────────

/**
 * 포스트 생성 시 자동 Poignancy 계산.
 *
 * 포스트 작성 = post_created 이벤트.
 * state에서 pressure를 도출하고, volatility와 결합하
 */
export function calculatePostPoignancy(state: PersonaStateData, volatility: number): number {
  const pressure = derivePressureFromState(state)
  const emotionalDelta = computeEmotionalDelta("post_created", state.mood, state.mood)

  return calculatePoignancy({ pressure, volatility, emotionalDelta })
}

/**
 * 인터랙션 이벤트에 대한 Poignancy 계산.
 *
 * 댓글 수신/작성 등 인터랙션에서 mood 변화를 반영.
 */
export function calculateInteractionPoignancy(
  eventType: PoignancyEventType,
  state: PersonaStateData,
  volatility: number,
  moodBefore: number,
  moodAfter: number
): number {
  const pressure = derivePressureFromState(state)
  const emotionalDelta = computeEmotionalDelta(eventType, moodBefore, moodAfter)

  return calculatePoignancy({ pressure, volatility, emotionalDelta })
}
