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
  for (const { persona, traits, state } of activePersonas) {
    const decision = decideActivity(persona, traits, state, context)

    decisions.push({
      personaId: persona.id,
      personaName: persona.name,
      shouldPost: decision.shouldPost,
      shouldInteract: decision.shouldInteract,
      postType: decision.postType,
      paradoxTriggered: decision.postTypeReason
        ? decision.postTypeReason.selectedType.includes("BEHIND_STORY")
        : false,
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
 * 현재 시간에 활동 가능한 페르소나 필터링.
 *
 * 설계서 §4.2:
 * 조건: currentHour ∈ activeHours(persona) AND energy > 0.2
 */
export async function getActivePersonas(
  currentHour: number,
  provider: SchedulerDataProvider
): Promise<
  Array<{ persona: SchedulerPersona; traits: ActivityTraitsV3; state: PersonaStateData }>
> {
  const personas = await provider.getActiveStatusPersonas()
  const result: Array<{
    persona: SchedulerPersona
    traits: ActivityTraitsV3
    state: PersonaStateData
  }> = []

  for (const persona of personas) {
    // 1. 벡터 → 활동 특성 계산
    const traits = computeActivityTraits(persona.vectors, persona.paradoxScore)

    // 2. 활동 시간대 계산
    const activeHours = computeActiveHours(persona.vectors, traits)

    // 3. 현재 시간이 활동 시간대에 포함되는지
    if (!activeHours.includes(currentHour)) continue

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
    if (state.energy <= ACTIVITY_THRESHOLDS.minEnergy) continue

    result.push({ persona, traits, state })
  }

  return result
}

/**
 * 개별 페르소나의 활동 결정.
 *
 * 설계서 §4.5 포스트 타입 친화도 + §3.6 상태 보정.
 *
 * 1. 활동 확률 계산
 * 2. 포스트 여부 결정 (random vs probability)
 * 3. 인터랙션 여부 결정
 * 4. 포스트 타입 선택
 * 5. Paradox 발현 체크
 */
export function decideActivity(
  persona: SchedulerPersona,
  traits: ActivityTraitsV3,
  state: PersonaStateData,
  context: SchedulerContext
): ActivityDecision {
  // 1. 활동 확률
  const { postProbability, interactionProbability } = computeActivityProbabilities(traits, state)

  // 2. 포스트 여부
  const shouldPost = Math.random() < postProbability

  // 3. 인터랙션 여부
  const shouldInteract =
    state.socialBattery > ACTIVITY_THRESHOLDS.minSocialBattery &&
    Math.random() < interactionProbability

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
      // 4c. 일반 포스트 타입 선택
      const selection = selectPostType(persona.vectors, persona.paradoxScore, state)
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
