// ═══════════════════════════════════════════════════════════════
// Cron Scheduler Service (v4.2)
// Business logic extracted from /api/cron/persona-scheduler route
// v4.2: 전체 관계 계산 파이프라인 (attraction + 자율 stage/type)
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import { Prisma, type PersonaActivityType } from "@/generated/prisma"
import { runScheduler } from "@/lib/persona-world/scheduler"
import type { SchedulerPersona, SchedulerDataProvider } from "@/lib/persona-world/scheduler"
import type { SchedulerContext, PersonaPostType } from "@/lib/persona-world/types"
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
  isLLMConfigured,
} from "@/lib/persona-world/llm-adapter"
import { getConsumptionContext, recordConsumption } from "@/lib/persona-world/consumption-manager"
import { getPersonaState } from "@/lib/persona-world/state-manager"
import { resolveMentions, notifyMentions } from "@/lib/persona-world/mention-service"
import { layerVectorsToMap } from "@/lib/vector/dim-maps"
import { isFeatureEnabled } from "@/lib/security/kill-switch"
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
import { executeNewsAutoFetch } from "@/lib/persona-world/news"
import type { NewsAutoFetchDataProvider, AutoFetchResult } from "@/lib/persona-world/news"
import { createNewsLLMProvider } from "@/lib/persona-world/llm-adapter"
import {
  runDailyNewsReactionPipeline,
  isSchedulerEnabled,
} from "@/lib/persona-world/admin/scheduler-service"
import { SCHEDULING_DELAYS } from "@/lib/persona-world/constants"
import { createSecurityMiddlewareProvider } from "@/lib/persona-world/security/security-provider-factory"
import type { CostRunnerProvider, BudgetCheckResult } from "@/lib/persona-world/cost/cost-runner"
import {
  checkBudgetBeforeExecution,
  getSchedulerFrequencyFromBudget,
  applyAutoActionToFrequency,
} from "@/lib/persona-world/cost/cost-runner"

// ── Result type ──────────────────────────────────────────────────

export interface CronSchedulerResult {
  executedAt: string
  decisions: number
  postsCreated: number
  interactions: number
  llmAvailable: boolean
  budgetCheck?: BudgetCheckResult
  contagion?: ContagionRoundLog | { skipped: true; reason: string }
  newsAutoFetch?: AutoFetchResult | { skipped: true; reason: string }
  details: {
    execution: {
      postsCreated: Array<{ personaId: string; postId: string; postType: string }>
      interactions: Array<{
        personaId: string
        likes: number
        comments: number
        reposts: number
        follows: number
      }>
    }
    [key: string]: unknown
  }
}

// ── Main execution ──────────────────────────────────────────────

