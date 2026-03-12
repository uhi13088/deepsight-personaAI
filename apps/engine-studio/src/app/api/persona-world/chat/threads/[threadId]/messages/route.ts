import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { isLLMConfigured } from "@/lib/llm-client"
import { sendMessage, getMessages } from "@/lib/persona-world/chat-service"
import type { ChatDataProvider } from "@/lib/persona-world/chat-service"
import type { PersonaProfileSnapshot, PersonaStateData } from "@/lib/persona-world/types"
import type { MemoryItem } from "@/lib/persona-world/rag-weighted-search"
import type { Factbook } from "@/types"

// ── Full ChatDataProvider (Prisma 구현) ─────────────────────

function buildChatProvider(): ChatDataProvider {
  return {
    // ── Thread 관련 ──
    async createThread(params) {
      const t = await prisma.chatThread.create({
        data: { personaId: params.personaId, userId: params.userId, sessionId: params.sessionId },
      })
      return { id: t.id }
    },

    async getThreads(userId) {
      const threads = await prisma.chatThread.findMany({
        where: { userId },
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
        include: {
          persona: { select: { name: true, profileImageUrl: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
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

    async getThread(threadId) {
      const t = await prisma.chatThread.findUnique({ where: { id: threadId } })
      if (!t) return null
      return {
        id: t.id,
        personaId: t.personaId,
        userId: t.userId,
        sessionId: t.sessionId,
        totalMessages: t.totalMessages,
        isActive: t.isActive,
        intimacyScore: Number(t.intimacyScore),
        intimacyLevel: t.intimacyLevel,
        lastIntimacyAt: t.lastIntimacyAt,
        sharedMilestones: (t.sharedMilestones as string[] | null) ?? null,
      }
    },

    async updateThread(threadId, data) {
      await prisma.chatThread.update({ where: { id: threadId }, data })
    },

    // ── Message 관련 ──
    async saveMessage(params) {
      const msg = await prisma.chatMessage.create({
        data: {
          threadId: params.threadId,
          role: params.role,
          content: params.content,
          imageUrl: params.imageUrl,
          tokenCount: params.tokenCount,
          poignancyScore: params.poignancyScore,
        },
      })
      return { id: msg.id, createdAt: msg.createdAt }
    },

    async getMessages(threadId, options) {
      const limit = options?.limit ?? 30
      const cursor = options?.cursor

      const messages = await prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: "asc" },
        take: limit + 1, // +1 for cursor detection
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, role: true, content: true, imageUrl: true, createdAt: true },
      })

      const hasMore = messages.length > limit
      const items = hasMore ? messages.slice(0, limit) : messages

      return {
        messages: items.map((m) => ({
          id: m.id,
          role: m.role as "USER" | "PERSONA",
          content: m.content,
          imageUrl: m.imageUrl,
          createdAt: m.createdAt,
        })),
        nextCursor: hasMore ? items[items.length - 1].id : null,
      }
    },

    // ── InteractionSession ──
    async createInteractionSession(params) {
      const s = await prisma.interactionSession.create({
        data: { personaId: params.personaId, userId: params.userId },
      })
      return { id: s.id }
    },

    // ── Memory Provider ──
    async getInteractionMemories(personaId, userId) {
      const logs = await prisma.interactionLog.findMany({
        where: {
          session: { personaId, userId },
          interactionType: "CONVERSATION",
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          userMessage: true,
          personaResponse: true,
          poignancyScore: true,
          createdAt: true,
        },
      })

      return logs.map(
        (log): MemoryItem => ({
          id: log.id,
          type: "interaction",
          content: [
            log.userMessage ? `유저: ${log.userMessage}` : "",
            log.personaResponse ? `나: ${log.personaResponse}` : "",
          ]
            .filter(Boolean)
            .join(" | "),
          personaId,
          createdAt: log.createdAt.getTime(),
          poignancy: Number(log.poignancyScore ?? 0),
        })
      )
    },

    async saveInteractionLog(params) {
      await prisma.interactionLog.create({
        data: {
          sessionId: params.sessionId,
          turnNumber: params.turnNumber,
          initiatorType: params.initiatorType,
          initiatorId: params.initiatorId,
          receiverType: params.receiverType,
          receiverId: params.receiverId,
          interactionType: params.interactionType,
          userMessage: params.userMessage,
          personaResponse: params.personaResponse,
          responseLengthTokens: params.responseLengthTokens,
          poignancyScore: params.poignancyScore,
          source: params.source,
        },
      })
    },

    async incrementSessionTurns(sessionId) {
      await prisma.interactionSession.update({
        where: { id: sessionId },
        data: { totalTurns: { increment: 1 } },
      })
    },

    // ── Factbook ──
    async getFactbook(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { factbook: true },
      })
      return (persona?.factbook as Factbook | null) ?? null
    },

    async saveFactbook(personaId, factbook) {
      await prisma.persona.update({
        where: { id: personaId },
        data: { factbook: JSON.parse(JSON.stringify(factbook)) },
      })
    },

    // ── PersonaState ──
    async getPersonaState(personaId) {
      const state = await prisma.personaState.findUnique({ where: { personaId } })
      if (!state) return null
      return {
        mood: Number(state.mood),
        energy: Number(state.energy),
        socialBattery: Number(state.socialBattery),
        paradoxTension: Number(state.paradoxTension),
        narrativeTension: state.narrativeTension ? Number(state.narrativeTension) : undefined,
      }
    },

    async savePersonaState(personaId, stateData) {
      await prisma.personaState.upsert({
        where: { personaId },
        update: {
          mood: stateData.mood,
          energy: stateData.energy,
          socialBattery: stateData.socialBattery,
          paradoxTension: stateData.paradoxTension,
        },
        create: {
          personaId,
          mood: stateData.mood,
          energy: stateData.energy,
          socialBattery: stateData.socialBattery,
          paradoxTension: stateData.paradoxTension,
        },
      })
    },

    // ── Persona Profile ──
    async getPersonaProfile(personaId) {
      const p = await prisma.persona.findUnique({
        where: { id: personaId },
        select: {
          name: true,
          role: true,
          expertise: true,
          description: true,
          region: true,
          speechPatterns: true,
          quirks: true,
          voiceSpec: true,
          factbook: true,
          postPrompt: true,
          commentPrompt: true,
        },
      })
      if (!p) return null
      return {
        name: p.name,
        role: p.role,
        expertise: p.expertise,
        description: p.description,
        region: p.region,
        speechPatterns: p.speechPatterns,
        quirks: p.quirks,
        voiceSpec: p.voiceSpec,
        factbook: p.factbook,
        postPrompt: p.postPrompt,
        commentPrompt: p.commentPrompt,
      } as PersonaProfileSnapshot
    },

    async getPersonaVolatility(personaId) {
      const p = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { paradoxConfig: true },
      })
      if (!p?.paradoxConfig) return 0.3
      const config = p.paradoxConfig as Record<string, unknown>
      const narrativeVector = config.narrativeVector as Record<string, number> | undefined
      return narrativeVector?.volatility ?? 0.3
    },

    // ── Intimacy Provider (T429) ──
    async getThreadIntimacy(threadId) {
      const t = await prisma.chatThread.findUnique({
        where: { id: threadId },
        select: {
          intimacyScore: true,
          intimacyLevel: true,
          lastIntimacyAt: true,
          sharedMilestones: true,
          personaId: true,
          userId: true,
        },
      })
      if (!t) return null
      return {
        intimacyScore: Number(t.intimacyScore),
        intimacyLevel: t.intimacyLevel,
        lastIntimacyAt: t.lastIntimacyAt,
        sharedMilestones: (t.sharedMilestones as string[] | null) ?? null,
        personaId: t.personaId,
        userId: t.userId,
      }
    },

    async updateThreadIntimacy(threadId, data) {
      await prisma.chatThread.update({
        where: { id: threadId },
        data: {
          intimacyScore: data.intimacyScore,
          intimacyLevel: data.intimacyLevel,
          lastIntimacyAt: data.lastIntimacyAt,
          ...(data.sharedMilestones ? { sharedMilestones: data.sharedMilestones } : {}),
        },
      })
    },

    // ── Credit Provider ──
    async getLatestTransaction(userId) {
      const tx = await prisma.coinTransaction.findFirst({
        where: { userId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      })
      if (!tx) return null
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async createTransaction(data) {
      const tx = await prisma.coinTransaction.create({
        data: {
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          balanceAfter: data.balanceAfter,
          reason: data.reason,
          orderId: data.orderId,
          paymentKey: data.paymentKey,
          status: data.status ?? "COMPLETED",
        },
      })
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async findByOrderId(orderId) {
      const tx = await prisma.coinTransaction.findFirst({ where: { orderId } })
      if (!tx) return null
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async updateTransaction(id, data) {
      const tx = await prisma.coinTransaction.update({ where: { id }, data })
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async getTransactions(userId, options) {
      const txs = await prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 20,
        skip: options?.offset ?? 0,
      })
      return txs.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }))
    },
  }
}

