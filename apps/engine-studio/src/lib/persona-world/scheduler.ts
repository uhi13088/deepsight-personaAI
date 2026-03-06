// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Autonomous Activity Scheduler
// 구현계획서 §5.1, 설계서 §4.2
// 매시간 크론 → 활성 페르소나 → 상태 로드 → 확률 → 결정 → 생성 → 로깅
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  computeActivityTraits,
  computeActiveHours,
  computeActivityProbabilities,
  computePostRateLimits,
} from "./activity-mapper"
import { getPersonaState } from "./state-manager"
import { selectPostType } from "./post-type-selector"
import { decideParadoxActivity } from "./paradox-activity"
import { ACTIVITY_THRESHOLDS } from "./constants"
import { updatePersonaState } from "./state-manager"
import type {
  ActivityDecision,
  ActivityTraitsV3,
  PersonaStateData,
  SchedulerContext,
} from "./types"
import { evaluateRules } from "@/lib/trigger/rule-dsl"
import type { TriggerRuleDSL, RuleContext, RuleEffect } from "@/lib/trigger/rule-dsl"

/**
 * 최소한의 페르소나 데이터 (스케줄러용).
 *
 * 실제 Prisma Persona 모델의 서브셋.
 * DB 의존성을 줄이기 위해 인터페이스로 정의.
 */
export interface SchedulerPersona {
  id: string
  name: string
  status: string
  vectors: ThreeLayerVector
  paradoxScore: number
  region?: string | null
  // Profile fields (LLM 프롬프트 생성용)
  role?: string | null
  expertise?: string[]
  description?: string | null
  speechPatterns?: string[]
  quirks?: string[]
  postPrompt?: string | null
  commentPrompt?: string | null
  voiceSpec?: unknown | null
  factbook?: unknown | null
  fewShotEnabled?: boolean | null
  // Activity scheduling fields
  postFrequency?: string // PostFrequency enum value
  activeHours?: number[] // DB 저장 활동 시간대
  peakHours?: number[] // DB 저장 피크 시간대
  triggerMap?: unknown // TriggerRuleDSL[] - structured rule engine
  knowledgeAreas?: string[] // 전문 지식 분야 (topic fallback)
  recentPostTypes?: string[] // 최근 포스트 타입 (다양성 쿨다운용, 최근→과거 순서)
}

/**
 * 스케줄러 데이터 프로바이더.
 *
 * DB 접근을 추상화하여 테스트 가능하게 함.
 */
export interface SchedulerDataProvider {
  /** 활성 상태 페르소나 목록 조회 */
  getActiveStatusPersonas(): Promise<SchedulerPersona[]>
  /** 페르소나의 마지막 활동 시간 조회 (없으면 null) */
  getLastActivityAt(personaId: string): Promise<Date | null>
  /** 오늘(KST 기준) 포스팅 횟수 조회 */
  getTodayPostCount(personaId: string): Promise<number>
  /** 마지막 포스팅 시간 조회 (없으면 null) */
  getLastPostAt(personaId: string): Promise<Date | null>
}

/**
 * 스케줄러 실행 결과.
 */
export interface SchedulerResult {
  totalPersonas: number
  activePersonas: number
  decisions: Array<{
    personaId: string
    personaName: string
    shouldPost: boolean
    shouldInteract: boolean
    postType?: string
    paradoxTriggered: boolean
    blockedReason?: string
  }>
}

/**
 * 매시간 실행되는 자율 활동 스케줄러.
 *
 * 설계서 §4.2 파이프라인:
 * 1. 트리거 수신
 * 2. 활성 페르소나 필터링
 * 3. PersonaState 로드
 * 4. 활동 확률 계산
 * 5. 활동 유형 결정
 * 6. (콘텐츠 생성은 T106에서 분리)
 * 7. 로깅
 */
