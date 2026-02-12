// ═══════════════════════════════════════════════════════════════
// A/B 테스트 가드레일
// T57-AC4: 안전 장치, 자동 롤백, 유의미성 판정
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ABTestType = "tier" | "weight" | "threshold" | "persona" | "layer"

export interface MatchingABTestConfig {
  id: string
  name: string
  type: ABTestType
  description: string
  controlLabel: string
  treatmentLabel: string
  trafficSplit: [number, number] // [control%, treatment%]
  durationDays: number
  metrics: string[]
  status: "draft" | "running" | "paused" | "completed" | "rolled_back"
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface GuardrailConfig {
  maxSatisfactionDrop: number // 기본 0.2 (20%)
  maxErrorRateSpike: number // 기본 2.0 (2배)
  minSampleSize: number // 최소 샘플 수
  significanceLevel: number // p-value 기준 (0.05)
  checkIntervalHours: number // 체크 주기
}

export interface DimensionMetric {
  dimension: string
  controlValue: number
  treatmentValue: number
  diff: number
  pValue: number
  significant: boolean
}

export interface GuardrailCheckResult {
  safe: boolean
  violations: GuardrailViolation[]
  checkedAt: number
}

export interface GuardrailViolation {
  type: "satisfaction_drop" | "error_spike" | "quality_degradation"
  severity: "warning" | "critical"
  message: string
  value: number
  threshold: number
}

export interface ABTestMetrics {
  controlSamples: number
  treatmentSamples: number
  controlSatisfaction: number
  treatmentSatisfaction: number
  controlErrorRate: number
  treatmentErrorRate: number
  controlCtr: number
  treatmentCtr: number
  dimensionMetrics: DimensionMetric[]
}

export interface ABTestVerdict {
  winner: "control" | "treatment" | "inconclusive"
  confidence: number // 0~1
  significantDimensions: number
  totalDimensions: number
  recommendation: string
}

// ── 기본 설정 ────────────────────────────────────────────────

export const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  maxSatisfactionDrop: 0.2,
  maxErrorRateSpike: 2.0,
  minSampleSize: 30,
  significanceLevel: 0.05,
  checkIntervalHours: 6,
}

// ── A/B 테스트 설정 생성 ─────────────────────────────────────

