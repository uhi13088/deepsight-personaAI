// ═══════════════════════════════════════════════════════════════
// Emotional Contagion Integration — DB 연동 + 안전 검사
// T225: 감정 전염 시스템을 스케줄러에 연결, Kill Switch 게이트
// ═══════════════════════════════════════════════════════════════

import {
  runContagionRound,
  checkMoodSafety,
  computeContagionStats,
  DEFAULT_CONTAGION_CONFIG,
  type ContagionPersonaState,
  type ContagionEdge,
  type ContagionSensitivity,
  type NodeTopology,
  type ContagionConfig,
  type ContagionRoundResult,
  type ContagionStats,
} from "./emotional-contagion"

// ── DI Provider ─────────────────────────────────────────────

/** 감정 전염에 필요한 데이터를 제공하는 인터페이스 */
export interface ContagionDataProvider {
  /** 활성 페르소나의 상태 로드 */
  getActivePersonaStates(): Promise<ContagionPersonaState[]>
  /** 페르소나 간 관계 엣지 로드 */
  getRelationshipEdges(): Promise<ContagionEdge[]>
  /** 페르소나별 감수성 파라미터 로드 (L2 벡터 기반) */
  getSensitivities(personaIds: string[]): Promise<Map<string, ContagionSensitivity>>
  /** 페르소나별 위상 정보 로드 */
  getTopologies(personaIds: string[]): Promise<Map<string, NodeTopology>>
  /** 페르소나 mood 업데이트 (DB 반영) */
  updateMood(personaId: string, newMood: number): Promise<void>
  /** 전파 결과 로깅 */
  logContagionRound(result: ContagionRoundLog): Promise<void>
}

// ── 결과 타입 ───────────────────────────────────────────────

export interface ContagionRoundLog {
  executedAt: string
  personaCount: number
  edgeCount: number
  affectedCount: number
  averageMoodBefore: number
  averageMoodAfter: number
  safetyStatus: "safe" | "warning" | "critical"
  safetyReason: string
  stats: ContagionStats
}

export interface ContagionExecutionResult {
  success: boolean
  log: ContagionRoundLog
  roundResult: ContagionRoundResult
  /** critical이면 킬스위치 트리거 필요 */
  requiresKillSwitch: boolean
}

// ── 메인 실행 함수 ──────────────────────────────────────────

/**
 * 감정 전염 1라운드 실행.
 *
 * 1. DB에서 활성 페르소나 상태/관계/감수성/위상 로드
 * 2. runContagionRound() 실행
 * 3. 결과를 DB에 반영 (mood 업데이트)
 * 4. 안전 검사 (checkMoodSafety)
 * 5. 결과 로깅
 *
 * Kill Switch 확인은 호출자(스케줄러)가 담당.
 */
export async function executeContagionRound(
  provider: ContagionDataProvider,
  config?: ContagionConfig
): Promise<ContagionExecutionResult> {
  const effectiveConfig = config ?? DEFAULT_CONTAGION_CONFIG

  // 1. 데이터 로드
  const personas = await provider.getActivePersonaStates()
  if (personas.length < 2) {
    const emptyLog = buildEmptyLog("전파 대상 부족 (페르소나 2명 미만)")
    return {
      success: true,
      log: emptyLog,
      roundResult: emptyRoundResult(),
      requiresKillSwitch: false,
    }
  }

  const personaIds = personas.map((p) => p.personaId)
  const [edges, sensitivities, topologies] = await Promise.all([
    provider.getRelationshipEdges(),
    provider.getSensitivities(personaIds),
    provider.getTopologies(personaIds),
  ])

  if (edges.length === 0) {
    const emptyLog = buildEmptyLog("관계 엣지 없음 (전파 불가)")
    return {
      success: true,
      log: emptyLog,
      roundResult: emptyRoundResult(),
      requiresKillSwitch: false,
    }
  }

  // 2. 전파 실행
  const roundResult = runContagionRound({
    personas,
    edges,
    sensitivities,
    topologies,
    config: effectiveConfig,
  })

  // 3. DB 반영 (mood 업데이트)
  for (const result of roundResult.personaResults) {
    if (result.totalMoodDelta !== 0) {
      await provider.updateMood(result.personaId, result.projectedMood)
    }
  }

  // 4. 안전 검사
  const safety = checkMoodSafety(roundResult)
  const stats = computeContagionStats(roundResult)

  // 5. 로깅
  const log: ContagionRoundLog = {
    executedAt: new Date().toISOString(),
    personaCount: personas.length,
    edgeCount: edges.length,
    affectedCount: roundResult.affectedCount,
    averageMoodBefore: roundResult.averageMoodBefore,
    averageMoodAfter: roundResult.averageMoodAfter,
    safetyStatus: safety.status,
    safetyReason: safety.reason,
    stats,
  }

  await provider.logContagionRound(log)

  return {
    success: true,
    log,
    roundResult,
    requiresKillSwitch: safety.status === "critical",
  }
}

// ── 유틸리티 ────────────────────────────────────────────────

function buildEmptyLog(reason: string): ContagionRoundLog {
  return {
    executedAt: new Date().toISOString(),
    personaCount: 0,
    edgeCount: 0,
    affectedCount: 0,
    averageMoodBefore: 0,
    averageMoodAfter: 0,
    safetyStatus: "safe",
    safetyReason: reason,
    stats: {
      totalEffects: 0,
      positiveEffects: 0,
      negativeEffects: 0,
      averageAbsDelta: 0,
      maxAbsDelta: 0,
      topInfluencer: null,
      mostAffected: null,
    },
  }
}

function emptyRoundResult(): ContagionRoundResult {
  return {
    timestamp: Date.now(),
    personaResults: [],
    effects: [],
    averageMoodBefore: 0,
    averageMoodAfter: 0,
    moodVarianceBefore: 0,
    moodVarianceAfter: 0,
    affectedCount: 0,
  }
}
