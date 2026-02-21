import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
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
import { getConsumptionContext } from "@/lib/persona-world/consumption-manager"
import { getPersonaState } from "@/lib/persona-world/state-manager"
import { resolveMentions, notifyMentions } from "@/lib/persona-world/mention-service"

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let activePersonaCount = 0
    let pausedPersonas: Array<{ id: string; name: string }> = []
    let todayPostCount = 0
    let recentLogs: Array<{
      id: string
      personaId: string
      activityType: string
      createdAt: Date
    }> = []

    try {
      ;[activePersonaCount, pausedPersonas, todayPostCount, recentLogs] = await Promise.all([
        prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
        prisma.persona.findMany({
          where: { status: "PAUSED" },
          select: { id: true, name: true },
        }),
        prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaActivityLog.findMany({
          where: { trigger: { in: ["SCHEDULED", "MANUAL"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ])
    } catch {
      // DB not ready — return empty data
    }

    const lastRunAt = recentLogs.length > 0 ? recentLogs[0].createdAt.toISOString() : null

    return NextResponse.json({
      success: true,
      data: {
        isActive: activePersonaCount > 0,
        activePersonaCount,
        pausedPersonas,
        todayPostCount,
        lastRunAt,
        recentRuns: recentLogs.map((log) => ({
          id: log.id,
          personaId: log.personaId,
          activityType: log.activityType,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SCHEDULER_READ_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action, personaId } = body as { action: string; personaId?: string }

    switch (action) {
      case "trigger_now": {
        // 내부 함수 직접 호출 (self-fetch 제거)
        const context: SchedulerContext = {
          trigger: "MANUAL",
          currentHour: new Date().getHours(),
        }

        const schedulerProvider = createSchedulerDataProvider()

        let schedulerResult
        try {
          schedulerResult = await runScheduler(context, schedulerProvider)
        } catch (schedulerError) {
          const msg =
            schedulerError instanceof Error ? schedulerError.message : "Unknown scheduler error"
          console.error("[Scheduler] runScheduler failed:", schedulerError)
          return NextResponse.json(
            {
              success: false,
              error: { code: "SCHEDULER_RUN_ERROR", message: msg },
            },
            { status: 500 }
          )
        }

        // 실행: 포스트 생성 + 인터랙션
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
              const postDataProvider = createPostPipelineProvider(context.trigger)

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
              console.error(`[Scheduler] Post creation failed for ${decision.personaId}:`, err)
            }
          }

          if (decision.shouldInteract) {
            try {
              const persona = (await schedulerProvider.getActiveStatusPersonas()).find(
                (p) => p.id === decision.personaId
              )
              if (!persona) continue

              const state = await getPersonaState(persona.id)
              const interactionDP = createInteractionProvider(context.trigger)
              const commentLLM = llmAvailable ? createCommentLLMProvider(persona.id) : undefined

              const result = await executeInteractions(persona, state, interactionDP, commentLLM)

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
            message: `스케줄러 실행 완료 (LLM: ${llmAvailable ? "활성" : "비활성"})`,
            result: {
              ...schedulerResult,
              execution: {
                postsCreated: postResults,
                interactions: interactionResults,
                llmAvailable,
              },
            },
          },
        })
      }

      case "resume_persona":
        if (!personaId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "personaId required" } },
            { status: 400 }
          )
        }
        await prisma.persona.update({
          where: { id: personaId },
          data: { status: "ACTIVE" },
        })
        return NextResponse.json({
          success: true,
          data: { action, personaId },
        })

      case "pause_persona":
        if (!personaId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "personaId required" } },
            { status: 400 }
          )
        }
        await prisma.persona.update({
          where: { id: personaId },
          data: { status: "PAUSED" },
        })
        return NextResponse.json({
          success: true,
          data: { action, personaId },
        })

      default:
        return NextResponse.json(
          { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SCHEDULER_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── Data Provider 팩토리 (스케줄러 파이프라인용) ─────────────

function createSchedulerDataProvider(): SchedulerDataProvider {
  return {
    async getActiveStatusPersonas(): Promise<SchedulerPersona[]> {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        select: {
          id: true,
          name: true,
          status: true,
          paradoxScore: true,
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

    async saveActivityLog({ personaId, decision, context: ctx, stateSnapshot }) {
      if (!decision.shouldPost && !decision.shouldInteract) return

      await prisma.personaActivityLog.create({
        data: {
          personaId,
          activityType: decision.shouldPost ? "POST_CREATED" : "POST_COMMENTED",
          trigger: ctx.trigger,
          postTypeReason: (decision.postTypeReason ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          stateSnapshot: stateSnapshot as unknown as Prisma.InputJsonValue,
        },
      })
    },
  }
}

function createPostPipelineProvider(
  trigger: SchedulerTrigger = "MANUAL"
): PostPipelineDataProvider {
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
          trigger,
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

function createInteractionProvider(
  trigger: SchedulerTrigger = "MANUAL"
): InteractionPipelineDataProvider {
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
          trigger,
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
