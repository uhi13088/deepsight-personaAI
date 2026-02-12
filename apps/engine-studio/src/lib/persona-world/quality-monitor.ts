// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Quality Monitor
// 구현계획서 §5.4, 설계서 §8.2~8.4
// Voice 일관성 + Integrity Score 자동 게이트
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types/persona-v3"
import {
  evaluateIntegrity,
  type IntegrityScoreResult,
  type ResponseSample,
} from "@/lib/quality/integrity-score"

// ── Voice 일관성 타입 ────────────────────────────────────────

export interface VoiceFeatures {
  /** 평균 문장 길이 (정규화 0~1) */
  avgSentenceLength: number
  /** 감정 표현 빈도 (정규화 0~1) */
  emotionalFrequency: number
  /** 격식도 (0=비격식, 1=격식) */
  formalityLevel: number
  /** 어휘 다양성 (0~1) */
  vocabularyDiversity: number
  /** 질문 빈도 (0~1) */
  questionFrequency: number
}

export type VoiceStatus = "ok" | "warning" | "critical"

export interface VoiceCheckResult {
  status: VoiceStatus
  similarity: number
  currentFeatures: VoiceFeatures
  averageFeatures: VoiceFeatures
}

/**
 * Voice 모니터 프로바이더 (DI).
 */
export interface VoiceMonitorProvider {
  /**
   * 페르소나의 최근 N개 포스트 텍스트 조회.
   */
  getRecentPostTexts(personaId: string, count: number): Promise<string[]>
}

// ── Voice 일관성 임계값 ──────────────────────────────────────
// 설계서 §8.4

export const VOICE_THRESHOLDS = {
  ok: 0.6, // similarity >= 0.6 → OK
  warning: 0.4, // 0.4 <= similarity < 0.6 → Warning
  // similarity < 0.4 → Critical
} as const

// ── Quality Gate 임계값 ──────────────────────────────────────
// 설계서 §8.2

export const QUALITY_THRESHOLDS = {
  excellent: 0.85, // PIS >= 0.85 → OK
  good: 0.7, // 0.70 <= PIS < 0.85 → Monitor
  caution: 0.55, // 0.55 <= PIS < 0.70 → Caution
  // PIS < 0.55 → Critical (pause)
} as const

export type QualityStatus = "excellent" | "good" | "caution" | "critical"

export interface QualityGateResult {
  status: QualityStatus
  integrityScore: IntegrityScoreResult
  shouldPauseActivity: boolean
}

/**
 * Quality Gate 프로바이더 (DI).
 */
export interface QualityGateProvider {
  /**
   * 페르소나의 차원별 설계 vs 추론 점수 조회.
   */
  getDimensionScores(
    personaId: string
  ): Promise<Record<string, { designed: number; inferred: number; delta: number }>>

  /**
   * 페르소나의 응답 샘플 조회.
   */
  getResponseSamples(personaId: string, count: number): Promise<ResponseSample[]>

  /**
   * 페르소나의 3-Layer 벡터 조회.
   */
  getVectors(personaId: string): Promise<{
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  } | null>
}

// ── Voice 일관성 체크 ────────────────────────────────────────

/**
 * 새 포스트의 Voice 일관성 확인.
 *
 * 설계서 §8.4:
 * 1. 새 포스트에서 Voice Feature 추출
 * 2. 최근 5개 포스트의 평균 Voice Feature 계산
 * 3. 코사인 유사도 비교
 * 4. similarity < 0.6 → 경고, < 0.4 → 보류+재생성
 */
export async function checkVoiceConsistency(
  newPostText: string,
  personaId: string,
  provider: VoiceMonitorProvider
): Promise<VoiceCheckResult> {
  const recentTexts = await provider.getRecentPostTexts(personaId, 5)

  const currentFeatures = extractVoiceFeatures(newPostText)

  if (recentTexts.length === 0) {
    return {
      status: "ok",
      similarity: 1.0,
      currentFeatures,
      averageFeatures: currentFeatures,
    }
  }

  const recentFeatures = recentTexts.map(extractVoiceFeatures)
  const averageFeatures = computeAverageFeatures(recentFeatures)
  const similarity = cosineSimilarity(
    featuresToArray(currentFeatures),
    featuresToArray(averageFeatures)
  )

  let status: VoiceStatus
  if (similarity >= VOICE_THRESHOLDS.ok) {
    status = "ok"
  } else if (similarity >= VOICE_THRESHOLDS.warning) {
    status = "warning"
  } else {
    status = "critical"
  }

  return { status, similarity, currentFeatures, averageFeatures }
}

/**
 * 텍스트에서 Voice Feature 추출.
 */
