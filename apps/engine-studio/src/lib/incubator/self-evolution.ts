// ═══════════════════════════════════════════════════════════════
// 자가발전 시스템
// T62-AC2: 인터랙션 로그 기반 벡터 미세 조정
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export interface InteractionMetrics {
  personaId: string
  sessionCount: number
  totalTurns: number
  avgPressure: number
  peakPressure: number
  avgIntegrity: number
  avgVoiceDrift: number
  avgContextRecall: number
}

export interface VectorDistribution {
  dimension: string
  mean: number
  stdDev: number
  min: number
  max: number
}

export interface CoverageGap {
  region: string // "high-depth-low-scope" 등
  userDensity: number // 해당 영역의 유저 밀도
  personaDensity: number // 해당 영역의 페르소나 밀도
  gapScore: number // userDensity - personaDensity
}

export interface WeeklyStrategyUpdate {
  analysisDate: Date
  userVectorDistribution: VectorDistribution[]
  personaCoverage: VectorDistribution[]
  gaps: CoverageGap[]
  recommendedStrategy: {
    userDriven: number
    exploration: number
    gapFilling: number
  }
  archetypeWeights: Record<string, number>
}

export interface VectorAdjustment {
  personaId: string
  dimension: string
  originalValue: number
  adjustment: number // ±0.05~0.1
  newValue: number
  reason: string
}

// ── 주간 전략 업데이트 ─────────────────────────────────────────