export async function executeCronScheduler(): Promise<CronSchedulerResult> {
  // 스케줄러 비활성화 상태면 즉시 반환
  const enabled = await isSchedulerEnabled()
  if (!enabled) {
    console.log("[CronScheduler] 스케줄러가 비활성화 상태입니다. 실행 건너뜀.")
    return {
      executedAt: new Date().toISOString(),
      decisions: 0,
      postsCreated: 0,
      interactions: 0,
      llmAvailable: false,
      details: { execution: { postsCreated: [], interactions: [] } },
    }
  }

  // ── v4.0 T299: 예산 체크 — 실행 전 예산 초과 확인 ──────────
  let budgetCheck: BudgetCheckResult | undefined
  try {
    const costProvider = createCostRunnerProvider()
    budgetCheck = await checkBudgetBeforeExecution(costProvider)

    if (!budgetCheck.allowed) {
      console.warn(`[CronScheduler] 예산 초과로 실행 차단: ${budgetCheck.reason}`)
      return {
        executedAt: new Date().toISOString(),
        decisions: 0,
        postsCreated: 0,
        interactions: 0,
        llmAvailable: isLLMConfigured(),
        budgetCheck,
        details: { execution: { postsCreated: [], interactions: [] } },
      }
    }

    if (budgetCheck.alerts.length > 0) {
      console.log(
        `[CronScheduler] 예산 경고: ${budgetCheck.alerts.map((a) => `${a.level}(${a.usagePercentage}%)`).join(", ")}`
      )
    }
  } catch (err) {
    console.error("[CronScheduler] Budget check failed, proceeding anyway:", err)
  }

  const context: SchedulerContext = {
    trigger: "SCHEDULED",
    currentHour: new Date().getHours(),
  }

  const schedulerProvider = createSchedulerDataProvider()
  const schedulerResult = await runScheduler(context, schedulerProvider)

  const postResults: Array<{ personaId: string; postId: string; postType: string }> = []
  const interactionResults: Array<{
    personaId: string
    likes: number
    comments: number
    reposts: number
    follows: number
  }> = []
  const llmAvailable = isLLMConfigured()

  // v4.0 T303: 예산 auto-action에 의한 빈도 감소 적용
  const shouldSkipPosts =
    budgetCheck?.autoAction?.type === "FREEZE_GENERATION" ||
    budgetCheck?.autoAction?.type === "FREEZE_AUTONOMOUS" ||
    budgetCheck?.autoAction?.type === "GLOBAL_FREEZE"

  const postFrequencyFactor =
    budgetCheck?.autoAction?.type === "REDUCE_POST_FREQUENCY" ? budgetCheck.autoAction.factor : 1.0

  // 페르소나 간 랜덤 딜레이 계산 — 동시 활동 방지
  const decisionCount = schedulerResult.decisions.length
  const maxDelayPerPersona =
    decisionCount > 0
      ? Math.min(
          Math.floor(SCHEDULING_DELAYS.cronBudgetMs / decisionCount),
          SCHEDULING_DELAYS.maxPerPersonaDelayMs
        )
      : 0

  for (let i = 0; i < schedulerResult.decisions.length; i++) {
    const decision = schedulerResult.decisions[i]

    // 첫 번째 페르소나는 딜레이 없이 즉시 실행, 이후부터 랜덤 딜레이
    if (i > 0 && maxDelayPerPersona > 0) {
      const delayMs = Math.floor(Math.random() * maxDelayPerPersona)
      console.log(
        `[Cron/Scheduler] Persona ${decision.personaId} — ${(delayMs / 1000).toFixed(1)}s delay`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    // v4.0 T303: 예산 auto-action 적용 — 빈도 감소 시 확률적 스킵
    const skipThisPost =
      shouldSkipPosts || (postFrequencyFactor < 1.0 && Math.random() > postFrequencyFactor)

    if (decision.shouldPost && llmAvailable && !skipThisPost) {
      try {
        const persona = (await schedulerProvider.getActiveStatusPersonas()).find(
          (p) => p.id === decision.personaId
        )
        if (!persona) continue

        const state = await getPersonaState(persona.id)
        const llmProvider = createPostLLMProvider(persona.id)
        const postDataProvider = createPostPipelineProvider()

        const securityProvider = createSecurityMiddlewareProvider(prisma)
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
          postDataProvider,
          { securityProvider }
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

        const securityProvider = createSecurityMiddlewareProvider(prisma)
        const result = await executeInteractions(persona, state, interactionDP, commentLLM, {
          securityProvider,
        })

        interactionResults.push({
          personaId: decision.personaId,
          likes: result.likes.length,
          comments: result.comments.length,
          reposts: result.reposts.length,
          follows: result.follows.length,
        })
      } catch (err) {
        console.error(`[Cron/Scheduler] Interaction failed for ${decision.personaId}:`, err)
      }
    }
  }

  // ── 감정 전염 스텝 (Kill Switch 게이트) ──────────────────
  let contagion: CronSchedulerResult["contagion"]

  try {
    const safetyConfig = await loadSafetyConfig()
    if (!isFeatureEnabled(safetyConfig, "emotionalContagion")) {
      contagion = { skipped: true, reason: "emotionalContagion Kill Switch OFF" }
    } else {
      const contagionProvider = createContagionDataProvider()
      const result = await executeContagionRound(contagionProvider)
      contagion = result.log

      if (result.requiresKillSwitch) {
        console.warn(
          `[Cron/Contagion] CRITICAL: 집단 mood 위험 — ${result.log.safetyReason}. Kill Switch 트리거 권고.`
        )
      }
    }
  } catch (err) {
    console.error("[Cron/Contagion] Emotional contagion failed:", err)
    contagion = {
      skipped: true,
      reason: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
    }
  }

  // ── T256: 뉴스 자동 수집 + 반응 트리거 ───────────────────
  let newsAutoFetch: CronSchedulerResult["newsAutoFetch"]

  try {
    const newsProvider = createNewsAutoFetchDataProvider()
    const newsLlm = llmAvailable ? (createNewsLLMProvider() ?? null) : null
    const reactionRunner = async () => runDailyNewsReactionPipeline({})

    newsAutoFetch = await executeNewsAutoFetch(newsProvider, newsLlm, reactionRunner)
  } catch (err) {
    console.error("[Cron/NewsAutoFetch] News auto-fetch failed:", err)
    newsAutoFetch = {
      skipped: true,
      reason: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
    }
  }

  return {
    executedAt: new Date().toISOString(),
    decisions: schedulerResult.decisions.length,
    postsCreated: postResults.length,
    interactions: interactionResults.length,
    llmAvailable,
    budgetCheck,
    contagion,
    newsAutoFetch,
    details: {
      ...schedulerResult,
      execution: { postsCreated: postResults, interactions: interactionResults },
    },
  }
}

// ── Safety Config 로더 ──────────────────────────────────────

async function loadSafetyConfig(): Promise<SystemSafetyConfig> {
  const { createDefaultConfig } = await import("@/lib/security/kill-switch")

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

// ── Contagion Data Provider ─────────────────────────────────

function createContagionDataProvider(): ContagionDataProvider {
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
        },
      })
      // 양방향 엣지 생성
      const edges: ContagionEdge[] = []
      for (const r of rels) {
        edges.push({
          sourceId: r.personaAId,
          targetId: r.personaBId,
          warmth: Number(r.warmth),
          tension: Number(r.tension),
          frequency: Number(r.frequency),
        })
        edges.push({
          sourceId: r.personaBId,
          targetId: r.personaAId,
          warmth: Number(r.warmth),
          tension: Number(r.tension),
          frequency: Number(r.frequency),
        })
      }
      return edges
    },

    async getSensitivities(personaIds: string[]): Promise<Map<string, ContagionSensitivity>> {
      const vectors = await prisma.personaLayerVector.findMany({
        where: { personaId: { in: personaIds }, layerType: "TEMPERAMENT" },
        select: {
          personaId: true,
          dim3: true, // extraversion
          dim4: true, // agreeableness
          dim5: true, // neuroticism
        },
      })

      const map = new Map<string, ContagionSensitivity>()
      for (const v of vectors) {
        const neuroticism = Number(v.dim5 ?? 0.5)
        const extraversion = Number(v.dim3 ?? 0.5)
        const agreeableness = Number(v.dim4 ?? 0.5)
        map.set(v.personaId, {
          moodSensitivity: 0.5 + neuroticism,
          socialOpenness: extraversion,
          agreeableness,
        })
      }
      return map
    },

    async getTopologies(personaIds: string[]): Promise<Map<string, NodeTopology>> {
      // 간단한 degree 기반 위상 계산
      const rels = await prisma.personaRelationship.findMany({
        where: {
          OR: [{ personaAId: { in: personaIds } }, { personaBId: { in: personaIds } }],
        },
        select: { personaAId: true, personaBId: true },
      })

      const degreeMap = new Map<string, Set<string>>()
      for (const id of personaIds) {
        degreeMap.set(id, new Set())
      }
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

        // 클러스터링 계수: 이웃 간 연결 비율
        let triangles = 0
        const neighborArr = [...neighbors]
        for (let i = 0; i < neighborArr.length; i++) {
          for (let j = i + 1; j < neighborArr.length; j++) {
            if (degreeMap.get(neighborArr[i])?.has(neighborArr[j])) {
              triangles++
            }
          }
        }
        const possibleTriangles = (totalDegree * (totalDegree - 1)) / 2
        const clusteringCoefficient = possibleTriangles > 0 ? triangles / possibleTriangles : 0

        map.set(id, {
          personaId: id,
          totalDegree,
          clusteringCoefficient,
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
        `[Contagion] Round: ${log.personaCount} personas, ${log.affectedCount} affected, ` +
          `mood ${log.averageMoodBefore.toFixed(3)}→${log.averageMoodAfter.toFixed(3)}, ` +
          `safety: ${log.safetyStatus}`
      )
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
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        include: {
          layerVectors: true,
          posts: {
            select: { type: true },
            orderBy: { createdAt: "desc" },
            take: 3, // 다양성 쿨다운용 최근 3개
          },
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
            recentPostTypes: p.posts.map((post) => post.type),
          },
        ]
      })
    },
  }
}

