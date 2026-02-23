import { NextRequest, NextResponse } from "next/server"
import { Prisma, type PersonaActivityType } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { runScheduler } from "@/lib/persona-world/scheduler"
import type { SchedulerPersona, SchedulerDataProvider } from "@/lib/persona-world/scheduler"
import type { SchedulerContext, PersonaPostType } from "@/lib/persona-world/types"
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

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 min for processing many personas

/**
 * GET /api/cron/persona-scheduler
 *
 * External cron trigger for autonomous persona scheduler.
 * Called hourly by Vercel Cron / GitHub Actions / etc.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check (fail-closed: CRON_SECRET 없으면 거부)
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "CRON_SECRET not configured" } },
        { status: 500 }
      )
    }
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      )
    }

    // 내부 함수 직접 호출 (self-fetch 제거)
    const context: SchedulerContext = {
      trigger: "SCHEDULED",
      currentHour: new Date().getHours(),
    }

    const schedulerProvider = createSchedulerDataProvider()
    const schedulerResult = await runScheduler(context, schedulerProvider)

    const postResults: Array<{ personaId: string; postId: string; postType: string }> = []
    const interactionResults: Array<{ personaId: string; likes: number; comments: number }> = []
    const llmAvailable = isLLMConfigured()

    for (const decision of schedulerResult.decisions) {
      if (decision.shouldPost && llmAvailable) {
        try {
          const persona = (await schedulerProvider.getActiveStatusPersonas()).find(
            (p) => p.id === decision.personaId
          )
          if (!persona) continue

          const state = await getPersonaState(persona.id)
          const llmProvider = createPostLLMProvider(persona.id)
          const postDataProvider = createPostPipelineProvider()

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
          console.error(`[Cron/Scheduler] Post creation failed for ${decision.personaId}:`, err)
        }
      }

      if (decision.shouldInteract) {
        try {
          const persona = (await schedulerProvider.getActiveStatusPersonas()).find(
            (p) => p.id === decision.personaId
          )
          if (!persona) continue

          const state = await getPersonaState(persona.id)
          const interactionDP = createInteractionProvider()
          const commentLLM = llmAvailable ? createCommentLLMProvider(persona.id) : undefined

          const result = await executeInteractions(persona, state, interactionDP, commentLLM)

          interactionResults.push({
            personaId: decision.personaId,
            likes: result.likes.length,
            comments: result.comments.length,
          })
        } catch (err) {
          console.error(`[Cron/Scheduler] Interaction failed for ${decision.personaId}:`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        executedAt: new Date().toISOString(),
        decisions: schedulerResult.decisions.length,
        postsCreated: postResults.length,
        interactions: interactionResults.length,
        llmAvailable,
        details: {
          ...schedulerResult,
          execution: { postsCreated: postResults, interactions: interactionResults },
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "CRON_ERROR", message } },
      { status: 500 }
    )
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
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        include: { layerVectors: true },
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
}

function createPostPipelineProvider(): PostPipelineDataProvider {
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

    async selectTopic() {
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

function createInteractionProvider(): InteractionPipelineDataProvider {
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

    async getBasicMatchScore() {
      return 0.5
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

    async saveLike(personaId, postId) {
      await prisma.personaPostLike.create({
        data: { personaId, postId },
      })
    },

    async saveComment(personaId, postId, content) {
      const comment = await prisma.personaComment.create({
        data: { personaId, postId, content },
      })
      return { id: comment.id }
    },

    async updateRelationship(personaAId, personaBId) {
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
