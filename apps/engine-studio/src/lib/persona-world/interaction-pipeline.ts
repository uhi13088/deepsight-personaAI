// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Interaction Execution Pipeline
// 스케줄러 인터랙션 결정 → 대상 선택 → 좋아요/댓글/팔로우 실행
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  PersonaStateData,
  PersonaProfileSnapshot,
  RelationshipScore,
  CommentGenerationInput,
} from "./types"
import type { SchedulerPersona } from "./scheduler"
import type {
  CommentLLMProvider,
  CommentDataProvider,
  CommentResult,
} from "./interactions/comment-engine"
import { generateComment } from "./interactions/comment-engine"
import { computeLikeProbability } from "./interactions/like-engine"
import { updatePersonaState } from "./state-manager"
import { buildVoiceAnchorFromProfile, parseVoiceProfile } from "./voice-anchor"
import { computeInteractionProvenance } from "@/lib/security/data-provenance"
import type { ProvenanceData } from "@/lib/security/data-provenance"
import { computeRelationshipProfileWithDecay } from "./interactions/relationship-protocol"

// ── 타입 정의 ────────────────────────────────────────────────

export interface InteractionPipelineDataProvider {
  /** 최근 피드 포스트 목록 (인터랙션 대상) */
  getRecentFeedPosts(
    personaId: string,
    limit: number
  ): Promise<
    Array<{
      id: string
      authorId: string
      content: string
    }>
  >

  /** 두 페르소나 간 매칭 점수 (0~1) */
  getBasicMatchScore(personaAId: string, personaBId: string): Promise<number>

  /** 팔로우 여부 */
  isFollowing(followerId: string, targetId: string): Promise<boolean>

  /** 관계 스코어 */
  getRelationship(personaAId: string, personaBId: string): Promise<RelationshipScore | null>

  /** 페르소나 벡터 조회 */
  getPersonaVectors(personaId: string): Promise<ThreeLayerVector>

  /** paradoxScore 조회 */
  getParadoxScore(personaId: string): Promise<number>

  /** 좋아요 저장 */
  saveLike(personaId: string, postId: string, provenance?: ProvenanceData): Promise<void>

  /** 댓글 저장 */
  saveComment(
    personaId: string,
    postId: string,
    content: string,
    provenance?: ProvenanceData
  ): Promise<{ id: string }>

  /** 관계 업데이트 */
  updateRelationship(personaAId: string, personaBId: string, event: string): Promise<void>

  /** 활동 로그 저장 */
  saveActivityLog(params: {
    personaId: string
    activityType: string
    targetId: string
    metadata: Record<string, unknown>
  }): Promise<void>

  /** DB에서 페르소나 voiceProfile JSON 조회 (콜드스타트 fallback용) */
  getVoiceProfile?(personaId: string): Promise<unknown | null>
}

export interface InteractionExecutionResult {
  likes: Array<{ postId: string; authorId: string }>
  comments: Array<{ postId: string; authorId: string; commentId: string }>
  totalTokensUsed: number
}

// ── 파이프라인 메인 ──────────────────────────────────────────

const DEFAULT_RELATIONSHIP: RelationshipScore = {
  warmth: 0,
  tension: 0,
  frequency: 0,
  depth: 0,
  lastInteractionAt: null,
}

/**
 * 인터랙션 실행 파이프라인.
 *
 * 1. 최근 피드에서 대상 포스트 선택
 * 2. 각 포스트에 대해 좋아요 확률 계산 → 실행
 * 3. 일부 포스트에 댓글 생성 → 실행
 * 4. 관계 갱신
 * 5. PersonaState 업데이트
 */
