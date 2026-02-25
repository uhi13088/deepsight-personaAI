// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Arena Feedback Loop (T231)
// Arena ↔ Quality 양방향 루프 브릿지
//
// 방향 1: Arena → Quality
//   교정 적용 → Instruction Layer 업데이트 → CorrectionTracking 생성
//
// 방향 2: Quality → Arena
//   PIS/트리거 → Arena 세션 요청 → 이전 교정 효과 평가
// ═══════════════════════════════════════════════════════════════

import type { VoiceProfile, Factbook } from "@/types"
import type { VoiceStyleParams } from "../types"
import type { CorrectionRequest } from "@/lib/arena/arena-cost-control"
import {
  executeCorrectionLoop,
  createStyleSnapshot,
  buildHistoryEntry,
  type CorrectionLoopResult,
  type CorrectionHistoryEntry,
} from "@/lib/arena/correction-loop"
import {
  createCorrectionTracking,
  recordCorrectionResult,
  type ArenaTrigger,
  type CorrectionTracking,
  type CorrectionVerdict,
  type TriggerType,
} from "./arena-bridge"

// ── DI 프로바이더 ──────────────────────────────────────────────

export interface ArenaFeedbackDataProvider {
  /** 페르소나의 현재 Instruction Layer 데이터 조회 */
  getPersonaInstruction(personaId: string): Promise<{
    voiceProfile: VoiceProfile | null
    voiceStyleParams: VoiceStyleParams | null
    factbook: Factbook | null
  }>

  /** 일일 교정 횟수 조회 (과교정 방지) */
  getDailyCorrectionCount(personaId: string): Promise<number>

  /** Instruction Layer 업데이트 (voiceProfile, styleParams, factbook) */
  updatePersonaInstruction(
    personaId: string,
    data: {
      voiceProfile?: VoiceProfile
      voiceStyleParams?: VoiceStyleParams
      factbook?: Factbook
    }
  ): Promise<void>

  /** CorrectionTracking 저장 */
  saveCorrectionTracking(tracking: CorrectionTracking): Promise<void>

  /** 미평가 CorrectionTracking 조회 (after가 없는 것) */
  getPendingTrackings(personaId: string): Promise<CorrectionTracking[]>

  /** CorrectionTracking 업데이트 (after + verdict 추가) */
  updateCorrectionTracking(correctionId: string, tracking: CorrectionTracking): Promise<void>
}

// ── 기본값 ──────────────────────────────────────────────────

const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  speechStyle: "",
  habitualExpressions: [],
  physicalMannerisms: [],
  unconsciousBehaviors: [],
  activationThresholds: {},
}

const DEFAULT_STYLE_PARAMS: VoiceStyleParams = {
  formality: 0.5,
  humor: 0.5,
  sentenceLength: 0.5,
  emotionExpression: 0.5,
  assertiveness: 0.5,
  vocabularyLevel: 0.5,
}

// ── 결과 타입 ──────────────────────────────────────────────────

export interface ApplyCorrectionResult {
  applied: boolean
  loopResult: CorrectionLoopResult
  tracking: CorrectionTracking
  historyEntry: CorrectionHistoryEntry | null
}

export interface TriggerProcessingResult {
  processed: number
  /** CRITICAL 트리거 수 (즉시 처리 대상) */
  criticalCount: number
  /** 처리된 트리거 목록 (personaId + type) */
  triggers: Array<{ personaId: string; type: TriggerType; priority: string }>
}

export interface EvaluationResult {
  evaluated: number
  verdicts: Array<{
    correctionId: string
    verdict: CorrectionVerdict
    improvement: number
  }>
}

// ═══════════════════════════════════════════════════════════════
// 방향 1: Arena → Quality (교정 적용 + 추적)
// ═══════════════════════════════════════════════════════════════

/**
 * Arena 교정을 Instruction Layer에 적용하고 CorrectionTracking을 생성.
 *
 * 기존 API route의 simplified `applyPersonaCorrection()` 대신
 * correction-loop.ts의 전체 파이프라인을 사용:
 *   1. buildStyleBookPatch → 패치 생성
 *   2. validatePatch → confidence/일일한도 검증
 *   3. applyVoiceProfilePatch + applyStyleParamsPatch + applyFactbookPatch
 *   4. DB 업데이트
 *   5. CorrectionTracking 레코드 생성 (향후 effectiveness 평가용)
 */
