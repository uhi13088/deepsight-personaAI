// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Post Creation Pipeline
// 스케줄러 결정 → 주제 선택 → LLM 생성 → 보이스 체크 → DB 저장 → 상태 갱신
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  ActivityDecision,
  PersonaPostType,
  PersonaStateData,
  PostGenerationInput,
  PostGenerationResult,
  SchedulerContext,
} from "./types"
import type { SchedulerPersona } from "./scheduler"
import type { LLMProvider } from "./content-generator"
import type { VoiceMonitorProvider, VoiceCheckResult } from "./quality-monitor"
import { generatePostContent } from "./content-generator"
import { checkVoiceConsistency } from "./quality-monitor"
import { updatePersonaState } from "./state-manager"
import { buildVoiceAnchorFromProfile, parseVoiceProfile } from "./voice-anchor"
import { calculatePostPoignancy } from "./poignancy"
import { determinePostSource } from "@/lib/security/data-provenance"
import type { PostSource } from "@/lib/security/data-provenance"

// ── 타입 정의 ────────────────────────────────────────────────

export interface PostPipelineDataProvider {
  /** 포스트 DB 저장 */
  savePost(params: {
    personaId: string
    type: PersonaPostType
    content: string
    metadata: Record<string, unknown>
    poignancyScore?: number
    postSource?: PostSource
    locationTag?: string
  }): Promise<{ id: string }>

  /** 최근 포스트 텍스트 조회 (RAG voiceAnchor용) */
  getRecentPostTexts(personaId: string, count: number): Promise<string[]>

  /** 소비 기록 컨텍스트 조회 */
  getConsumptionContext(personaId: string): Promise<string>

  /** 활동 로그 저장 */
  saveActivityLog(params: {
    personaId: string
    activityType: string
    postId: string
    metadata: Record<string, unknown>
  }): Promise<void>

  /** 주제 조회 (트리거/관심사/벡터 기반) */
  selectTopic(personaId: string, trigger: SchedulerContext["trigger"]): Promise<string | null>

  /** DB에서 페르소나 voiceProfile JSON 조회 (콜드스타트 fallback용) */
  getVoiceProfile?(personaId: string): Promise<unknown | null>
}

export interface PostCreationResult {
  postId: string
  content: string
  postType: PersonaPostType
  tokensUsed: number
  voiceCheck: VoiceCheckResult | null
  regenerated: boolean
  poignancyScore: number
}

// ── 파이프라인 메인 ──────────────────────────────────────────

/**
 * 포스트 생성 실행 파이프라인.
 *
 * 1. 주제 선택
 * 2. RAG 컨텍스트 구축 (간소화)
 * 3. LLM 콘텐츠 생성
 * 4. Voice 일관성 체크 (critical이면 1회 재생성)
 * 5. DB 저장
 * 6. PersonaState 갱신
 * 7. 활동 로그
 */
