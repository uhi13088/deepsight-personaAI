// ═══════════════════════════════════════════════════════════════
// Connectivity API — Social Module 그래프 분석
// T148: 관리자 보안 대시보드
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  computeAllNodeMetrics,
  computeGraphStats,
  classifyNode,
  detectAnomalies,
} from "@/lib/social-module/connectivity"
import type {
  RelationshipEdge,
  NodeMetrics,
  GraphStats,
  NodeClassification,
  AnomalyAlert,
} from "@/lib/social-module/types"

interface ConnectivityResponse {
  stats: GraphStats
  nodes: Array<NodeMetrics & { classification: NodeClassification; personaName?: string }>
  anomalies: AnomalyAlert[]
}

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    // 관계 데이터 로드
    const relationships = await prisma.personaRelationship.findMany({
      select: {
        personaAId: true,
        personaBId: true,
        warmth: true,
        tension: true,
        frequency: true,
        depth: true,
        lastInteractionAt: true,
      },
    })

    // 페르소나 이름 매핑
    const personaIds = new Set<string>()
    for (const r of relationships) {
      personaIds.add(r.personaAId)
      personaIds.add(r.personaBId)
    }

    const personas = await prisma.persona.findMany({
      where: { id: { in: Array.from(personaIds) } },
      select: { id: true, name: true },
    })
    const nameMap = new Map(personas.map((p) => [p.id, p.name]))

    // RelationshipEdge 변환
    const edges: RelationshipEdge[] = relationships.map((r) => ({
      sourceId: r.personaAId,
      targetId: r.personaBId,
      warmth: Number(r.warmth),
      tension: Number(r.tension),
      frequency: Number(r.frequency),
      depth: Number(r.depth),
      lastInteractionAt: r.lastInteractionAt?.getTime() ?? null,
    }))

    // 그래프 분석
    const stats = computeGraphStats(edges)
    const metrics = computeAllNodeMetrics(edges)

    // 최근 7일 엣지 (이상 탐지용)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentEdges = edges.filter(
      (e) => e.lastInteractionAt !== null && e.lastInteractionAt >= weekAgo
    )

    const anomalies = detectAnomalies(edges, recentEdges, 7)

    // 분류 추가
    const nodes = metrics.map((m) => ({
      ...m,
      classification: classifyNode(m, stats.avgDegree),
      personaName: nameMap.get(m.personaId),
    }))

    // Hub, Isolate 순으로 정렬
    nodes.sort((a, b) => {
      const order: Record<NodeClassification, number> = {
        HUB: 0,
        NORMAL: 1,
        PERIPHERAL: 2,
        ISOLATE: 3,
      }
      return order[a.classification] - order[b.classification]
    })

    return NextResponse.json({
      success: true,
      data: { stats, nodes, anomalies },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}
