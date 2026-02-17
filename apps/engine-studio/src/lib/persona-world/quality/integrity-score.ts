// ═══════════════════════════════════════════════════════════════
// PersonaWorld — PIS Calculation (Phase 6-B)
// 운영 설계서 §9.3 — 3요소 가중합, 등급 판정, 자동 조치
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ContextRecallDetails {
  recentMemoryAccuracy: number // 7일 기억 정확도
  mediumTermAccuracy: number // 7-30일 기억 정확도
  coreMemoryRetention: number // Poignancy≥0.8 유지율
}

export interface SettingConsistencyDetails {
  factbookCompliance: number // Factbook 위반 없음 비율
  voiceSpecAdherence: number // 어투/격식 준수율
  vectorBehaviorAlign: number // 벡터 ↔ 행동 정합성
}

export interface CharacterStabilityDetails {
  weeklyDrift: number // V_Final 주간 변화 (0에 가까울수록 좋음 → 점수로 변환)
  toneVariance: number // 톤 일관성 (0에 가까울수록 좋음 → 점수로 변환)
  growthArcAlignment: number // 의도 vs 실제 성장 정합
}

export interface PWIntegrityScore {
  overall: number // 0.0 ~ 1.0

  components: {
    contextRecall: { score: number; details: ContextRecallDetails }
    settingConsistency: { score: number; details: SettingConsistencyDetails }
    characterStability: { score: number; details: CharacterStabilityDetails }
  }

  grade: PISGrade
  measuredAt: Date
  sampleSize: number
  confidence: number // 0.0 ~ 1.0
}

export type PISGrade = "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL" | "QUARANTINE"

// ── 등급 기준 ──────────────────────────────────────────────────

const GRADE_THRESHOLDS = {
  EXCELLENT: 0.9,
  GOOD: 0.8,
  WARNING: 0.7,
  CRITICAL: 0.6,
  // < 0.6 → QUARANTINE
} as const

// ── 가중치 ──────────────────────────────────────────────────────

const WEIGHTS = {
  contextRecall: 0.35,
  settingConsistency: 0.35,
  characterStability: 0.3,
} as const

// ── Context Recall 계산 ──────────────────────────────────────

/**
 * Context Recall 점수 계산 (가중치 0.35).
 * - recentMemory (7일) 40%
 * - mediumTerm (7-30일) 30%
 * - coreMemory (Poignancy≥0.8) 30%
 */
export function computeContextRecall(details: ContextRecallDetails): number {
  return round(
    details.recentMemoryAccuracy * 0.4 +
      details.mediumTermAccuracy * 0.3 +
      details.coreMemoryRetention * 0.3
  )
}

// ── Setting Consistency 계산 ─────────────────────────────────

/**
 * Setting Consistency 점수 계산 (가중치 0.35).
 * - factbook 준수 40%
 * - voiceSpec 준수 30%
 * - vector↔behavior 30%
 */
export function computeSettingConsistency(details: SettingConsistencyDetails): number {
  return round(
    details.factbookCompliance * 0.4 +
      details.voiceSpecAdherence * 0.3 +
      details.vectorBehaviorAlign * 0.3
  )
}

// ── Character Stability 계산 ─────────────────────────────────

/**
 * Character Stability 점수 계산 (가중치 0.30).
 * weeklyDrift, toneVariance는 낮을수록 좋음 → 1-value 로 점수 변환.
 * growthArcAlignment은 높을수록 좋음.
 */
export function computeCharacterStability(details: CharacterStabilityDetails): number {
  const driftScore = Math.max(0, 1 - details.weeklyDrift)
  const varianceScore = Math.max(0, 1 - details.toneVariance)

  return round(driftScore * 0.35 + varianceScore * 0.35 + details.growthArcAlignment * 0.3)
}

// ── PIS 종합 계산 ──────────────────────────────────────────────

/**
 * PIS = contextRecall × 0.35 + settingConsistency × 0.35 + characterStability × 0.30
 */
export function computePIS(
  contextRecall: ContextRecallDetails,
  settingConsistency: SettingConsistencyDetails,
  characterStability: CharacterStabilityDetails,
  sampleSize: number
): PWIntegrityScore {
  const crScore = computeContextRecall(contextRecall)
  const scScore = computeSettingConsistency(settingConsistency)
  const csScore = computeCharacterStability(characterStability)

  const overall = round(
    crScore * WEIGHTS.contextRecall +
      scScore * WEIGHTS.settingConsistency +
      csScore * WEIGHTS.characterStability
  )

  const grade = getPISGrade(overall)

  // Confidence: 샘플 수 기반 (최소 5, 최적 50)
  const confidence = round(Math.min(1, sampleSize / 50))

  return {
    overall,
    components: {
      contextRecall: { score: crScore, details: contextRecall },
      settingConsistency: { score: scScore, details: settingConsistency },
      characterStability: { score: csScore, details: characterStability },
    },
    grade,
    measuredAt: new Date(),
    sampleSize,
    confidence,
  }
}

// ── 등급 판정 ──────────────────────────────────────────────────

export function getPISGrade(pis: number): PISGrade {
  if (pis >= GRADE_THRESHOLDS.EXCELLENT) return "EXCELLENT"
  if (pis >= GRADE_THRESHOLDS.GOOD) return "GOOD"
  if (pis >= GRADE_THRESHOLDS.WARNING) return "WARNING"
  if (pis >= GRADE_THRESHOLDS.CRITICAL) return "CRITICAL"
  return "QUARANTINE"
}

// ── 자동 조치 ──────────────────────────────────────────────────

export type PISAction =
  | { type: "REDUCE_FREQUENCY" }
  | { type: "NORMAL" }
  | { type: "INCREASE_FREQUENCY"; dashboardAlert: true }
  | { type: "SCHEDULE_ARENA"; adminNotify: true }
  | { type: "PAUSE_ACTIVITY"; emergencyArena: true; adminApproval: true }

/**
 * PIS 등급별 자동 조치 결정.
 */
export function getPISAction(grade: PISGrade): PISAction {
  switch (grade) {
    case "EXCELLENT":
      return { type: "REDUCE_FREQUENCY" }
    case "GOOD":
      return { type: "NORMAL" }
    case "WARNING":
      return { type: "INCREASE_FREQUENCY", dashboardAlert: true }
    case "CRITICAL":
      return { type: "SCHEDULE_ARENA", adminNotify: true }
    case "QUARANTINE":
      return { type: "PAUSE_ACTIVITY", emergencyArena: true, adminApproval: true }
  }
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