function createPostPipelineProvider(): PostPipelineDataProvider {
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
        type: eventType as InteractionEvent["type"],
      }
      const updated = computeRelationshipUpdate(current, event)
      // v4.2: 자율 자동 — 단계/유형도 자동 계산
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

    // ── T258: 자율 팔로우 ──

    async saveFollow(followerPersonaId, followingPersonaId) {
      await prisma.personaFollow.create({
        data: { followerPersonaId, followingPersonaId },
      })
    },

    async getCrossAxisSimilarity(_personaAId, _personaBId) {
      // TODO: 실제 83축 교차축 유사도 계산 연동
      return 0.5
    },

    async getParadoxCompatibility(_personaAId, _personaBId) {
      // TODO: 실제 Paradox 호환성 계산 연동
      return 0.5
    },

    async getPersonaState(personaId) {
      const state = await prisma.personaState.findUnique({
        where: { personaId },
        select: { mood: true, energy: true, socialBattery: true, paradoxTension: true },
      })
      return {
        mood: Number(state?.mood ?? 0.5),
        energy: Number(state?.energy ?? 1.0),
        socialBattery: Number(state?.socialBattery ?? 1.0),
        paradoxTension: Number(state?.paradoxTension ?? 0),
      }
    },

    // ── T259: 자율 리포스트 ──

    async saveRepost(personaId, postId) {
      await prisma.$transaction([
        prisma.personaRepost.create({
          data: { personaId, originalPostId: postId },
        }),
        prisma.personaPost.update({
          where: { id: postId },
          data: { repostCount: { increment: 1 } },
        }),
      ])
    },
  }
}

