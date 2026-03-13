// ═══════════════════════════════════════════════════════════════
// Emotional Contagion — 감정 전염 시스템
// T156: 페르소나 간 분위기(atmosphere) 전파 — 정보 아닌 감정만
// ═══════════════════════════════════════════════════════════════

// ── 타입 ──────────────────────────────────────────────────────

/** 감정 전염에 사용하는 페르소나 상태 (필수 필드만) */
export interface ContagionPersonaState {
  personaId: string
  mood: number // 0.0~1.0
  energy: number // 0.0~1.0
  socialBattery: number // 0.0~1.0
  paradoxTension: number // 0.0~1.0
}

/** 관계 엣지 (소셜 그래프) */
export interface ContagionEdge {
  sourceId: string
  targetId: string
  warmth: number // 0.0~1.0: 친밀도
  tension: number // 0.0~1.0: 갈등
  frequency: number // 0.0~1.0: 상호작용 빈도
  /** 최근 인터랙션 시각 (없으면 전파 스킵) */
  lastInteractionAt: Date | null
}

/** 성격 기반 감수성 파라미터 */
export interface ContagionSensitivity {
  /** 감정 민감도 (0.5~1.5) — neuroticism 기반 */
  moodSensitivity: number
  /** 사회적 개방성 (0.0~1.0) — extraversion 기반 */
  socialOpenness: number
  /** 동조성 (0.0~1.0) — agreeableness 기반 */
  agreeableness: number
}

/** 전파 설정 */
export interface ContagionConfig {
  /** 전파 강도 계수 (기본 0.15) */
  baseIntensity: number
  /** 허브 증폭 배율 (기본 1.3) */
  hubAmplifier: number
  /** 클러스터 증폭 배율 (기본 1.2) */
  clusterAmplifier: number
  /** 최대 mood 변화량 (기본 0.15) */
  maxDelta: number
  /** 고립 노드 감쇠 (기본 0.3) */
  isolateDamping: number
  /** 고긴장 저항 임계값 (기본 0.7) */
  tensionResistanceThreshold: number
  /** 최소 에너지 (이하면 전파 수신 안 함) */
  minEnergyForReception: number
  /** 최소 소셜배터리 (이하면 전파 수신 안 함) */
  minSocialBatteryForReception: number
}

/** 노드 위상 정보 */
export interface NodeTopology {
  personaId: string
  /** 총 연결 수 */
  totalDegree: number
  /** 클러스터링 계수 (0.0~1.0) */
  clusteringCoefficient: number
  /** 허브 여부 */
  isHub: boolean
}

/** 단일 전파 결과 (source → target) */
export interface ContagionEffect {
  sourceId: string
  targetId: string
  /** mood 변화량 (-maxDelta ~ +maxDelta) */
  moodDelta: number
  /** 전파 강도 (디버그용) */
  rawInfluence: number
  /** 저항 계수 (디버그용) */
  resistance: number
  /** 최종 가중치 (warmth × frequency × topology) */
  weight: number
}

/** 페르소나별 최종 전파 결과 */
export interface PersonaContagionResult {
  personaId: string
  /** 수신한 총 mood 변화량 */
  totalMoodDelta: number
  /** 전파 기여 소스 수 */
  sourceCount: number
  /** 가장 영향력 큰 소스 */
  dominantSource: string | null
  /** 적용 후 예상 mood */
  projectedMood: number
}

/** 전체 전파 라운드 결과 */
export interface ContagionRoundResult {
  /** 타임스탬프 */
  timestamp: number
  /** 전체 페르소나 결과 */
  personaResults: PersonaContagionResult[]
  /** 개별 전파 효과 (디버그용) */
  effects: ContagionEffect[]
  /** 전파 전 평균 mood */
  averageMoodBefore: number
  /** 전파 후 평균 mood */
  averageMoodAfter: number
  /** mood 분산 변화 */
  moodVarianceBefore: number
  moodVarianceAfter: number
  /** 영향 받은 페르소나 수 */
  affectedCount: number
}

// ── 상수 ──────────────────────────────────────────────────────

/** 기본 전파 설정 */
export const DEFAULT_CONTAGION_CONFIG: ContagionConfig = {
  baseIntensity: 0.15,
  hubAmplifier: 1.3,
  clusterAmplifier: 1.2,
  maxDelta: 0.15,
  isolateDamping: 0.3,
  tensionResistanceThreshold: 0.7,
  minEnergyForReception: 0.2,
  minSocialBatteryForReception: 0.1,
} as const

/** 전파 허용 최대 인터랙션 경과 일수 (이 기간 내 인터랙션이 없으면 전파 스킵) */
export const CONTAGION_INTERACTION_WINDOW_DAYS = 7

