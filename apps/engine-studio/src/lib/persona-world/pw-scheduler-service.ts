// ═══════════════════════════════════════════════════════════════
// PersonaWorld Scheduler Service
// Business logic extracted from /api/persona-world/scheduler route
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import { Prisma, type PersonaActivityType } from "@/generated/prisma"
import { runScheduler } from "@/lib/persona-world/scheduler"
import type { SchedulerPersona, SchedulerDataProvider } from "@/lib/persona-world/scheduler"
import type { SchedulerContext, SchedulerTrigger, PersonaPostType } from "@/lib/persona-world/types"
import type { ThreeLayerVector } from "@/types/persona-v3"
import { executePostCreation } from "@/lib/persona-world/post-pipeline"
import type { PostPipelineDataProvider } from "@/lib/persona-world/post-pipeline"
import { executeInteractions } from "@/lib/persona-world/interaction-pipeline"
import type { InteractionPipelineDataProvider } from "@/lib/persona-world/interaction-pipeline"
import {
  createPostLLMProvider,
  createCommentLLMProvider,
  isLLMConfigured,
} from "@/lib/persona-world/llm-adapter"
import { getConsumptionContext, recordConsumption } from "@/lib/persona-world/consumption-manager"
import { getPersonaState } from "@/lib/persona-world/state-manager"
import { resolveMentions, notifyMentions } from "@/lib/persona-world/mention-service"
import { layerVectorsToMap } from "@/lib/vector/dim-maps"
import { isSchedulerEnabled } from "@/lib/persona-world/admin/scheduler-service"
import { SCHEDULING_DELAYS } from "@/lib/persona-world/constants"

// ── Input/Result types ──────────────────────────────────────────

export interface PwSchedulerInput {
  trigger: SchedulerTrigger
  currentHour: number
  triggerData?: {
    contentId?: string
    userId?: string
    personaId?: string
    topicId?: string
  }
}

export interface PwSchedulerResult {
  decisions: unknown[]
  execution: {
    postsCreated: Array<{ personaId: string; postId: string; postType: string }>
    interactions: Array<{ personaId: string; likes: number; comments: number }>
    llmAvailable: boolean
  }
  [key: string]: unknown
}

// ── Main execution ──────────────────────────────────────────────

