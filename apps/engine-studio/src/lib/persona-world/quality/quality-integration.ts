// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Quality Integration (Phase 6-B)
// 운영 설계서 §9 — Auto-Interview + PIS + Logger + Arena 통합
// ═══════════════════════════════════════════════════════════════

import {
  selectQuestions,
  aggregateResults,
  selectInterviewTargets,
  DEFAULT_SCHEDULE_CONFIG,
  type PWInterviewJudgment,
  type PWInterviewResult,
  type PersonaScheduleInfo,
  type InterviewScheduleConfig,
} from "./auto-interview"
import {
  computePIS,
  getPISGrade,
  getPISAction,
  type ContextRecallDetails,
  type SettingConsistencyDetails,
  type CharacterStabilityDetails,
  type PWIntegrityScore,
  type PISAction,
} from "./integrity-score"
import {
  aggregatePostQualityLogs,
  aggregateCommentQualityLogs,
  type PostQualityLog,
  type CommentQualityLog,
} from "./quality-logger"
import { checkAllTriggers, type ArenaTrigger } from "./arena-bridge"
import { measureDrift, summarizeDrift, type DriftResult, type DriftSeverity } from "./persona-drift"
import {
  measureDiversity,
  summarizeDiversity,
  type DiversityResult,
  type DiversitySeverity,
} from "./diversity-score"
import { buildDiversityConstraint, type DiversityConstraintResult } from "./diversity-constraint"
import { applyDriftCorrection, type DriftCorrectionResult } from "./drift-correction"
import type { VoiceStyleParams } from "../types"

// ── 통합 결과 타입 ──────────────────────────────────────────

export interface QualityCheckResult {
  personaId: string
  interview: PWInterviewResult | null
  pis: PWIntegrityScore
  action: PISAction
  triggers: ArenaTrigger[]
  drift: DriftResult | null
  diversity: DiversityResult | null
  /** T182: 다양성 자동 constraint (WARNING/CRITICAL 시 자동 생성) */
  diversityConstraint: DiversityConstraintResult | null
  /** T183: VoiceStyle 자동 보정 결과 (STABLE이 아닐 때 자동 생성) */
  driftCorrection: DriftCorrectionResult | null
  summary: QualitySummary
}

export interface QualitySummary {
  status: "HEALTHY" | "CAUTION" | "DEGRADED" | "CRITICAL"
  reasons: string[]
}

// ── 품질 점검 통합 파이프라인 ──────────────────────────────────

/**
 * 페르소나 품질 통합 점검.
 *
 * 설계서 §9 파이프라인:
 * 1. PIS 계산 (3요소 가중합)
 * 2. 인터뷰 결과 반영 (있을 경우)
 * 3. 품질 로그 집계 → 이상 패턴 확인
 * 4. Arena 트리거 조건 확인
 * 5. 종합 상태 판정
 */