export async function applyAndTrackCorrection(
  params: {
    correction: CorrectionRequest
    personaId: string
    triggeredBy: TriggerType
    beforePIS: number
    failedDimensions: string[]
    arenaSessionId: string
    approvedBy: string
  },
  provider: ArenaFeedbackDataProvider
): Promise<ApplyCorrectionResult> {
  // 1. 현재 Instruction Layer 조회
  const instruction = await provider.getPersonaInstruction(params.personaId)
  const dailyCount = await provider.getDailyCorrectionCount(params.personaId)

  const currentVoice = instruction.voiceProfile ?? DEFAULT_VOICE_PROFILE
  const currentParams = instruction.voiceStyleParams ?? DEFAULT_STYLE_PARAMS

  // 2. Before 스냅샷 생성
  const beforeSnapshot = createStyleSnapshot(currentVoice, currentParams, instruction.factbook, 0)

  // 3. Correction Loop 실행 (full pipeline)
  const loopResult = executeCorrectionLoop(
    params.correction,
    currentVoice,
    currentParams,
    instruction.factbook,
    dailyCount
  )

  // 4. 적용 성공 시 DB에 Instruction Layer 업데이트
  let historyEntry: CorrectionHistoryEntry | null = null

  if (loopResult.applied && loopResult.updatedSnapshot) {
    await provider.updatePersonaInstruction(params.personaId, {
      voiceProfile: loopResult.updatedSnapshot.voiceProfile,
      voiceStyleParams: loopResult.updatedSnapshot.styleParams,
    })

    historyEntry = buildHistoryEntry(loopResult, beforeSnapshot, loopResult.updatedSnapshot)
  }

  // 5. CorrectionTracking 생성 (성공/실패 모두 기록)
  const tracking = createCorrectionTracking({
    correctionId: params.correction.id,
    personaId: params.personaId,
    beforePIS: params.beforePIS,
    failedDimensions: params.failedDimensions,
    triggeredBy: params.triggeredBy,
    arenaSessionId: params.arenaSessionId,
    patchCategories: [params.correction.issueCategory],
    approvedBy: params.approvedBy,
  })

  await provider.saveCorrectionTracking(tracking)

  return { applied: loopResult.applied, loopResult, tracking, historyEntry }
}

// ═══════════════════════════════════════════════════════════════
// 방향 2: Quality → Arena (트리거 처리 + 교정 효과 평가)
// ═══════════════════════════════════════════════════════════════

/**
 * 품질 점검에서 발생한 Arena 트리거를 처리.
 *
 * quality-integration.ts → runQualityCheck() → triggers[]를 받아
 * 우선순위에 따라 Arena 세션 요청 데이터를 구성.
 *
 * 실제 Arena 세션 생성은 호출 측에서 수행 (이 함수는 데이터 구성만).
 */
export function processQualityTriggers(triggers: ArenaTrigger[]): TriggerProcessingResult {
  if (triggers.length === 0) {
    return { processed: 0, criticalCount: 0, triggers: [] }
  }

  const processed: TriggerProcessingResult["triggers"] = []
  let criticalCount = 0

  for (const trigger of triggers) {
    processed.push({
      personaId: trigger.personaId,
      type: trigger.type,
      priority: trigger.priority,
    })

    if (trigger.priority === "CRITICAL") {
      criticalCount++
    }
  }

  return {
    processed: processed.length,
    criticalCount,
    triggers: processed,
  }
}

/**
 * 이전에 적용된 교정의 효과를 현재 PIS와 비교하여 평가.
 *
 * 품질 점검 후 호출하여, 아직 평가되지 않은(after === undefined)
 * CorrectionTracking에 대해 verdict를 결정.
 *
 * - EFFECTIVE: PIS 개선 > 0.05
 * - PARTIAL: 0 < 개선 ≤ 0.05
 * - INEFFECTIVE: ≈ 0 (±0.01 이내)
 * - REGRESSED: < -0.01
 */
export async function evaluatePendingCorrections(
  personaId: string,
  currentPIS: number,
  resolvedDimensions: string[],
  remainingIssues: string[],
  provider: ArenaFeedbackDataProvider
): Promise<EvaluationResult> {
  const pending = await provider.getPendingTrackings(personaId)
  const verdicts: EvaluationResult["verdicts"] = []

  for (const tracking of pending) {
    // 이미 평가된 건 skip
    if (tracking.after) continue

    const updated = recordCorrectionResult(
      tracking,
      currentPIS,
      resolvedDimensions,
      remainingIssues
    )

    await provider.updateCorrectionTracking(tracking.correctionId, updated)

    verdicts.push({
      correctionId: tracking.correctionId,
      verdict: updated.verdict!,
      improvement: updated.after!.improvement,
    })
  }

  return { evaluated: verdicts.length, verdicts }
}

/**
 * 교정 효과 요약 생성 (로깅/대시보드용).
 */
export function summarizeCorrectionEffectiveness(
  trackings: CorrectionTracking[]
): CorrectionEffectivenessSummary {
  const withVerdict = trackings.filter((t) => t.verdict !== undefined)
  if (withVerdict.length === 0) {
    return {
      total: 0,
      effective: 0,
      partial: 0,
      ineffective: 0,
      regressed: 0,
      avgImprovement: 0,
      successRate: 0,
    }
  }

  const counts = {
    EFFECTIVE: 0,
    PARTIAL: 0,
    INEFFECTIVE: 0,
    REGRESSED: 0,
  }

  let totalImprovement = 0
  for (const t of withVerdict) {
    counts[t.verdict!]++
    totalImprovement += t.after?.improvement ?? 0
  }

  const total = withVerdict.length
  const successRate = (counts.EFFECTIVE + counts.PARTIAL) / total

  return {
    total,
    effective: counts.EFFECTIVE,
    partial: counts.PARTIAL,
    ineffective: counts.INEFFECTIVE,
    regressed: counts.REGRESSED,
    avgImprovement: Math.round((totalImprovement / total) * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
  }
}

export interface CorrectionEffectivenessSummary {
  total: number
  effective: number
  partial: number
  ineffective: number
  regressed: number
  avgImprovement: number
  /** (EFFECTIVE + PARTIAL) / total */
  successRate: number
}
