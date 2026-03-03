// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Interaction Execution Pipeline
// 스케줄러 인터랙션 결정 → 대상 선택 → 좋아요/댓글/팔로우 실행
// ═══════════════════════════════════════════════════════════════

import { Prisma } from "@/generated/prisma"
import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  PersonaStateData,
  PersonaProfileSnapshot,
  RelationshipScore,
  CommentGenerationInput,
  CommentQualityLogInput,
} from "./types"
import type { SchedulerPersona } from "./scheduler"
import type {
  CommentLLMProvider,
  CommentDataProvider,
  CommentResult,
} from "./interactions/comment-engine"
import { generateComment } from "./interactions/comment-engine"
import { computeLikeProbability } from "./interactions/like-engine"
import { computeFollowScore, computeFollowProbability } from "./interactions/follow-engine"
import { computeRepostProbability } from "./interactions/repost-engine"
import { updatePersonaState } from "./state-manager"
import { buildVoiceAnchorFromProfile, parseVoiceProfile } from "./voice-anchor"
import { computeInteractionProvenance } from "@/lib/security/data-provenance"
import type { ProvenanceData } from "@/lib/security/data-provenance"
import {
  computeRelationshipProfileWithDecay,
  summarizeRelationship,
} from "./interactions/relationship-protocol"
import { classifyL2Pattern } from "./interactions/l2-pattern"
import { decideEngagement } from "./interactions/engagement-decision"
import { computeVoiceAdjustment, mergeAllowedTones } from "./interactions/voice-adjustment"
import type { SecurityMiddlewareProvider } from "./security/security-middleware"
import { securityOutputMiddleware, createSecurityQuarantine } from "./security/security-middleware"
import { isFeatureEnabled, type PWKillSwitchConfig } from "./security/pw-kill-switch"
import type { ImmutableFact } from "@/types"
import { runModerationPipeline } from "./moderation/auto-moderator"

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

  /** 특정 포스트에 이미 댓글을 달았는지 확인 */
  hasCommented?(personaId: string, postId: string): Promise<boolean>

  /** DB에서 페르소나 voiceProfile JSON 조회 (콜드스타트 fallback용) */
  getVoiceProfile?(personaId: string): Promise<unknown | null>

  // ── T258: 자율 팔로우 ──

  /** 팔로우 저장 */
  saveFollow?(followerPersonaId: string, followingPersonaId: string): Promise<void>

  /** 교차축 83축 유사도 (0~1) */
  getCrossAxisSimilarity?(personaAId: string, personaBId: string): Promise<number>

  /** Paradox 호환성 (0~1) */
  getParadoxCompatibility?(personaAId: string, personaBId: string): Promise<number>

  /** 페르소나 상태 조회 */
  getPersonaState?(personaId: string): Promise<PersonaStateData>

  // ── T259: 자율 리포스트 ──

  /** 리포스트 저장 */
  saveRepost?(personaId: string, postId: string): Promise<void>

  /** v4.0: 품질 로그 DB 저장 (T288) */
  saveCommentQualityLog?(input: CommentQualityLogInput): Promise<void>
}

/** v4.0 보안 옵션 */
export interface InteractionSecurityOptions {
  killSwitch?: PWKillSwitchConfig
  securityProvider?: SecurityMiddlewareProvider
  immutableFacts?: ImmutableFact[]
}