/** 관계 가중치 비율 */
export const RELATIONSHIP_WEIGHTS = {
  /** warmth 기여도 */
  warmth: 0.5,
  /** frequency 기여도 */
  frequency: 0.3,
  /** (1-tension) 기여도 */
  inverseTension: 0.2,
} as const

// ── 핵심 계산 함수 ──────────────────────────────────────────

/** 관계 기반 전파 가중치 계산 */
export function computeRelationshipWeight(edge: ContagionEdge): number {
  const w = RELATIONSHIP_WEIGHTS
  const weight =
    w.warmth * edge.warmth + w.frequency * edge.frequency + w.inverseTension * (1 - edge.tension)

  return Math.max(0, Math.min(1, weight))
}

/** 수신자의 저항 계수 계산 (0 = 완전 수용, 1 = 완전 차단) */
export function computeResistance(
  receiver: ContagionPersonaState,
  sensitivity: ContagionSensitivity,
  config: ContagionConfig
): number {
  // 높은 paradoxTension → 방어적 → 수신 저항 증가
  const tensionResistance =
    receiver.paradoxTension >= config.tensionResistanceThreshold
      ? 0.5 + (receiver.paradoxTension - config.tensionResistanceThreshold) * 1.5
      : receiver.paradoxTension * 0.3

  // 낮은 agreeableness → 동조하지 않음 → 저항 증가
  const agreeablenessResistance = (1 - sensitivity.agreeableness) * 0.3

  // 낮은 socialOpenness → 사회적 영향 덜 받음
  const socialResistance = (1 - sensitivity.socialOpenness) * 0.2

  const totalResistance = tensionResistance + agreeablenessResistance + socialResistance
  return Math.max(0, Math.min(1, totalResistance))
}

/** 엣지에 최근 인터랙션이 있는지 확인 (windowDays 이내) */
export function hasRecentInteraction(
  edge: ContagionEdge,
  now: Date = new Date(),
  windowDays: number = CONTAGION_INTERACTION_WINDOW_DAYS
): boolean {
  if (!edge.lastInteractionAt) return false
  const diffMs = now.getTime() - edge.lastInteractionAt.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= windowDays
}

/** 수신자가 전파 수신 가능한 상태인지 확인 */
export function canReceiveContagion(
  receiver: ContagionPersonaState,
  config: ContagionConfig
): boolean {
  return (
    receiver.energy >= config.minEnergyForReception &&
    receiver.socialBattery >= config.minSocialBatteryForReception
  )
}

/** 소스 → 타겟 단일 전파 효과 계산 */
export function computeSingleEffect(params: {
  source: ContagionPersonaState
  target: ContagionPersonaState
  edge: ContagionEdge
  targetSensitivity: ContagionSensitivity
  sourceTopology: NodeTopology
  targetTopology: NodeTopology
  config: ContagionConfig
}): ContagionEffect {
  const { source, target, edge, targetSensitivity, sourceTopology, targetTopology, config } = params

  // 1. 관계 기반 가중치
  const relWeight = computeRelationshipWeight(edge)

  // 2. 소스 위상 증폭 (허브는 더 강하게 전파)
  const sourceAmp = sourceTopology.isHub ? config.hubAmplifier : 1.0

  // 3. 타겟 클러스터 증폭 (밀접한 그룹 내 전파 강화)
  const clusterAmp =
    targetTopology.clusteringCoefficient > 0.5
      ? 1 + (targetTopology.clusteringCoefficient - 0.5) * (config.clusterAmplifier - 1) * 2
      : 1.0

  // 4. 고립 노드 감쇠
  const isolateDamp = targetTopology.totalDegree <= 1 ? config.isolateDamping : 1.0

  // 5. mood 차이 (source mood - target mood)
  const moodGap = source.mood - target.mood

  // 6. 원천 감정의 영향력 = |moodGap| × baseIntensity × 관계 × 위상
  const rawInfluence =
    moodGap * config.baseIntensity * relWeight * sourceAmp * clusterAmp * isolateDamp

  // 7. 수신자 저항
  const resistance = computeResistance(target, targetSensitivity, config)

  // 8. 감수성 적용 (moodSensitivity 반영)
  const sensitivityFactor = targetSensitivity.moodSensitivity

  // 9. 최종 delta = rawInfluence × (1 - resistance) × sensitivity
  const moodDelta = rawInfluence * (1 - resistance) * sensitivityFactor

  // 10. 최대 delta 제한
  const clampedDelta = Math.max(-config.maxDelta, Math.min(config.maxDelta, moodDelta))

  return {
    sourceId: source.personaId,
    targetId: target.personaId,
    moodDelta: Math.round(clampedDelta * 10000) / 10000,
    rawInfluence: Math.round(rawInfluence * 10000) / 10000,
    resistance: Math.round(resistance * 10000) / 10000,
    weight: Math.round(relWeight * 10000) / 10000,
  }
}