export async function executeInteractions(
  persona: SchedulerPersona,
  state: PersonaStateData,
  dataProvider: InteractionPipelineDataProvider,
  commentLLMProvider?: CommentLLMProvider
): Promise<InteractionExecutionResult> {
  const likes: InteractionExecutionResult["likes"] = []
  const comments: InteractionExecutionResult["comments"] = []
  let totalTokensUsed = 0

  // Step 1: 최근 피드 포스트 조회 (최대 10개)
  const feedPosts = await dataProvider.getRecentFeedPosts(persona.id, 10)

  if (feedPosts.length === 0) {
    return { likes, comments, totalTokensUsed: 0 }
  }

  // Step 2-3: 각 포스트에 대해 인터랙션 판정
  for (const post of feedPosts) {
    // 자기 글 스킵
    if (post.authorId === persona.id) continue

    const [matchScore, isFollowingAuthor, relationship] = await Promise.all([
      dataProvider.getBasicMatchScore(persona.id, post.authorId),
      dataProvider.isFollowing(persona.id, post.authorId),
      dataProvider.getRelationship(persona.id, post.authorId),
    ])

    // 관계 프로토콜 계산 (단계 + 유형 → 허용 톤 + 인터랙션 배수)
    const relProfile = computeRelationshipProfileWithDecay(relationship ?? DEFAULT_RELATIONSHIP)

    // 좋아요 확률 계산 + 관계 프로토콜 interactionBoost 적용
    const interactivity = 0.5 // 간소화: traits.interactivity 대체
    const likeResult = computeLikeProbability(
      matchScore,
      interactivity,
      state.socialBattery,
      isFollowingAuthor,
      relationship ?? DEFAULT_RELATIONSHIP
    )
    const adjustedLikeProbability = Math.min(
      1,
      likeResult.probability * relProfile.protocol.interactionBoost
    )

    // 좋아요 실행 (출처 태깅 포함)
    if (Math.random() < adjustedLikeProbability) {
      const likeProvenance = computeInteractionProvenance({
        source: "SYSTEM",
        propagationDepth: 0,
      })

      await dataProvider.saveLike(persona.id, post.id, likeProvenance)
      likes.push({ postId: post.id, authorId: post.authorId })

      await dataProvider.updateRelationship(persona.id, post.authorId, "like")

      await dataProvider.saveActivityLog({
        personaId: persona.id,
        activityType: "POST_LIKED",
        targetId: post.id,
        metadata: {
          probability: likeResult.probability,
          matchScore,
          provenance: likeProvenance,
        },
      })
    }

    // 댓글 확률: 좋아요한 포스트 중 30% 정도에 댓글
    const shouldComment = likes.some((l) => l.postId === post.id) && Math.random() < 0.3

    if (shouldComment) {
      const vectors = await dataProvider.getPersonaVectors(persona.id)
      const rel = relationship ?? DEFAULT_RELATIONSHIP

      // Voice Anchor: DB VoiceProfile fallback (콜드스타트 해결)
      let voiceAnchor = ""
      if (dataProvider.getVoiceProfile) {
        const rawProfile = await dataProvider.getVoiceProfile(persona.id)
        const profile = parseVoiceProfile(rawProfile)
        if (profile) {
          voiceAnchor = buildVoiceAnchorFromProfile(profile)
        }
      }

      const personaProfile: PersonaProfileSnapshot = {
        name: persona.name,
        role: persona.role,
        expertise: persona.expertise,
        description: persona.description,
        speechPatterns: persona.speechPatterns,
        quirks: persona.quirks,
        commentPrompt: persona.commentPrompt,
        voiceSpec: persona.voiceSpec,
        factbook: persona.factbook,
      }

      const commentInput: CommentGenerationInput = {
        commenterId: persona.id,
        postId: post.id,
        postAuthorId: post.authorId,
        relationship: rel,
        ragContext: {
          voiceAnchor,
          relationMemory: "",
          interestContinuity: "",
          consumptionMemory: "",
        },
        commenterState: state,
        personaProfile,
        allowedTones: relProfile.protocol.allowedTones,
      }

      const commentDataProvider: CommentDataProvider = {
        getPostContent: async () => post.content,
        getPersonaVectors: async () => vectors,
        getParadoxScore: async () => persona.paradoxScore,
        saveCommentLog: async () => {},
      }

      const commentResult: CommentResult = await generateComment(
        commentInput,
        vectors,
        commentDataProvider,
        commentLLMProvider
      )

      const commentProvenance = computeInteractionProvenance({
        source: "SYSTEM",
        propagationDepth: 0,
      })

      const saved = await dataProvider.saveComment(
        persona.id,
        post.id,
        commentResult.content,
        commentProvenance
      )
      comments.push({ postId: post.id, authorId: post.authorId, commentId: saved.id })

      await dataProvider.updateRelationship(persona.id, post.authorId, "comment")

      await dataProvider.saveActivityLog({
        personaId: persona.id,
        activityType: "POST_COMMENTED",
        targetId: post.id,
        metadata: {
          commentId: saved.id,
          tone: commentResult.tone.tone,
          expressApplied: commentResult.expressApplied,
          provenance: commentProvenance,
        },
      })
    }
  }

  // Step 5: PersonaState 업데이트 (댓글 작성마다 state 갱신)
  for (const _comment of comments) {
    await updatePersonaState(persona.id, {
      type: "comment_created",
      tokensUsed: 0,
    })
  }

  return { likes, comments, totalTokensUsed }
}
