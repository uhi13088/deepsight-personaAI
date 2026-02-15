// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Evolution Batch Runner
// T135: 주간 배치 실행 — 전체 ACTIVE 페르소나 L3 진화
// ═══════════════════════════════════════════════════════════════

import type { NarrativeDriveVector } from "@/types/persona-v3"
import type { ActivityLogEntry, EvolutionAnalyzerProvider } from "./evolution-analyzer"
import { analyzeEvolutionTrend } from "./evolution-analyzer"
import { computeL3Evolution, type L3EvolutionResult } from "./evolution-algorithm"

// ── 타입 정의 ────────────────────────────────────────────────

export interface EvolutionPersona {
  id: string
  name: string
  narrative: NarrativeDriveVector
  createdAt: Date
}

export interface EvolutionRunnerDataProvider extends EvolutionAnalyzerProvider {
  /** ACTIVE 상태 페르소나 + NARRATIVE 벡터 조회 */
  getActivePersonasWithNarrative(): Promise<EvolutionPersona[]>

  /** L3 벡터 새 버전 저장 */
  saveNewNarrativeVersion(
    personaId: string,
    newL3: NarrativeDriveVector,
    previousVersion: number
  ): Promise<{ version: number }>

  /** 현재 NARRATIVE 벡터 최신 버전 조회 */
  getCurrentNarrativeVersion(personaId: string): Promise<number>

  /** 진화 로그 저장 */
  saveEvolutionLog(params: {
    personaId: string
    previousL3: NarrativeDriveVector
    newL3: NarrativeDriveVector
    deltas: NarrativeDriveVector
    stageTransition: boolean
    fromStage: string
    toStage: string
    reason: string
    version: number
  }): Promise<void>
}

export interface EvolutionBatchResult {
  /** 처리된 페르소나 수 */
  totalProcessed: number
  /** 실제 진화된 페르소나 수 */
  totalEvolved: number
  /** 스테이지 전이 수 */
  stageTransitions: number
  /** 각 페르소나별 결과 */
  results: Array<{
    personaId: string
    personaName: string
    evolved: boolean
    newVersion?: number
    stageTransition?: boolean
    reason: string
  }>
  /** 실행 소요 시간 (ms) */
  durationMs: number
}

// ── 배치 러너 ────────────────────────────────────────────────

/**
 * 주간 진화 배치 실행.
 *
 * 1. ACTIVE 페르소나 전체 조회
 * 2. 각 페르소나의 최근 7일 활동 이력 분석
 * 3. L3 진화 알고리즘 실행
 * 4. 진화 발생 시 → PersonaLayerVector 새 버전 저장
 * 5. 진화 로그 기록
 */
export async function runEvolutionBatch(
  provider: EvolutionRunnerDataProvider,
  options: { periodDays?: number } = {}
): Promise<EvolutionBatchResult> {
  const startTime = Date.now()
  const periodDays = options.periodDays ?? 7

  const personas = await provider.getActivePersonasWithNarrative()
  const results: EvolutionBatchResult["results"] = []
  let totalEvolved = 0
  let stageTransitions = 0

  for (const persona of personas) {
    try {
      // Step 1: 활동 이력 조회
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - periodDays)
      const logs = await provider.getActivityLogs(persona.id, sinceDate)

      // Step 2: 트렌드 분석
      const trend = analyzeEvolutionTrend(logs, periodDays)

      // Step 3: 진화 계산
      const daysSinceCreation = Math.floor(
        (Date.now() - persona.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      const evolution = computeL3Evolution(persona.narrative, trend, daysSinceCreation)

      if (evolution.evolved) {
        // Step 4: 새 버전 저장
        const currentVersion = await provider.getCurrentNarrativeVersion(persona.id)
        const saved = await provider.saveNewNarrativeVersion(
          persona.id,
          evolution.newL3,
          currentVersion
        )

        // Step 5: 진화 로그 기록
        await provider.saveEvolutionLog({
          personaId: persona.id,
          previousL3: evolution.previousL3,
          newL3: evolution.newL3,
          deltas: evolution.deltas,
          stageTransition: evolution.stageTransition.transitioned,
          fromStage: evolution.stageTransition.fromStage,
          toStage: evolution.stageTransition.toStage,
          reason: evolution.reason,
          version: saved.version,
        })

        totalEvolved++
        if (evolution.stageTransition.transitioned) {
          stageTransitions++
        }

        results.push({
          personaId: persona.id,
          personaName: persona.name,
          evolved: true,
          newVersion: saved.version,
          stageTransition: evolution.stageTransition.transitioned,
          reason: evolution.reason,
        })
      } else {
        results.push({
          personaId: persona.id,
          personaName: persona.name,
          evolved: false,
          reason: evolution.reason,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      results.push({
        personaId: persona.id,
        personaName: persona.name,
        evolved: false,
        reason: `에러: ${message}`,
      })
    }
  }

  return {
    totalProcessed: personas.length,
    totalEvolved,
    stageTransitions,
    results,
    durationMs: Date.now() - startTime,
  }
}