export async function executePwScheduler(input: PwSchedulerInput): Promise<PwSchedulerResult> {
  // 스케줄러 비활성화 상태면 즉시 반환 (수동 트리거 제외)
  if (input.trigger === "SCHEDULED") {
    const enabled = await isSchedulerEnabled()
    if (!enabled) {
      console.log("[Scheduler] 스케줄러가 비활성화 상태입니다. 실행 건너뜀.")
      return {
        decisions: [],
        execution: { postsCreated: [], interactions: [], llmAvailable: false },
      }
    }
  }

  const context: SchedulerContext = {
    trigger: input.trigger,
    currentHour: input.currentHour,
    triggerData: input.triggerData,
  }

  // DB provider 구현
  const schedulerProvider = createSchedulerDataProvider()

  // Step 1: 스케줄러 실행 (결정만)
  const schedulerResult = await runScheduler(context, schedulerProvider)

  // Step 2: 결정 실행 (실제 포스트/인터랙션 생성)
  const postResults: Array<{ personaId: string; postId: string; postType: string }> = []
  const interactionResults: Array<{
    personaId: string
    likes: number
    comments: number
  }> = []

  const llmAvailable = isLLMConfigured()

  // 페르소나 간 랜덤 딜레이 — 수동 트리거도 자연스러운 간격 유지
  const manualMaxDelay = SCHEDULING_DELAYS.manualMaxPerPersonaDelayMs

  for (let i = 0; i < schedulerResult.decisions.length; i++) {
    const decision = schedulerResult.decisions[i]

    // 첫 번째 페르소나는 즉시 실행, 이후부터 랜덤 딜레이
    if (i > 0 && manualMaxDelay > 0) {
      const delayMs = Math.floor(Math.random() * manualMaxDelay)
      console.log(
        `[Scheduler] Persona ${decision.personaId} — ${(delayMs / 1000).toFixed(1)}s delay`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    // 포스트 생성 실행
    if (decision.shouldPost && llmAvailable) {
      try {
        const persona = (await schedulerProvider.getActiveStatusPersonas()).find(
          (p) => p.id === decision.personaId
        )
        if (!persona) continue

        const state = await getPersonaState(persona.id)
        const llmProvider = createPostLLMProvider(persona.id)
        const postDataProvider = createPostPipelineDataProvider()

        const postResult = await executePostCreation(
          persona,
          {
            shouldPost: true,
            shouldInteract: decision.shouldInteract,
            postType: decision.postType as PersonaPostType | undefined,
            postTypeReason: undefined,
          },
          context,
          state,
          llmProvider,
          postDataProvider
        )

        postResults.push({
          personaId: decision.personaId,
          postId: postResult.postId,
          postType: postResult.postType,
        })

        // 멘션 알림 (fire-and-forget) — 포스트 내 @handle 감지 시
        void resolveMentions(postResult.content).then((mentions) => {
          if (mentions.length > 0) {
            void notifyMentions({
              mentions,
              mentionerName: persona.name,
              postId: postResult.postId,
            })
          }
        })
      } catch (err) {
        console.error(`[Scheduler] Post creation failed for ${decision.personaId}:`, err)
      }
    }

    // 인터랙션 실행
    if (decision.shouldInteract) {
      try {
        const persona = (await schedulerProvider.getActiveStatusPersonas()).find(
          (p) => p.id === decision.personaId
        )
        if (!persona) continue

        const state = await getPersonaState(persona.id)
        const interactionDataProvider = createInteractionDataProvider()
        const commentLLM = llmAvailable
          ? createCommentLLMProvider(persona.id, {
              name: persona.name,
              role: persona.role,
              expertise: persona.expertise,
              description: persona.description,
              speechPatterns: persona.speechPatterns,
              quirks: persona.quirks,
              commentPrompt: persona.commentPrompt,
              voiceSpec: persona.voiceSpec,
              factbook: persona.factbook,
            })
          : undefined

        const result = await executeInteractions(
          persona,
          state,
          interactionDataProvider,
          commentLLM
        )

        interactionResults.push({
          personaId: decision.personaId,
          likes: result.likes.length,
          comments: result.comments.length,
        })
      } catch (err) {
        console.error(`[Scheduler] Interaction failed for ${decision.personaId}:`, err)
      }
    }
  }

  return {
    ...schedulerResult,
    execution: {
      postsCreated: postResults,
      interactions: interactionResults,
      llmAvailable,
    },
  }
}

// ── Data Provider 팩토리 ─────────────────────────────────────

function createSchedulerDataProvider(): SchedulerDataProvider {
  return {
    async getLastActivityAt(personaId: string): Promise<Date | null> {
      const log = await prisma.personaActivityLog.findFirst({
        where: { personaId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      return log?.createdAt ?? null
    },

    async getActiveStatusPersonas(): Promise<SchedulerPersona[]> {
      const personas = await prisma.persona.findMany({
        where: {
          status: { in: ["ACTIVE", "STANDARD"] },
        },
        include: {
          layerVectors: true,
        },
      })

      let missingVectors = 0

      const result = personas.flatMap((p): SchedulerPersona[] => {
        const layerMap = layerVectorsToMap(p.layerVectors)
        const l1 = layerMap.get("SOCIAL")
        const l2 = layerMap.get("TEMPERAMENT")
        const l3 = layerMap.get("NARRATIVE")

        if (!l1 || !l2 || !l3) {
          missingVectors++
          return []
        }

        const vectors: ThreeLayerVector = {
          social: {
            depth: Number(l1.dim1 ?? 0.5),
            lens: Number(l1.dim2 ?? 0.5),
            stance: Number(l1.dim3 ?? 0.5),
            scope: Number(l1.dim4 ?? 0.5),
            taste: Number(l1.dim5 ?? 0.5),
            purpose: Number(l1.dim6 ?? 0.5),
            sociability: Number(l1.dim7 ?? 0.5),
          },
          temperament: {
            openness: Number(l2.dim1 ?? 0.5),
            conscientiousness: Number(l2.dim2 ?? 0.5),
            extraversion: Number(l2.dim3 ?? 0.5),
            agreeableness: Number(l2.dim4 ?? 0.5),
            neuroticism: Number(l2.dim5 ?? 0.5),
          },
          narrative: {
            lack: Number(l3.dim1 ?? 0.5),
            moralCompass: Number(l3.dim2 ?? 0.5),
            volatility: Number(l3.dim3 ?? 0.5),
            growthArc: Number(l3.dim4 ?? 0.5),
          },
        }

        return [
          {
            id: p.id,
            name: p.name,
            status: p.status,
            vectors,
            paradoxScore: Number(p.paradoxScore ?? 0),
            region: p.region,
            role: p.role,
            expertise: p.expertise,
            description: p.description,
            speechPatterns: p.speechPatterns,
            quirks: p.quirks,
            postPrompt: p.postPrompt,
            commentPrompt: p.commentPrompt,
            voiceSpec: p.voiceSpec,
            factbook: p.factbook,
            postFrequency: p.postFrequency,
            activeHours: p.activeHours,
            peakHours: p.peakHours,
            triggerMap: p.triggerMap,
            knowledgeAreas: p.knowledgeAreas,
          },
        ]
      })

      if (personas.length > 0 || missingVectors > 0) {
        console.log(
          `[Scheduler] DB 조회: ACTIVE/STANDARD ${personas.length}명, ` +
            `벡터 완비 ${result.length}명, 벡터 미완 ${missingVectors}명`
        )
      }

      return result
    },
  }
}

function createPostPipelineDataProvider(): PostPipelineDataProvider {
  return {
    async savePost({ personaId, type, content, metadata, postSource, locationTag, hashtags }) {
      const post = await prisma.personaPost.create({
        data: {
          personaId,
          type,
          content,
          metadata: metadata as Prisma.InputJsonValue,
          postSource: postSource ?? "AUTONOMOUS",
          locationTag: locationTag ?? null,
          hashtags: hashtags ?? [],
        },
      })
      return { id: post.id }
    },

    async getRecentPostTexts(personaId, count) {
      const posts = await prisma.personaPost.findMany({
        where: { personaId },
        orderBy: { createdAt: "desc" },
        take: count,
        select: { content: true },
      })
      return posts.map((p) => p.content)
    },

    async getConsumptionContext(personaId) {
      return getConsumptionContext(personaId)
    },

    async saveActivityLog({ personaId, activityType, metadata }) {
      await prisma.personaActivityLog.create({
        data: {
          personaId,
          activityType: activityType as PersonaActivityType,
          trigger: "SCHEDULED",
          metadata: metadata as Prisma.InputJsonValue,
        },
      })
    },

    async selectTopic(_personaId, _trigger) {
      // 간소화: 자유 주제 (향후 RAG 연동)
      return null
    },

    async getVoiceProfile(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { voiceProfile: true },
      })
      return persona?.voiceProfile ?? null
    },

    async getActivePersonaHandles(excludePersonaId) {
      const personas = await prisma.persona.findMany({
        where: {
          status: { in: ["ACTIVE", "STANDARD"] },
          id: { not: excludePersonaId },
          handle: { not: null },
        },
        select: { handle: true, name: true },
        take: 50,
      })
      return personas
        .filter((p): p is typeof p & { handle: string } => p.handle !== null)
        .map((p) => ({ handle: p.handle, name: p.name }))
    },

    async recordConsumption(personaId, record) {
      return recordConsumption(personaId, record)
    },
  }
}

function createInteractionDataProvider(): InteractionPipelineDataProvider {
  return {
    async getRecentFeedPosts(_personaId, limit) {
      const posts = await prisma.personaPost.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, personaId: true, content: true },
      })
      return posts.map((p) => ({
        id: p.id,
        authorId: p.personaId,
        content: p.content,
      }))
    },

    async getBasicMatchScore(_a, _b) {
      return 0.5 // 간소화: 향후 매칭 엔진 연동
    },

    async isFollowing(followerId, targetId) {
      const follow = await prisma.personaFollow.findUnique({
        where: {
          followerPersonaId_followingPersonaId: {
            followerPersonaId: followerId,
            followingPersonaId: targetId,
          },
        },
      })
      return !!follow
    },

    async getRelationship(personaAId, personaBId) {
      const rel = await prisma.personaRelationship.findFirst({
        where: {
          OR: [
            { personaAId, personaBId },
            { personaAId: personaBId, personaBId: personaAId },
          ],
        },
      })
      if (!rel) return null
      return {
        warmth: Number(rel.warmth),
        tension: Number(rel.tension),
        frequency: Number(rel.frequency),
        depth: Number(rel.depth),
        lastInteractionAt: rel.updatedAt ?? null,
      }
    },

    async getPersonaVectors(personaId) {
      const vectors = await prisma.personaLayerVector.findMany({
        where: { personaId },
      })

      const layerMap = layerVectorsToMap(vectors)
      const l1 = layerMap.get("SOCIAL")
      const l2 = layerMap.get("TEMPERAMENT")
      const l3 = layerMap.get("NARRATIVE")

      return {
        social: {
          depth: Number(l1?.dim1 ?? 0.5),
          lens: Number(l1?.dim2 ?? 0.5),
          stance: Number(l1?.dim3 ?? 0.5),
          scope: Number(l1?.dim4 ?? 0.5),
          taste: Number(l1?.dim5 ?? 0.5),
          purpose: Number(l1?.dim6 ?? 0.5),
          sociability: Number(l1?.dim7 ?? 0.5),
        },
        temperament: {
          openness: Number(l2?.dim1 ?? 0.5),
          conscientiousness: Number(l2?.dim2 ?? 0.5),
          extraversion: Number(l2?.dim3 ?? 0.5),
          agreeableness: Number(l2?.dim4 ?? 0.5),
          neuroticism: Number(l2?.dim5 ?? 0.5),
        },
        narrative: {
          lack: Number(l3?.dim1 ?? 0.5),
          moralCompass: Number(l3?.dim2 ?? 0.5),
          volatility: Number(l3?.dim3 ?? 0.5),
          growthArc: Number(l3?.dim4 ?? 0.5),
        },
      }
    },

    async getParadoxScore(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { paradoxScore: true },
      })
      return Number(persona?.paradoxScore ?? 0)
    },

    async hasCommented(personaId, postId) {
      const existing = await prisma.personaComment.findFirst({
        where: { personaId, postId, isHidden: false },
        select: { id: true },
      })
      return existing !== null
    },

    async saveLike(personaId, postId, _provenance) {
      await prisma.$transaction([
        prisma.personaPostLike.create({
          data: { personaId, postId },
        }),
        prisma.personaPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ])
      // provenance는 saveActivityLog metadata에서 추적
    },

    async saveComment(personaId, postId, content, _provenance) {
      const [comment] = await prisma.$transaction([
        prisma.personaComment.create({
          data: { personaId, postId, content },
        }),
        prisma.personaPost.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
        }),
      ])
      return { id: comment.id }
      // provenance는 saveActivityLog metadata에서 추적
    },

    async updateRelationship(personaAId, personaBId, _event) {
      await prisma.personaRelationship.upsert({
        where: {
          personaAId_personaBId: { personaAId, personaBId },
        },
        update: {
          frequency: { increment: 0.01 },
          lastInteractionAt: new Date(),
        },
        create: {
          personaAId,
          personaBId,
          warmth: 0.1,
          tension: 0,
          frequency: 0.01,
          depth: 0,
        },
      })
    },

    async saveActivityLog({ personaId, activityType, targetId, metadata }) {
      await prisma.personaActivityLog.create({
        data: {
          personaId,
          activityType: activityType as PersonaActivityType,
          trigger: "SCHEDULED",
          targetId: targetId ?? undefined,
          metadata: metadata as Prisma.InputJsonValue,
        },
      })
    },

    async getVoiceProfile(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { voiceProfile: true },
      })
      return persona?.voiceProfile ?? null
    },
  }
}