// ── 전체 전파 라운드 ────────────────────────────────────────

/** 모든 페르소나에 대한 감정 전파 1라운드 실행 */
export function runContagionRound(params: {
  personas: ContagionPersonaState[]
  edges: ContagionEdge[]
  sensitivities: Map<string, ContagionSensitivity>
  topologies: Map<string, NodeTopology>
  config?: ContagionConfig
}): ContagionRoundResult {
  const config = params.config ?? DEFAULT_CONTAGION_CONFIG
  const timestamp = Date.now()

  const personaMap = new Map<string, ContagionPersonaState>()
  for (const p of params.personas) {
    personaMap.set(p.personaId, p)
  }

  // 전파 전 통계
  const moods = params.personas.map((p) => p.mood)
  const averageMoodBefore = computeAverage(moods)
  const moodVarianceBefore = computeVariance(moods)

  // 수신자별 effects 수집
  const effectsByTarget = new Map<string, ContagionEffect[]>()
  const allEffects: ContagionEffect[] = []

  for (const edge of params.edges) {
    const source = personaMap.get(edge.sourceId)
    const target = personaMap.get(edge.targetId)
    if (!source || !target) continue

    // T445: 최근 인터랙션 없는 엣지는 전파 스킵
    if (!hasRecentInteraction(edge)) continue

    // 수신 가능 여부 확인
    if (!canReceiveContagion(target, config)) continue

    const targetSensitivity = params.sensitivities.get(target.personaId)
    if (!targetSensitivity) continue

    const sourceTopology =
      params.topologies.get(source.personaId) ?? defaultTopology(source.personaId)
    const targetTopology =
      params.topologies.get(target.personaId) ?? defaultTopology(target.personaId)

    const effect = computeSingleEffect({
      source,
      target,
      edge,
      targetSensitivity,
      sourceTopology,
      targetTopology,
      config,
    })

    // delta가 0이면 스킵
    if (effect.moodDelta === 0) continue

    allEffects.push(effect)
    const existing = effectsByTarget.get(target.personaId) ?? []
    existing.push(effect)
    effectsByTarget.set(target.personaId, existing)
  }

  // 페르소나별 결과 집계
  const personaResults: PersonaContagionResult[] = []
  const projectedMoods: number[] = []

  for (const persona of params.personas) {
    const effects = effectsByTarget.get(persona.personaId)
    if (!effects || effects.length === 0) {
      projectedMoods.push(persona.mood)
      continue
    }

    // mood delta 합산
    const totalMoodDelta = effects.reduce((sum, e) => sum + e.moodDelta, 0)

    // 최대 delta 제한 (전체 합산에도 적용)
    const clampedTotal = Math.max(-config.maxDelta, Math.min(config.maxDelta, totalMoodDelta))

    // 가장 영향력 큰 소스
    const dominant = effects.reduce((best, e) =>
      Math.abs(e.moodDelta) > Math.abs(best.moodDelta) ? e : best
    )

    const projectedMood = Math.max(0, Math.min(1, persona.mood + clampedTotal))
    projectedMoods.push(projectedMood)

    personaResults.push({
      personaId: persona.personaId,
      totalMoodDelta: Math.round(clampedTotal * 10000) / 10000,
      sourceCount: effects.length,
      dominantSource: dominant.sourceId,
      projectedMood: Math.round(projectedMood * 10000) / 10000,
    })
  }

  // 전파 후 통계
  const averageMoodAfter = computeAverage(projectedMoods)
  const moodVarianceAfter = computeVariance(projectedMoods)

  return {
    timestamp,
    personaResults,
    effects: allEffects,
    averageMoodBefore: round4(averageMoodBefore),
    averageMoodAfter: round4(averageMoodAfter),
    moodVarianceBefore: round4(moodVarianceBefore),
    moodVarianceAfter: round4(moodVarianceAfter),
    affectedCount: personaResults.length,
  }
}

// ── 상태 적용 ───────────────────────────────────────────────

/** 전파 결과를 페르소나 상태에 적용 (불변) */
export function applyContagionResult(
  state: ContagionPersonaState,
  result: PersonaContagionResult
): ContagionPersonaState {
  const newMood = Math.max(0, Math.min(1, state.mood + result.totalMoodDelta))
  return {
    ...state,
    mood: Math.round(newMood * 10000) / 10000,
  }
}

