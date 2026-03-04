import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { isLLMConfigured } from "@/lib/llm-client"
import { startCall } from "@/lib/persona-world/call-service"
import type { CallDataProvider } from "@/lib/persona-world/call-service"
import type { PersonaProfileSnapshot } from "@/lib/persona-world/types"
import type { MemoryItem } from "@/lib/persona-world/rag-weighted-search"
import type { Factbook } from "@/types"

// ── Full CallDataProvider (Prisma 구현) ──────────────────────

function buildCallProvider(): CallDataProvider {
  return {
    // ── Reservation ──
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
      await prisma.callReservation.update({
        where: { id: reservationId },
        data: { status },
      })
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

    // ── Call Session ──
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

    // ── Factbook ──
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

    // ── TTS Config ──
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
 * POST /api/persona-world/calls/sessions
 * 통화 시작 — 예약 ID → CallSession 생성 + TTS 인사말 생성
 * Body: { reservationId }
 */
export async function POST(req: NextRequest) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  if (!isLLMConfigured()) {
    return NextResponse.json(
      { success: false, error: { code: "LLM_NOT_CONFIGURED", message: "LLM API key not set" } },
      { status: 503 }
    )
  }

  const body = (await req.json()) as { reservationId?: string }
  if (!body.reservationId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MISSING_FIELDS", message: "reservationId is required" },
      },
      { status: 400 }
    )
  }

  try {
    const dp = buildCallProvider()
    const result = await startCall(dp, body.reservationId)

    return NextResponse.json({
      success: true,
      data: {
        callSessionId: result.callSessionId,
        interactionSessionId: result.interactionSessionId,
        greetingText: result.greetingText,
        greetingAudioBase64: result.greetingAudio.audioBase64,
        greetingAudioContentType: result.greetingAudio.contentType,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg === "RESERVATION_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "RESERVATION_NOT_FOUND", message: "Reservation not found" },
        },
        { status: 404 }
      )
    }
    if (msg === "RESERVATION_NOT_AVAILABLE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESERVATION_NOT_AVAILABLE",
            message: "Reservation is not available for call",
          },
        },
        { status: 409 }
      )
    }
    console.error("[Call Sessions] startCall error:", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to start call" } },
      { status: 500 }
    )
  }
}