export async function runScheduler(
  context: SchedulerContext,
  provider: SchedulerDataProvider
): Promise<SchedulerResult> {
  // Step 1-2: 활성 페르소나 필터링
  const activePersonas = await getActivePersonas(context.currentHour, provider)

  const allPersonas = await provider.getActiveStatusPersonas()
  const decisions: SchedulerResult["decisions"] = []

  // Step 3-5: 각 페르소나별 활동 결정
  for (const {
    persona,
    traits,
    state,
    isInActiveHours,
    todayPostCount,
    lastPostAt,
  } of activePersonas) {
    const decision = decideActivity(
      persona,
      traits,
      state,
      context,
      isInActiveHours,
      todayPostCount,
      lastPostAt
    )

    decisions.push({
      personaId: persona.id,
      personaName: persona.name,
      shouldPost: decision.shouldPost,
      shouldInteract: decision.shouldInteract,
      postType: decision.postType,
      paradoxTriggered: decision.postTypeReason
        ? decision.postTypeReason.selectedType.includes("BEHIND_STORY")
        : false,
      blockedReason: decision.blockedReason,
    })

    // Step 7: 로깅 — 실행 파이프라인(post-pipeline, interaction-pipeline)에서
    // 개별적으로 활동 로그를 기록하므로, 여기서는 중복 로깅하지 않음
  }

  return {
    totalPersonas: allPersonas.length,
    activePersonas: activePersonas.length,
    decisions,
  }
}

/**
 * 현재 시간에 활동 가능한 페르소나 필터링 (T377: 인터랙션 시간대 분리).
 *
 * 설계서 §4.2:
 * - 포스팅: activeHours 안에서만 허용
 * - 인터랙션(좋아요/리포스트/댓글): 24시간 허용, 시간대 밖이면 확률 50% 감소
 * - 공통 필터: energy > 0.2
 */
export async function getActivePersonas(
  currentHour: number,
  provider: SchedulerDataProvider
): Promise<
  Array<{
    persona: SchedulerPersona
    traits: ActivityTraitsV3
    state: PersonaStateData
    isInActiveHours: boolean
    todayPostCount: number
    lastPostAt: Date | null
  }>
> {
  const personas = await provider.getActiveStatusPersonas()
  const result: Array<{
    persona: SchedulerPersona
    traits: ActivityTraitsV3
    state: PersonaStateData
    isInActiveHours: boolean
    todayPostCount: number
    lastPostAt: Date | null
  }> = []

  console.log(`[Scheduler] 활성 페르소나 ${personas.length}명 평가 (hour=${currentHour})`)

  let filteredByEnergy = 0
  let outOfActiveHours = 0

  for (const persona of personas) {
    // 1. 벡터 → 활동 특성 계산
    const traits = computeActivityTraits(persona.vectors, persona.paradoxScore)

    // 2. 활동 시간대: DB 저장값 우선, 없으면 벡터에서 재계산
    const activeHours =
      persona.activeHours && persona.activeHours.length > 0
        ? persona.activeHours
        : computeActiveHours(persona.vectors, traits)

    // 3. 시간대 포함 여부 체크 (필터 제거 → 플래그로 전환)
    const isInActiveHours = activeHours.includes(currentHour)
    if (!isInActiveHours) outOfActiveHours++

    // 4. idle 시간 계산 → 에너지 회복 적용
    const lastActivityAt = await provider.getLastActivityAt(persona.id)
    const now = new Date()
    const idleHours = lastActivityAt
      ? (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60)
      : 24 // 활동 기록 없으면 24시간 풀 회복
    if (idleHours > 0) {
      await updatePersonaState(persona.id, { type: "idle_period", hours: idleHours })
    }

    // 5. PersonaState 로드 + 에너지 체크
    const state = await getPersonaState(persona.id)
    if (state.energy <= ACTIVITY_THRESHOLDS.minEnergy) {
      filteredByEnergy++
      continue
    }

    // 6. triggerMap 효과 적용 (벡터 임시 보정)
    const effectiveTraits = applyTriggerMapToTraits(persona, state, traits)

    // 7. 일일 포스트 수 + 마지막 포스팅 시간 조회 (하드 리밋용)
    const [todayPostCount, lastPostAt] = await Promise.all([
      provider.getTodayPostCount(persona.id),
      provider.getLastPostAt(persona.id),
    ])

    result.push({
      persona,
      traits: effectiveTraits,
      state,
      isInActiveHours,
      todayPostCount,
      lastPostAt,
    })
  }

  if (personas.length > 0) {
    const inHours = result.filter((r) => r.isInActiveHours).length
    const outHours = result.filter((r) => !r.isInActiveHours).length
    console.log(
      `[Scheduler] 필터 결과: ${result.length}명 통과 (시간대 내 ${inHours}명 + 인터랙션전용 ${outHours}명), ` +
        `${outOfActiveHours - outHours}명 시간대 불일치(에너지부족 제외), ` +
        `${filteredByEnergy}명 에너지 부족`
    )
  }

  return result
}

