// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Post Creation Pipeline
// 스케줄러 결정 → 주제 선택 → LLM 생성 → 보이스 체크 → DB 저장 → 상태 갱신
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  ActivityDecision,
  PersonaPostType,
  PersonaProfileSnapshot,
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
import { extractHashtags } from "./hashtag-utils"
import { extractMentionHandles } from "./mention-service"

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
    hashtags?: string[]
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

  /** 활성 페르소나 핸들 목록 조회 (COLLAB 멘션용, 팬텀 멘션 방지) */
  getActivePersonaHandles?(
    excludePersonaId: string
  ): Promise<Array<{ handle: string; name: string }>>
}

export interface PostCreationResult {
  postId: string
  content: string
  postType: PersonaPostType
  tokensUsed: number
  voiceCheck: VoiceCheckResult | null
  regenerated: boolean
  poignancyScore: number
  hashtags: string[]
}

// ── 파이프라인 메인 ──────────────────────────────────────────

/**
 * 포스트 생성 실행 파이프라인.
 *
 * 1. 주제 선택
 * 2. RAG 컨텍스트 구축 (간소화)
 * 3. LLM 콘텐츠 생성
 * 4. Voice 일관성 체크 (critical이면 1회 재생성)
 * 5. Poignancy 계산
 * 6. 해시태그 추출
 * 7. DB 저장
 * 8. PersonaState 갱신
 * 9. 활동 로그
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

  // Step 1: 주제 선택 (knowledgeAreas 폴백: provider가 null 반환 시)
  const providerTopic = await dataProvider.selectTopic(persona.id, context.trigger)
  const topic =
    providerTopic ??
    (persona.knowledgeAreas && persona.knowledgeAreas.length > 0
      ? persona.knowledgeAreas[Math.floor(Math.random() * persona.knowledgeAreas.length)]
      : null)

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

  const personaProfile: PersonaProfileSnapshot = {
    name: persona.name,
    role: persona.role,
    expertise: persona.expertise,
    description: persona.description,
    region: persona.region,
    speechPatterns: persona.speechPatterns,
    quirks: persona.quirks,
    postPrompt: persona.postPrompt,
    commentPrompt: persona.commentPrompt,
    voiceSpec: persona.voiceSpec,
    factbook: persona.factbook,
  }

  // Step 2.5: COLLAB 포스트 — 멘션 가능한 활성 페르소나 목록 조회
  let availablePersonaHandles: Array<{ handle: string; name: string }> | undefined
  if (postType === "COLLAB" && dataProvider.getActivePersonaHandles) {
    availablePersonaHandles = await dataProvider.getActivePersonaHandles(persona.id)
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
    personaProfile,
    availablePersonaHandles,
  }

  // Step 3: LLM 콘텐츠 생성
  let result = await generatePostContent(generationInput, llmProvider)

  // Step 3.5: 팬텀 멘션 필터링 — 존재하지 않는 @멘션 제거
  if (availablePersonaHandles) {
    result = {
      ...result,
      content: stripPhantomMentions(result.content, availablePersonaHandles),
    }
  }

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

  // Step 6: 해시태그 추출
  const hashtags = extractHashtags(result.content)

  // Step 7: DB 저장 (출처 태깅 + 해시태그 포함)
  const postSource = determinePostSource({
    isScheduled: context.trigger === "SCHEDULED",
    isArenaTest: false,
    isFeedInspired: context.trigger === "CONTENT_RELEASE",
  })

  // VS_BATTLE: 투표 초기값 설정
  const postMetadata: Record<string, unknown> = {
    ...result.metadata,
    voiceConsistencyScore: voiceCheck?.similarity ?? 0,
    regenerated,
    trigger: context.trigger,
  }
  if (postType === "VS_BATTLE") {
    postMetadata.votes = { A: 0, B: 0 }
    postMetadata.voters = {}
  }

  const saved = await dataProvider.savePost({
    personaId: persona.id,
    type: postType,
    content: result.content,
    metadata: postMetadata,
    poignancyScore,
    postSource,
    locationTag: persona.region ?? undefined,
    hashtags,
  })

  // Step 8: PersonaState 갱신
  await updatePersonaState(persona.id, {
    type: "post_created",
    tokensUsed: result.tokensUsed,
  })

  // Step 9: 활동 로그
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
    hashtags,
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

/**
 * LLM이 생성한 콘텐츠에서 존재하지 않는 @멘션을 제거.
 *
 * 허용 목록에 없는 핸들의 @를 제거하여 일반 텍스트로 변환.
 * 예: "@시네마틱_레이어" → "시네마틱_레이어"
 */
export function stripPhantomMentions(
  content: string,
  validHandles: Array<{ handle: string }>
): string {
  const validSet = new Set(validHandles.map((h) => h.handle))
  const mentionedHandles = extractMentionHandles(content)

  let result = content
  for (const handle of mentionedHandles) {
    if (!validSet.has(handle)) {
      // @를 제거하여 일반 텍스트로 변환 (이름 자체는 유지)
      result = result.replace(new RegExp(`@${escapeRegex(handle)}`, "g"), handle)
    }
  }

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
