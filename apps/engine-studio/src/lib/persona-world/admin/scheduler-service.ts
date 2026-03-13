// ═══════════════════════════════════════════════════════════════
// Scheduler Admin Service (v4.2)
// Business logic extracted from /api/internal/persona-world-admin/scheduler route
// v4.2: 전체 관계 계산 파이프라인 (attraction + 자율 stage/type)
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
  computeRelationshipUpdate,
  type InteractionEvent,
} from "@/lib/persona-world/interactions/relationship-manager"
import {
  determineStage,
  determineType,
} from "@/lib/persona-world/interactions/relationship-protocol"
import type { RelationshipMilestone } from "@/lib/persona-world/types"
import {
  createPostLLMProvider,
  createCommentLLMProvider,
  createNewsReactionPostLLMProvider,
  createNewsLLMProvider,
  isLLMConfigured,
} from "@/lib/persona-world/llm-adapter"
import { getConsumptionContext } from "@/lib/persona-world/consumption-manager"
import { getPersonaState } from "@/lib/persona-world/state-manager"
import { resolveMentions, notifyMentions } from "@/lib/persona-world/mention-service"
import {
  triggerNewsReactionPosts,
  runDailyNewsReactions,
  formatNewsArticleTopic,
  executeNewsAutoFetch,
} from "@/lib/persona-world/news"
import type {
  NewsReactionDataProvider,
  DailyNewsDataProvider,
  NewsAutoFetchDataProvider,
  AutoFetchResult,
} from "@/lib/persona-world/news"
import { layerVectorsToMap } from "@/lib/vector/dim-maps"
import { isFeatureEnabled, createDefaultConfig } from "@/lib/security/kill-switch"
import type { SystemSafetyConfig } from "@/lib/security/kill-switch"
import { executeContagionRound } from "@/lib/persona-world/contagion-integration"
import type {
  ContagionDataProvider,
  ContagionRoundLog,
} from "@/lib/persona-world/contagion-integration"
import type {
  ContagionPersonaState,
  ContagionEdge,
  ContagionSensitivity,
  NodeTopology,
} from "@/lib/persona-world/emotional-contagion"

// ── Scheduler enabled flag (DB-backed) ──────────────────────────

const SCHEDULER_CONFIG_CATEGORY = "SCHEDULER"
const SCHEDULER_ENABLED_KEY = "enabled"

/** DB에서 스케줄러 활성화 상태 조회 (기본: false — 명시적으로 켜야 동작) */
export async function isSchedulerEnabled(): Promise<boolean> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: {
        category_key: { category: SCHEDULER_CONFIG_CATEGORY, key: SCHEDULER_ENABLED_KEY },
      },
    })
    return row?.value === true
  } catch {
    return false
  }
}

/** DB에 스케줄러 활성화 상태 저장 */
export async function setSchedulerEnabled(enabled: boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: {
      category_key: { category: SCHEDULER_CONFIG_CATEGORY, key: SCHEDULER_ENABLED_KEY },
    },
    update: { value: enabled },
    create: {
      category: SCHEDULER_CONFIG_CATEGORY,
      key: SCHEDULER_ENABLED_KEY,
      value: enabled,
    },
  })
}

// ── Result types ─────────────────────────────────────────────────

export interface SchedulerStatusData {
  isActive: boolean
  /** 서버 스케줄러가 DB에서 활성화되어 있는지 */
  schedulerEnabled: boolean
  activePersonaCount: number
  pausedPersonas: Array<{ id: string; name: string }>
  todayPostCount: number
  lastRunAt: string | null
  recentRuns: Array<{
    id: string
    personaId: string
    activityType: string
    trigger: string
    createdAt: string
  }>
}

export interface TriggerNowResult {
  message: string
  result: {
    decisions: unknown[]
    execution: {
      postsCreated: Array<{ personaId: string; postId: string; postType: string }>
      interactions: Array<{ personaId: string; likes: number; comments: number }>
      llmAvailable: boolean
    }
    [key: string]: unknown
  }
}

export interface NewsArticleTriggerResult {
  articleId: string
  articleTitle: string
  selectedPersonas: number
  postsCreated: Array<{ personaId: string; postId: string }>
  llmAvailable: boolean
}

export interface DailyNewsResult {
  scheduledReactions: number
  postsCreated: number
  byArticle: Record<string, number>
  llmAvailable: boolean
}

// ── GET: Fetch scheduler status ─────────────────────────────────

