// ═══════════════════════════════════════════════════════════════
// 점진적 프로파일링
// T56-AC3: 행동 데이터 수집, 피드백 루프, 감쇠 기반 벡터 업데이트
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type BehaviorType =
  | "click"
  | "save"
  | "like"
  | "dislike"
  | "dwell"
  | "search"
  | "share"
  | "skip"

export interface BehaviorEvent {
  id: string
  userId: string
  type: BehaviorType
  contentId: string
  personaId: string | null
  metadata: Record<string, number | string>
  timestamp: number
}

export interface FeedbackSignal {
  dimension: string
  delta: number // -1 ~ +1
  weight: number // 0~1 (신호 강도)
  source: BehaviorType
}

export interface VectorUpdateResult {
  previousVector: Record<string, number>
  updatedVector: Record<string, number>
  appliedSignals: FeedbackSignal[]
  decayFactor: number
}

export interface ProfileHistory {
  userId: string
  snapshots: Array<{
    vector: Record<string, number>
    timestamp: number
    reason: string
  }>
}

// ── 행동 → 피드백 신호 변환 ─────────────────────────────────────

const BEHAVIOR_SIGNAL_MAP: Record<
  BehaviorType,
  Array<{ dimension: string; delta: number; weight: number }>
> = {
  click: [{ dimension: "taste", delta: 0.1, weight: 0.3 }],
  save: [
    { dimension: "purpose", delta: 0.15, weight: 0.5 },
    { dimension: "depth", delta: 0.1, weight: 0.3 },
  ],
  like: [
    { dimension: "stance", delta: -0.05, weight: 0.2 }, // 좋아요 → 수용적
  ],
  dislike: [
    { dimension: "stance", delta: 0.1, weight: 0.3 }, // 싫어요 → 비판적
  ],
  dwell: [
    { dimension: "depth", delta: 0.1, weight: 0.4 },
    { dimension: "scope", delta: 0.08, weight: 0.3 },
  ],
  search: [
    { dimension: "taste", delta: 0.05, weight: 0.2 },
    { dimension: "purpose", delta: 0.05, weight: 0.2 },
  ],
  share: [{ dimension: "sociability", delta: 0.15, weight: 0.5 }],
  skip: [{ dimension: "taste", delta: -0.05, weight: 0.1 }],
}

export function behaviorToSignals(event: BehaviorEvent): FeedbackSignal[] {
  const template = BEHAVIOR_SIGNAL_MAP[event.type] ?? []
  return template.map((t) => ({
    dimension: t.dimension,
    delta: t.delta,
    weight: t.weight,
    source: event.type,
  }))
}

// ── 감쇠 함수 ───────────────────────────────────────────────────

export function calculateDecay(daysSinceEvent: number, lambda: number = 0.03): number {
  return round(Math.exp(-lambda * daysSinceEvent))
}

// ── 벡터 업데이트 ───────────────────────────────────────────────

export const LEARNING_RATE = 0.1 // α
export const EXPLORATION_RATE = 0.1 // ε (epsilon-greedy)

export function updateVector(
  currentVector: Record<string, number>,
  signals: FeedbackSignal[],
  daysSinceLastUpdate: number = 0,
  alpha: number = LEARNING_RATE
): VectorUpdateResult {
  const decay = calculateDecay(daysSinceLastUpdate)
  const updatedVector = { ...currentVector }
  const appliedSignals: FeedbackSignal[] = []

  for (const signal of signals) {
    if (updatedVector[signal.dimension] === undefined) continue

    // New_Vector = Old_Vector + α × weight × delta × decay
    const adjustment = alpha * signal.weight * signal.delta * decay
    updatedVector[signal.dimension] = clamp(round(updatedVector[signal.dimension] + adjustment))
    appliedSignals.push(signal)
  }

  return {
    previousVector: currentVector,
    updatedVector,
    appliedSignals,
    decayFactor: decay,
  }
}

// ── 배치 업데이트 (여러 이벤트) ─────────────────────────────────

export function batchUpdateVector(
  currentVector: Record<string, number>,
  events: BehaviorEvent[],
  currentTime: number = Date.now(),
  alpha: number = LEARNING_RATE
): VectorUpdateResult {
  let vector = { ...currentVector }
  const allSignals: FeedbackSignal[] = []

  for (const event of events) {
    const daysSince = (currentTime - event.timestamp) / (1000 * 60 * 60 * 24)
    const signals = behaviorToSignals(event)
    const result = updateVector(vector, signals, daysSince, alpha)
    vector = result.updatedVector
    allSignals.push(...result.appliedSignals)
  }

  return {
    previousVector: currentVector,
    updatedVector: vector,
    appliedSignals: allSignals,
    decayFactor:
      events.length > 0
        ? calculateDecay(
            (currentTime - events[events.length - 1].timestamp) / (1000 * 60 * 60 * 24)
          )
        : 1,
  }
}

// ── 탐색 (epsilon-greedy) ───────────────────────────────────────

export function shouldExplore(epsilon: number = EXPLORATION_RATE): boolean {
  return Math.random() < epsilon
}

// ── 프로필 히스토리 ─────────────────────────────────────────────

export function createProfileHistory(userId: string): ProfileHistory {
  return { userId, snapshots: [] }
}

export function addSnapshot(
  history: ProfileHistory,
  vector: Record<string, number>,
  reason: string
): ProfileHistory {
  return {
    ...history,
    snapshots: [...history.snapshots, { vector: { ...vector }, timestamp: Date.now(), reason }],
  }
}

// ── 벡터 드리프트 측정 ──────────────────────────────────────────

export function measureDrift(history: ProfileHistory): number {
  if (history.snapshots.length < 2) return 0

  const first = history.snapshots[0].vector
  const last = history.snapshots[history.snapshots.length - 1].vector
  const dims = Object.keys(first)

  const totalDelta = dims.reduce(
    (sum, dim) => sum + Math.abs((last[dim] ?? 0.5) - (first[dim] ?? 0.5)),
    0
  )

  return round(totalDelta / dims.length)
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
