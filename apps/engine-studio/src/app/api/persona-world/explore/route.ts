import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getExploreData } from "@/lib/persona-world/feed/explore-engine"
import type { ExploreDataProvider } from "@/lib/persona-world/feed/explore-engine"
import type { ExploreData } from "@/lib/persona-world/types"

/**
 * GET /api/persona-world/explore
 *
 * Explore 탭 종합 데이터 API.
 * 교차축 클러스터, 핫 토픽, 활성 토론, 신규 페르소나.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const topPersonasLimit = Number(searchParams.get("topPersonas") || "5")
    const hotTopicsLimit = Number(searchParams.get("hotTopics") || "10")
    const activeDebatesLimit = Number(searchParams.get("activeDebates") || "5")
    const newPersonasLimit = Number(searchParams.get("newPersonas") || "10")

    const provider: ExploreDataProvider = {
      async getTopPersonaClusters(limit: number): Promise<ExploreData["topPersonas"]> {
        // 역할(role) 기반 클러스터링 (향후 교차축 기반으로 확장)
        const personas = await prisma.persona.findMany({
          where: { status: { in: ["ACTIVE", "STANDARD"] } },
          select: { id: true, role: true },
          orderBy: { createdAt: "desc" },
          take: limit * 5,
        })

        const clusters = new Map<string, string[]>()
        for (const p of personas) {
          const cluster = p.role ?? "기타"
          if (!clusters.has(cluster)) clusters.set(cluster, [])
          clusters.get(cluster)!.push(p.id)
        }

        return Array.from(clusters.entries())
          .slice(0, limit)
          .map(([cluster, personaIds]) => ({ cluster, personaIds: personaIds.slice(0, 5) }))
      },

      async getHotTopics(limit: number): Promise<ExploreData["hotTopics"]> {
        const posts = await prisma.personaPost.findMany({
          where: {
            isHidden: false,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          select: { type: true },
          orderBy: { likeCount: "desc" },
          take: limit * 10,
        })

        const topicCount = new Map<string, number>()
        for (const p of posts) {
          const topic = p.type
          topicCount.set(topic, (topicCount.get(topic) ?? 0) + 1)
        }

        return Array.from(topicCount.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([topic, postCount]) => ({
            topic,
            postCount,
            paradoxTensionAvg: 0, // 향후 PersonaState 연동
          }))
      },

      async getActiveDebates(limit: number): Promise<ExploreData["activeDebates"]> {
        const posts = await prisma.personaPost.findMany({
          where: {
            isHidden: false,
            type: { in: ["DEBATE", "VS_BATTLE"] },
          },
          select: {
            id: true,
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })

        return posts.map((p) => ({
          postId: p.id,
          participants: [],
          commentCount: p._count.comments,
        }))
      },

      async getNewPersonas(limit: number): Promise<ExploreData["newPersonas"]> {
        const personas = await prisma.persona.findMany({
          where: { status: { in: ["ACTIVE", "STANDARD"] } },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { id: true },
        })

        return personas.map((p) => ({
          personaId: p.id,
          autoInterviewScore: 0, // 향후 Auto-Interview 연동
        }))
      },
    }

    const data = await getExploreData(provider, {
      topPersonas: topPersonasLimit,
      hotTopics: hotTopicsLimit,
      activeDebates: activeDebatesLimit,
      newPersonas: newPersonasLimit,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EXPLORE_ERROR", message } },
      { status: 500 }
    )
  }
}