export async function executePostCreation(
  persona: SchedulerPersona,
  decision: ActivityDecision,
  context: SchedulerContext,
  state: PersonaStateData,
  llmProvider: LLMProvider,
  dataProvider: PostPipelineDataProvider
): Promise<PostCreationResult> {
  const postType = decision.postType ?? ("THOUGHT" as PersonaPostType)

  // Step 1: 주제 선택
  const topic = await dataProvider.selectTopic(persona.id, context.trigger)

  // Step 2: RAG 컨텍스트 구축 (간소화)
  const [recentTexts, consumptionMemory] = await Promise.all([
    dataProvider.getRecentPostTexts(persona.id, 5),
    dataProvider.getConsumptionContext(persona.id),
  ])

  // Voice Anchor: 최근 글 기반 → 없으면 DB VoiceProfile fallback (콜드스타트 해결)
  let voiceAnchor: string
  if (recentTexts.length > 0) {
    voiceAnchor = `[최근 글 스타일]\n${recentTexts.slice(0, 3).join("\n---\n")}`
  } else if (dataProvider.getVoiceProfile) {
    const rawProfile = await dataProvider.getVoiceProfile(persona.id)
    const profile = parseVoiceProfile(rawProfile)
    voiceAnchor = profile ? buildVoiceAnchorFromProfile(profile) : ""
  } else {
    voiceAnchor = ""
  }

  const generationInput: PostGenerationInput = {
    personaId: persona.id,
    postType,
    trigger: context.trigger,
    topic: topic ?? undefined,
    ragContext: {
      voiceAnchor,
      interestContinuity: topic ? `최근 관심사: ${topic}` : "",
      consumptionMemory,
      emotionalState: describeEmotionalState(state),
    },
    personaState: state,
  }

  // Step 3: LLM 콘텐츠 생성
  let result = await generatePostContent(generationInput, llmProvider)

  // Step 4: Voice 일관성 체크
  let voiceCheck: VoiceCheckResult | null = null
  let regenerated = false

  if (recentTexts.length >= 3) {
    const voiceProvider: VoiceMonitorProvider = {
      getRecentPostTexts: async () => recentTexts,
    }
    voiceCheck = await checkVoiceConsistency(result.content, persona.id, voiceProvider)

    // critical이면 1회 재생성 (강화된 voiceAnchor)
    if (voiceCheck.status === "critical") {
      const reinforcedInput: PostGenerationInput = {
        ...generationInput,
        ragContext: {
          ...generationInput.ragContext,
          voiceAnchor: `[중요: 아래 글 스타일을 반드시 유지하세요]\n${recentTexts.join("\n---\n")}`,
        },
      }
      result = await generatePostContent(reinforcedInput, llmProvider)
      regenerated = true

      // 재생성 후 다시 체크
      voiceCheck = await checkVoiceConsistency(result.content, persona.id, voiceProvider)
    }
  }

  // Step 5: Poignancy 자동 계산 (v4.0)
  const volatility = persona.vectors.narrative.volatility
  const poignancyScore = calculatePostPoignancy(state, volatility)

  // Step 6: DB 저장 (출처 태깅 포함)
  const postSource = determinePostSource({
    isScheduled: context.trigger === "SCHEDULED",
    isArenaTest: false,
    isFeedInspired: context.trigger === "CONTENT_RELEASE",
  })

  const saved = await dataProvider.savePost({
    personaId: persona.id,
    type: postType,
    content: result.content,
    metadata: {
      ...result.metadata,
      voiceConsistencyScore: voiceCheck?.similarity ?? 0,
      regenerated,
      trigger: context.trigger,
    },
    poignancyScore,
    postSource,
    locationTag: persona.region ?? undefined,
  })

  // Step 7: PersonaState 갱신
  await updatePersonaState(persona.id, {
    type: "post_created",
    tokensUsed: result.tokensUsed,
  })

  // Step 8: 활동 로그
  await dataProvider.saveActivityLog({
    personaId: persona.id,
    activityType: "POST_CREATED",
    postId: saved.id,
    metadata: {
      postType,
      topic,
      tokensUsed: result.tokensUsed,
      voiceStatus: voiceCheck?.status ?? "unchecked",
      regenerated,
      poignancyScore,
    },
  })

  return {
    postId: saved.id,
    content: result.content,
    postType,
    tokensUsed: result.tokensUsed,
    voiceCheck,
    regenerated,
    poignancyScore,
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

function describeEmotionalState(state: PersonaStateData): string {
  const parts: string[] = []
  if (state.mood > 0.7) parts.push("기분이 좋은 상태")
  else if (state.mood < 0.3) parts.push("기분이 좋지 않은 상태")
  else parts.push("평범한 기분")

  if (state.energy > 0.7) parts.push("에너지가 충만")
  else if (state.energy < 0.3) parts.push("피곤한 상태")

  if (state.paradoxTension > 0.6) parts.push("내면 갈등이 높은 상태")

  return parts.join(", ")
}
