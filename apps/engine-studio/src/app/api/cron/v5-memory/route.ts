import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invalidateMatchData } from "@/lib/cache/persona-match-cache"
import { consolidateAllPersonas } from "@/lib/persona-world/memory-consolidation"
import type {
  ConsolidationProvider,
  ConsolidationEpisode,
  SemanticMemoryRecord,
} from "@/lib/persona-world/memory-consolidation"
import { updateGrowthArc } from "@/lib/persona-world/growth-arc-updater"
import type {
  GrowthArcProvider,
  L3Vector,
  L3Influence,
} from "@/lib/persona-world/growth-arc-updater"
import { detectIdentityDrift } from "@/lib/persona-world/identity-drift-detector"
import type { DriftDetectorProvider } from "@/lib/persona-world/identity-drift-detector"
import type { SemanticMemoryCategory } from "@/generated/prisma"
import { Prisma } from "@/generated/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * GET /api/cron/v5-memory
 *
 * v5.0 기억 진화 배치 작업:
 * 1. Memory Consolidation — 지난 7일 에피소드 → SemanticMemory (주간 배치)
 * 2. Growth Arc Update — SemanticMemory → L3 벡터 조금씩 진화
 * 3. Identity Drift Detection — 일일 일관성 모니터링
 *
 * 주간 cron (일요일 03:00) 또는 수동 호출
 */