export function extractVoiceFeatures(text: string): VoiceFeatures {
  const sentences = text.split(/[.!?。！？\n]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.length > 0)

  // 평균 문장 길이 (정규화: 50자 기준)
  const avgLen =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length
      : 0
  const avgSentenceLength = Math.min(1, avgLen / 50)

  // 감정 표현 빈도 (감탄사, 이모지, 감정 키워드)
  const emotionalPatterns = /[!！]{2,}|ㅋ{2,}|ㅎ{2,}|ㅠ{2,}|감동|사랑|슬프|기쁨|화남|😀|😢|❤|🔥/g
  const emotionalMatches = text.match(emotionalPatterns)
  const emotionalFrequency = Math.min(
    1,
    (emotionalMatches?.length ?? 0) / Math.max(1, sentences.length)
  )

  // 격식도 (존댓말 비율)
  const formalPatterns = /입니다|습니다|하세요|드립니다|됩니다|겠습니다/g
  const formalMatches = text.match(formalPatterns)
  const informalPatterns = /이야|야|거든|잖아|인데|지만|해|했어|했는데/g
  const informalMatches = text.match(informalPatterns)
  const formalCount = formalMatches?.length ?? 0
  const informalCount = informalMatches?.length ?? 0
  const formalityLevel =
    formalCount + informalCount > 0 ? formalCount / (formalCount + informalCount) : 0.5

  // 어휘 다양성 (unique words / total words)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()))
  const vocabularyDiversity = words.length > 0 ? Math.min(1, uniqueWords.size / words.length) : 0.5

  // 질문 빈도
  const questionMarks = (text.match(/\?|？/g) ?? []).length
  const questionFrequency = Math.min(1, questionMarks / Math.max(1, sentences.length))

  return {
    avgSentenceLength: round(avgSentenceLength),
    emotionalFrequency: round(emotionalFrequency),
    formalityLevel: round(formalityLevel),
    vocabularyDiversity: round(vocabularyDiversity),
    questionFrequency: round(questionFrequency),
  }
}

// ── Quality Gate ────────────────────────────────────────────

/**
 * 품질 게이트 실행 (Integrity Score 기반).
 *
 * 설계서 §8.2:
 * PIS >= 0.85 → Excellent
 * 0.70~0.85 → Good (모니터링)
 * 0.55~0.70 → Caution (경고)
 * < 0.55 → Critical (활동 일시 중지)
 */
export async function runQualityGate(
  personaId: string,
  provider: QualityGateProvider
): Promise<QualityGateResult> {
  const vectors = await provider.getVectors(personaId)
  if (!vectors) {
    return {
      status: "caution",
      integrityScore: emptyIntegrityResult(),
      shouldPauseActivity: false,
    }
  }

  const dimensionScores = await provider.getDimensionScores(personaId)
  const samples = await provider.getResponseSamples(personaId, 20)

  const integrityScore = evaluateIntegrity(
    dimensionScores,
    samples,
    vectors.l1,
    vectors.l2,
    vectors.l3
  )

  let status: QualityStatus
  let shouldPauseActivity = false

  if (integrityScore.pis >= QUALITY_THRESHOLDS.excellent) {
    status = "excellent"
  } else if (integrityScore.pis >= QUALITY_THRESHOLDS.good) {
    status = "good"
  } else if (integrityScore.pis >= QUALITY_THRESHOLDS.caution) {
    status = "caution"
  } else {
    status = "critical"
    shouldPauseActivity = true
  }

  return { status, integrityScore, shouldPauseActivity }
}

// ── 유틸리티 ────────────────────────────────────────────────

function featuresToArray(f: VoiceFeatures): number[] {
  return [
    f.avgSentenceLength,
    f.emotionalFrequency,
    f.formalityLevel,
    f.vocabularyDiversity,
    f.questionFrequency,
  ]
}

function computeAverageFeatures(features: VoiceFeatures[]): VoiceFeatures {
  const n = features.length
  if (n === 0) {
    return {
      avgSentenceLength: 0.5,
      emotionalFrequency: 0.5,
      formalityLevel: 0.5,
      vocabularyDiversity: 0.5,
      questionFrequency: 0.5,
    }
  }

  return {
    avgSentenceLength: round(features.reduce((s, f) => s + f.avgSentenceLength, 0) / n),
    emotionalFrequency: round(features.reduce((s, f) => s + f.emotionalFrequency, 0) / n),
    formalityLevel: round(features.reduce((s, f) => s + f.formalityLevel, 0) / n),
    vocabularyDiversity: round(features.reduce((s, f) => s + f.vocabularyDiversity, 0) / n),
    questionFrequency: round(features.reduce((s, f) => s + f.questionFrequency, 0) / n),
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  if (magnitude === 0) return 1 // 빈 벡터는 동일로 취급
  return round(dot / magnitude)
}

function emptyIntegrityResult(): IntegrityScoreResult {
  return {
    consistencyRate: 0,
    stabilityCoefficient: 0,
    coherenceScore: 0,
    pis: 0,
    grade: "F",
    details: {
      crBreakdown: { l1Consistency: 0, l2Consistency: 0, l3Consistency: 0, dimensionScores: {} },
      scBreakdown: { responseVariance: 0, temporalStability: 0, crossContextStability: 0 },
      csBreakdown: { l1l2Coherence: 0, l1l3Coherence: 0, l2l3Coherence: 0, paradoxAlignment: 0 },
    },
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
