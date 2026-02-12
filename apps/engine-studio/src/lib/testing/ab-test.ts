// ═══════════════════════════════════════════════════════════════
// A/B 테스트
// T55-AC3: 페르소나 버전 비교, 트래픽 분배, 결과 통계
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type TrafficSplit = "50:50" | "70:30" | "90:10"
export type ABTestStatus = "pending" | "running" | "completed" | "paused" | "cancelled"
export type ABMetricKey = "ctr" | "satisfaction" | "engagement" | "conversion"

export interface ABTestConfig {
  id: string
  name: string
  personaAId: string
  personaBId: string
  trafficSplit: TrafficSplit
  testDurationDays: number
  metrics: ABMetricKey[]
  status: ABTestStatus
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface ABMetricResult {
  metric: ABMetricKey
  personaA: number
  personaB: number
  delta: number // B - A
  deltaPercent: number // ((B - A) / A) * 100
  winner: "A" | "B" | "tie"
  significant: boolean // 통계적 유의미성
}

export interface ABTestResult {
  configId: string
  totalImpressions: { personaA: number; personaB: number }
  metricResults: ABMetricResult[]
  overallWinner: "A" | "B" | "inconclusive"
  confidence: number // 0~1
  completedAt: number
}

// ── 트래픽 분배 파싱 ──────────────────────────────────────────

export function parseTrafficSplit(split: TrafficSplit): [number, number] {
  switch (split) {
    case "50:50":
      return [0.5, 0.5]
    case "70:30":
      return [0.7, 0.3]
    case "90:10":
      return [0.9, 0.1]
  }
}

// ── A/B 테스트 설정 생성 ─────────────────────────────────────

export function createABTestConfig(
  name: string,
  personaAId: string,
  personaBId: string,
  trafficSplit: TrafficSplit = "50:50",
  testDurationDays: number = 14,
  metrics: ABMetricKey[] = ["ctr", "satisfaction", "engagement"]
): ABTestConfig {
  return {
    id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    personaAId,
    personaBId,
    trafficSplit,
    testDurationDays,
    metrics,
    status: "pending",
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  }
}

// ── 테스트 시작 ─────────────────────────────────────────────────

export function startABTest(config: ABTestConfig): ABTestConfig {
  if (config.status !== "pending" && config.status !== "paused") {
    throw new Error(`Cannot start test: status is ${config.status}`)
  }
  return {
    ...config,
    status: "running",
    startedAt: config.startedAt ?? Date.now(),
  }
}

// ── 테스트 일시정지 ─────────────────────────────────────────────

export function pauseABTest(config: ABTestConfig): ABTestConfig {
  if (config.status !== "running") {
    throw new Error(`Cannot pause test: status is ${config.status}`)
  }
  return { ...config, status: "paused" }
}

// ── 테스트 취소 ─────────────────────────────────────────────────

export function cancelABTest(config: ABTestConfig): ABTestConfig {
  if (config.status === "completed" || config.status === "cancelled") {
    throw new Error(`Cannot cancel test: status is ${config.status}`)
  }
  return { ...config, status: "cancelled" }
}

// ── 메트릭 비교 ─────────────────────────────────────────────────

export function compareMetric(
  metric: ABMetricKey,
  valueA: number,
  valueB: number,
  sampleSizeA: number,
  sampleSizeB: number
): ABMetricResult {
  const delta = round(valueB - valueA)
  const deltaPercent = valueA > 0 ? round(((valueB - valueA) / valueA) * 100) : 0

  // 간이 통계 유의미성: 차이가 5% 이상 + 샘플 사이즈 최소 30
  const minSamples = Math.min(sampleSizeA, sampleSizeB)
  const significant = Math.abs(deltaPercent) >= 5 && minSamples >= 30

  let winner: ABMetricResult["winner"]
  if (!significant || Math.abs(deltaPercent) < 2) {
    winner = "tie"
  } else if (delta > 0) {
    winner = "B"
  } else {
    winner = "A"
  }

  return { metric, personaA: valueA, personaB: valueB, delta, deltaPercent, winner, significant }
}

// ── 종합 결과 계산 ──────────────────────────────────────────────

export function calculateABTestResult(
  configId: string,
  impressionsA: number,
  impressionsB: number,
  metricsData: Array<{ metric: ABMetricKey; valueA: number; valueB: number }>
): ABTestResult {
  const metricResults = metricsData.map((m) =>
    compareMetric(m.metric, m.valueA, m.valueB, impressionsA, impressionsB)
  )

  // 전체 승자: 유의미한 메트릭 기준 다수결
  const significantResults = metricResults.filter((m) => m.significant)
  const aWins = significantResults.filter((m) => m.winner === "A").length
  const bWins = significantResults.filter((m) => m.winner === "B").length

  let overallWinner: ABTestResult["overallWinner"]
  if (significantResults.length === 0) {
    overallWinner = "inconclusive"
  } else if (aWins > bWins) {
    overallWinner = "A"
  } else if (bWins > aWins) {
    overallWinner = "B"
  } else {
    overallWinner = "inconclusive"
  }

  // 신뢰도: 유의미한 결과 비율
  const confidence =
    metricResults.length > 0 ? round(significantResults.length / metricResults.length) : 0

  return {
    configId,
    totalImpressions: { personaA: impressionsA, personaB: impressionsB },
    metricResults,
    overallWinner,
    confidence,
    completedAt: Date.now(),
  }
}

// ── 만료 체크 ───────────────────────────────────────────────────

export function isTestExpired(config: ABTestConfig): boolean {
  if (config.status !== "running" || !config.startedAt) return false
  const elapsed = Date.now() - config.startedAt
  const durationMs = config.testDurationDays * 24 * 60 * 60 * 1000
  return elapsed >= durationMs
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