export interface InteractionExecutionResult {
  likes: Array<{ postId: string; authorId: string }>
  comments: Array<{ postId: string; authorId: string; commentId: string }>
  reposts: Array<{ postId: string; authorId: string }>
  follows: Array<{ targetPersonaId: string; score: number }>
  totalTokensUsed: number
  /** v4.0: 보안으로 스킵된 댓글 수 */
  securityBlockedComments?: number
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
  commentLLMProvider?: CommentLLMProvider,
  securityOptions?: InteractionSecurityOptions
): Promise<InteractionExecutionResult> {
  const likes: InteractionExecutionResult["likes"] = []
  const comments: InteractionExecutionResult["comments"] = []
  const reposts: InteractionExecutionResult["reposts"] = []
  const follows: InteractionExecutionResult["follows"] = []
  let totalTokensUsed = 0
  let securityBlockedComments = 0

  // Step 0: Kill Switch 확인 (T285)
  if (securityOptions?.killSwitch) {
    if (!isFeatureEnabled(securityOptions.killSwitch, "commentGeneration")) {
      // 댓글 비활성 — 좋아요/리포스트만 진행
      console.log("[InteractionPipeline] commentGeneration disabled by kill switch")
    }
    if (!isFeatureEnabled(securityOptions.killSwitch, "likeInteraction")) {
      return { likes, comments, reposts, follows, totalTokensUsed: 0, securityBlockedComments: 0 }
    }
  }

  // Step 1: 최근 피드 포스트 조회 (최대 10개)
  const feedPosts = await dataProvider.getRecentFeedPosts(persona.id, 10)

  if (feedPosts.length === 0) {
    return { likes, comments, reposts, follows, totalTokensUsed: 0 }
  }

  // Phase RA: 루프 전 페르소나 벡터 캐싱 + L2 갈등 패턴 분류
  // 포스트마다 벡터를 재조회하던 것을 한 번으로 통합
  const personaVectors = await dataProvider.getPersonaVectors(persona.id)
  const l2Result = classifyL2Pattern(personaVectors.temperament)
  const l2Pattern = l2Result.pattern // L2ConflictPattern 문자열

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
    // P2002(unique constraint) 방어: 이미 좋아요한 포스트면 중복 저장 스킵하고 liked로 처리
    let alreadyLiked = false
    if (Math.random() < adjustedLikeProbability) {
      const likeProvenance = computeInteractionProvenance({
        source: "SYSTEM",
        propagationDepth: 0,
      })

      try {
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
      } catch (error) {
        // P2002: 이미 좋아요한 포스트 — 중복 무시하고 댓글 단계로 진행
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          alreadyLiked = true
        } else {
          throw error
        }
      }
    }

    // T259: 리포스트 판정 — 좋아요 이후, 댓글 전
    const liked = alreadyLiked || likes.some((l) => l.postId === post.id)
    if (!liked) continue // 좋아요 없으면 리포스트/댓글도 없음

    if (dataProvider.saveRepost) {
      const repostProb = computeRepostProbability(matchScore, interactivity, state.mood)
      if (Math.random() < repostProb) {
        try {
          await dataProvider.saveRepost(persona.id, post.id)
          reposts.push({ postId: post.id, authorId: post.authorId })

          await dataProvider.updateRelationship(persona.id, post.authorId, "repost")

          await dataProvider.saveActivityLog({
            personaId: persona.id,
            activityType: "POST_REPOSTED",
            targetId: post.id,
            metadata: { probability: repostProb, matchScore },
          })
        } catch (error) {
          // P2002: 이미 리포스트한 포스트 — 중복 무시
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
            throw error
          }
        }
      }
    }

    // Phase RA: 댓글 여부 결정 — L2 기질 + tension 기반 Engagement Decision
    // L2 패턴 + tension → skip/react_only/comment 확률적 결정

    // 이미 이 포스트에 댓글을 달았으면 스킵 (중복 댓글 방지)
    if (dataProvider.hasCommented) {
      const already = await dataProvider.hasCommented(persona.id, post.id)
      if (already) continue
    }

    const currentTension = (relationship ?? DEFAULT_RELATIONSHIP).tension
    const engagementDecision = decideEngagement(l2Pattern, currentTension)

    if (engagementDecision.action !== "comment") {
      // skip 또는 react_only: 댓글 생략, 억제 이유 로깅
      await dataProvider.saveActivityLog({
        personaId: persona.id,
        activityType: "COMMENT_SUPPRESSED",
        targetId: post.id,
        metadata: {
          action: engagementDecision.action,
          reason: engagementDecision.reason,
          suppressedBy: engagementDecision.suppressedBy,
          l2Pattern,
          tension: currentTension,
        },
      })
      continue
    }

    // engagement === "comment": Voice Adjustment 계산 후 댓글 생성
    const voiceAdj = computeVoiceAdjustment(l2Pattern, currentTension)
    const mergedTones = mergeAllowedTones(relProfile.protocol.allowedTones, voiceAdj)

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
      region: persona.region,
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
        relationMemory: summarizeRelationship(rel, relProfile),
        interestContinuity: "",
        consumptionMemory: "",
      },
      commenterState: state,
      personaProfile,
      allowedTones: mergedTones, // Phase RA: voice adjustment 적용된 톤 필터
    }

    const commentDataProvider: CommentDataProvider = {
      getPostContent: async () => post.content,
      getPersonaVectors: async () => personaVectors, // 캐시된 벡터 재사용
      getParadoxScore: async () => persona.paradoxScore,
      saveCommentLog: async () => {},
    }

    // Kill Switch: 댓글 생성 비활성이면 스킵 (T285)
    if (
      securityOptions?.killSwitch &&
      !isFeatureEnabled(securityOptions.killSwitch, "commentGeneration")
    ) {
      continue
    }

    const commentResult: CommentResult = await generateComment(
      commentInput,
      personaVectors, // 캐시된 벡터 재사용
      commentDataProvider,
      commentLLMProvider
    )

    // Output Sentinel: 댓글 생성 후 보안 검사 (T281)
    if (securityOptions?.securityProvider) {
      const outputCheck = securityOutputMiddleware(
        commentResult.content,
        securityOptions.immutableFacts
      )

      if (!outputCheck.passed) {
        // BLOCKED — 댓글 스킵 + quarantine 기록 (T281 AC2)
        await createSecurityQuarantine(securityOptions.securityProvider, {
          contentType: "COMMENT",
          contentId: `comment-${persona.id}-${post.id}-${Date.now()}`,
          personaId: persona.id,
          sentinelResult: outputCheck.sentinelResult,
        })

        await dataProvider.saveActivityLog({
          personaId: persona.id,
          activityType: "COMMENT_BLOCKED_SECURITY",
          targetId: post.id,
          metadata: {
            reason: outputCheck.reason,
            violations: outputCheck.sentinelResult.violations.length,
          },
        })

        securityBlockedComments++
        continue // 이 포스트에 대한 댓글 스킵
      }
    }

    // Moderation Pipeline Stage 1+2: 댓글 모더레이션 (T294)
    const moderationResult = runModerationPipeline(commentResult.content)
    if (moderationResult.action === "BLOCK") {
      // BLOCK → 댓글 스킵 + ModerationLog (T294 AC2)
      if (securityOptions?.securityProvider) {
        await securityOptions.securityProvider.saveModerationLog({
          contentType: "COMMENT",
          contentId: `comment-blocked-${persona.id}-${post.id}-${Date.now()}`,
          personaId: persona.id,
          stage: `STAGE_${moderationResult.stage}`,
          verdict: "BLOCK",
          violations: moderationResult.detections,
        })
      }

      await dataProvider.saveActivityLog({
        personaId: persona.id,
        activityType: "COMMENT_BLOCKED_MODERATION",
        targetId: post.id,
        metadata: {
          stage: moderationResult.stage,
          detections: moderationResult.detections.map((d) => d.type),
        },
      })

      securityBlockedComments++
      continue
    }

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

    // 품질 로그 자동 생성 (T288 — side effect, 실패해도 댓글 중단 안 함)
    if (dataProvider.saveCommentQualityLog) {
      try {
        await dataProvider.saveCommentQualityLog({
          commentId: saved.id,
          personaId: persona.id,
          toneMatch: commentResult.tone.confidence,
          contextRelevance: 0.7,
          memoryReference: false,
          naturalness: 0.7,
          overallScore: commentResult.tone.confidence,
        })
      } catch (err) {
        console.error(`[InteractionPipeline] Comment quality log failed for ${saved.id}:`, err)
      }
    }

    await dataProvider.saveActivityLog({
      personaId: persona.id,
      activityType: "POST_COMMENTED",
      targetId: post.id,
      metadata: {
        commentId: saved.id,
        tone: commentResult.tone.tone,
        expressApplied: commentResult.expressApplied,
        provenance: commentProvenance,
        // Phase RA: engagement 결정 컨텍스트 메타데이터
        engagementContext: {
          l2Pattern,
          tension: currentTension,
          voiceAdjApplied: voiceAdj !== null,
          tonesFiltered: mergedTones !== relProfile.protocol.allowedTones,
        },
      },
    })
  }

  // T258: 팔로우 판정 — 인터랙션한 고유 작성자 대상
  // Kill Switch: followInteraction 비활성이면 스킵 (T285)
  const followEnabled =
    !securityOptions?.killSwitch ||
    isFeatureEnabled(securityOptions.killSwitch, "followInteraction")
  if (
    followEnabled &&
    dataProvider.saveFollow &&
    dataProvider.getCrossAxisSimilarity &&
    dataProvider.getParadoxCompatibility
  ) {
    // 좋아요한 포스트 작성자 중 고유 ID 추출
    const interactedAuthorIds = [...new Set(likes.map((l) => l.authorId))]

    for (const authorId of interactedAuthorIds) {
      const alreadyFollowing = await dataProvider.isFollowing(persona.id, authorId)
      if (alreadyFollowing) continue

      const [basicMatch, crossAxis, paradoxCompat] = await Promise.all([
        dataProvider.getBasicMatchScore(persona.id, authorId),
        dataProvider.getCrossAxisSimilarity(persona.id, authorId),
        dataProvider.getParadoxCompatibility(persona.id, authorId),
      ])

      const sociability = personaVectors.social.sociability
      const score = computeFollowScore(basicMatch, crossAxis, paradoxCompat)
      const probability = computeFollowProbability(score, sociability)

      if (probability > 0 && Math.random() < probability) {
        try {
          await dataProvider.saveFollow(persona.id, authorId)
          follows.push({ targetPersonaId: authorId, score })

          await dataProvider.updateRelationship(persona.id, authorId, "follow")

          await dataProvider.saveActivityLog({
            personaId: persona.id,
            activityType: "PERSONA_FOLLOWED",
            targetId: authorId,
            metadata: { score, probability, breakdown: { basicMatch, crossAxis, paradoxCompat } },
          })
        } catch (error) {
          // P2002: 이미 팔로우 — 중복 무시
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
            throw error
          }
        }
      }
    }
  }

  // Step 5: PersonaState 업데이트 (댓글 작성마다 state 갱신)
  for (const _comment of comments) {
    await updatePersonaState(persona.id, {
      type: "comment_created",
      tokensUsed: 0,
    })
  }

  return {
    likes,
    comments,
    reposts,
    follows,
    totalTokensUsed,
    securityBlockedComments: securityBlockedComments > 0 ? securityBlockedComments : undefined,
  }
}