/** 전파 라운드 결과를 모든 페르소나에 일괄 적용 (불변) */
export function applyContagionRound(
  personas: ContagionPersonaState[],
  roundResult: ContagionRoundResult
): ContagionPersonaState[] {
  const resultMap = new Map<string, PersonaContagionResult>()
  for (const r of roundResult.personaResults) {
    resultMap.set(r.personaId, r)
  }

  return personas.map((persona) => {
    const result = resultMap.get(persona.personaId)
    if (!result) return { ...persona }
    return applyContagionResult(persona, result)
  })
}

// ── 분석/통계 ───────────────────────────────────────────────

/** 전파 라운드의 수렴 여부 판단 */
export function hasConverged(
  roundResult: ContagionRoundResult,
  threshold: number = 0.001
): boolean {
  return Math.abs(roundResult.averageMoodAfter - roundResult.averageMoodBefore) < threshold
}

/** 전파 강도 요약 통계 */
export interface ContagionStats {
  /** 총 전파 효과 수 */
  totalEffects: number
  /** 양의 전파 수 (mood 상승) */
  positiveEffects: number
  /** 음의 전파 수 (mood 하락) */
  negativeEffects: number
  /** 평균 전파 강도 */
  averageAbsDelta: number
  /** 최대 전파 강도 */
  maxAbsDelta: number
  /** 가장 영향력 큰 소스 */
  topInfluencer: string | null
  /** 가장 영향받은 수신자 */
  mostAffected: string | null
}

/** 전파 라운드에서 통계 추출 */
export function computeContagionStats(roundResult: ContagionRoundResult): ContagionStats {
  const effects = roundResult.effects

  if (effects.length === 0) {
    return {
      totalEffects: 0,
      positiveEffects: 0,
      negativeEffects: 0,
      averageAbsDelta: 0,
      maxAbsDelta: 0,
      topInfluencer: null,
      mostAffected: null,
    }
  }

  let positiveEffects = 0
  let negativeEffects = 0
  let totalAbsDelta = 0
  let maxAbsDelta = 0

  // 소스별 영향력 합산
  const sourceInfluence = new Map<string, number>()

  for (const effect of effects) {
    const absDelta = Math.abs(effect.moodDelta)
    if (effect.moodDelta > 0) positiveEffects++
    else negativeEffects++

    totalAbsDelta += absDelta
    if (absDelta > maxAbsDelta) maxAbsDelta = absDelta

    const existing = sourceInfluence.get(effect.sourceId) ?? 0
    sourceInfluence.set(effect.sourceId, existing + absDelta)
  }

  // 가장 영향력 큰 소스
  let topInfluencer: string | null = null
  let topInfluence = 0
  for (const [id, influence] of sourceInfluence) {
    if (influence > topInfluence) {
      topInfluence = influence
      topInfluencer = id
    }
  }

  // 가장 영향받은 수신자
  let mostAffected: string | null = null
  let maxReceivedDelta = 0
  for (const result of roundResult.personaResults) {
    const absDelta = Math.abs(result.totalMoodDelta)
    if (absDelta > maxReceivedDelta) {
      maxReceivedDelta = absDelta
      mostAffected = result.personaId
    }
  }

  return {
    totalEffects: effects.length,
    positiveEffects,
    negativeEffects,
    averageAbsDelta: round4(totalAbsDelta / effects.length),
    maxAbsDelta: round4(maxAbsDelta),
    topInfluencer,
    mostAffected,
  }
}

/** 집단 mood 안전성 검사 */
export function checkMoodSafety(
  roundResult: ContagionRoundResult,
  warningThreshold: number = 0.3,
  criticalThreshold: number = 0.15
): {
  status: "safe" | "warning" | "critical"
  averageMood: number
  reason: string
} {
  const avg = roundResult.averageMoodAfter

  if (avg <= criticalThreshold) {
    return {
      status: "critical",
      averageMood: avg,
      reason: `평균 mood ${avg} ≤ ${criticalThreshold} — 집단 우울 위험`,
    }
  }

  if (avg <= warningThreshold) {
    return {
      status: "warning",
      averageMood: avg,
      reason: `평균 mood ${avg} ≤ ${warningThreshold} — 집단 정서 주의`,
    }
  }

  return {
    status: "safe",
    averageMood: avg,
    reason: "",
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

function defaultTopology(personaId: string): NodeTopology {
  return {
    personaId,
    totalDegree: 0,
    clusteringCoefficient: 0,
    isHub: false,
  }
}

function computeAverage(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function computeVariance(values: number[]): number {
  if (values.length === 0) return 0
  const avg = computeAverage(values)
  const squaredDiffs = values.map((v) => (v - avg) ** 2)
  return computeAverage(squaredDiffs)
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