/**
 * 개별 페르소나의 활동 결정 (T377: 시간대 분리).
 *
 * 설계서 §4.5 포스트 타입 친화도 + §3.6 상태 보정.
 *
 * 1. 활동 확률 계산
 * 2. 포스트 여부 결정: 활동 시간대 밖이면 false
 * 3. 인터랙션 여부 결정: 활동 시간대 밖이면 확률 50% 감소
 * 4. 포스트 타입 선택
 * 5. Paradox 발현 체크
 */
export function decideActivity(
  persona: SchedulerPersona,
  traits: ActivityTraitsV3,
  state: PersonaStateData,
  context: SchedulerContext,
  isInActiveHours = true,
  todayPostCount = 0,
  lastPostAt: Date | null = null
): ActivityDecision & { blockedReason?: string } {
  // 1. 활동 확률 (postFrequency 반영)
  const { postProbability, interactionProbability } = computeActivityProbabilities(
    traits,
    state,
    persona.postFrequency
  )

  // 2. 포스트 여부: 시간대 + 벡터 기반 동적 리밋 체크
  // endurance(지속성) × postFrequency(빈도 배수) → 일일 한도 + 최소 간격 동적 산출
  const { dailyLimit, minIntervalHours } = computePostRateLimits(traits, persona.postFrequency)

  // 일일 한도 초과 체크
  if (todayPostCount >= dailyLimit) {
    const shouldInteract =
      state.socialBattery > ACTIVITY_THRESHOLDS.minSocialBattery &&
      Math.random() < (isInActiveHours ? interactionProbability : interactionProbability * 0.5)
    return {
      shouldPost: false,
      shouldInteract,
      blockedReason: `daily_limit(${todayPostCount}/${dailyLimit})`,
    }
  }

  // 마지막 포스팅 이후 최소 간격 체크 (endurance × postFrequency 기반 동적 산출)
  if (lastPostAt) {
    const hoursSinceLastPost = (Date.now() - lastPostAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastPost < minIntervalHours) {
      const shouldInteract =
        state.socialBattery > ACTIVITY_THRESHOLDS.minSocialBattery &&
        Math.random() < (isInActiveHours ? interactionProbability : interactionProbability * 0.5)
      return {
        shouldPost: false,
        shouldInteract,
        blockedReason: `min_interval(${hoursSinceLastPost.toFixed(1)}h < ${minIntervalHours.toFixed(1)}h)`,
      }
    }
  }

  const shouldPost = isInActiveHours && Math.random() < postProbability

  // 3. 인터랙션 여부: 시간대 밖이면 확률 50% 감소 (수시 반응은 허용)
  const effectiveInteractionProbability = isInActiveHours
    ? interactionProbability
    : interactionProbability * 0.5
  const shouldInteract =
    state.socialBattery > ACTIVITY_THRESHOLDS.minSocialBattery &&
    Math.random() < effectiveInteractionProbability

  if (!shouldPost && !shouldInteract) {
    return { shouldPost: false, shouldInteract: false }
  }

  // 4. 포스트 타입 선택 (포스팅 하기로 결정한 경우)
  let postType: string | undefined
  let postTypeReason: ActivityDecision["postTypeReason"]

  if (shouldPost) {
    // 4a. Paradox 발현 체크
    const paradoxResult = decideParadoxActivity(persona.vectors, persona.paradoxScore, state)

    // 4b. Paradox 발현 시 BEHIND_STORY 강제
    if (paradoxResult.shouldTrigger && paradoxResult.primaryPattern) {
      postType = "BEHIND_STORY"
      postTypeReason = {
        affinityScores: {},
        stateModifiers: { paradox_override: 1 },
        selectedType: "BEHIND_STORY",
        selectionProbability: paradoxResult.adjustedChance,
      }
    } else {
      // 4c. 일반 포스트 타입 선택 (다양성 쿨다운 적용)
      const selection = selectPostType(
        persona.vectors,
        persona.paradoxScore,
        state,
        undefined,
        undefined,
        persona.recentPostTypes ?? []
      )
      postType = selection.selectedType
      postTypeReason = {
        affinityScores: selection.scores,
        stateModifiers: selection.stateModifiers,
        selectedType: selection.selectedType,
        selectionProbability: 0,
      }
    }
  }

  return {
    shouldPost,
    shouldInteract,
    postType: postType as ActivityDecision["postType"],
    postTypeReason,
  }
}

