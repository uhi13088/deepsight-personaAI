// ═══════════════════════════════════════════════════════════════
// Persona Integrity Score (PIS)
// T54-AC2: CR(0.35) + SC(0.35) + CS(0.30)
// 설계된 벡터와 실제 행동 사이의 정합성 측정
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface IntegrityScoreResult {
  consistencyRate: number // CR: 벡터-응답 일관성 (0~1)
  stabilityCoefficient: number // SC: 행동 안정성 (0~1)
  coherenceScore: number // CS: 내적 일관성 (0~1)
  pis: number // PIS = CR*0.35 + SC*0.35 + CS*0.30
  grade: "A" | "B" | "C" | "D" | "F"
  details: IntegrityDetails
}

export interface IntegrityDetails {
  crBreakdown: CRBreakdown
  scBreakdown: SCBreakdown
  csBreakdown: CSBreakdown
}

export interface CRBreakdown {
  l1Consistency: number // L1 벡터-응답 일관성
  l2Consistency: number // L2 벡터-응답 일관성
  l3Consistency: number // L3 벡터-응답 일관성
  dimensionScores: Record<string, number>
}

export interface SCBreakdown {
  responseVariance: number // 응답 분산 (낮을수록 안정)
  temporalStability: number // 시간 경과 안정성
  crossContextStability: number // 맥락 간 안정성
}

export interface CSBreakdown {
  l1l2Coherence: number // L1↔L2 내적 일관성
  l1l3Coherence: number // L1↔L3 내적 일관성
  l2l3Coherence: number // L2↔L3 내적 일관성
  paradoxAlignment: number // 설계된 모순 vs 실제 모순 정합
}

// ── CR: Consistency Rate ────────────────────────────────────────

export function calculateConsistencyRate(
  dimensionScores: Record<string, { designed: number; inferred: number; delta: number }>
): CRBreakdown {
  const entries = Object.entries(dimensionScores)
  const l1Dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"]
  const l2Dims = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
  const l3Dims = ["lack", "moralCompass", "volatility", "growthArc"]

  const calcLayerConsistency = (dims: string[]): number => {
    const layerEntries = entries.filter(([dim]) => dims.includes(dim))
    if (layerEntries.length === 0) return 1
    const avgDelta = layerEntries.reduce((sum, [, s]) => sum + s.delta, 0) / layerEntries.length
    return round(1 - avgDelta)
  }

  const perDim: Record<string, number> = {}
  for (const [dim, score] of entries) {
    perDim[dim] = round(1 - score.delta)
  }

  return {
    l1Consistency: calcLayerConsistency(l1Dims),
    l2Consistency: calcLayerConsistency(l2Dims),
    l3Consistency: calcLayerConsistency(l3Dims),
    dimensionScores: perDim,
  }
}

export function crToScore(breakdown: CRBreakdown): number {
  // 가중 평균: L1(0.45) + L2(0.30) + L3(0.25)
  return round(
    breakdown.l1Consistency * 0.45 + breakdown.l2Consistency * 0.3 + breakdown.l3Consistency * 0.25
  )
}

// ── SC: Stability Coefficient ───────────────────────────────────

export interface ResponseSample {
  dimensionScores: Record<string, number> // dimension → inferred score
  timestamp: number
  context: string // 맥락 식별자
}

export function calculateStabilityCoefficient(samples: ResponseSample[]): SCBreakdown {
  if (samples.length < 2) {
    return { responseVariance: 1, temporalStability: 1, crossContextStability: 1 }
  }

  // 1) Response Variance: 각 차원별 점수 분산의 평균
  const dimensions = Object.keys(samples[0].dimensionScores)
  const variances: number[] = []

  for (const dim of dimensions) {
    const values = samples.map((s) => s.dimensionScores[dim] ?? 0.5)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    variances.push(variance)
  }

  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length
  // 분산 0→1.0, 분산 0.25→0.0 (최대 분산 0.25 for 0~1 range)
  const responseVariance = round(Math.max(0, 1 - avgVariance * 4))

  // 2) Temporal Stability: 시간순 인접 샘플 간 변화량
  const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp)
  const drifts: number[] = []

  for (let i = 1; i < sorted.length; i++) {
    let totalDelta = 0
    let dimCount = 0
    for (const dim of dimensions) {
      const prev = sorted[i - 1].dimensionScores[dim] ?? 0.5
      const curr = sorted[i].dimensionScores[dim] ?? 0.5
      totalDelta += Math.abs(curr - prev)
      dimCount++
    }
    drifts.push(dimCount > 0 ? totalDelta / dimCount : 0)
  }

  const avgDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length
  const temporalStability = round(Math.max(0, 1 - avgDrift * 2))

  // 3) Cross-context Stability: 서로 다른 맥락 간 일관성
  const contexts = [...new Set(samples.map((s) => s.context))]
  if (contexts.length < 2) {
    return { responseVariance, temporalStability, crossContextStability: 1 }
  }

  const contextMeans: Record<string, Record<string, number>> = {}
  for (const ctx of contexts) {
    const ctxSamples = samples.filter((s) => s.context === ctx)
    contextMeans[ctx] = {}
    for (const dim of dimensions) {
      const values = ctxSamples.map((s) => s.dimensionScores[dim] ?? 0.5)
      contextMeans[ctx][dim] = values.reduce((a, b) => a + b, 0) / values.length
    }
  }

  const contextDiffs: number[] = []
  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      let diff = 0
      for (const dim of dimensions) {
        diff += Math.abs(
          (contextMeans[contexts[i]][dim] ?? 0.5) - (contextMeans[contexts[j]][dim] ?? 0.5)
        )
      }
      contextDiffs.push(diff / dimensions.length)
    }
  }

  const avgContextDiff = contextDiffs.reduce((a, b) => a + b, 0) / contextDiffs.length
  const crossContextStability = round(Math.max(0, 1 - avgContextDiff * 2))

  return { responseVariance, temporalStability, crossContextStability }
}

