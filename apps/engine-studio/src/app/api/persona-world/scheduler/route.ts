import { NextRequest, NextResponse } from "next/server"
import { Prisma, type PersonaActivityType } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { runScheduler, getActivePersonas } from "@/lib/persona-world/scheduler"
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
import { getConsumptionContext } from "@/lib/persona-world/consumption-manager"
import { getPersonaState } from "@/lib/persona-world/state-manager"
import { resolveMentions, notifyMentions } from "@/lib/persona-world/mention-service"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/persona-world/scheduler
 *
 * 자율 활동 스케줄러 실행 (cron trigger).
 *
 * Body:
 * - trigger: SchedulerTrigger (기본 "SCHEDULED")
 * - currentHour: number (기본 현재 시각)
 * - triggerData?: { contentId?, userId?, personaId?, topicId? }
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))

    const trigger: SchedulerTrigger = body.trigger ?? "SCHEDULED"
    const currentHour: number = body.currentHour ?? new Date().getHours()
    const triggerData = body.triggerData

    const context: SchedulerContext = {
      trigger,
      currentHour,
      triggerData,
    }

    // DB provider 구현
    const schedulerProvider: SchedulerDataProvider = {
      async getActiveStatusPersonas(): Promise<SchedulerPersona[]> {
        const personas = await prisma.persona.findMany({
          where: {
            status: { in: ["ACTIVE", "STANDARD"] },
          },
          include: {
            layerVectors: true,
          },
        })

        return personas.flatMap((p): SchedulerPersona[] => {
          const l1 = p.layerVectors.find((v) => v.layerType === "SOCIAL")
          const l2 = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
          const l3 = p.layerVectors.find((v) => v.layerType === "NARRATIVE")

          if (!l1 || !l2 || !l3) return []

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
            },
          ]
        })
      },
    }

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

    for (const decision of schedulerResult.decisions) {
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
          const commentLLM = llmAvailable ? createCommentLLMProvider(persona.id) : undefined

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

    return NextResponse.json({
      success: true,
      data: {
        ...schedulerResult,
        execution: {
          postsCreated: postResults,
          interactions: interactionResults,
          llmAvailable,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "SCHEDULER_ERROR", message },
      },
      { status: 500 }
    )
  }
}

// ── Data Provider 팩토리 ─────────────────────────────────────

function createPostPipelineDataProvider(): PostPipelineDataProvider {
  return {
    async savePost({ personaId, type, content, metadata, postSource }) {
      const post = await prisma.personaPost.create({
        data: {
          personaId,
          type,
          content,
          metadata: metadata as Prisma.InputJsonValue,
          postSource: postSource ?? "AUTONOMOUS",
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

      const l1 = vectors.find((v) => v.layerType === "SOCIAL")
      const l2 = vectors.find((v) => v.layerType === "TEMPERAMENT")
      const l3 = vectors.find((v) => v.layerType === "NARRATIVE")

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

    async saveLike(personaId, postId, _provenance) {
      await prisma.personaPostLike.create({
        data: { personaId, postId },
      })
      // provenance는 saveActivityLog metadata에서 추적
    },

    async saveComment(personaId, postId, content, _provenance) {
      const comment = await prisma.personaComment.create({
        data: { personaId, postId, content },
      })
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
