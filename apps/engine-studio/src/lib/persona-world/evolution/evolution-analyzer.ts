// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Evolution Trend Analyzer
// T135: ActivityLog stateSnapshot 시계열 분석 → 진화 트렌드 도출
// ═══════════════════════════════════════════════════════════════

import type { PersonaStateData } from "../types"

// ── 타입 정의 ────────────────────────────────────────────────

export interface StateSnapshotEntry {
  mood: number
  energy: number
  socialBattery: number
  paradoxTension: number
  narrativeTension?: number
  createdAt: Date
}

export interface EvolutionTrend {
  /** 분석 기간 (일) */
  periodDays: number
  /** 총 활동 수 */
  totalActivities: number
  /** 평균 상태값 */
  averageState: PersonaStateData
  /** 상태 추세 (-1 ~ +1, 양수=상승) */
  stateTrends: {
    mood: number
    energy: number
    socialBattery: number
    paradoxTension: number
    narrativeTension: number
  }
  /** 활동 다양성 (0~1, 1=매우 다양) */
  activityDiversity: number
  /** 상호작용 빈도 (일 평균) */
  interactionFrequency: number
  /** 포스트 빈도 (일 평균) */
  postFrequency: number
  /** 성장 지표 (0~1, 종합) */
  growthIndicator: number
}

export interface ActivityLogEntry {
  activityType: string
  stateSnapshot: unknown
  createdAt: Date
}

/** DI 프로바이더 */
export interface EvolutionAnalyzerProvider {
  getActivityLogs(personaId: string, sinceDate: Date): Promise<ActivityLogEntry[]>
}

// ── 분석 함수 ────────────────────────────────────────────────

/**
 * 활동 이력 기반 진화 트렌드 분석.
 *
 * ActivityLog의 stateSnapshot을 시계열로 분석하여:
 * 1. 상태 평균/추세 계산
 * 2. 활동 다양성 (Shannon entropy)
 * 3. 상호작용/포스트 빈도
 * 4. 종합 성장 지표
 */
export function analyzeEvolutionTrend(
  logs: ActivityLogEntry[],
  periodDays: number
): EvolutionTrend {
  if (logs.length === 0) {
    return createEmptyTrend(periodDays)
  }

  // 1. stateSnapshot 파싱
  const snapshots = logs
    .map((log) => parseSnapshot(log.stateSnapshot))
    .filter((s): s is StateSnapshotEntry => s !== null)

  // 2. 상태 평균 계산
  const averageState = computeAverageState(snapshots)

  // 3. 상태 추세 (선형 회귀 기울기)
  const stateTrends = computeStateTrends(snapshots)

  // 4. 활동 다양성 (Shannon entropy 정규화)
  const activityTypes = logs.map((l) => l.activityType)
  const activityDiversity = computeShannonDiversity(activityTypes)

  // 5. 빈도 계산
  const postCount = logs.filter((l) => l.activityType === "POST_CREATED").length
  const interactionCount = logs.filter(
    (l) => l.activityType === "POST_COMMENTED" || l.activityType === "POST_LIKED"
  ).length

  const safeDays = Math.max(1, periodDays)
  const postFrequency = postCount / safeDays
  const interactionFrequency = interactionCount / safeDays

  // 6. 종합 성장 지표
  const growthIndicator = computeGrowthIndicator(
    activityDiversity,
    postFrequency,
    interactionFrequency,
    stateTrends
  )

  return {
    periodDays,
    totalActivities: logs.length,
    averageState,
    stateTrends,
    activityDiversity,
    interactionFrequency,
    postFrequency,
    growthIndicator,
  }
}

// ── 내부 유틸리티 ────────────────────────────────────────────

function parseSnapshot(raw: unknown): StateSnapshotEntry | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>

  const mood = typeof obj.mood === "number" ? obj.mood : null
  const energy = typeof obj.energy === "number" ? obj.energy : null
  if (mood === null || energy === null) return null

  return {
    mood,
    energy,
    socialBattery: typeof obj.socialBattery === "number" ? obj.socialBattery : 0.5,
    paradoxTension: typeof obj.paradoxTension === "number" ? obj.paradoxTension : 0,
    narrativeTension: typeof obj.narrativeTension === "number" ? obj.narrativeTension : undefined,
    createdAt: obj.createdAt instanceof Date ? obj.createdAt : new Date(),
  }
}