export async function getSchedulerStatus(): Promise<SchedulerStatusData> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  let activePersonaCount = 0
  let pausedPersonas: Array<{ id: string; name: string }> = []
  let todayPostCount = 0
  let recentLogs: Array<{
    id: string
    personaId: string
    activityType: string
    trigger: string
    createdAt: Date
  }> = []

  let enabled = false

  try {
    ;[activePersonaCount, pausedPersonas, todayPostCount, recentLogs, enabled] = await Promise.all([
      prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
      prisma.persona.findMany({
        where: { status: "PAUSED" },
        select: { id: true, name: true },
      }),
      prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.personaActivityLog.findMany({
        where: { trigger: { in: ["SCHEDULED", "MANUAL", "TRENDING"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, personaId: true, activityType: true, trigger: true, createdAt: true },
      }),
      isSchedulerEnabled(),
    ])
  } catch {
    // DB not ready — return empty data
  }

  const lastRunAt = recentLogs.length > 0 ? recentLogs[0].createdAt.toISOString() : null

  return {
    isActive: activePersonaCount > 0,
    schedulerEnabled: enabled,
    activePersonaCount,
    pausedPersonas,
    todayPostCount,
    lastRunAt,
    recentRuns: recentLogs.map((log) => ({
      id: log.id,
      personaId: log.personaId,
      activityType: log.activityType,
      trigger: log.trigger,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

// ── POST: trigger_now ───────────────────────────────────────────

export async function triggerSchedulerNow(): Promise<TriggerNowResult> {
  const context: SchedulerContext = {
    trigger: "MANUAL",
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

  return {
    message: `스케줄러 실행 완료 (LLM: ${llmAvailable ? "활성" : "비활성"})`,
    result: {
      ...schedulerResult,
      execution: {
        postsCreated: postResults,
        interactions: interactionResults,
        llmAvailable,
      },
    },
  }
}

// ── POST: resume/pause persona ──────────────────────────────────

export async function resumePersona(
  personaId: string
): Promise<{ action: string; personaId: string }> {
  await prisma.persona.update({
    where: { id: personaId },
    data: { status: "ACTIVE" },
  })
  return { action: "resume_persona", personaId }
}

export async function pausePersona(
  personaId: string
): Promise<{ action: string; personaId: string }> {
  await prisma.persona.update({
    where: { id: personaId },
    data: { status: "PAUSED" },
  })
  return { action: "pause_persona", personaId }
}

// ── POST: trigger_contagion ────────────────────────────────────

export interface ContagionTriggerResult {
  message: string
  log: ContagionRoundLog
  requiresKillSwitch: boolean
}

export async function triggerContagionManual(): Promise<ContagionTriggerResult> {
  // Kill Switch 확인
  const safetyConfig = await loadSafetyConfigForAdmin()
  if (!isFeatureEnabled(safetyConfig, "emotionalContagion")) {
    throw new Error(
      "emotionalContagion이 Kill Switch에 의해 비활성화되어 있습니다. 보안 대시보드에서 활성화 후 재시도하세요."
    )
  }

  const provider = createAdminContagionDataProvider()
  const result = await executeContagionRound(provider)

  return {
    message: result.requiresKillSwitch
      ? `감정 전염 실행 — 집단 mood 위험 감지: ${result.log.safetyReason}`
      : `감정 전염 실행 완료 — ${result.log.affectedCount}명 영향`,
    log: result.log,
    requiresKillSwitch: result.requiresKillSwitch,
  }
}

async function loadSafetyConfigForAdmin(): Promise<SystemSafetyConfig> {
  const row = await prisma.systemSafetyConfig.findUnique({
    where: { id: "singleton" },
  })
  if (!row) return createDefaultConfig("system")

  return {
    emergencyFreeze: row.emergencyFreeze,
    freezeReason: row.freezeReason ?? undefined,
    freezeAt: row.freezeAt ? row.freezeAt.getTime() : undefined,
    featureToggles: row.featureToggles as unknown as SystemSafetyConfig["featureToggles"],
    autoTriggers: row.autoTriggers as unknown as SystemSafetyConfig["autoTriggers"],
    updatedAt: row.updatedAt.getTime(),
    updatedBy: row.updatedBy,
  }
}

function createAdminContagionDataProvider(): ContagionDataProvider {
  return {
    async getActivePersonaStates(): Promise<ContagionPersonaState[]> {
      const states = await prisma.personaState.findMany({
        where: {
          persona: { status: { in: ["ACTIVE", "STANDARD"] } },
        },
        select: {
          personaId: true,
          mood: true,
          energy: true,
          socialBattery: true,
          paradoxTension: true,
        },
      })
      return states.map((s) => ({
        personaId: s.personaId,
        mood: Number(s.mood),
        energy: Number(s.energy),
        socialBattery: Number(s.socialBattery),
        paradoxTension: Number(s.paradoxTension),
      }))
    },

    async getRelationshipEdges(): Promise<ContagionEdge[]> {
      const rels = await prisma.personaRelationship.findMany({
        select: {
          personaAId: true,
          personaBId: true,
          warmth: true,
          tension: true,
          frequency: true,
          lastInteractionAt: true,
        },
      })
      const edges: ContagionEdge[] = []
      for (const r of rels) {
        edges.push({
          sourceId: r.personaAId,
          targetId: r.personaBId,
          warmth: Number(r.warmth),
          tension: Number(r.tension),
          frequency: Number(r.frequency),
          lastInteractionAt: r.lastInteractionAt,
        })
        edges.push({
          sourceId: r.personaBId,
          targetId: r.personaAId,
          warmth: Number(r.warmth),
          tension: Number(r.tension),
          frequency: Number(r.frequency),
          lastInteractionAt: r.lastInteractionAt,
        })
      }
      return edges
    },

    async getSensitivities(personaIds: string[]): Promise<Map<string, ContagionSensitivity>> {
      const vectors = await prisma.personaLayerVector.findMany({
        where: { personaId: { in: personaIds }, layerType: "TEMPERAMENT" },
        select: { personaId: true, dim3: true, dim4: true, dim5: true },
      })
      const map = new Map<string, ContagionSensitivity>()
      for (const v of vectors) {
        map.set(v.personaId, {
          moodSensitivity: 0.5 + Number(v.dim5 ?? 0.5),
          socialOpenness: Number(v.dim3 ?? 0.5),
          agreeableness: Number(v.dim4 ?? 0.5),
        })
      }
      return map
    },

    async getTopologies(personaIds: string[]): Promise<Map<string, NodeTopology>> {
      const rels = await prisma.personaRelationship.findMany({
        where: { OR: [{ personaAId: { in: personaIds } }, { personaBId: { in: personaIds } }] },
        select: { personaAId: true, personaBId: true },
      })
      const degreeMap = new Map<string, Set<string>>()
      for (const id of personaIds) degreeMap.set(id, new Set())
      for (const r of rels) {
        degreeMap.get(r.personaAId)?.add(r.personaBId)
        degreeMap.get(r.personaBId)?.add(r.personaAId)
      }
      const map = new Map<string, NodeTopology>()
      const degrees = [...degreeMap.values()].map((s) => s.size)
      const avgDegree = degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0
      const hubThreshold = Math.max(avgDegree * 2, 5)
      for (const [id, neighbors] of degreeMap) {
        const totalDegree = neighbors.size
        let triangles = 0
        const arr = [...neighbors]
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            if (degreeMap.get(arr[i])?.has(arr[j])) triangles++
          }
        }
        const possible = (totalDegree * (totalDegree - 1)) / 2
        map.set(id, {
          personaId: id,
          totalDegree,
          clusteringCoefficient: possible > 0 ? triangles / possible : 0,
          isHub: totalDegree >= hubThreshold,
        })
      }
      return map
    },

    async updateMood(personaId: string, newMood: number): Promise<void> {
      await prisma.personaState.update({
        where: { personaId },
        data: { mood: newMood },
      })
    },

    async logContagionRound(log: ContagionRoundLog): Promise<void> {
      console.log(
        `[Contagion/Admin] Round: ${log.personaCount} personas, ${log.affectedCount} affected, ` +
          `mood ${log.averageMoodBefore.toFixed(3)}→${log.averageMoodAfter.toFixed(3)}, safety: ${log.safetyStatus}`
      )
    },
  }
}

// ── POST: trigger_news_article ──────────────────────────────────

export async function triggerNewsArticle(
  articleId: string
): Promise<NewsArticleTriggerResult | null> {
  const article = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      summary: true,
      topicTags: true,
      region: true,
      importanceScore: true, // T200-C
    },
  })
  if (!article) return null

  const llmAvailable = isLLMConfigured()
  const newsReactionProvider = createNewsReactionDataProvider()
  const allScheduled = await triggerNewsReactionPosts(
    { ...article, importanceScore: Number(article.importanceScore ?? 0.5) },
    newsReactionProvider
  )

  // T200-A: 수동 트리거 최대 10명 제한
  const MAX_MANUAL_REACTIONS = 10
  const scheduled = allScheduled.slice(0, MAX_MANUAL_REACTIONS)

  if (allScheduled.length > MAX_MANUAL_REACTIONS) {
    console.log(
      `[NewsReaction] 수동 트리거 상한 적용: ${allScheduled.length}명 → ${MAX_MANUAL_REACTIONS}명`
    )
  }

  const createdPosts: Array<{ personaId: string; postId: string }> = []

  for (const reaction of scheduled) {
    try {
      const schedulerPersonas = await createSchedulerDataProvider().getActiveStatusPersonas()
      const persona = schedulerPersonas.find((p) => p.id === reaction.personaId)
      if (!persona) continue

      const state = await getPersonaState(persona.id)
      const topic = formatNewsArticleTopic(article.title, article.summary)
      const newsPostProvider = createNewsPostPipelineProvider(topic)
      // T200-D: news_reaction callType으로 비용 대시보드 별도 추적
      const llmProvider = llmAvailable ? createNewsReactionPostLLMProvider(persona.id) : undefined
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

  return {
    articleId,
    articleTitle: article.title,
    selectedPersonas: scheduled.length,
    postsCreated: createdPosts,
    llmAvailable,
  }
}

// ── POST: daily_news ────────────────────────────────────────────

export interface DailyNewsOptions {
  dailyBudget?: number
  maxPerPersona?: number
  withinHours?: number
}

export interface DailyNewsSkippedResult {
  skipped: true
  reason: string
}

export async function runDailyNewsReactionPipeline(
  options: DailyNewsOptions
): Promise<DailyNewsResult | DailyNewsSkippedResult> {
  // T200-B: SystemConfig NEWS.auto_trigger_enabled 확인
  const autoConfig = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "NEWS", key: "auto_trigger_enabled" } },
  })
  if (autoConfig && autoConfig.value === false) {
    return { skipped: true, reason: "자동 트리거가 비활성화 상태입니다 (NEWS 설정 참조)" }
  }

  // SystemConfig에서 budget 읽기 (body 파라미터로 override 가능)
  const [budgetConfig, maxConfig, breakingConfig, commentThrottleConfig] = await Promise.all([
    prisma.systemConfig.findUnique({
      where: { category_key: { category: "NEWS", key: "daily_budget" } },
    }),
    prisma.systemConfig.findUnique({
      where: { category_key: { category: "NEWS", key: "max_per_persona" } },
    }),
    // T255: 새 설정
    prisma.systemConfig.findUnique({
      where: { category_key: { category: "NEWS", key: "max_breaking_per_day" } },
    }),
    prisma.systemConfig.findUnique({
      where: { category_key: { category: "NEWS", key: "comment_throttle_per_article" } },
    }),
  ])

  const dailyBudget = options.dailyBudget ?? (budgetConfig?.value as number | undefined) ?? 20
  const maxPerPersona = options.maxPerPersona ?? (maxConfig?.value as number | undefined) ?? 2
  const withinHours = options.withinHours ?? 24
  const maxBreakingPerDay = (breakingConfig?.value as number | undefined) ?? 3
  const commentThrottlePerArticle = (commentThrottleConfig?.value as number | undefined) ?? 5

  const llmAvailable = isLLMConfigured()
  const dailyProvider = createDailyNewsDataProvider()
  const scheduled = await runDailyNewsReactions(dailyProvider, {
    dailyBudget,
    maxPerPersona,
    withinHours,
    maxBreakingPerDay,
    commentThrottlePerArticle,
  })

  const createdPosts: Array<{ personaId: string; postId: string; articleId: string }> = []
  const schedulerDP = createSchedulerDataProvider()
  // 동일 배치 실행 내 페르소나당 1개 포스트 제한 (동시 다중 포스팅 방지)
  const postedInBatch = new Set<string>()
  const schedulerPersonas = await schedulerDP.getActiveStatusPersonas()

  for (const reaction of scheduled) {
    // 이미 이번 배치에서 포스팅한 페르소나는 다음 배치로 이월
    if (postedInBatch.has(reaction.personaId)) continue

    try {
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
      // T200-D: news_reaction callType으로 비용 대시보드 별도 추적
      const llmProvider = llmAvailable ? createNewsReactionPostLLMProvider(persona.id) : undefined
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

      postedInBatch.add(reaction.personaId)
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

  return {
    scheduledReactions: scheduled.length,
    postsCreated: createdPosts.length,
    byArticle,
    llmAvailable,
  }
}

// ── Data Provider 팩토리 (스케줄러 파이프라인용) ─────────────

export function createSchedulerDataProvider(): SchedulerDataProvider {
  return {
    async getLastActivityAt(personaId: string): Promise<Date | null> {
      const log = await prisma.personaActivityLog.findFirst({
        where: { personaId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      return log?.createdAt ?? null
    },

    async getTodayPostCount(personaId: string): Promise<number> {
      const now = new Date()
      const kstOffset = 9 * 60 * 60 * 1000
      const todayKst = new Date(
        Math.floor((now.getTime() + kstOffset) / 86400000) * 86400000 - kstOffset
      )
      return prisma.personaPost.count({
        where: { personaId, createdAt: { gte: todayKst } },
      })
    },

    async getLastPostAt(personaId: string): Promise<Date | null> {
      const post = await prisma.personaPost.findFirst({
        where: { personaId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      return post?.createdAt ?? null
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
          // LLM 프롬프트 개인화용 프로필 필드
          role: true,
          expertise: true,
          description: true,
          region: true,
          speechPatterns: true,
          quirks: true,
          postPrompt: true,
          commentPrompt: true,
          voiceSpec: true,
          factbook: true,
          // 활동 스케줄링 필드
          postFrequency: true,
          activeHours: true,
          peakHours: true,
          triggerMap: true,
          knowledgeAreas: true,
        },
      })

      return personas.flatMap((p): SchedulerPersona[] => {
        const layerMap = layerVectorsToMap(p.layerVectors)
        const l1 = layerMap.get("SOCIAL")
        const l2 = layerMap.get("TEMPERAMENT")
        const l3 = layerMap.get("NARRATIVE")
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
            role: p.role ?? null,
            expertise: (p.expertise as string[]) ?? [],
            description: p.description ?? null,
            region: p.region ?? null,
            speechPatterns: (p.speechPatterns as string[]) ?? [],
            quirks: (p.quirks as string[]) ?? [],
            postPrompt: p.postPrompt ?? null,
            commentPrompt: p.commentPrompt ?? null,
            voiceSpec: p.voiceSpec ?? null,
            factbook: p.factbook ?? null,
            postFrequency: p.postFrequency,
            activeHours: (p.activeHours as number[]) ?? [],
            peakHours: (p.peakHours as number[]) ?? [],
            triggerMap: p.triggerMap ?? null,
            knowledgeAreas: (p.knowledgeAreas as string[]) ?? [],
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
    async savePost({ personaId, type, content, metadata, postSource, hashtags }) {
      const post = await prisma.personaPost.create({
        data: {
          personaId,
          type,
          content,
          metadata: metadata as Prisma.InputJsonValue,
          postSource: postSource ?? "AUTONOMOUS",
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

    async scheduleNewsReactionPost({ personaId, articleId, interestScore, commentEligible }) {
      await prisma.personaActivityLog.create({
        data: {
          personaId,
          activityType: "SYSTEM",
          trigger: "TRENDING",
          metadata: {
            action: "news_reaction_scheduled",
            newsArticleId: articleId,
            interestScore,
            commentEligible, // T255: 댓글 쓰로틀링
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
          importanceScore: true, // T200-C
        },
        orderBy: { publishedAt: "desc" },
      })
      return articles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary ?? "",
        topicTags: (a.topicTags as string[]) ?? [],
        region: a.region ?? "GLOBAL",
        importanceScore: Number(a.importanceScore ?? 0.5),
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
        lastInteractionAt: rel.lastInteractionAt ?? null,
        attraction: Number(rel.attraction),
        peakStage: rel.peakStage,
        momentum: Number(rel.momentum),
        milestones: (rel.milestones as unknown as RelationshipMilestone[]) ?? [],
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

    async saveLike(personaId, postId) {
      await prisma.$transaction([
        prisma.personaPostLike.create({
          data: { personaId, postId },
        }),
        prisma.personaPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ])
    },

    async saveComment(personaId, postId, content) {
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
    },

    async updateRelationship(personaAId, personaBId, eventType) {
      // v4.2: 전체 관계 계산 파이프라인 (자율 자동 업데이트)
      const rel = await prisma.personaRelationship.findFirst({
        where: {
          OR: [
            { personaAId, personaBId },
            { personaAId: personaBId, personaBId: personaAId },
          ],
        },
      })

      const current = rel
        ? {
            warmth: Number(rel.warmth),
            tension: Number(rel.tension),
            frequency: Number(rel.frequency),
            depth: Number(rel.depth),
            lastInteractionAt: rel.lastInteractionAt ?? null,
            attraction: Number(rel.attraction),
            peakStage: rel.peakStage,
            momentum: Number(rel.momentum),
            milestones: (rel.milestones as unknown as RelationshipMilestone[]) ?? [],
          }
        : {
            warmth: 0.1,
            tension: 0,
            frequency: 0,
            depth: 0,
            lastInteractionAt: null,
            attraction: 0,
          }

      const event: InteractionEvent = {
        type: (eventType ?? "like") as InteractionEvent["type"],
      }
      const updated = computeRelationshipUpdate(current, event)
      const autoStage = determineStage(updated)
      const autoType = determineType(updated)

      await prisma.personaRelationship.upsert({
        where: {
          personaAId_personaBId: { personaAId, personaBId },
        },
        update: {
          warmth: updated.warmth,
          tension: updated.tension,
          frequency: updated.frequency,
          depth: updated.depth,
          attraction: updated.attraction ?? 0,
          peakStage: updated.peakStage ?? "STRANGER",
          momentum: updated.momentum ?? 0,
          milestones: (updated.milestones as unknown as Prisma.JsonArray) ?? [],
          stage: autoStage,
          type: autoType,
          lastInteractionAt: new Date(),
        },
        create: {
          personaAId,
          personaBId,
          warmth: updated.warmth,
          tension: updated.tension,
          frequency: updated.frequency,
          depth: updated.depth,
          attraction: updated.attraction ?? 0,
          peakStage: updated.peakStage ?? "STRANGER",
          momentum: updated.momentum ?? 0,
          milestones: (updated.milestones as unknown as Prisma.JsonArray) ?? [],
          stage: autoStage,
          type: autoType,
          lastInteractionAt: new Date(),
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

// ── T256: 뉴스 자동 수집 수동 트리거 ──────────────────────────

export async function runNewsAutoFetchManual(): Promise<AutoFetchResult> {
  const provider = createNewsAutoFetchPrismaProvider()
  const llm = isLLMConfigured() ? (createNewsLLMProvider() ?? null) : null
  const reactionRunner = async () => runDailyNewsReactionPipeline({})

  return executeNewsAutoFetch(provider, llm, reactionRunner)
}

function createNewsAutoFetchPrismaProvider(): NewsAutoFetchDataProvider {
  return {
    async getSourceCount() {
      return prisma.newsSource.count()
    },

    async seedPresets(presets) {
      const result = await prisma.newsSource.createMany({
        data: presets.map((p) => ({
          name: p.name,
          rssUrl: p.rssUrl,
          region: p.region,
          isActive: true,
        })),
        skipDuplicates: true,
      })
      return { added: result.count }
    },

    async getActiveSources() {
      return prisma.newsSource.findMany({
        where: { isActive: true },
        select: { id: true, name: true, rssUrl: true, region: true },
      })
    },

    async articleExists(url) {
      const article = await prisma.newsArticle.findUnique({
        where: { url },
        select: { id: true },
      })
      return !!article
    },

    async saveArticle(data) {
      await prisma.newsArticle.create({ data })
    },

    async markSourceSuccess(sourceId) {
      await prisma.newsSource.update({
        where: { id: sourceId },
        data: { lastFetchAt: new Date(), consecutiveFailures: 0, lastError: null },
      })
    },

    async markSourceFailure(sourceId, error) {
      const updated = await prisma.newsSource.update({
        where: { id: sourceId },
        data: {
          consecutiveFailures: { increment: 1 },
          lastError: error.slice(0, 500),
        },
      })
      return updated.consecutiveFailures
    },

    async disableSource(sourceId) {
      await prisma.newsSource.update({
        where: { id: sourceId },
        data: { isActive: false },
      })
    },

    async getConfig(key) {
      const config = await prisma.systemConfig.findUnique({
        where: { category_key: { category: "NEWS", key } },
      })
      return config?.value ?? null
    },
  }
}