export function scToScore(breakdown: SCBreakdown): number {
  return round(
    breakdown.responseVariance * 0.35 +
      breakdown.temporalStability * 0.35 +
      breakdown.crossContextStability * 0.3
  )
}

// ── CS: Coherence Score ─────────────────────────────────────────

export function calculateCoherenceScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  designedParadox?: { l1l2: number; l1l3: number; l2l3: number }
): CSBreakdown {
  // L1↔L2: 기대되는 상관관계
  const l1l2Pairs: [number, number][] = [
    [l1.stance, 1 - l2.agreeableness], // 비판적 ↔ 비협조
    [l1.depth, l2.conscientiousness], // 심층 ↔ 원칙
    [l1.sociability, l2.extraversion], // 사교 ↔ 외향
    [l1.taste, l2.openness], // 실험 ↔ 개방
  ]
  const l1l2Coherence = calculatePairCoherence(l1l2Pairs)

  // L1↔L3: 기대되는 상관관계
  const l1l3Pairs: [number, number][] = [
    [l1.depth, l3.growthArc], // 심층 ↔ 성장
    [l1.stance, l3.moralCompass], // 비판 ↔ 도덕
    [l1.purpose, 1 - l3.lack], // 의미 ↔ 충족
  ]
  const l1l3Coherence = calculatePairCoherence(l1l3Pairs)

  // L2↔L3: 기대되는 상관관계
  const l2l3Pairs: [number, number][] = [
    [l2.neuroticism, l3.volatility], // 불안 ↔ 폭발
    [l2.openness, l3.growthArc], // 개방 ↔ 성장
    [l2.conscientiousness, l3.moralCompass], // 원칙 ↔ 도덕
  ]
  const l2l3Coherence = calculatePairCoherence(l2l3Pairs)

  // Paradox Alignment: 설계 의도와 실제 모순 비교
  let paradoxAlignment = 1.0
  if (designedParadox) {
    const actualL1L2 = calculateLayerDistance(l1l2Pairs)
    const actualL1L3 = calculateLayerDistance(l1l3Pairs)
    const actualL2L3 = calculateLayerDistance(l2l3Pairs)

    const l1l2Diff = Math.abs(designedParadox.l1l2 - actualL1L2)
    const l1l3Diff = Math.abs(designedParadox.l1l3 - actualL1L3)
    const l2l3Diff = Math.abs(designedParadox.l2l3 - actualL2L3)

    paradoxAlignment = round(1 - (l1l2Diff + l1l3Diff + l2l3Diff) / 3)
  }

  return {
    l1l2Coherence: round(l1l2Coherence),
    l1l3Coherence: round(l1l3Coherence),
    l2l3Coherence: round(l2l3Coherence),
    paradoxAlignment: round(paradoxAlignment),
  }
}

function calculatePairCoherence(pairs: [number, number][]): number {
  if (pairs.length === 0) return 1
  const diffs = pairs.map(([a, b]) => Math.abs(a - b))
  const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length
  // diff 0 → coherence 1, diff 0.5+ → coherence 0
  return Math.max(0, 1 - avgDiff * 2)
}

function calculateLayerDistance(pairs: [number, number][]): number {
  if (pairs.length === 0) return 0
  const diffs = pairs.map(([a, b]) => Math.abs(a - b))
  return diffs.reduce((sum, d) => sum + d, 0) / diffs.length
}

export function csToScore(breakdown: CSBreakdown): number {
  return round(
    breakdown.l1l2Coherence * 0.3 +
      breakdown.l1l3Coherence * 0.25 +
      breakdown.l2l3Coherence * 0.25 +
      breakdown.paradoxAlignment * 0.2
  )
}

// ── PIS: 종합 점수 ──────────────────────────────────────────────

export function calculatePIS(
  cr: number,
  sc: number,
  cs: number
): { pis: number; grade: IntegrityScoreResult["grade"] } {
  const pis = round(cr * 0.35 + sc * 0.35 + cs * 0.3)

  let grade: IntegrityScoreResult["grade"]
  if (pis >= 0.9) grade = "A"
  else if (pis >= 0.8) grade = "B"
  else if (pis >= 0.7) grade = "C"
  else if (pis >= 0.6) grade = "D"
  else grade = "F"

  return { pis, grade }
}

// ── 전체 평가 ────────────────────────────────────────────────────

export function evaluateIntegrity(
  dimensionScores: Record<string, { designed: number; inferred: number; delta: number }>,
  samples: ResponseSample[],
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  designedParadox?: { l1l2: number; l1l3: number; l2l3: number }
): IntegrityScoreResult {
  const crBreakdown = calculateConsistencyRate(dimensionScores)
  const cr = crToScore(crBreakdown)

  const scBreakdown = calculateStabilityCoefficient(samples)
  const sc = scToScore(scBreakdown)

  const csBreakdown = calculateCoherenceScore(l1, l2, l3, designedParadox)
  const cs = csToScore(csBreakdown)

  const { pis, grade } = calculatePIS(cr, sc, cs)

  return {
    consistencyRate: cr,
    stabilityCoefficient: sc,
    coherenceScore: cs,
    pis,
    grade,
    details: { crBreakdown, scBreakdown, csBreakdown },
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
