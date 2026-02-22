import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

interface SearchResult {
  type: "api_key" | "log" | "webhook" | "doc"
  id: string
  title: string
  description: string
  url: string
}

// GET /api/search?q=query
export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim().toLowerCase()

    if (!query || query.length < 2 || query.length > 100) {
      return NextResponse.json({
        success: true,
        data: { results: [] },
      })
    }

    const results: SearchResult[] = []

    // Search API Keys
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { keyPrefix: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastFour: true,
          environment: true,
        },
      })

      for (const key of apiKeys) {
        results.push({
          type: "api_key",
          id: key.id,
          title: key.name,
          description: `${key.keyPrefix}...${key.lastFour} (${key.environment})`,
          url: "/api-keys",
        })
      }
    } catch {
      // Table might not exist, skip
    }

    // Search Webhooks
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          OR: [
            { url: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: {
          id: true,
          url: true,
          description: true,
        },
      })

      for (const webhook of webhooks) {
        results.push({
          type: "webhook",
          id: webhook.id,
          title: webhook.url,
          description: webhook.description || "Webhook endpoint",
          url: "/webhooks",
        })
      }
    } catch {
      // Table might not exist, skip
    }

    // Search API Logs (by endpoint)
    try {
      const logs = await prisma.apiLog.findMany({
        where: {
          endpoint: { contains: query, mode: "insensitive" },
        },
        take: 5,
        distinct: ["endpoint"],
        select: {
          id: true,
          endpoint: true,
          method: true,
          statusCode: true,
        },
      })

      for (const log of logs) {
        results.push({
          type: "log",
          id: log.id,
          title: `${log.method} ${log.endpoint}`,
          description: `Status: ${log.statusCode}`,
          url: "/logs",
        })
      }
    } catch {
      // Table might not exist, skip
    }

    // Search Documentation (static)
    const docs = [
      {
        id: "auth",
        title: "Authentication",
        description: "API 인증 방법",
        url: "/docs/authentication",
      },
      { id: "keys", title: "API Keys", description: "API 키 관리", url: "/docs/api-keys" },
      { id: "rate", title: "Rate Limits", description: "요청 제한", url: "/docs/rate-limits" },
      { id: "errors", title: "Error Handling", description: "에러 처리", url: "/docs/errors" },
      { id: "webhooks", title: "Webhooks", description: "웹훅 설정", url: "/docs/webhooks" },
      { id: "personas", title: "Personas API", description: "페르소나 API", url: "/docs/personas" },
      { id: "matching", title: "Matching API", description: "매칭 API", url: "/docs/matching" },
    ]

    for (const doc of docs) {
      if (
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query)
      ) {
        results.push({
          type: "doc",
          id: doc.id,
          title: doc.title,
          description: doc.description,
          url: doc.url,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { results: results.slice(0, 10) },
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({
      success: true,
      data: { results: [] },
    })
  }
}
