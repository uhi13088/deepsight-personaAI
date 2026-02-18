// ═══════════════════════════════════════════════════════════════
// 하이브리드 연결 메커니즘 — Barrel Export + InteractionEngine
// T73-AC5: attitude→delta 매핑 상수 + 통합 엔진
// 4대 알고리즘(Init/Override/Adapt/Express)을 통합 관리
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension, UserSentiment } from "@/types"
import { calculateInitDelta, type InitResult } from "./init-algorithm"
import {
  applyOverrides,
  decayOverrides,
  DEFAULT_OVERRIDE_RULES,
  type ActiveOverride,
  type OverrideResult,
  type OverrideRule,
} from "./override-algorithm"
import {
  createAdaptState,
  adaptVector,
  sentimentToUIV,
  DEFAULT_ADAPT_CONFIG,
  type AdaptState,
  type AdaptConfig,
} from "./adapt-algorithm"
import {
  calculateDerivedStates,
  evaluateQuirks,
  DEFAULT_QUIRKS,
  type DerivedStates,
  type QuirkState,
  type QuirkDefinition,
  type ExpressResult,
  type FiredQuirk,
} from "./express-algorithm"

// ── Attitude → Delta 매핑 상수 ─────────────────────────────────

export type UserAttitude =
  | "admiring"
  | "agreeable"
  | "neutral"
  | "skeptical"
  | "confrontational"
  | "dismissive"
  | "curious"
  | "playful"

export interface AttitudeDelta {
  dimension: SocialDimension
  adjustmentRate: number
  bounds: { min: number; max: number }
}

export const ATTITUDE_DELTA_MAP: Record<UserAttitude, AttitudeDelta[]> = {
  admiring: [
    { dimension: "stance", adjustmentRate: -0.03, bounds: { min: 0.1, max: 0.9 } },
    { dimension: "sociability", adjustmentRate: 0.02, bounds: { min: 0.1, max: 0.9 } },
  ],
  agreeable: [
    { dimension: "stance", adjustmentRate: -0.02, bounds: { min: 0.1, max: 0.9 } },
    { dimension: "depth", adjustmentRate: -0.01, bounds: { min: 0.2, max: 0.9 } },
  ],
  neutral: [],
  skeptical: [
    { dimension: "stance", adjustmentRate: 0.03, bounds: { min: 0.1, max: 0.9 } },
    { dimension: "depth", adjustmentRate: 0.02, bounds: { min: 0.1, max: 0.9 } },
  ],
  confrontational: [
    { dimension: "stance", adjustmentRate: 0.05, bounds: { min: 0.1, max: 0.95 } },
    { dimension: "sociability", adjustmentRate: -0.03, bounds: { min: 0.05, max: 0.9 } },
  ],
  dismissive: [
    { dimension: "depth", adjustmentRate: -0.03, bounds: { min: 0.1, max: 0.9 } },
    { dimension: "purpose", adjustmentRate: -0.02, bounds: { min: 0.1, max: 0.9 } },
  ],
  curious: [
    { dimension: "depth", adjustmentRate: 0.03, bounds: { min: 0.1, max: 0.9 } },
    { dimension: "scope", adjustmentRate: 0.02, bounds: { min: 0.1, max: 0.9 } },
  ],
  playful: [
    { dimension: "purpose", adjustmentRate: -0.03, bounds: { min: 0.1, max: 0.9 } },
    { dimension: "taste", adjustmentRate: 0.02, bounds: { min: 0.1, max: 0.9 } },
  ],
}

// ── Attitude delta 적용 ──────────────────────────────────────

export function applyAttitudeDelta(
  currentL1: SocialPersonaVector,
  attitude: UserAttitude
): SocialPersonaVector {
  const deltas = ATTITUDE_DELTA_MAP[attitude]
  if (deltas.length === 0) return { ...currentL1 }

  const adjusted = { ...currentL1 }
  for (const d of deltas) {
    const newVal = adjusted[d.dimension] + d.adjustmentRate
    adjusted[d.dimension] =
      Math.round(Math.max(d.bounds.min, Math.min(d.bounds.max, newVal)) * 100) / 100
  }
  return adjusted
}

// ── InteractionEngine 통합 상태 ──────────────────────────────

export interface InteractionEngineState {
  /** 초기 L1 벡터 (변경 불가) */
  originalL1: SocialPersonaVector
  /** 현재 L1 벡터 (모든 알고리즘 적용 후) */
  currentL1: SocialPersonaVector
  /** Init 적용 여부 */
  initApplied: boolean
  /** Override 활성 목록 */
  activeOverrides: ActiveOverride[]
  /** Adapt 상태 */
  adaptState: AdaptState
  /** Quirk 상태 */
  quirkStates: QuirkState[]
  /** 현재 턴 */
  currentTurn: number
  /** 마지막 파생 상태 */
  lastDerivedStates: DerivedStates | null
  /** 마지막 발동된 quirk */
  lastFiredQuirks: FiredQuirk[]
}

export interface InteractionEngineConfig {
  overrideRules: OverrideRule[]
  adaptConfig: AdaptConfig
  quirks: QuirkDefinition[]
  enableInit: boolean
  enableOverride: boolean
  enableAdapt: boolean
  enableExpress: boolean
}

export const DEFAULT_ENGINE_CONFIG: InteractionEngineConfig = {
  overrideRules: DEFAULT_OVERRIDE_RULES,
  adaptConfig: DEFAULT_ADAPT_CONFIG,
  quirks: DEFAULT_QUIRKS,
  enableInit: true,
  enableOverride: true,
  enableAdapt: true,
  enableExpress: true,
}

