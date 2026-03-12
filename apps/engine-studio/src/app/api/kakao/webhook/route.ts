import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isLLMConfigured } from "@/lib/llm-client"
import { sendMessage, createThread } from "@/lib/persona-world/chat-service"
import type { ChatDataProvider } from "@/lib/persona-world/chat-service"
import type { PersonaProfileSnapshot, PersonaStateData } from "@/lib/persona-world/types"
import type { MemoryItem } from "@/lib/persona-world/rag-weighted-search"
import type { Factbook } from "@/types"

// ── 카카오 오픈빌더 요청/응답 타입 ──────────────────────────

interface KakaoSkillRequest {
  intent: { id: string; name: string }
  userRequest: {
    timezone: string
    params: { ignoreRecent: string; surface: string }
    block: { id: string; name: string }
    utterance: string
    lang: string
    user: {
      id: string // kakaoUserKey
      type: string
      properties: Record<string, string>
    }
  }
  bot: { id: string; name: string }
  action: { name: string; clientExtra: Record<string, unknown>; params: Record<string, string> }
}

interface KakaoSkillResponse {
  version: string
  template: {
    outputs: Array<{ simpleText: { text: string } }>
  }
}

// ── 헬퍼 ────────────────────────────────────────────────────

function kakaoResponse(text: string): KakaoSkillResponse {
  // 카카오톡 simpleText 최대 1000자
  const truncated = text.length > 1000 ? text.slice(0, 997) + "..." : text
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text: truncated } }],
    },
  }
}

// ── Prisma ChatDataProvider (웹훅 전용) ─────────────────────

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

// ── 기존 대화방 조회 또는 생성 ──────────────────────────────

async function getOrCreateThread(
  provider: ChatDataProvider,
  userId: string,
  personaId: string
): Promise<string> {
  // 기존 활성 대화방 찾기
  const existing = await prisma.chatThread.findFirst({
    where: { userId, personaId, isActive: true },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: { id: true },
  })

  if (existing) return existing.id

  // 새 대화방 생성
  const result = await createThread(provider, userId, personaId)
  return result.threadId
}

/**
 * POST /api/kakao/webhook
 * 카카오 오픈빌더 스킬 서버 엔드포인트
 * 인증 불필요 — 카카오 오픈빌더가 직접 호출
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KakaoSkillRequest
    const kakaoUserKey = body.userRequest?.user?.id
    const utterance = body.userRequest?.utterance?.trim()

    if (!kakaoUserKey || !utterance) {
      return NextResponse.json(kakaoResponse("요청을 처리할 수 없습니다."))
    }

    // 1. kakaoUserKey로 연동 정보 조회
    const link = await prisma.kakaoLink.findUnique({
      where: { kakaoUserKey },
      include: {
        persona: { select: { id: true, name: true, status: true } },
      },
    })

    if (!link || !link.isActive) {
      return NextResponse.json(
        kakaoResponse(
          "아직 페르소나가 연동되지 않았어요.\n\nPersonaWorld(persona-world.deepsight.ai)에서 페르소나를 연동해주세요!"
        )
      )
    }

    if (link.persona.status !== "ACTIVE") {
      return NextResponse.json(
        kakaoResponse(
          "연동된 페르소나가 현재 비활성 상태입니다.\nPersonaWorld에서 다른 페르소나를 연동해주세요."
        )
      )
    }

    // 2. LLM 설정 확인
    if (!isLLMConfigured()) {
      return NextResponse.json(
        kakaoResponse("현재 서비스 점검 중입니다. 잠시 후 다시 시도해주세요.")
      )
    }

    // 3. 메시지 길이 제한
    if (utterance.length > 2000) {
      return NextResponse.json(kakaoResponse("메시지가 너무 길어요. 2000자 이내로 보내주세요."))
    }

    // 4. 대화방 조회/생성 + 메시지 전송
    const provider = buildChatProvider()
    const threadId = await getOrCreateThread(provider, link.userId, link.personaId)

    const result = await sendMessage(provider, {
      threadId,
      userId: link.userId,
      content: utterance,
      source: "KAKAO",
    })

    return NextResponse.json(kakaoResponse(result.personaResponse))
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"

    if (msg === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        kakaoResponse("크레딧이 부족합니다.\nPersonaWorld에서 크레딧을 충전해주세요!")
      )
    }

    console.error("[kakao/webhook POST]", error)
    return NextResponse.json(
      kakaoResponse("죄송합니다, 응답을 생성하지 못했어요. 잠시 후 다시 시도해주세요.")
    )
  }
}