export function analyzeUserDistribution(
  userVectors: Array<Record<string, number>>
): VectorDistribution[] {
  const dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"]
  const distributions: VectorDistribution[] = []

  for (const dim of dims) {
    const values = userVectors.map((v) => v[dim] ?? 0.5)
    if (values.length === 0) {
      distributions.push({ dimension: dim, mean: 0.5, stdDev: 0, min: 0.5, max: 0.5 })
      continue
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    distributions.push({
      dimension: dim,
      mean: Math.round(mean * 1000) / 1000,
      stdDev: Math.round(stdDev * 1000) / 1000,
      min: Math.min(...values),
      max: Math.max(...values),
    })
  }

  return distributions
}

export function findCoverageGaps(
  userDist: VectorDistribution[],
  personaDist: VectorDistribution[]
): CoverageGap[] {
  const gaps: CoverageGap[] = []
  const regions = [
    { region: "high-depth", test: (d: string, v: number) => d === "depth" && v > 0.7 },
    { region: "low-depth", test: (d: string, v: number) => d === "depth" && v < 0.3 },
    { region: "high-stance", test: (d: string, v: number) => d === "stance" && v > 0.7 },
    { region: "low-stance", test: (d: string, v: number) => d === "stance" && v < 0.3 },
    { region: "high-taste", test: (d: string, v: number) => d === "taste" && v > 0.7 },
    { region: "low-taste", test: (d: string, v: number) => d === "taste" && v < 0.3 },
    { region: "high-sociability", test: (d: string, v: number) => d === "sociability" && v > 0.7 },
    { region: "low-sociability", test: (d: string, v: number) => d === "sociability" && v < 0.3 },
  ]

  for (const r of regions) {
    const userDim = userDist.find((d) => r.test(d.dimension, d.mean))
    const personaDim = personaDist.find((d) => r.test(d.dimension, d.mean))

    const userDensity = userDim ? 1 - Math.abs(userDim.mean - 0.5) * 2 : 0
    const personaDensity = personaDim ? 1 - Math.abs(personaDim.mean - 0.5) * 2 : 0
    const gapScore = Math.max(0, userDensity - personaDensity)

    if (gapScore > 0.1) {
      gaps.push({
        region: r.region,
        userDensity,
        personaDensity,
        gapScore: Math.round(gapScore * 100) / 100,
      })
    }
  }

  return gaps.sort((a, b) => b.gapScore - a.gapScore)
}

export function generateWeeklyStrategy(
  userVectors: Array<Record<string, number>>,
  personaVectors: Array<Record<string, number>>
): WeeklyStrategyUpdate {
  const userDist = analyzeUserDistribution(userVectors)
  const personaDist = analyzeUserDistribution(personaVectors)
  const gaps = findCoverageGaps(userDist, personaDist)

  // GAP이 많으면 gap_filling 가중치 증가
  const hasSignificantGaps = gaps.length > 3
  const recommendedStrategy = hasSignificantGaps
    ? { userDriven: 0.4, exploration: 0.15, gapFilling: 0.45 }
    : { userDriven: 0.6, exploration: 0.2, gapFilling: 0.2 }

  return {
    analysisDate: new Date(),
    userVectorDistribution: userDist,
    personaCoverage: personaDist,
    gaps,
    recommendedStrategy,
    archetypeWeights: {},
  }
}

// ── 벡터 미세 조정 ────────────────────────────────────────────

export function calculateVectorAdjustments(
  personaId: string,
  metrics: InteractionMetrics,
  currentVector: Record<string, number>
): VectorAdjustment[] {
  const adjustments: VectorAdjustment[] = []
  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  // 높은 pressure → stance 강화 (압박 대응 향상)
  if (metrics.avgPressure > 0.7) {
    const adj = 0.05
    adjustments.push({
      personaId,
      dimension: "stance",
      originalValue: currentVector.stance ?? 0.5,
      adjustment: adj,
      newValue: clamp((currentVector.stance ?? 0.5) + adj),
      reason: "높은 평균 압력 대응",
    })
  }

  // 낮은 일관성 → depth 미세 조정
  if (metrics.avgIntegrity < 0.7) {
    const adj = 0.03
    adjustments.push({
      personaId,
      dimension: "depth",
      originalValue: currentVector.depth ?? 0.5,
      adjustment: adj,
      newValue: clamp((currentVector.depth ?? 0.5) + adj),
      reason: "일관성 점수 개선",
    })
  }

  // 높은 voice drift → sociability 복귀
  if (metrics.avgVoiceDrift > 0.2) {
    const drift = metrics.avgVoiceDrift
    const adj = -drift * 0.3 // 드리프트의 30%만큼 복귀
    adjustments.push({
      personaId,
      dimension: "sociability",
      originalValue: currentVector.sociability ?? 0.5,
      adjustment: Math.round(adj * 1000) / 1000,
      newValue: clamp((currentVector.sociability ?? 0.5) + adj),
      reason: "보이스 드리프트 보정",
    })
  }

  return adjustments
}

// ── 비논리 조합 판정 ──────────────────────────────────────────

export interface IlLogicalCombination {
  dimensions: [string, string]
  values: [number, number]
  reason: string
}

export function detectIllogicalCombinations(
  vector: Record<string, number>
): IlLogicalCombination[] {
  const issues: IlLogicalCombination[] = []

  // Depth 0.2 미만 + Scope 0.9 이상 → 가볍게 보면서 디테일까지 (모순)
  if ((vector.depth ?? 0.5) < 0.2 && (vector.scope ?? 0.5) > 0.9) {
    issues.push({
      dimensions: ["depth", "scope"],
      values: [vector.depth ?? 0.5, vector.scope ?? 0.5],
      reason: "가볍게 보면서 디테일까지 (모순)",
    })
  }

  // Lens 0.9 이상 + Purpose 0.1 미만 → 논리적인데 재미만 (어색)
  if ((vector.lens ?? 0.5) > 0.9 && (vector.purpose ?? 0.5) < 0.1) {
    issues.push({
      dimensions: ["lens", "purpose"],
      values: [vector.lens ?? 0.5, vector.purpose ?? 0.5],
      reason: "논리적인데 재미만 추구 (어색)",
    })
  }

  // Sociability 0.1 미만 + Scope 0.9 이상 → 혼자인데 디테일 공유 (모순)
  if ((vector.sociability ?? 0.5) < 0.1 && (vector.scope ?? 0.5) > 0.9) {
    issues.push({
      dimensions: ["sociability", "scope"],
      values: [vector.sociability ?? 0.5, vector.scope ?? 0.5],
      reason: "비사교적인데 디테일 공유 (모순)",
    })
  }

  return issues
}