export function runQualityCheck(params: {
  personaId: string
  contextRecall: ContextRecallDetails
  settingConsistency: SettingConsistencyDetails
  characterStability: CharacterStabilityDetails
  sampleSize: number
  interviewJudgments?: PWInterviewJudgment[]
  previousPIS?: number
  postLogs?: PostQualityLog[]
  commentLogs?: CommentQualityLog[]
  hasCriticalBotPattern?: boolean
  dailyFactbookViolations?: number
  voiceStyleBaseline?: VoiceStyleParams
  voiceStyleCurrent?: VoiceStyleParams
  recentContents?: string[]
}): QualityCheckResult {
  const {
    personaId,
    contextRecall,
    settingConsistency,
    characterStability,
    sampleSize,
    interviewJudgments,
    previousPIS,
    postLogs,
    commentLogs,
    hasCriticalBotPattern,
    dailyFactbookViolations,
    voiceStyleBaseline,
    voiceStyleCurrent,
    recentContents,
  } = params

  // Step 1: PIS 계산
  const pis = computePIS(contextRecall, settingConsistency, characterStability, sampleSize)
  const action = getPISAction(pis.grade)

  // Step 2: 인터뷰 결과 (있을 경우)
  let interview: PWInterviewResult | null = null
  if (interviewJudgments && interviewJudgments.length > 0) {
    const questions = selectQuestions()
    interview = aggregateResults(personaId, questions, interviewJudgments, { input: 0, output: 0 })
  }

  // Step 3: 품질 로그 집계
  const postStats = postLogs ? aggregatePostQualityLogs(postLogs) : null
  const commentStats = commentLogs ? aggregateCommentQualityLogs(commentLogs) : null

  // Step 4: Arena 트리거 확인
  const triggers = checkAllTriggers({
    personaId,
    interviewScore: interview?.overallScore,
    currentPIS: pis.overall,
    previousPIS,
    hasCriticalBotPattern,
    dailyFactbookViolations,
  })

  // Step 5: PersonaDrift 감지
  const drift =
    voiceStyleBaseline && voiceStyleCurrent
      ? measureDrift(voiceStyleBaseline, voiceStyleCurrent)
      : null

  // Step 6: DiversityScore 측정
  const diversity =
    recentContents && recentContents.length > 0 ? measureDiversity(recentContents) : null

  // Step 7: T182 — DiversityConstraint 자동 생성 (WARNING/CRITICAL 시)
  const diversityConstraint = diversity ? buildDiversityConstraint(diversity) : null

  // Step 8: T183 — VoiceStyle Drift 자동 보정 (STABLE이 아닐 때)
  const driftCorrection =
    drift && voiceStyleBaseline && voiceStyleCurrent && drift.severity !== "STABLE"
      ? applyDriftCorrection(voiceStyleCurrent, voiceStyleBaseline, drift.severity)
      : null

  // Step 9: 종합 상태 판정
  const summary = buildSummary(
    pis,
    interview,
    postStats,
    commentStats,
    triggers,
    drift,
    diversity,
    driftCorrection
  )

  return {
    personaId,
    interview,
    pis,
    action,
    triggers,
    drift,
    diversity,
    diversityConstraint,
    driftCorrection,
    summary,
  }
}

// ── 인터뷰 대상 선택 + 스케줄링 ────────────────────────────────

/**
 * 인터뷰 대상 선택 (적응적 스케줄링 래퍼).
 *
 * PIS 등급을 기반으로 인터뷰 주기를 결정하고,
 * 이탈 감지된 페르소나를 우선 포함.
 */
export function selectQualityCheckTargets(
  personas: PersonaScheduleInfo[],
  config: InterviewScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
  now: Date = new Date()
): string[] {
  return selectInterviewTargets(personas, config, now)
}

// ── PIS 변화 추적 ───────────────────────────────────────────

/**
 * PIS 변화량 계산 및 급락 여부 판정.
 */
export function analyzePISChange(
  currentPIS: number,
  previousPIS: number
): { delta: number; isSuddenDrop: boolean; isImproving: boolean } {
  const delta = round(currentPIS - previousPIS)
  return {
    delta,
    isSuddenDrop: delta < -0.1,
    isImproving: delta > 0.05,
  }
}

// ── 품질 로그 기반 이상 감지 ─────────────────────────────────

/**
 * 품질 로그 통계에서 이상 지표 추출.
 */
export function detectQualityIssues(params: {
  postStats?: {
    avgVoiceSpecMatch: number
    avgRepetitionScore: number
    totalFactbookViolations: number
  }
  commentStats?: {
    avgToneMatchScore: number
    avgContextRelevance: number
    memoryReferenceRate: number
  }
}): string[] {
  const issues: string[] = []

  if (params.postStats) {
    if (params.postStats.avgVoiceSpecMatch < 0.7) {
      issues.push(`낮은 보이스 스펙 일치도: ${params.postStats.avgVoiceSpecMatch}`)
    }
    if (params.postStats.avgRepetitionScore > 0.5) {
      issues.push(`높은 반복 점수: ${params.postStats.avgRepetitionScore}`)
    }
    if (params.postStats.totalFactbookViolations > 0) {
      issues.push(`팩트북 위반 ${params.postStats.totalFactbookViolations}건`)
    }
  }

  if (params.commentStats) {
    if (params.commentStats.avgToneMatchScore < 0.6) {
      issues.push(`낮은 톤 일치도: ${params.commentStats.avgToneMatchScore}`)
    }
    if (params.commentStats.avgContextRelevance < 0.5) {
      issues.push(`낮은 컨텍스트 관련성: ${params.commentStats.avgContextRelevance}`)
    }
    if (params.commentStats.memoryReferenceRate < 0.1) {
      issues.push(`극히 낮은 기억 참조율: ${params.commentStats.memoryReferenceRate}`)
    }
  }

  return issues
}

