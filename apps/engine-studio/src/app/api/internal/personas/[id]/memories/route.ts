import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/personas/[id]/memories
// T175: 페르소나 기억 통합 조회 (활동/소비/대화/관계/상태)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const { searchParams } = request.nextUrl
    const tab = searchParams.get("tab") ?? "activity"
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100)

    // 페르소나 존재 확인
    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // 상태 정보는 항상 포함
    let state: {
      mood: number
      energy: number
      socialBattery: number
      paradoxTension: number
      narrativeTension: number
      updatedAt: string
    } | null = null

    try {
      const personaState = await prisma.personaState.findUnique({
        where: { personaId: id },
      })
      if (personaState) {
        state = {
          mood: Number(personaState.mood),
          energy: Number(personaState.energy),
          socialBattery: Number(personaState.socialBattery),
          paradoxTension: Number(personaState.paradoxTension),
          narrativeTension: Number(personaState.narrativeTension),
          updatedAt: personaState.updatedAt.toISOString(),
        }
      }
    } catch {
      // PersonaState 테이블이 없을 수 있음
    }

    // 탭별 데이터 조회
    if (tab === "activity") {
      const activities = await fetchActivities(id, limit)
      return NextResponse.json({
        success: true,
        data: { tab, state, activities, stats: await fetchMemoryStats(id) },
      })
    }

    if (tab === "consumption") {
      const consumptions = await fetchConsumptions(id, limit)
      return NextResponse.json({
        success: true,
        data: { tab, state, consumptions, stats: await fetchMemoryStats(id) },
      })
    }

    if (tab === "interaction") {
      const interactions = await fetchInteractions(id, limit)
      return NextResponse.json({
        success: true,
        data: { tab, state, interactions, stats: await fetchMemoryStats(id) },
      })
    }

    if (tab === "relationship") {
      const relationships = await fetchRelationships(id)
      return NextResponse.json({
        success: true,
        data: { tab, state, relationships, stats: await fetchMemoryStats(id) },
      })
    }

    // 기본: activity
    const activities = await fetchActivities(id, limit)
    return NextResponse.json({
      success: true,
      data: { tab: "activity", state, activities, stats: await fetchMemoryStats(id) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MEMORY_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── 활동 로그 조회 ───────────────────────────────────────────

async function fetchActivities(personaId: string, limit: number) {
  try {
    const logs = await prisma.personaActivityLog.findMany({
      where: { personaId },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return logs.map((log) => ({
      id: log.id,
      activityType: log.activityType,
      targetId: log.targetId,
      metadata: log.metadata as Record<string, unknown> | null,
      stateSnapshot: log.stateSnapshot as Record<string, unknown> | null,
      matchingScore: log.matchingScore ? Number(log.matchingScore) : null,
      createdAt: log.createdAt.toISOString(),
    }))
  } catch {
    return []
  }
}

// ── 소비 기록 조회 ───────────────────────────────────────────

async function fetchConsumptions(personaId: string, limit: number) {
  try {
    const logs = await prisma.consumptionLog.findMany({
      where: { personaId },
      orderBy: { consumedAt: "desc" },
      take: limit,
    })
    return logs.map((log) => ({
      id: log.id,
      contentType: log.contentType,
      title: log.title,
      impression: log.impression,
      rating: log.rating ? Number(log.rating) : null,
      emotionalImpact: Number(log.emotionalImpact),
      tags: log.tags,
      source: log.source,
      consumedAt: log.consumedAt.toISOString(),
    }))
  } catch {
    return []
  }
}

// ── 대화 이력 조회 ───────────────────────────────────────────

async function fetchInteractions(personaId: string, limit: number) {
  try {
    const sessions = await prisma.interactionSession.findMany({
      where: { personaId },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
          take: 5,
        },
      },
    })
    return sessions.map((session) => ({
      id: session.id,
      totalTurns: session.totalTurns,
      avgPressure: session.avgPressure ? Number(session.avgPressure) : null,
      peakPressure: session.peakPressure ? Number(session.peakPressure) : null,
      dominantTopic: session.dominantTopic,
      integrityScore: session.integrityScore ? Number(session.integrityScore) : null,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      recentLogs: session.logs.map((log) => ({
        id: log.id,
        interactionType: log.interactionType,
        poignancyScore: log.poignancyScore ? Number(log.poignancyScore) : null,
        timestamp: log.timestamp.toISOString(),
      })),
    }))
  } catch {
    return []
  }
}

// ── 관계 조회 ───────────────────────────────────────────────

async function fetchRelationships(personaId: string) {
  try {
    const rels = await prisma.personaRelationship.findMany({
      where: {
        OR: [{ personaAId: personaId }, { personaBId: personaId }],
      },
      orderBy: { updatedAt: "desc" },
    })

    // 상대 페르소나 이름 조회
    const otherIds = rels.map((r) => (r.personaAId === personaId ? r.personaBId : r.personaAId))
    const personas = await prisma.persona.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, name: true },
    })
    const nameMap = new Map(personas.map((p) => [p.id, p.name]))

    return rels.map((rel) => {
      const otherId = rel.personaAId === personaId ? rel.personaBId : rel.personaAId
      return {
        id: rel.id,
        otherPersonaId: otherId,
        otherPersonaName: nameMap.get(otherId) ?? "Unknown",
        warmth: Number(rel.warmth),
        tension: Number(rel.tension),
        frequency: Number(rel.frequency),
        depth: Number(rel.depth),
        attraction: Number(rel.attraction),
        stage: rel.stage,
        type: rel.type,
        peakStage: rel.peakStage,
        momentum: Number(rel.momentum),
        milestones: rel.milestones ?? [],
        lastInteractionAt: rel.lastInteractionAt?.toISOString() ?? null,
      }
    })
  } catch {
    return []
  }
}

// ── 기억 통계 ───────────────────────────────────────────────

async function fetchMemoryStats(personaId: string) {
  try {
    const [activityCount, consumptionCount, sessionCount, relationshipCount] = await Promise.all([
      prisma.personaActivityLog.count({ where: { personaId } }),
      prisma.consumptionLog.count({ where: { personaId } }),
      prisma.interactionSession.count({ where: { personaId } }),
      prisma.personaRelationship.count({
        where: { OR: [{ personaAId: personaId }, { personaBId: personaId }] },
      }),
    ])

    return {
      activityCount,
      consumptionCount,
      sessionCount,
      relationshipCount,
      totalMemories: activityCount + consumptionCount + sessionCount,
    }
  } catch {
    return {
      activityCount: 0,
      consumptionCount: 0,
      sessionCount: 0,
      relationshipCount: 0,
      totalMemories: 0,
    }
  }
}
