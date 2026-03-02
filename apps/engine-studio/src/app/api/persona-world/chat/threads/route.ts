import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { createThread, getThreads } from "@/lib/persona-world/chat-service"
import type { ChatDataProvider } from "@/lib/persona-world/chat-service"

// ── Prisma ChatDataProvider (부분: thread 관련만) ─────────

function buildThreadProvider(): Pick<
  ChatDataProvider,
  "createThread" | "getThreads" | "createInteractionSession"
> {
  return {
    async createThread(params) {
      const thread = await prisma.chatThread.create({
        data: {
          personaId: params.personaId,
          userId: params.userId,
          sessionId: params.sessionId,
        },
      })
      return { id: thread.id }
    },

    async getThreads(userId) {
      const threads = await prisma.chatThread.findMany({
        where: { userId },
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
        include: {
          persona: { select: { name: true, profileImageUrl: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      })

      return threads.map((t) => ({
        id: t.id,
        personaId: t.personaId,
        personaName: t.persona.name,
        personaImageUrl: t.persona.profileImageUrl,
        lastMessageAt: t.lastMessageAt,
        lastMessageContent: t.messages[0]?.content ?? null,
        totalMessages: t.totalMessages,
        isActive: t.isActive,
      }))
    },

    async createInteractionSession(params) {
      const session = await prisma.interactionSession.create({
        data: {
          personaId: params.personaId,
          userId: params.userId,
        },
      })
      return { id: session.id }
    },
  }
}

/**
 * GET /api/persona-world/chat/threads?userId=xxx
 * 유저의 대화방 목록
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  try {
    const provider = buildThreadProvider()
    const threads = await getThreads(provider as ChatDataProvider, userId)

    return NextResponse.json({ success: true, data: { threads } })
  } catch (error) {
    console.error("[chat/threads GET]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch threads" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/chat/threads
 * 대화방 생성
 * Body: { userId, personaId }
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, personaId } = body

    if (!userId || !personaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARAM", message: "userId and personaId required" },
        },
        { status: 400 }
      )
    }

    // 페르소나 존재 확인
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: { id: true, status: true },
    })
    if (!persona || persona.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "PERSONA_NOT_FOUND", message: "Persona not found or not active" },
        },
        { status: 404 }
      )
    }

    // 유저 존재 확인
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } },
        { status: 404 }
      )
    }

    const provider = buildThreadProvider()
    const result = await createThread(provider as ChatDataProvider, userId, personaId)

    return NextResponse.json({
      success: true,
      data: { threadId: result.threadId, sessionId: result.sessionId },
    })
  } catch (error) {
    console.error("[chat/threads POST]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to create thread" } },
      { status: 500 }
    )
  }
}
