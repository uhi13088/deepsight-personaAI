// ═══════════════════════════════════════════════════════════════
// Adapt 알고리즘
// T73-AC3: UIV 3축 분석, 차원별 α 튜닝, 모멘텀, ±0.3 클램프
// 사용자 반응 기반으로 L1 벡터를 점진적으로 적응시킨다
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension, UserSentiment } from "@/types"

// ── UIV (User Interaction Vector) 3축 ─────────────────────────

export interface UserInteractionVector {
  engagement: number // -1.0~1.0: 관심도 (부정적↔긍정적)
  intensity: number // 0.0~1.0: 감정 강도
  valence: number // -1.0~1.0: 감정 방향 (부정↔긍정)
}

// ── Adapt 설정 ────────────────────────────────────────────────

export interface AdaptConfig {
  learningRate: number // 기본 학습률 (default: 0.05)
  momentum: number // 모멘텀 (default: 0.3)
  maxDelta: number // 최대 변화량 (default: ±0.3)
  minTurnsForAdapt: number // 적응 시작 최소 턴 (default: 3)
}

export const DEFAULT_ADAPT_CONFIG: AdaptConfig = {
  learningRate: 0.05,
  momentum: 0.3,
  maxDelta: 0.3,
  minTurnsForAdapt: 3,
}

// ── Adapt 상태 ────────────────────────────────────────────────

export interface AdaptState {
  originalL1: SocialPersonaVector
  currentL1: SocialPersonaVector
  totalDelta: Record<SocialDimension, number>
  momentumBuffer: Record<SocialDimension, number>
  turnCount: number
}

// ── Sentiment → UIV 변환 ──────────────────────────────────────

export function sentimentToUIV(sentiment: UserSentiment): UserInteractionVector {
  const map: Record<UserSentiment, UserInteractionVector> = {
    supportive: { engagement: 0.7, intensity: 0.5, valence: 0.8 },
    neutral: { engagement: 0.3, intensity: 0.2, valence: 0.0 },
    challenging: { engagement: 0.8, intensity: 0.7, valence: -0.3 },
    aggressive: { engagement: 0.9, intensity: 0.9, valence: -0.8 },
  }
  return map[sentiment]
}

// ── UIV → dimension delta 매핑 ────────────────────────────────

const UIV_DIMENSION_MAP: Record<
  SocialDimension,
  {
    engagementWeight: number
    intensityWeight: number
    valenceWeight: number
  }
> = {
  depth: { engagementWeight: 0.5, intensityWeight: 0.3, valenceWeight: 0.2 },
  lens: { engagementWeight: 0.2, intensityWeight: 0.3, valenceWeight: -0.5 },
  stance: { engagementWeight: 0.3, intensityWeight: 0.5, valenceWeight: -0.2 },
  scope: { engagementWeight: 0.4, intensityWeight: 0.2, valenceWeight: 0.4 },
  taste: { engagementWeight: 0.3, intensityWeight: 0.1, valenceWeight: 0.6 },
  purpose: { engagementWeight: 0.4, intensityWeight: 0.4, valenceWeight: 0.2 },
  sociability: { engagementWeight: 0.6, intensityWeight: 0.2, valenceWeight: 0.2 },
}

// ── 초기 상태 생성 ────────────────────────────────────────────

export function createAdaptState(l1: SocialPersonaVector): AdaptState {
  const zeroDelta = {} as Record<SocialDimension, number>
  const zeroMomentum = {} as Record<SocialDimension, number>
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  for (const dim of dims) {
    zeroDelta[dim] = 0
    zeroMomentum[dim] = 0
  }

  return {
    originalL1: { ...l1 },
    currentL1: { ...l1 },
    totalDelta: zeroDelta,
    momentumBuffer: zeroMomentum,
    turnCount: 0,
  }
}

// ── Adapt 실행 ────────────────────────────────────────────────

export function adaptVector(
  state: AdaptState,
  uiv: UserInteractionVector,
  config: AdaptConfig = DEFAULT_ADAPT_CONFIG
): AdaptState {
  const newState: AdaptState = {
    ...state,
    currentL1: { ...state.currentL1 },
    totalDelta: { ...state.totalDelta },
    momentumBuffer: { ...state.momentumBuffer },
    turnCount: state.turnCount + 1,
  }

  // 최소 턴 미달이면 관찰만
  if (newState.turnCount < config.minTurnsForAdapt) {
    return newState
  }

  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]

  for (const dim of dims) {
    const weights = UIV_DIMENSION_MAP[dim]

    // UIV 기반 raw delta 계산
    const rawDelta =
      uiv.engagement * weights.engagementWeight +
      uiv.intensity * weights.intensityWeight +
      uiv.valence * weights.valenceWeight

    // 학습률 적용
    const scaledDelta = rawDelta * config.learningRate

    // 모멘텀 적용
    const momentumDelta = scaledDelta + config.momentum * newState.momentumBuffer[dim]
    newState.momentumBuffer[dim] = momentumDelta

    // 누적 delta 업데이트 (±maxDelta 클램프)
    const newTotalDelta = clampDelta(newState.totalDelta[dim] + momentumDelta, config.maxDelta)
    newState.totalDelta[dim] = newTotalDelta

    // 벡터 적용 (원본 + 누적 delta)
    newState.currentL1[dim] = clampVector(state.originalL1[dim] + newTotalDelta)
  }

  return newState
}

// ── 배치 적응 (여러 턴의 sentiment 한 번에 처리) ──────────────

export function adaptBatch(
  state: AdaptState,
  sentiments: UserSentiment[],
  config: AdaptConfig = DEFAULT_ADAPT_CONFIG
): AdaptState {
  let current = state
  for (const sentiment of sentiments) {
    const uiv = sentimentToUIV(sentiment)
    current = adaptVector(current, uiv, config)
  }
  return current
}

// ── 유틸리티 ──────────────────────────────────────────────────

function clampDelta(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v))
}

function clampVector(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}