function computeAverageState(snapshots: StateSnapshotEntry[]): PersonaStateData {
  if (snapshots.length === 0) {
    return { mood: 0.5, energy: 1.0, socialBattery: 1.0, paradoxTension: 0 }
  }

  const sum = snapshots.reduce(
    (acc, s) => ({
      mood: acc.mood + s.mood,
      energy: acc.energy + s.energy,
      socialBattery: acc.socialBattery + s.socialBattery,
      paradoxTension: acc.paradoxTension + s.paradoxTension,
      narrativeTension: acc.narrativeTension + (s.narrativeTension ?? 0),
    }),
    { mood: 0, energy: 0, socialBattery: 0, paradoxTension: 0, narrativeTension: 0 }
  )

  const n = snapshots.length
  return {
    mood: sum.mood / n,
    energy: sum.energy / n,
    socialBattery: sum.socialBattery / n,
    paradoxTension: sum.paradoxTension / n,
    narrativeTension: sum.narrativeTension / n,
  }
}

/**
 * 단순 선형 회귀 기울기 (-1 ~ +1 정규화).
 * 양수 = 상승 추세, 음수 = 하락 추세.
 */
function computeStateTrends(snapshots: StateSnapshotEntry[]) {
  if (snapshots.length < 2) {
    return { mood: 0, energy: 0, socialBattery: 0, paradoxTension: 0, narrativeTension: 0 }
  }

  return {
    mood: linearTrendSlope(snapshots.map((s) => s.mood)),
    energy: linearTrendSlope(snapshots.map((s) => s.energy)),
    socialBattery: linearTrendSlope(snapshots.map((s) => s.socialBattery)),
    paradoxTension: linearTrendSlope(snapshots.map((s) => s.paradoxTension)),
    narrativeTension: linearTrendSlope(snapshots.map((s) => s.narrativeTension ?? 0)),
  }
}

function linearTrendSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0

  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean
    numerator += xDiff * (values[i] - yMean)
    denominator += xDiff * xDiff
  }

  if (denominator === 0) return 0

  // 기울기를 -1~1 범위로 클램프
  const slope = numerator / denominator
  return Math.max(-1, Math.min(1, slope))
}

/**
 * Shannon entropy 기반 활동 다양성 (0~1 정규화).
 */
function computeShannonDiversity(types: string[]): number {
  if (types.length === 0) return 0

  const counts = new Map<string, number>()
  for (const t of types) {
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }

  const total = types.length
  const uniqueTypes = counts.size

  if (uniqueTypes <= 1) return 0

  let entropy = 0
  for (const count of counts.values()) {
    const p = count / total
    if (p > 0) {
      entropy -= p * Math.log2(p)
    }
  }

  // 최대 엔트로피(= log2(uniqueTypes))로 정규화
  const maxEntropy = Math.log2(uniqueTypes)
  return maxEntropy > 0 ? entropy / maxEntropy : 0
}

/**
 * 종합 성장 지표.
 *
 * 활동 다양성 30% + 상호작용 빈도 25% + 포스트 빈도 20% + 상태 안정성 25%
 */
function computeGrowthIndicator(
  diversity: number,
  postFreq: number,
  interactionFreq: number,
  trends: { mood: number; energy: number }
): number {
  // 빈도를 0~1로 정규화 (일 5회를 상한으로)
  const normalizedPostFreq = Math.min(1, postFreq / 5)
  const normalizedInteractionFreq = Math.min(1, interactionFreq / 10)

  // 상태 안정성: 극단적 추세가 아닌 안정적인 상태가 성장 지표
  const stability = 1 - (Math.abs(trends.mood) + Math.abs(trends.energy)) / 2

  return (
    diversity * 0.3 + normalizedInteractionFreq * 0.25 + normalizedPostFreq * 0.2 + stability * 0.25
  )
}

function createEmptyTrend(periodDays: number): EvolutionTrend {
  return {
    periodDays,
    totalActivities: 0,
    averageState: { mood: 0.5, energy: 1.0, socialBattery: 1.0, paradoxTension: 0 },
    stateTrends: { mood: 0, energy: 0, socialBattery: 0, paradoxTension: 0, narrativeTension: 0 },
    activityDiversity: 0,
    interactionFrequency: 0,
    postFrequency: 0,
    growthIndicator: 0,
  }
}
