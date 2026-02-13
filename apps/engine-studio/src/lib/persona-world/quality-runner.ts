// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Quality Runner
// 기존 quality-monitor.ts의 Voice 일관성 + Integrity Gate를 주기적으로 실행
// ═══════════════════════════════════════════════════════════════

import type {
  VoiceCheckResult,
  VoiceMonitorProvider,
  QualityGateProvider,
  QualityGateResult,
} from "./quality-monitor"
import { checkVoiceConsistency, runQualityGate } from "./quality-monitor"

// ── 타입 정의 ────────────────────────────────────────────────

export interface QualityRunnerDataProvider {
  /** 활성 페르소나 목록 */
  getActivePersonas(): Promise<Array<{ id: string; name: string }>>

  /** 페르소나의 최근 포스트 텍스트 */
  getRecentPostTexts(personaId: string, count: number): Promise<string[]>

  /** 페르소나 일시정지 */
  pausePersona(personaId: string): Promise<void>

  /** 품질 체크 결과 저장 */
  saveQualityCheckResult(params: {
    personaId: string
    voiceCheck: VoiceCheckResult | null
    qualityGate: QualityGateResult | null
    autoAction: string | null
  }): Promise<void>
}

export interface QualityCheckSummary {
  checkedAt: Date
  totalChecked: number
  results: Array<{
    personaId: string
    personaName: string
    voiceStatus: string | null
    voiceSimilarity: number | null
    qualityStatus: string | null
    qualityScore: number | null
    autoAction: string | null
  }>
  alerts: Array<{
    personaId: string
    personaName: string
    type: "voice_critical" | "quality_critical" | "quality_caution"
    message: string
  }>
  stats: {
    averageVoiceSimilarity: number
    averageQualityScore: number
    criticalCount: number
    warningCount: number
    pausedCount: number
  }
}

// ── 메인 러너 ────────────────────────────────────────────────

/**
 * 전체 페르소나에 대한 품질 체크 실행.
 *
 * 1. 활성 페르소나 조회
 * 2. 각 페르소나: Voice 일관성 체크
 * 3. PIS < 0.55 → 자동 정지
 * 4. 결과 저장 + 요약 반환
 */
export async function runPeriodicQualityCheck(
  dataProvider: QualityRunnerDataProvider,
  qualityGateProvider?: QualityGateProvider
): Promise<QualityCheckSummary> {
  const personas = await dataProvider.getActivePersonas()
  const results: QualityCheckSummary["results"] = []
  const alerts: QualityCheckSummary["alerts"] = []
  let totalVoiceSim = 0
  let voiceCount = 0
  let totalQualityScore = 0
  let qualityCount = 0
  let criticalCount = 0
  let warningCount = 0
  let pausedCount = 0

  for (const persona of personas) {
    let voiceCheck: VoiceCheckResult | null = null
    let qualityGate: QualityGateResult | null = null
    let autoAction: string | null = null

    // Voice 일관성 체크
    const voiceProvider: VoiceMonitorProvider = {
      getRecentPostTexts: (_, count) => dataProvider.getRecentPostTexts(persona.id, count),
    }

    try {
      const recentTexts = await dataProvider.getRecentPostTexts(persona.id, 5)
      if (recentTexts.length >= 3) {
        // Use the latest text as the "new" text to check
        voiceCheck = await checkVoiceConsistency(recentTexts[0], persona.id, voiceProvider)
        totalVoiceSim += voiceCheck.similarity
        voiceCount++

        if (voiceCheck.status === "critical") {
          alerts.push({
            personaId: persona.id,
            personaName: persona.name,
            type: "voice_critical",
            message: `Voice drift critical: similarity=${voiceCheck.similarity.toFixed(3)}`,
          })
          criticalCount++
        } else if (voiceCheck.status === "warning") {
          warningCount++
        }
      }
    } catch {
      // Voice check failed — skip
    }

    // Quality Gate (Integrity Score) — optional
    if (qualityGateProvider) {
      try {
        qualityGate = await runQualityGate(persona.id, qualityGateProvider)
        totalQualityScore += qualityGate.integrityScore.pis
        qualityCount++

        if (qualityGate.shouldPauseActivity) {
          autoAction = "paused"
          await dataProvider.pausePersona(persona.id)
          pausedCount++
          alerts.push({
            personaId: persona.id,
            personaName: persona.name,
            type: "quality_critical",
            message: `PIS=${qualityGate.integrityScore.pis.toFixed(3)} < 0.55 → auto-paused`,
          })
          criticalCount++
        } else if (qualityGate.status === "caution") {
          alerts.push({
            personaId: persona.id,
            personaName: persona.name,
            type: "quality_caution",
            message: `PIS=${qualityGate.integrityScore.pis.toFixed(3)} — caution threshold`,
          })
          warningCount++
        }
      } catch {
        // Quality gate failed — skip
      }
    }

    // 결과 저장
    await dataProvider.saveQualityCheckResult({
      personaId: persona.id,
      voiceCheck,
      qualityGate,
      autoAction,
    })

    results.push({
      personaId: persona.id,
      personaName: persona.name,
      voiceStatus: voiceCheck?.status ?? null,
      voiceSimilarity: voiceCheck?.similarity ?? null,
      qualityStatus: qualityGate?.status ?? null,
      qualityScore: qualityGate?.integrityScore.pis ?? null,
      autoAction,
    })
  }

  return {
    checkedAt: new Date(),
    totalChecked: personas.length,
    results,
    alerts,
    stats: {
      averageVoiceSimilarity: voiceCount > 0 ? totalVoiceSim / voiceCount : 0,
      averageQualityScore: qualityCount > 0 ? totalQualityScore / qualityCount : 0,
      criticalCount,
      warningCount,
      pausedCount,
    },
  }
}
