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
import {
  triggerNewsReactionPosts,
  runDailyNewsReactions,
  formatNewsArticleTopic,
} from "@/lib/persona-world/news"
import type { NewsReactionDataProvider, DailyNewsDataProvider } from "@/lib/persona-world/news"

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

      case "trigger_news_article": {
        // Phase NB: 특정 뉴스 기사 → 관심 페르소나 → NEWS_REACTION 포스트 생성
        const { articleId } = body as { action: string; articleId?: string }
        if (!articleId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "articleId required" } },
            { status: 400 }
          )
        }

        const article = await prisma.newsArticle.findUnique({
          where: { id: articleId },
          select: { id: true, title: true, summary: true, topicTags: true, region: true },
        })
        if (!article) {
          return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "NewsArticle not found" } },
            { status: 404 }
          )
        }

        const llmAvailable = isLLMConfigured()
        const newsReactionProvider = createNewsReactionDataProvider()
        const scheduled = await triggerNewsReactionPosts(article, newsReactionProvider)

        // 각 선정된 페르소나에 대해 포스트 생성 실행
        const createdPosts: Array<{ personaId: string; postId: string }> = []

        for (const reaction of scheduled) {
          try {
            const schedulerPersonas =
              await await createSchedulerDataProvider().getActiveStatusPersonas()
            const persona = schedulerPersonas.find((p) => p.id === reaction.personaId)
            if (!persona) continue

            const state = await getPersonaState(persona.id)
            const topic = formatNewsArticleTopic(article.title, article.summary)
            const newsPostProvider = createNewsPostPipelineProvider(topic)
            const llmProvider = llmAvailable ? createPostLLMProvider(persona.id) : undefined
            if (!llmProvider) continue

            const postResult = await executePostCreation(
              persona,
              {
                shouldPost: true,
                shouldInteract: false,
                postType: "NEWS_REACTION" as PersonaPostType,
              },
              {
                trigger: "TRENDING",
                currentHour: new Date().getHours(),
                triggerData: { topicId: articleId },
              },
              state,
              llmProvider,
              newsPostProvider
            )

            // 뉴스 기사와 포스트 연결
            await prisma.personaPost.update({
              where: { id: postResult.postId },
              data: { newsArticleId: articleId },
            })

            createdPosts.push({ personaId: reaction.personaId, postId: postResult.postId })
          } catch (err) {
            console.error(`[NewsReaction] Post creation failed for ${reaction.personaId}:`, err)
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            articleId,
            articleTitle: article.title,
            selectedPersonas: scheduled.length,
            postsCreated: createdPosts,
            llmAvailable,
          },
        })
      }

      case "daily_news": {
        // T199: 일일 자동 뉴스 반응 파이프라인
        // 점수 분포 기반으로 반응 인원 결정 — 하드코딩 상한 없음
        const {
          dailyBudget = 20,
          maxPerPersona = 2,
          withinHours = 24,
        } = body as {
          action: string
          dailyBudget?: number
          maxPerPersona?: number
          withinHours?: number
        }

        const llmAvailable = isLLMConfigured()
        const dailyProvider = createDailyNewsDataProvider()
        const scheduled = await runDailyNewsReactions(dailyProvider, {
          dailyBudget,
          maxPerPersona,
          withinHours,
        })

        const createdPosts: Array<{ personaId: string; postId: string; articleId: string }> = []
        const schedulerDP = createSchedulerDataProvider()

        for (const reaction of scheduled) {
          try {
            const schedulerPersonas = await schedulerDP.getActiveStatusPersonas()
            const persona = schedulerPersonas.find((p) => p.id === reaction.personaId)
            if (!persona) continue

            const articleData = await prisma.newsArticle.findUnique({
              where: { id: reaction.articleId },
              select: { title: true, summary: true },
            })
            if (!articleData) continue

            const state = await getPersonaState(persona.id)
            const topic = formatNewsArticleTopic(articleData.title, articleData.summary)
            const newsPostProvider = createNewsPostPipelineProvider(topic)
            const llmProvider = llmAvailable ? createPostLLMProvider(persona.id) : undefined
            if (!llmProvider) continue

            const postResult = await executePostCreation(
              persona,
              {
                shouldPost: true,
                shouldInteract: false,
                postType: "NEWS_REACTION" as PersonaPostType,
              },
              {
                trigger: "TRENDING",
                currentHour: new Date().getHours(),
                triggerData: { topicId: reaction.articleId },
              },
              state,
              llmProvider,
              newsPostProvider
            )

            await prisma.personaPost.update({
              where: { id: postResult.postId },
              data: { newsArticleId: reaction.articleId },
            })

            createdPosts.push({
              personaId: reaction.personaId,
              postId: postResult.postId,
              articleId: reaction.articleId,
            })
          } catch (err) {
            console.error(`[DailyNews] Post creation failed for ${reaction.personaId}:`, err)
          }
        }

        // 기사별 반응 집계
        const byArticle = createdPosts.reduce(
          (acc, p) => {
            acc[p.articleId] = (acc[p.articleId] ?? 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        return NextResponse.json({
          success: true,
          data: {
            scheduledReactions: scheduled.length,
            postsCreated: createdPosts.length,
            byArticle,
            llmAvailable,
          },
        })
      }

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

// ── Phase NB: News Reaction 전용 데이터 프로바이더 ─────────────

function createNewsReactionDataProvider(): NewsReactionDataProvider {
  return {
    async getActivePersonas() {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        select: {
          id: true,
          role: true,
          expertise: true,
          country: true,
          languages: true,
          layerVectors: {
            where: { layerType: "TEMPERAMENT" },
            select: { dim1: true, dim2: true, dim3: true, dim4: true, dim5: true },
            take: 1,
          },
        },
      })

      return personas.map((p) => {
        const l2 = p.layerVectors[0]
        return {
          id: p.id,
          expertise: (p.expertise as string[]) ?? [],
          role: p.role ?? null,
          country: p.country ?? "KR",
          languages: (p.languages as string[]) ?? [],
          temperament: {
            openness: Number(l2?.dim1 ?? 0.5),
            conscientiousness: Number(l2?.dim2 ?? 0.5),
            extraversion: Number(l2?.dim3 ?? 0.5),
            agreeableness: Number(l2?.dim4 ?? 0.5),
            neuroticism: Number(l2?.dim5 ?? 0.5),
          },
        }
      })
    },

    async hasReactedToArticle(personaId, articleId) {
      const existing = await prisma.personaPost.findFirst({
        where: { personaId, newsArticleId: articleId },
        select: { id: true },
      })
      return !!existing
    },

    async scheduleNewsReactionPost({ personaId, articleId, interestScore }) {
      await prisma.personaActivityLog.create({
        data: {
          personaId,
          activityType: "SYSTEM",
          trigger: "TRENDING",
          metadata: {
            action: "news_reaction_scheduled",
            newsArticleId: articleId,
            interestScore,
          } as Prisma.InputJsonValue,
        },
      })
    },

    async markArticleTriggered(_articleId, _triggerCount) {
      // no-op (로그로 추적)
    },
  }
}

/** T199: Daily 자동 뉴스 반응용 데이터 프로바이더 */
function createDailyNewsDataProvider(): DailyNewsDataProvider {
  const base = createNewsReactionDataProvider()
  return {
    ...base,

    async getRecentArticles(withinHours) {
      const since = new Date(Date.now() - withinHours * 60 * 60 * 1000)
      const articles = await prisma.newsArticle.findMany({
        where: { publishedAt: { gte: since } },
        select: {
          id: true,
          title: true,
          summary: true,
          topicTags: true,
          region: true,
        },
        orderBy: { publishedAt: "desc" },
      })
      return articles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary ?? "",
        topicTags: (a.topicTags as string[]) ?? [],
        region: a.region ?? "GLOBAL",
      }))
    },

    async getPersonaNewsReactionCountToday(personaId) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      return prisma.personaPost.count({
        where: {
          personaId,
          type: "NEWS_REACTION",
          createdAt: { gte: todayStart },
        },
      })
    },
  }
}

/** Phase NB: 뉴스 반응 포스트 생성용 PostPipelineDataProvider (topic 고정) */
function createNewsPostPipelineProvider(newsTopic: string): PostPipelineDataProvider {
  const base = createPostPipelineProvider("TRENDING")
  return {
    ...base,
    async selectTopic(_personaId, _trigger) {
      return newsTopic
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