// ── InteractionEngine ────────────────────────────────────────

export function createInteractionEngine(
  l1: SocialPersonaVector,
  config: Partial<InteractionEngineConfig> = {}
): InteractionEngineState {
  const adaptState = createAdaptState(l1)
  return {
    originalL1: { ...l1 },
    currentL1: { ...l1 },
    initApplied: false,
    activeOverrides: [],
    adaptState,
    quirkStates: [],
    currentTurn: 0,
    lastDerivedStates: null,
    lastFiredQuirks: [],
  }
}

export interface TurnInput {
  userMessage: string
  sentiment: UserSentiment
  attitude?: UserAttitude
  contextText?: string // Init 단계에서만 사용 (첫 턴)
  pressure?: number // Express 단계에서 사용
}

export interface TurnResult {
  state: InteractionEngineState
  initResult: InitResult | null
  overrideResult: OverrideResult | null
  expressResult: ExpressResult | null
  attitudeApplied: boolean
}

/**
 * 한 턴의 인터랙션을 처리한다.
 * Init → Override → Adapt → Attitude → Express 순서로 실행
 */
export function processTurn(
  state: InteractionEngineState,
  input: TurnInput,
  config: InteractionEngineConfig = DEFAULT_ENGINE_CONFIG
): TurnResult {
  let currentL1 = { ...state.currentL1 }
  const newTurn = state.currentTurn + 1

  let initResult: InitResult | null = null
  let overrideResult: OverrideResult | null = null
  let expressResult: ExpressResult | null = null
  let attitudeApplied = false

  // 1. Init (첫 턴, 한 번만)
  if (config.enableInit && !state.initApplied && input.contextText) {
    initResult = calculateInitDelta(currentL1, input.contextText)
    currentL1 = initResult.adjustedVector
  }

  // 2. Override (트리거 감지 + 감쇠)
  if (config.enableOverride) {
    overrideResult = applyOverrides(
      currentL1,
      input.userMessage,
      state.activeOverrides,
      config.overrideRules
    )
    currentL1 = overrideResult.adjustedVector
  }

  // 3. Adapt (감정 기반 점진 적응)
  let newAdaptState = state.adaptState
  if (config.enableAdapt) {
    const uiv = sentimentToUIV(input.sentiment)
    newAdaptState = adaptVector({ ...state.adaptState, currentL1 }, uiv, config.adaptConfig)
    currentL1 = newAdaptState.currentL1
  }

  // 4. Attitude delta (사용자 태도 기반)
  if (input.attitude) {
    currentL1 = applyAttitudeDelta(currentL1, input.attitude)
    attitudeApplied = true
  }

  // 5. Express (파생 상태 + Quirk)
  let lastDerivedStates: DerivedStates | null = state.lastDerivedStates
  let lastFiredQuirks: FiredQuirk[] = []
  let newQuirkStates = state.quirkStates

  if (config.enableExpress) {
    const derivedStates = calculateDerivedStates(currentL1, input.pressure ?? 0)
    expressResult = evaluateQuirks(
      currentL1,
      derivedStates,
      newTurn,
      state.quirkStates,
      config.quirks
    )
    lastDerivedStates = derivedStates
    lastFiredQuirks = expressResult.firedQuirks
    newQuirkStates = expressResult.quirkStates
  }

  const newState: InteractionEngineState = {
    originalL1: state.originalL1,
    currentL1,
    initApplied: state.initApplied || initResult !== null,
    activeOverrides: overrideResult?.activeOverrides ?? state.activeOverrides,
    adaptState: newAdaptState,
    quirkStates: newQuirkStates,
    currentTurn: newTurn,
    lastDerivedStates,
    lastFiredQuirks,
  }

  return {
    state: newState,
    initResult,
    overrideResult,
    expressResult,
    attitudeApplied,
  }
}

/**
 * 벡터 드리프트 (원본 대비 변화량) 계산
 */
export function calculateDrift(state: InteractionEngineState): Record<SocialDimension, number> {
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  const drift = {} as Record<SocialDimension, number>
  for (const dim of dims) {
    drift[dim] = Math.round((state.currentL1[dim] - state.originalL1[dim]) * 100) / 100
  }
  return drift
}

/**
 * 엔진 상태를 원본으로 리셋
 */
export function resetEngine(state: InteractionEngineState): InteractionEngineState {
  return createInteractionEngine(state.originalL1)
}

// ── Re-exports ────────────────────────────────────────────────

export { calculateInitDelta, extractKeywords, categorizeKeywords } from "./init-algorithm"
export {
  applyOverrides,
  detectTriggers,
  decayOverrides,
  DEFAULT_OVERRIDE_RULES,
} from "./override-algorithm"
export {
  createAdaptState,
  adaptVector,
  adaptBatch,
  sentimentToUIV,
  DEFAULT_ADAPT_CONFIG,
} from "./adapt-algorithm"
export {
  calculateDerivedStates,
  evaluateQuirks,
  generateParadoxQuirks,
  DEFAULT_QUIRKS,
} from "./express-algorithm"

export type { InitResult, SemanticCategory } from "./init-algorithm"
export type { OverrideRule, ActiveOverride, OverrideResult } from "./override-algorithm"
export type { AdaptState, AdaptConfig, UserInteractionVector } from "./adapt-algorithm"
export { generateExpressQuirksWithLLM } from "./llm-express-quirks"
export type {
  DerivedStates,
  QuirkState,
  QuirkDefinition,
  ExpressResult,
  FiredQuirk,
} from "./express-algorithm"
