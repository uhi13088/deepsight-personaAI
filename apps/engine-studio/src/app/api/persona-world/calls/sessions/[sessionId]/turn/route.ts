import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { isLLMConfigured } from "@/lib/llm-client"
import { processCallTurn } from "@/lib/persona-world/call-service"
import type { CallDataProvider } from "@/lib/persona-world/call-service"
import type { ConversationMessage } from "@/lib/persona-world/conversation-engine"
import type { PersonaProfileSnapshot } from "@/lib/persona-world/types"
import type { MemoryItem } from "@/lib/persona-world/rag-weighted-search"
import type { Factbook } from "@/types"

// ── CallDataProvider 재사용 (sessions/route.ts와 동일 구조) ──
// 실제 프로덕션에서는 공유 팩토리로 추출하는 것이 바람직하지만,
// 현재 프로젝트 컨벤션(인라인 DI 구현)을 따름

function buildCallProvider(): CallDataProvider {
  return {
    async createReservation(params) {
      const r = await prisma.callReservation.create({
        data: {
          personaId: params.personaId,
          userId: params.userId,
          scheduledAt: params.scheduledAt,
          coinSpent: params.coinSpent,
          status: "PENDING",
        },
      })
      return { id: r.id }
    },

    async getReservation(reservationId) {
      const r = await prisma.callReservation.findUnique({ where: { id: reservationId } })
      if (!r) return null
      return {
        id: r.id,
        personaId: r.personaId,
        userId: r.userId,
        scheduledAt: r.scheduledAt,
        status: r.status,
        coinSpent: r.coinSpent,
      }
    },

    async updateReservationStatus(reservationId, status) {
      await prisma.callReservation.update({ where: { id: reservationId }, data: { status } })
    },

    async getReservations(userId) {
      const reservations = await prisma.callReservation.findMany({
        where: { userId },
        orderBy: { scheduledAt: "desc" },
        include: { persona: { select: { name: true, profileImageUrl: true } } },
      })
      return reservations.map((r) => ({
        id: r.id,
        personaId: r.personaId,
        personaName: r.persona.name,
        personaImageUrl: r.persona.profileImageUrl,
        scheduledAt: r.scheduledAt,
        status: r.status,
        coinSpent: r.coinSpent,
      }))
    },

    async createCallSession(params) {
      const s = await prisma.callSession.create({
        data: {
          reservationId: params.reservationId,
          interactionSessionId: params.interactionSessionId,
        },
      })
      return { id: s.id }
    },

    async updateCallSession(sessionId, data) {
      await prisma.callSession.update({ where: { id: sessionId }, data })
    },

    async getCallSession(reservationId) {
      const s = await prisma.callSession.findUnique({ where: { reservationId } })
      if (!s) return null
      return {
        id: s.id,
        reservationId: s.reservationId,
        interactionSessionId: s.interactionSessionId ?? "",
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        totalTurns: s.totalTurns,
        totalDurationSec: s.totalDurationSec,
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

    async getFactbook(personaId) {
      const p = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { factbook: true },
      })
      return (p?.factbook as Factbook | null) ?? null
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

    async getPersonaTTSConfig(personaId) {
      const p = await prisma.persona.findUnique({
        where: { id: personaId },
        select: {
          ttsProvider: true,
          ttsVoiceId: true,
          ttsPitch: true,
          ttsSpeed: true,
          ttsLanguage: true,
        },
      })
      return {
        ttsProvider: p?.ttsProvider ?? null,
        ttsVoiceId: p?.ttsVoiceId ?? null,
        ttsPitch: p?.ttsPitch ? Number(p.ttsPitch) : null,
        ttsSpeed: p?.ttsSpeed ? Number(p.ttsSpeed) : null,
        ttsLanguage: p?.ttsLanguage ?? null,
      }
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
 * POST /api/persona-world/calls/sessions/[sessionId]/turn
 * 통화 턴 처리 — 유저 음성 → STT → LLM → TTS → 페르소나 음성
 * Body: { reservationId, personaId, userId, audioBase64, audioContentType, conversationHistory, turnNumber, elapsedSec }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  if (!isLLMConfigured()) {
    return NextResponse.json(
      { success: false, error: { code: "LLM_NOT_CONFIGURED", message: "LLM API key not set" } },
      { status: 503 }
    )
  }

  const { sessionId } = await params

  try {
    const body = (await req.json()) as {
      reservationId?: string
      personaId?: string
      userId?: string
      audioBase64?: string
      audioContentType?: string
      conversationHistory?: ConversationMessage[]
      turnNumber?: number
      elapsedSec?: number
    }

    if (
      !body.reservationId ||
      !body.personaId ||
      !body.userId ||
      !body.audioBase64 ||
      !body.audioContentType
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "reservationId, personaId, userId, audioBase64, audioContentType are required",
          },
        },
        { status: 400 }
      )
    }

    const audioBuffer = Buffer.from(body.audioBase64, "base64")

    const dp = buildCallProvider()
    const result = await processCallTurn(dp, {
      reservationId: body.reservationId,
      callSessionId: sessionId,
      personaId: body.personaId,
      userId: body.userId,
      audioBuffer,
      audioContentType: body.audioContentType,
      conversationHistory: body.conversationHistory ?? [],
      turnNumber: body.turnNumber ?? 0,
      elapsedSec: body.elapsedSec ?? 0,
    })

    return NextResponse.json({
      success: true,
      data: {
        userText: result.userText,
        personaText: result.personaText,
        personaAudioBase64: result.personaAudio.audioBase64,
        personaAudioContentType: result.personaAudio.contentType,
        turnNumber: result.turnNumber,
        shouldEnd: result.shouldEnd,
        detectedLanguage: result.detectedLanguage,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg === "PERSONA_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "PERSONA_NOT_FOUND", message: "Persona not found" } },
        { status: 404 }
      )
    }
    console.error("[Call Turn] processCallTurn error:", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to process call turn" } },
      { status: 500 }
    )
  }
}