export function createMatchingABTest(
  name: string,
  type: ABTestType,
  description: string,
  controlLabel: string,
  treatmentLabel: string,
  trafficSplit: [number, number] = [50, 50],
  durationDays: number = 14,
  metrics: string[] = ["satisfaction", "ctr", "engagement"]
): MatchingABTestConfig {
  if (trafficSplit[0] + trafficSplit[1] !== 100) {
    throw new Error(`트래픽 분배 합이 100이 아닙니다: ${trafficSplit[0]} + ${trafficSplit[1]}`)
  }

  return {
    id: `mab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    description,
    controlLabel,
    treatmentLabel,
    trafficSplit,
    durationDays,
    metrics,
    status: "draft",
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  }
}

// ── 상태 전환 ────────────────────────────────────────────────

export function startMatchingABTest(config: MatchingABTestConfig): MatchingABTestConfig {
  if (config.status !== "draft" && config.status !== "paused") {
    throw new Error(`'${config.status}' 상태에서 시작할 수 없습니다`)
  }
  return { ...config, status: "running", startedAt: config.startedAt ?? Date.now() }
}

export function pauseMatchingABTest(config: MatchingABTestConfig): MatchingABTestConfig {
  if (config.status !== "running") throw new Error("실행 중이 아닙니다")
  return { ...config, status: "paused" }
}

export function completeMatchingABTest(config: MatchingABTestConfig): MatchingABTestConfig {
  if (config.status !== "running") throw new Error("실행 중이 아닙니다")
  return { ...config, status: "completed", completedAt: Date.now() }
}

export function rollbackMatchingABTest(config: MatchingABTestConfig): MatchingABTestConfig {
  if (config.status !== "running" && config.status !== "paused") {
    throw new Error(`'${config.status}' 상태에서 롤백할 수 없습니다`)
  }
  return { ...config, status: "rolled_back", completedAt: Date.now() }
}

// ── 가드레일 체크 ────────────────────────────────────────────

export function checkGuardrails(
  metrics: ABTestMetrics,
  guardrails: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG
): GuardrailCheckResult {
  const violations: GuardrailViolation[] = []

  // 1. 만족도 하락 체크
  if (metrics.controlSatisfaction > 0) {
    const drop =
      (metrics.controlSatisfaction - metrics.treatmentSatisfaction) / metrics.controlSatisfaction
    if (drop >= guardrails.maxSatisfactionDrop) {
      violations.push({
        type: "satisfaction_drop",
        severity: drop >= guardrails.maxSatisfactionDrop * 1.5 ? "critical" : "warning",
        message: `만족도 ${round(drop * 100)}% 하락 (기준: ${guardrails.maxSatisfactionDrop * 100}%)`,
        value: round(drop),
        threshold: guardrails.maxSatisfactionDrop,
      })
    }
  }

  // 2. 에러율 급증 체크
  if (metrics.controlErrorRate > 0) {
    const spike = metrics.treatmentErrorRate / metrics.controlErrorRate
    if (spike >= guardrails.maxErrorRateSpike) {
      violations.push({
        type: "error_spike",
        severity: spike >= guardrails.maxErrorRateSpike * 2 ? "critical" : "warning",
        message: `에러율 ${round(spike)}배 증가 (기준: ${guardrails.maxErrorRateSpike}배)`,
        value: round(spike),
        threshold: guardrails.maxErrorRateSpike,
      })
    }
  }

  // 3. 샘플 수 부족 시 결론 보류 (violation은 아님)

  return {
    safe: violations.filter((v) => v.severity === "critical").length === 0,
    violations,
    checkedAt: Date.now(),
  }
}

// ── 차원별 메트릭 비교 ───────────────────────────────────────

export function compareDimensionMetrics(
  dimensionMetrics: DimensionMetric[],
  significanceLevel: number = 0.05
): DimensionMetric[] {
  return dimensionMetrics.map((dm) => ({
    ...dm,
    diff: round(dm.treatmentValue - dm.controlValue),
    significant: dm.pValue < significanceLevel,
  }))
}

// ── 종합 판정 ────────────────────────────────────────────────

export function evaluateABTestResult(
  metrics: ABTestMetrics,
  guardrails: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG
): ABTestVerdict {
  const guardrailCheck = checkGuardrails(metrics, guardrails)

  // 가드레일 위반 시 control 유지
  if (!guardrailCheck.safe) {
    return {
      winner: "control",
      confidence: 0.9,
      significantDimensions: 0,
      totalDimensions: metrics.dimensionMetrics.length,
      recommendation: "가드레일 위반으로 기존 알고리즘 유지를 권장합니다",
    }
  }

  // 샘플 수 부족
  if (
    metrics.controlSamples < guardrails.minSampleSize ||
    metrics.treatmentSamples < guardrails.minSampleSize
  ) {
    return {
      winner: "inconclusive",
      confidence: 0,
      significantDimensions: 0,
      totalDimensions: metrics.dimensionMetrics.length,
      recommendation: "샘플 수가 부족합니다. 테스트 기간을 연장하세요",
    }
  }

  // 차원별 유의미성 분석
  const significantDims = metrics.dimensionMetrics.filter(
    (dm) => dm.pValue < guardrails.significanceLevel
  )
  const treatmentWins = significantDims.filter((dm) => dm.treatmentValue > dm.controlValue)
  const controlWins = significantDims.filter((dm) => dm.controlValue > dm.treatmentValue)

  // CTR + 만족도 종합
  const treatmentBetter =
    metrics.treatmentCtr > metrics.controlCtr &&
    metrics.treatmentSatisfaction >= metrics.controlSatisfaction

  const controlBetter =
    metrics.controlCtr > metrics.treatmentCtr &&
    metrics.controlSatisfaction >= metrics.treatmentSatisfaction

  let winner: ABTestVerdict["winner"]
  let recommendation: string

  if (treatmentBetter && treatmentWins.length >= controlWins.length) {
    winner = "treatment"
    recommendation = "신규 알고리즘이 전반적으로 우수합니다. 전체 적용을 권장합니다"
  } else if (controlBetter) {
    winner = "control"
    recommendation = "기존 알고리즘이 더 나은 성과를 보입니다. 현행 유지를 권장합니다"
  } else {
    winner = "inconclusive"
    recommendation = "유의미한 차이가 없습니다. 추가 분석 또는 테스트 연장을 고려하세요"
  }

  const confidence = round(
    significantDims.length > 0 ? significantDims.length / metrics.dimensionMetrics.length : 0
  )

  return {
    winner,
    confidence,
    significantDimensions: significantDims.length,
    totalDimensions: metrics.dimensionMetrics.length,
    recommendation,
  }
}

// ── 자동 롤백 판단 ───────────────────────────────────────────

export function shouldAutoRollback(checkResult: GuardrailCheckResult): boolean {
  return checkResult.violations.some((v) => v.severity === "critical")
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
