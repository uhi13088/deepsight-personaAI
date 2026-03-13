import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { endChatThread } from "@/lib/persona-world/chat-service"
import type { ChatDataProvider } from "@/lib/persona-world/chat-service"
import type { PersonaProfileSnapshot, PersonaStateData } from "@/lib/persona-world/types"
import type { MemoryItem } from "@/lib/persona-world/rag-weighted-search"
import type { Factbook } from "@/types"

// Prisma ChatDataProvider를 messages/route.ts와 동일하게 구현
// (공유 팩토리 추출은 별도 티켓)
function buildChatProvider(): ChatDataProvider {
  return {
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
        lastMessageAt: t.lastMessageAt,
        intimacyScore: Number(t.intimacyScore),
        intimacyLevel: t.intimacyLevel,
        lastIntimacyAt: t.lastIntimacyAt,
        sharedMilestones: (t.sharedMilestones as string[] | null) ?? null,
      }
    },

    async updateThread(threadId, data) {
      await prisma.chatThread.update({ where: { id: threadId }, data })
    },

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
        take: limit + 1,
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

    async createInteractionSession(params) {
      const s = await prisma.interactionSession.create({
        data: { personaId: params.personaId, userId: params.userId },
      })
      return { id: s.id }
    },

    async getTopPoignancyLogs(sessionId, limit) {
      const logs = await prisma.interactionLog.findMany({
        where: { sessionId },
        orderBy: { poignancyScore: "desc" },
        take: limit,
        select: { userMessage: true, personaResponse: true, poignancyScore: true },
      })
      return logs.map((log) => ({
        userMessage: log.userMessage ?? "",
        personaResponse: log.personaResponse ?? "",
        poignancyScore: Number(log.poignancyScore ?? 0),
      }))
    },

    async endInteractionSession(sessionId, endedAt) {
      await prisma.interactionSession.update({
        where: { id: sessionId },
        data: { endedAt },
      })
    },

    async getInteractionMemories(personaId, userId) {
      const logs = await prisma.interactionLog.findMany({
        where: { session: { personaId, userId }, interactionType: "CONVERSATION" },
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
      await prisma.interactionLog.create({ data: params })
    },

    async incrementSessionTurns(sessionId) {
      await prisma.interactionSession.update({
        where: { id: sessionId },
        data: { totalTurns: { increment: 1 } },
      })
    },

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
 * POST /api/persona-world/chat/threads/[threadId]/end
 * T435: 명시적 채팅 종료
 * Body: { userId, highlights?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const { threadId } = await params

  try {
    const body = await request.json()
    const { userId, highlights } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
        { status: 400 }
      )
    }

    const provider = buildChatProvider()
    const result = await endChatThread(provider, { threadId, userId, highlights })

    return NextResponse.json({ success: true, data: result })
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
    if (msg === "THREAD_ALREADY_ENDED") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_ALREADY_ENDED", message: "Thread already ended" },
        },
        { status: 409 }
      )
    }
    console.error("[chat/threads/end POST]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to end chat thread" } },
      { status: 500 }
    )
  }
}
