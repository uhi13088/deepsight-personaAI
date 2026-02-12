// ═══════════════════════════════════════════════════════════════
// 재검증 시스템 + 진화 전략
// T62-AC6: 분기별 재테스트, 등급 재분류, 우수 페르소나 Mutation
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ValidationGrade = "ACTIVE" | "STANDARD" | "LEGACY" | "DEPRECATED"

export interface RevalidationResult {
  personaId: string
  previousGrade: ValidationGrade
  newScore: number
  newGrade: ValidationGrade
  gradeChanged: boolean
  testedSampleCount: number
  validationVersion: number
  validationDate: Date
}

export interface RevalidationBatchResult {
  totalTested: number
  results: RevalidationResult[]
  gradeDistribution: Record<ValidationGrade, number>
  upgrades: number
  downgrades: number
  unchanged: number
  estimatedCostKRW: number
}

export interface MutationResult {
  sourcePersonaId: string
  mutatedVector: Record<string, number>
  mutationDeltas: Record<string, number>
  seed: number
}

export interface EvolutionBatchResult {
  topPersonas: Array<{ personaId: string; score: number }>
  mutations: MutationResult[]
  batchDate: Date
}

// ── 재검증: 등급 분류 ────────────────────────────────────────

export function classifyGrade(score: number): ValidationGrade {
  if (score >= 0.95) return "ACTIVE"
  if (score >= 0.85) return "STANDARD"
  if (score >= 0.8) return "LEGACY"
  return "DEPRECATED"
}

// ── 재검증: 단일 페르소나 ─────────────────────────────────────

export function revalidatePersona(
  personaId: string,
  previousGrade: ValidationGrade,
  testScore: number,
  sampleCount: number,
  validationVersion: number
): RevalidationResult {
  const newGrade = classifyGrade(testScore)
  return {
    personaId,
    previousGrade,
    newScore: Math.round(testScore * 100) / 100,
    newGrade,
    gradeChanged: previousGrade !== newGrade,
    testedSampleCount: sampleCount,
    validationVersion,
    validationDate: new Date(),
  }
}

// ── 재검증: 배치 실행 ─────────────────────────────────────────

export function runRevalidationBatch(
  personas: Array<{
    id: string
    currentGrade: ValidationGrade
  }>,
  scoreFn: (personaId: string) => number,
  sampleCount: number,
  validationVersion: number
): RevalidationBatchResult {
  const results: RevalidationResult[] = []
  const gradeDistribution: Record<ValidationGrade, number> = {
    ACTIVE: 0,
    STANDARD: 0,
    LEGACY: 0,
    DEPRECATED: 0,
  }
  let upgrades = 0
  let downgrades = 0
  let unchanged = 0

  const gradeOrder: ValidationGrade[] = ["ACTIVE", "STANDARD", "LEGACY", "DEPRECATED"]

  for (const p of personas) {
    const score = scoreFn(p.id)
    const result = revalidatePersona(p.id, p.currentGrade, score, sampleCount, validationVersion)
    results.push(result)

    gradeDistribution[result.newGrade]++

    if (result.gradeChanged) {
      const oldIdx = gradeOrder.indexOf(p.currentGrade)
      const newIdx = gradeOrder.indexOf(result.newGrade)
      if (newIdx < oldIdx) upgrades++
      else downgrades++
    } else {
      unchanged++
    }
  }

  // 비용: 7원/페르소나 (GPT-4o-mini 기준)
  const estimatedCostKRW = personas.length * 7

  return {
    totalTested: personas.length,
    results,
    gradeDistribution,
    upgrades,
    downgrades,
    unchanged,
    estimatedCostKRW,
  }
}

// ── 진화 전략: Mutation ──────────────────────────────────────

export function mutateVector(
  original: Record<string, number>,
  mutationRange: number = 0.1,
  seed?: number
): { mutated: Record<string, number>; deltas: Record<string, number> } {
  const dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"]
  const mutated: Record<string, number> = {}
  const deltas: Record<string, number> = {}

  // 결정적 PRNG (seed 기반) — 간단한 xorshift
  let s = seed ?? Math.floor(Math.random() * 2147483647)
  function nextRandom(): number {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return ((s >>> 0) / 4294967296) * 2 - 1 // -1~1 범위
  }

  for (const dim of dims) {
    const val = original[dim] ?? 0.5
    const delta = nextRandom() * mutationRange
    const newVal = Math.max(0, Math.min(1, val + delta))
    mutated[dim] = Math.round(newVal * 1000) / 1000
    deltas[dim] = Math.round(delta * 1000) / 1000
  }

  return { mutated, deltas }
}

// ── 진화 전략: 월말 배치 ──────────────────────────────────────

export function runEvolutionBatch(
  topPersonas: Array<{ personaId: string; score: number; vector: Record<string, number> }>,
  mutationsPerPersona: number = 5,
  mutationRange: number = 0.1
): EvolutionBatchResult {
  const mutations: MutationResult[] = []

  for (const persona of topPersonas) {
    for (let i = 0; i < mutationsPerPersona; i++) {
      const seed = hashCode(`${persona.personaId}-${i}`)
      const { mutated, deltas } = mutateVector(persona.vector, mutationRange, seed)
      mutations.push({
        sourcePersonaId: persona.personaId,
        mutatedVector: mutated,
        mutationDeltas: deltas,
        seed,
      })
    }
  }

  return {
    topPersonas: topPersonas.map((p) => ({ personaId: p.personaId, score: p.score })),
    mutations,
    batchDate: new Date(),
  }
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

// ── 재검증 비용 추정 ──────────────────────────────────────────

export function estimateRevalidationCost(personaCount: number): {
  costPerQuarter: number
  costPerYear: number
} {
  const costPerPersona = 7 // ₩7 per persona
  const costPerQuarter = personaCount * costPerPersona
  return {
    costPerQuarter,
    costPerYear: costPerQuarter * 4,
  }
}
