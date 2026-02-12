// ═══════════════════════════════════════════════════════════════
// 페르소나 시뮬레이터
// T55-AC4: 가상 대화, 성격 일관성 확인
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector } from "@/types"
import { analyzeTone, evaluateVectorAlignment } from "./single-content-test"
import type { ToneAnalysis } from "./single-content-test"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface SimulationTurn {
  turnNumber: number
  userMessage: string
  personaResponse: string
  timestamp: number
  analysis: TurnAnalysis
}

export interface TurnAnalysis {
  tone: ToneAnalysis
  vectorAlignment: number // 0~100
  pressureLevel: number // 0~1 (대화 압박 추정)
  responseLength: number
}

export interface SimulationSession {
  id: string
  personaId: string
  personaName: string
  turns: SimulationTurn[]
  consistencyReport: ConsistencyReport | null
  createdAt: number
  updatedAt: number
}

export interface ConsistencyReport {
  overallConsistency: number // 0~100
  toneStability: number // 0~100
  vectorAlignmentAvg: number // 0~100
  vectorAlignmentTrend: "stable" | "improving" | "degrading"
  pressureResponsePattern: "resilient" | "adaptive" | "volatile"
  turnCount: number
}

// ── 세션 생성 ───────────────────────────────────────────────────

export function createSimulationSession(personaId: string, personaName: string): SimulationSession {
  return {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    personaId,
    personaName,
    turns: [],
    consistencyReport: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ── 대화 압박 추정 ──────────────────────────────────────────────

export function estimatePressureLevel(userMessage: string): number {
  const lower = userMessage.toLowerCase()

  let pressure = 0.2 // 기본

  // 도전적 시그널
  const challengeSignals = ["왜", "근거가", "틀렸", "반대", "반박", "아닌데", "말이 안"]
  const challengeCount = challengeSignals.filter((s) => lower.includes(s)).length
  pressure += challengeCount * 0.15

  // 감정적 시그널
  const emotionalSignals = ["화나", "짜증", "실망", "별로", "최악"]
  const emotionalCount = emotionalSignals.filter((s) => lower.includes(s)).length
  pressure += emotionalCount * 0.1

  // 긴 메시지 = 높은 기대
  if (userMessage.length > 200) pressure += 0.1

  // 물음표 많으면 압박
  const questionMarks = (userMessage.match(/\?/g) ?? []).length
  pressure += questionMarks * 0.05

  return Math.min(1, Math.round(pressure * 100) / 100)
}

// ── 턴 분석 ─────────────────────────────────────────────────────

export function analyzeTurn(
  userMessage: string,
  personaResponse: string,
  l1: SocialPersonaVector
): TurnAnalysis {
  return {
    tone: analyzeTone(personaResponse),
    vectorAlignment: evaluateVectorAlignment(personaResponse, l1),
    pressureLevel: estimatePressureLevel(userMessage),
    responseLength: personaResponse.length,
  }
}

// ── 턴 추가 ─────────────────────────────────────────────────────

export function addTurn(
  session: SimulationSession,
  userMessage: string,
  personaResponse: string,
  l1: SocialPersonaVector
): SimulationSession {
  const turn: SimulationTurn = {
    turnNumber: session.turns.length + 1,
    userMessage,
    personaResponse,
    timestamp: Date.now(),
    analysis: analyzeTurn(userMessage, personaResponse, l1),
  }

  const turns = [...session.turns, turn]

  return {
    ...session,
    turns,
    consistencyReport: turns.length >= 3 ? generateConsistencyReport(turns) : null,
    updatedAt: Date.now(),
  }
}

// ── 일관성 리포트 ───────────────────────────────────────────────

export function generateConsistencyReport(turns: SimulationTurn[]): ConsistencyReport {
  if (turns.length < 2) {
    return {
      overallConsistency: 100,
      toneStability: 100,
      vectorAlignmentAvg: 100,
      vectorAlignmentTrend: "stable",
      pressureResponsePattern: "resilient",
      turnCount: turns.length,
    }
  }

  // 1) 톤 안정성: dominant tone 일관성
  const tones = turns.map((t) => t.analysis.tone.dominantTone)
  const toneGroups = new Map<string, number>()
  for (const t of tones) {
    toneGroups.set(t, (toneGroups.get(t) ?? 0) + 1)
  }
  const maxToneCount = Math.max(...toneGroups.values())
  const toneStability = Math.round((maxToneCount / tones.length) * 100)

  // 2) 벡터 정합 평균
  const alignments = turns.map((t) => t.analysis.vectorAlignment)
  const vectorAlignmentAvg = Math.round(alignments.reduce((a, b) => a + b, 0) / alignments.length)

  // 3) 벡터 정합 추이
  const firstHalf = alignments.slice(0, Math.floor(alignments.length / 2))
  const secondHalf = alignments.slice(Math.floor(alignments.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  let vectorAlignmentTrend: ConsistencyReport["vectorAlignmentTrend"]
  if (secondAvg - firstAvg > 5) vectorAlignmentTrend = "improving"
  else if (firstAvg - secondAvg > 5) vectorAlignmentTrend = "degrading"
  else vectorAlignmentTrend = "stable"

  // 4) 압박 반응 패턴
  const highPressureTurns = turns.filter((t) => t.analysis.pressureLevel > 0.5)
  let pressureResponsePattern: ConsistencyReport["pressureResponsePattern"]

  if (highPressureTurns.length === 0) {
    pressureResponsePattern = "resilient"
  } else {
    const pressureAlignments = highPressureTurns.map((t) => t.analysis.vectorAlignment)
    const normalAlignments = turns
      .filter((t) => t.analysis.pressureLevel <= 0.5)
      .map((t) => t.analysis.vectorAlignment)

    const pressureAvg =
      pressureAlignments.length > 0
        ? pressureAlignments.reduce((a, b) => a + b, 0) / pressureAlignments.length
        : vectorAlignmentAvg
    const normalAvg =
      normalAlignments.length > 0
        ? normalAlignments.reduce((a, b) => a + b, 0) / normalAlignments.length
        : vectorAlignmentAvg

    if (normalAvg - pressureAvg > 15) pressureResponsePattern = "volatile"
    else if (normalAvg - pressureAvg > 5) pressureResponsePattern = "adaptive"
    else pressureResponsePattern = "resilient"
  }

  // 종합 일관성
  const overallConsistency = Math.round(toneStability * 0.4 + vectorAlignmentAvg * 0.6)

  return {
    overallConsistency,
    toneStability,
    vectorAlignmentAvg,
    vectorAlignmentTrend,
    pressureResponsePattern,
    turnCount: turns.length,
  }
}