/**
 * GET /api/persona-world/chat/threads/[threadId]/messages?userId=xxx&limit=30&cursor=xxx
 * 메시지 히스토리 (커서 페이지네이션)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const { threadId } = await params
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  try {
    const provider = buildChatProvider()
    const result = await getMessages(provider, threadId, userId, {
      limit: Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 30), 100),
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        messages: result.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
        nextCursor: result.nextCursor,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    if (msg === "THREAD_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "THREAD_NOT_FOUND", message: "Thread not found" } },
        { status: 404 }
      )
    }
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not your thread" } },
        { status: 403 }
      )
    }
    console.error("[chat/messages GET]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch messages" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/chat/threads/[threadId]/messages
 * 메시지 전송 (10코인 차감 + LLM 호출 + 기억 저장)
 * Body: { userId, content, imageBase64?, imageMediaType?, imageUrl? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const { threadId } = await params

  // LLM 설정 확인
  if (!isLLMConfigured()) {
    return NextResponse.json(
      { success: false, error: { code: "LLM_NOT_CONFIGURED", message: "LLM API key not set" } },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { userId, content, imageBase64, imageMediaType, imageUrl } = body

    if (!userId || !content) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARAM", message: "userId and content required" },
        },
        { status: 400 }
      )
    }

    // 메시지 길이 제한
    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: { code: "MESSAGE_TOO_LONG", message: "Max 2000 characters" } },
        { status: 400 }
      )
    }

    // 유저 활동명 조회
    const pwUser = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: { nickname: true },
    })

    const provider = buildChatProvider()
    const result = await sendMessage(provider, {
      threadId,
      userId,
      content,
      imageBase64,
      imageMediaType,
      imageUrl,
      userNickname: pwUser?.nickname ?? undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        userMessageId: result.userMessageId,
        personaMessageId: result.personaMessageId,
        personaResponse: result.personaResponse,
        remainingBalance: result.remainingBalance,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"

    if (msg === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: "Not enough coins. Need 10 coins per turn.",
          },
        },
        { status: 402 }
      )
    }
    if (msg === "THREAD_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "THREAD_NOT_FOUND", message: "Thread not found" } },
        { status: 404 }
      )
    }
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not your thread" } },
        { status: 403 }
      )
    }
    if (msg === "PERSONA_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "PERSONA_NOT_FOUND", message: "Persona not found" } },
        { status: 404 }
      )
    }

    console.error("[chat/messages POST]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to send message" } },
      { status: 500 }
    )
  }
}