export async function GET(request: NextRequest) {
  try {
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

    const results: Record<string, unknown> = {}

    // 활성 페르소나 목록 조회
    const activePersonas = await prisma.persona.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    })
    const personaIds = activePersonas.map((p) => p.id)

    // ── 1. Memory Consolidation ──────────────────────────────────
    try {
      const consolidationProvider = createConsolidationProvider()
      const consolidationResults = await consolidateAllPersonas(consolidationProvider, personaIds)

      const summary = {
        total: consolidationResults.length,
        processed: consolidationResults.filter((r) => !r.skipped).length,
        skipped: consolidationResults.filter((r) => r.skipped).length,
        totalMemoriesCreated: consolidationResults.reduce((s, r) => s + r.memoriesCreated, 0),
        totalMemoriesUpdated: consolidationResults.reduce((s, r) => s + r.memoriesUpdated, 0),
      }
      results.memoryConsolidation = { success: true, ...summary }
    } catch (err) {
      console.error("[v5-memory] Consolidation failed:", err)
      results.memoryConsolidation = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── 2. Growth Arc Update ─────────────────────────────────────
    try {
      const growthArcProvider = createGrowthArcProvider()
      const growthResults = await Promise.allSettled(
        personaIds.map((id) => updateGrowthArc(growthArcProvider, id))
      )

      const updated = growthResults.filter(
        (r) => r.status === "fulfilled" && !r.value.skipped
      ).length
      const skipped = growthResults.filter(
        (r) => r.status === "fulfilled" && r.value.skipped
      ).length

      results.growthArcUpdate = { success: true, updated, skipped }
    } catch (err) {
      console.error("[v5-memory] GrowthArc failed:", err)
      results.growthArcUpdate = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── 3. Identity Drift Detection ──────────────────────────────
    try {
      const driftProvider = createDriftDetectorProvider()
      const driftResults = await Promise.allSettled(
        personaIds.map((id) => detectIdentityDrift(driftProvider, id))
      )

      const warnings = driftResults.filter(
        (r) => r.status === "fulfilled" && r.value.status === "warning"
      ).length
      const criticals = driftResults.filter(
        (r) => r.status === "fulfilled" && r.value.status === "critical"
      ).length

      results.identityDrift = { success: true, warnings, criticals }
    } catch (err) {
      console.error("[v5-memory] DriftDetection failed:", err)
      results.identityDrift = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error("[v5-memory] Unexpected error:", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal error" } },
      { status: 500 }
    )
  }
}

// ── Prisma Provider 구현 ─────────────────────────────────────────

function createConsolidationProvider(): ConsolidationProvider {
  return {
    async getHighPoignancyEpisodes(personaId, sinceDate, threshold, limit) {
      const episodes: ConsolidationEpisode[] = []

      // InteractionLog (대화 턴)
      const interactions = await prisma.interactionLog.findMany({
        where: {
          receiverId: personaId,
          receiverType: "PERSONA",
          poignancyScore: { gte: threshold },
          createdAt: { gte: sinceDate },
        },
        select: { id: true, personaResponse: true, poignancyScore: true, createdAt: true },
        orderBy: { poignancyScore: "desc" },
        take: Math.floor(limit * 0.5),
      })
      for (const log of interactions) {
        if (log.personaResponse) {
          episodes.push({
            id: log.id,
            type: "interaction",
            content: log.personaResponse.slice(0, 200),
            poignancyScore: Number(log.poignancyScore),
            createdAt: log.createdAt,
          })
        }
      }

      // ConsumptionLog (콘텐츠 소비)
      const consumptions = await prisma.consumptionLog.findMany({
        where: {
          personaId,
          poignancyScore: { gte: threshold },
          createdAt: { gte: sinceDate },
        },
        select: { id: true, title: true, impression: true, poignancyScore: true, createdAt: true },
        orderBy: { poignancyScore: "desc" },
        take: Math.floor(limit * 0.3),
      })
      for (const log of consumptions) {
        episodes.push({
          id: log.id,
          type: "consumption",
          content: `${log.title}: ${log.impression}`.slice(0, 200),
          poignancyScore: Number(log.poignancyScore),
          createdAt: log.createdAt,
        })
      }

      // PersonaPost (포스팅)
      const posts = await prisma.personaPost.findMany({
        where: {
          personaId,
          poignancyScore: { gte: threshold },
          createdAt: { gte: sinceDate },
        },
        select: { id: true, content: true, poignancyScore: true, createdAt: true },
        orderBy: { poignancyScore: "desc" },
        take: Math.floor(limit * 0.2),
      })
      for (const post of posts) {
        episodes.push({
          id: post.id,
          type: "post",
          content: post.content.slice(0, 200),
          poignancyScore: Number(post.poignancyScore),
          createdAt: post.createdAt,
        })
      }

      // poignancy 높은 순 정렬 후 limit 적용
      return episodes.sort((a, b) => b.poignancyScore - a.poignancyScore).slice(0, limit)
    },

    async getPersonaProfile(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { name: true, background: true, factbook: true, updatedAt: true },
      })
      if (!persona) return null

      const backstorySummary = persona.background?.slice(0, 200) ?? "배경 정보 없음"

      // factbook.mutableContext.recentExperience에서 마지막 consolidation 시각 추정
      // 실제로는 별도 필드가 필요하지만 여기서는 updatedAt 사용
      return {
        name: persona.name,
        backstorySummary,
        lastConsolidatedAt: null, // TODO: SemanticMemory lastConsolidatedAt 최신값으로 교체 가능
      }
    },

    async findSemanticMemoryBySubject(personaId, subject) {
      const mem = await prisma.semanticMemory.findFirst({
        where: { personaId, subject },
        orderBy: { confidence: "desc" },
      })
      if (!mem) return null
      return {
        id: mem.id,
        personaId: mem.personaId,
        category: mem.category,
        subject: mem.subject,
        belief: mem.belief,
        confidence: Number(mem.confidence),
        evidenceCount: mem.evidenceCount,
        sourceEpisodeIds: mem.sourceEpisodeIds,
        l3Influence: mem.l3Influence as L3Influence | null,
        consolidatedAt: mem.consolidatedAt,
      } satisfies SemanticMemoryRecord
    },

    async createSemanticMemory(data) {
      const mem = await prisma.semanticMemory.create({
        data: {
          personaId: data.personaId,
          category: data.category,
          subject: data.subject,
          belief: data.belief,
          confidence: data.confidence,
          evidenceCount: data.evidenceCount,
          sourceEpisodeIds: data.sourceEpisodeIds,
          l3Influence: data.l3Influence
            ? (data.l3Influence as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
      return {
        id: mem.id,
        personaId: mem.personaId,
        category: mem.category,
        subject: mem.subject,
        belief: mem.belief,
        confidence: Number(mem.confidence),
        evidenceCount: mem.evidenceCount,
        sourceEpisodeIds: mem.sourceEpisodeIds,
        l3Influence: mem.l3Influence as L3Influence | null,
        consolidatedAt: mem.consolidatedAt,
      } satisfies SemanticMemoryRecord
    },

    async updateSemanticMemory(id, data) {
      await prisma.semanticMemory.update({
        where: { id },
        data: {
          belief: data.belief,
          confidence: data.confidence,
          evidenceCount: data.evidenceCount,
          sourceEpisodeIds: data.sourceEpisodeIds,
          l3Influence: data.l3Influence
            ? (data.l3Influence as unknown as Prisma.InputJsonValue)
            : undefined,
          consolidatedAt: new Date(),
        },
      })
    },

    async pruneSemanticMemories(personaId, category, keepTop) {
      // confidence 낮은 항목 삭제 (keepTop 초과분)
      const all = await prisma.semanticMemory.findMany({
        where: { personaId, category },
        orderBy: { confidence: "desc" },
        select: { id: true },
      })
      if (all.length > keepTop) {
        const toDelete = all.slice(keepTop).map((m) => m.id)
        await prisma.semanticMemory.deleteMany({ where: { id: { in: toDelete } } })
      }
    },

    async getFactbook(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { factbook: true },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (persona?.factbook as any) ?? null
    },

    async saveFactbook(personaId, factbook) {
      await prisma.persona.update({
        where: { id: personaId },
        data: { factbook: factbook as object },
      })
    },

    async updateLastConsolidatedAt(_personaId, _at) {
      // 현재 Persona 모델에 lastConsolidatedAt 필드가 없으므로 no-op
      // TODO: T408 후속으로 Persona에 lastConsolidatedAt 컬럼 추가 고려
    },
  }
}

function createGrowthArcProvider(): GrowthArcProvider {
  return {
    async getL3Vector(personaId) {
      const vec = await prisma.personaLayerVector.findFirst({
        where: { personaId, layerType: "NARRATIVE" },
        orderBy: { version: "desc" },
      })
      if (!vec) return null
      return {
        lack: Number(vec.dim1 ?? 0.5),
        moralCompass: Number(vec.dim2 ?? 0.5),
        volatility: Number(vec.dim3 ?? 0.5),
        growthArc: Number(vec.dim4 ?? 0.5),
      }
    },

    async getOriginalL3Vector(personaId) {
      // 가장 오래된 버전 = 원본
      const vec = await prisma.personaLayerVector.findFirst({
        where: { personaId, layerType: "NARRATIVE" },
        orderBy: { version: "asc" },
      })
      if (!vec) return null
      return {
        lack: Number(vec.dim1 ?? 0.5),
        moralCompass: Number(vec.dim2 ?? 0.5),
        volatility: Number(vec.dim3 ?? 0.5),
        growthArc: Number(vec.dim4 ?? 0.5),
      }
    },

    async getRecentL3Influences(personaId, sinceDays) {
      const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      const memories = await prisma.semanticMemory.findMany({
        where: {
          personaId,
          l3Influence: { not: undefined },
          consolidatedAt: { gte: since },
        },
        select: { l3Influence: true },
      })
      return memories
        .map((m) => m.l3Influence as L3Influence | null)
        .filter((inf): inf is L3Vector => inf !== null)
    },

    async updateL3Vector(personaId, vector) {
      const latest = await prisma.personaLayerVector.findFirst({
        where: { personaId, layerType: "NARRATIVE" },
        orderBy: { version: "desc" },
      })
      const newVersion = (latest?.version ?? 0) + 1

      await prisma.personaLayerVector.create({
        data: {
          personaId,
          layerType: "NARRATIVE",
          version: newVersion,
          dim1: vector.lack,
          dim2: vector.moralCompass,
          dim3: vector.volatility,
          dim4: vector.growthArc,
        },
      })
      await invalidateMatchData(personaId)
      return { newVersion }
    },
  }
}

function createDriftDetectorProvider(): DriftDetectorProvider {
  return {
    async getRecentOutputs(personaId, withinHours, limit) {
      const since = new Date(Date.now() - withinHours * 60 * 60 * 1000)

      const posts = await prisma.personaPost.findMany({
        where: { personaId, createdAt: { gte: since } },
        select: { id: true, content: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: Math.floor(limit * 0.7),
      })

      const chats = await prisma.interactionLog.findMany({
        where: {
          receiverId: personaId,
          receiverType: "PERSONA",
          personaResponse: { not: null },
          createdAt: { gte: since },
        },
        select: { id: true, personaResponse: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: Math.floor(limit * 0.3),
      })

      return [
        ...posts.map((p) => ({
          id: p.id,
          type: "post" as const,
          content: p.content,
          createdAt: p.createdAt,
        })),
        ...chats.map((c) => ({
          id: c.id,
          type: "chat_response" as const,
          content: c.personaResponse!,
          createdAt: c.createdAt,
        })),
      ].slice(0, limit)
    },

    async getImmutableCore(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { factbook: true, voiceSpec: true, name: true, role: true },
      })
      if (!persona) return null

      const fb = persona.factbook as Record<string, unknown> | null
      const immutableFacts =
        (fb?.immutableFacts as Array<{
          id: string
          category: string
          content: string
          source?: string
          changeCount?: number
        }>) ?? []

      // 핵심 키워드: name + role
      const coreKeywords: string[] = [persona.name, ...(persona.role ? [persona.role] : [])].filter(
        Boolean
      )

      // 금지 패턴: voiceSpec.guardrails.forbiddenPatterns
      const vs = persona.voiceSpec as Record<string, unknown> | null
      const guardrails = vs?.guardrails as Record<string, unknown> | undefined
      const forbiddenPatterns = (guardrails?.forbiddenPatterns as string[]) ?? []

      return { immutableFacts, coreKeywords, forbiddenPatterns }
    },

    async updateConsistencyScore(personaId, score) {
      await prisma.persona.update({
        where: { id: personaId },
        data: { consistencyScore: score },
      })
    },

    async setDegradedState(personaId, reason) {
      // T140 kill switch: status를 DEGRADED로 전환
      // Persona.status enum이 DEGRADED를 지원하면 업데이트, 아니면 로그만
      console.warn(`[IdentityDrift] personaId=${personaId} CRITICAL: ${reason}`)
      // status 업데이트는 Persona.status enum 확인 후 적용
    },
  }
}