// ── T256: News Auto-Fetch Data Provider ──────────────────────

function createNewsAutoFetchDataProvider(): NewsAutoFetchDataProvider {
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

// ── v4.0 T299: CostRunnerProvider (Prisma) ──────────────────

function createCostRunnerProvider(): CostRunnerProvider {
  return {
    async aggregateDailyUsage(date: Date) {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const logs = await prisma.llmUsageLog.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        select: {
          callType: true,
          estimatedCostUsd: true,
          inputTokens: true,
          cacheReadInputTokens: true,
        },
      })

      let postingCost = 0
      let commentCost = 0
      let interviewCost = 0
      let arenaCost = 0
      let otherCost = 0
      let totalInputTokens = 0
      let totalCachedTokens = 0

      for (const log of logs) {
        const cost = Number(log.estimatedCostUsd)
        const ct = log.callType.toLowerCase()
        if (ct === "post") postingCost += cost
        else if (ct === "comment") commentCost += cost
        else if (ct === "interview" || ct === "test-generate") interviewCost += cost
        else if (ct === "arena" || ct === "judge") arenaCost += cost
        else otherCost += cost

        totalInputTokens += log.inputTokens
        totalCachedTokens += log.cacheReadInputTokens ?? 0
      }

      const totalCost = postingCost + commentCost + interviewCost + arenaCost + otherCost
      const cacheHitRate = totalInputTokens > 0 ? totalCachedTokens / totalInputTokens : 0

      return {
        totalCost: Math.round(totalCost * 10000) / 10000,
        postingCost: Math.round(postingCost * 10000) / 10000,
        commentCost: Math.round(commentCost * 10000) / 10000,
        interviewCost: Math.round(interviewCost * 10000) / 10000,
        arenaCost: Math.round(arenaCost * 10000) / 10000,
        otherCost: Math.round(otherCost * 10000) / 10000,
        llmCalls: logs.length,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      }
    },

    async saveDailyCostReport(params) {
      const report = await prisma.dailyCostReport.upsert({
        where: { date: params.date },
        update: {
          totalCost: params.totalCost,
          postingCost: params.postingCost,
          commentCost: params.commentCost,
          interviewCost: params.interviewCost,
          arenaCost: params.arenaCost,
          otherCost: params.otherCost,
          llmCalls: params.llmCalls,
          cacheHitRate: params.cacheHitRate,
        },
        create: {
          date: params.date,
          totalCost: params.totalCost,
          postingCost: params.postingCost,
          commentCost: params.commentCost,
          interviewCost: params.interviewCost,
          arenaCost: params.arenaCost,
          otherCost: params.otherCost,
          llmCalls: params.llmCalls,
          cacheHitRate: params.cacheHitRate,
        },
      })
      return { id: report.id }
    },

    async getMonthlyDailyReports(monthStart, monthEnd) {
      const reports = await prisma.dailyCostReport.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        orderBy: { date: "asc" },
      })
      return reports.map((r) => ({
        date: r.date,
        totalCost: Number(r.totalCost),
        postingCost: Number(r.postingCost),
        commentCost: Number(r.commentCost),
        interviewCost: Number(r.interviewCost),
        arenaCost: Number(r.arenaCost),
        otherCost: Number(r.otherCost),
        llmCalls: r.llmCalls,
        cacheHitRate: r.cacheHitRate !== null ? Number(r.cacheHitRate) : null,
      }))
    },

    async getBudgetConfig() {
      const config = await prisma.budgetConfig
        .findUnique({ where: { id: "singleton" } })
        .catch(() => null)

      if (!config) {
        return {
          id: "singleton",
          dailyBudget: 50,
          monthlyBudget: 1000,
          costMode: "BALANCE" as const,
          alertThresholds: null,
          autoActions: null,
          updatedAt: new Date(),
          updatedBy: null,
        }
      }

      return {
        id: config.id,
        dailyBudget: Number(config.dailyBudget),
        monthlyBudget: Number(config.monthlyBudget),
        costMode: config.costMode as "QUALITY" | "BALANCE" | "COST_PRIORITY",
        alertThresholds: config.alertThresholds as {
          info: number
          warning: number
          critical: number
          emergency: number
        } | null,
        autoActions: config.autoActions as Record<string, unknown> | null,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      }
    },

    async updateBudgetConfig(params) {
      const data: Record<string, unknown> = {}
      if (params.dailyBudget !== undefined) data.dailyBudget = params.dailyBudget
      if (params.monthlyBudget !== undefined) data.monthlyBudget = params.monthlyBudget
      if (params.costMode !== undefined) data.costMode = params.costMode
      if (params.alertThresholds !== undefined)
        data.alertThresholds = params.alertThresholds as Prisma.InputJsonValue
      if (params.autoActions !== undefined)
        data.autoActions = params.autoActions as Prisma.InputJsonValue
      if (params.updatedBy !== undefined) data.updatedBy = params.updatedBy

      const config = await prisma.budgetConfig.upsert({
        where: { id: "singleton" },
        update: data,
        create: {
          id: "singleton",
          dailyBudget: params.dailyBudget ?? 50,
          monthlyBudget: params.monthlyBudget ?? 1000,
          costMode: params.costMode ?? "BALANCE",
          ...(params.alertThresholds && {
            alertThresholds: params.alertThresholds as Prisma.InputJsonValue,
          }),
          ...(params.autoActions && { autoActions: params.autoActions as Prisma.InputJsonValue }),
          ...(params.updatedBy && { updatedBy: params.updatedBy }),
        },
      })

      return {
        id: config.id,
        dailyBudget: Number(config.dailyBudget),
        monthlyBudget: Number(config.monthlyBudget),
        costMode: config.costMode as "QUALITY" | "BALANCE" | "COST_PRIORITY",
        alertThresholds: config.alertThresholds as {
          info: number
          warning: number
          critical: number
          emergency: number
        } | null,
        autoActions: config.autoActions as Record<string, unknown> | null,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      }
    },

    async getMonthlySpending() {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const result = await prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { estimatedCostUsd: true },
      })
      return Number(result._sum.estimatedCostUsd ?? 0)
    },

    async getDailySpending() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const result = await prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { estimatedCostUsd: true },
      })
      return Number(result._sum.estimatedCostUsd ?? 0)
    },
  }
}