// ── 유틸리티 ────────────────────────────────────────────────

/** 종합 상태 판정 */
function buildSummary(
  pis: PWIntegrityScore,
  interview: PWInterviewResult | null,
  postStats: ReturnType<typeof aggregatePostQualityLogs> | null,
  commentStats: ReturnType<typeof aggregateCommentQualityLogs> | null,
  triggers: ArenaTrigger[],
  drift: DriftResult | null = null,
  diversity: DiversityResult | null = null,
  driftCorrection: DriftCorrectionResult | null = null
): QualitySummary {
  const reasons: string[] = []

  // PIS 등급 기반
  if (pis.grade === "QUARANTINE") {
    reasons.push(`PIS ${pis.overall} — 격리 수준`)
  } else if (pis.grade === "CRITICAL") {
    reasons.push(`PIS ${pis.overall} — 위험 수준`)
  } else if (pis.grade === "WARNING") {
    reasons.push(`PIS ${pis.overall} — 주의 수준`)
  }

  // 인터뷰 결과
  if (interview) {
    if (interview.verdict === "fail") {
      reasons.push(
        `인터뷰 실패 (${interview.overallScore}) — 실패 차원: ${interview.failedDimensions.join(", ")}`
      )
    } else if (interview.verdict === "warning") {
      reasons.push(`인터뷰 경고 (${interview.overallScore})`)
    }
  }

  // 품질 로그 이슈
  const logIssues = detectQualityIssues({
    postStats: postStats ?? undefined,
    commentStats: commentStats ?? undefined,
  })
  reasons.push(...logIssues)

  // 드리프트 기반
  if (drift) {
    if (drift.severity !== "STABLE") {
      reasons.push(summarizeDrift(drift))
    }
  }

  // T183: CRITICAL 교정 내역 기록 (운영자 사후 확인용)
  if (driftCorrection?.applied && driftCorrection.summary && drift?.severity === "CRITICAL") {
    reasons.push(`[자동 교정] ${driftCorrection.summary}`)
  }

  // 다양성 기반
  if (diversity) {
    if (diversity.severity !== "DIVERSE") {
      reasons.push(summarizeDiversity(diversity))
    }
  }

  // 트리거 기반
  if (triggers.some((t) => t.priority === "CRITICAL")) {
    reasons.push(
      `CRITICAL 트리거 감지: ${triggers
        .filter((t) => t.priority === "CRITICAL")
        .map((t) => t.type)
        .join(", ")}`
    )
  }

  // 상태 결정
  let status: QualitySummary["status"]
  if (triggers.some((t) => t.priority === "CRITICAL") || pis.grade === "QUARANTINE") {
    status = "CRITICAL"
  } else if (
    pis.grade === "CRITICAL" ||
    (interview && interview.verdict === "fail") ||
    (drift && drift.severity === "CRITICAL") ||
    (diversity && diversity.severity === "CRITICAL")
  ) {
    status = "DEGRADED"
  } else if (
    pis.grade === "WARNING" ||
    (interview && interview.verdict === "warning") ||
    logIssues.length > 0 ||
    (drift && drift.severity === "WARNING") ||
    (diversity && diversity.severity === "WARNING")
  ) {
    status = "CAUTION"
  } else {
    status = "HEALTHY"
  }

  return { status, reasons }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