// ── 헬퍼: TriggerMap 효과 → ActivityTraits 보정 ──────────────

/**
 * triggerMap 규칙을 평가하여 ActivityTraits를 임시 보정.
 *
 * 벡터 차원에 boost/suppress/override 효과를 적용한 수정 벡터로
 * 새로운 ActivityTraits를 계산한다. 원본 벡터는 변경하지 않음.
 */
function applyTriggerMapToTraits(
  persona: SchedulerPersona,
  state: PersonaStateData,
  baseTraits: ActivityTraitsV3
): ActivityTraitsV3 {
  if (!persona.triggerMap) return baseTraits

  let rules: TriggerRuleDSL[]
  try {
    rules = Array.isArray(persona.triggerMap) ? (persona.triggerMap as TriggerRuleDSL[]) : []
  } catch {
    return baseTraits
  }

  if (rules.length === 0) return baseTraits

  const { social: l1, temperament: l2, narrative: l3 } = persona.vectors
  const ctx: RuleContext = {
    L1: {
      depth: l1.depth,
      lens: l1.lens,
      stance: l1.stance,
      scope: l1.scope,
      taste: l1.taste,
      purpose: l1.purpose,
      sociability: l1.sociability,
    },
    L2: {
      openness: l2.openness,
      conscientiousness: l2.conscientiousness,
      extraversion: l2.extraversion,
      agreeableness: l2.agreeableness,
      neuroticism: l2.neuroticism,
    },
    L3: {
      lack: l3.lack,
      moralCompass: l3.moralCompass,
      volatility: l3.volatility,
      growthArc: l3.growthArc,
    },
    state: {
      mood: state.mood,
      energy: state.energy,
      socialBattery: state.socialBattery,
      paradoxTension: state.paradoxTension,
    },
  }

  const evalResult = evaluateRules(rules, ctx)
  if (evalResult.appliedEffects.length === 0) return baseTraits

  // 효과를 벡터 복사본에 적용
  const v: ThreeLayerVector = {
    social: { ...l1 },
    temperament: { ...l2 },
    narrative: { ...l3 },
  }

  for (const effect of evalResult.appliedEffects) {
    applyEffectToVector(v, effect)
  }

  // 수정된 벡터로 새로운 ActivityTraits 계산
  return computeActivityTraits(v, persona.paradoxScore)
}

function applyEffectToVector(v: ThreeLayerVector, effect: RuleEffect): void {
  const layerMap: Record<string, Record<string, number>> = {
    L1: v.social as unknown as Record<string, number>,
    L2: v.temperament as unknown as Record<string, number>,
    L3: v.narrative as unknown as Record<string, number>,
  }
  const layer = layerMap[effect.layer]
  if (!layer || !(effect.dimension in layer)) return

  const cur = layer[effect.dimension]
  if (effect.mode === "boost") {
    layer[effect.dimension] = Math.min(1, cur + effect.magnitude)
  } else if (effect.mode === "suppress") {
    layer[effect.dimension] = Math.max(0, cur - effect.magnitude)
  } else if (effect.mode === "override") {
    layer[effect.dimension] = effect.magnitude
  }
}
