// ═══════════════════════════════════════════════════════════════
// 대량 콘텐츠 테스트
// T55-AC2: 배치 실행, 결과 비교, 일관성 분석
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector } from "@/types"
import type { ContentTestInput, SingleContentTestResult, ToneAnalysis } from "./single-content-test"
import { createSingleTestResult } from "./single-content-test"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface BatchTestConfig {
  personaId: string
  contents: ContentTestInput[]
}

export interface BatchAnomaly {
  contentIndex: number
  reason: string
  severity: "low" | "medium" | "high"
}

export interface BatchTestStats {
  avgResponseLength: number
  avgQualityScore: number
  logicRatio: number // 0~1
  emotionRatio: number // 0~1
  sentimentDistribution: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface BatchTestResult {
  personaId: string
  results: SingleContentTestResult[]
  consistencyScore: number // 0~100
  anomalies: BatchAnomaly[]
  stats: BatchTestStats
  completedAt: number
}

// ── 일관성 분석 ─────────────────────────────────────────────────

export function calculateConsistency(results: SingleContentTestResult[]): number {
  if (results.length < 2) return 100

  // 1) 톤 일관성: dominant tone이 얼마나 일관적인지
  const tones = results.map((r) => r.evaluation.toneAnalysis.dominantTone)
  const toneGroups = new Map<string, number>()
  for (const t of tones) {
    toneGroups.set(t, (toneGroups.get(t) ?? 0) + 1)
  }
  const maxToneCount = Math.max(...toneGroups.values())
  const toneConsistency = maxToneCount / tones.length

  // 2) 벡터 정합 분산: vectorAlignment가 얼마나 안정적인지
  const alignments = results.map((r) => r.evaluation.vectorAlignment)
  const avgAlignment = alignments.reduce((a, b) => a + b, 0) / alignments.length
  const alignmentVariance =
    alignments.reduce((sum, v) => sum + (v - avgAlignment) ** 2, 0) / alignments.length
  // variance 0→1.0, variance 625(max 25^2)→0
  const alignmentConsistency = Math.max(0, 1 - alignmentVariance / 625)

  // 3) 길이 일관성
  const lengths = results.map((r) => r.response.length)
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const lenVariance = lengths.reduce((sum, l) => sum + (l - avgLen) ** 2, 0) / lengths.length
  const lenConsistency = Math.max(0, 1 - lenVariance / (avgLen * avgLen + 1))

  // 가중 합산
  const score = toneConsistency * 0.4 + alignmentConsistency * 0.35 + lenConsistency * 0.25

  return Math.round(score * 100)
}

// ── 이상치 감지 ─────────────────────────────────────────────────

export function detectAnomalies(results: SingleContentTestResult[]): BatchAnomaly[] {
  if (results.length < 2) return []

  const anomalies: BatchAnomaly[] = []

  // 평균 품질 계산
  const qualities = results.map((r) => r.evaluation.overallQuality)
  const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length
  const stdDev = Math.sqrt(
    qualities.reduce((sum, q) => sum + (q - avgQuality) ** 2, 0) / qualities.length
  )

  for (let i = 0; i < results.length; i++) {
    const r = results[i]

    // 금지어 발견
    if (r.evaluation.prohibitedWordMatches.length > 0) {
      anomalies.push({
        contentIndex: i,
        reason: `금지어 포함: ${r.evaluation.prohibitedWordMatches.map((m) => m.word).join(", ")}`,
        severity: "high",
      })
    }

    // 품질 점수가 평균에서 2σ 이상 벗어남
    if (stdDev > 0 && Math.abs(r.evaluation.overallQuality - avgQuality) > stdDev * 2) {
      anomalies.push({
        contentIndex: i,
        reason: `품질 점수 이상치 (${r.evaluation.overallQuality}, 평균: ${Math.round(avgQuality)})`,
        severity: "medium",
      })
    }

    // 응답이 너무 짧음
    if (r.response.trim().length < 50) {
      anomalies.push({
        contentIndex: i,
        reason: `응답 길이 부족 (${r.response.trim().length}자)`,
        severity: "medium",
      })
    }

    // 벡터 정합성이 매우 낮음
    if (r.evaluation.vectorAlignment < 30) {
      anomalies.push({
        contentIndex: i,
        reason: `벡터 정합성 낮음 (${r.evaluation.vectorAlignment}%)`,
        severity: "low",
      })
    }
  }

  return anomalies
}

// ── 통계 계산 ───────────────────────────────────────────────────

export function calculateStats(results: SingleContentTestResult[]): BatchTestStats {
  if (results.length === 0) {
    return {
      avgResponseLength: 0,
      avgQualityScore: 0,
      logicRatio: 0,
      emotionRatio: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
    }
  }

  const avgResponseLength = Math.round(
    results.reduce((sum, r) => sum + r.response.length, 0) / results.length
  )
  const avgQualityScore = Math.round(
    results.reduce((sum, r) => sum + r.evaluation.overallQuality, 0) / results.length
  )

  // 톤 비율
  const totalLogic = results.reduce((sum, r) => sum + r.evaluation.toneAnalysis.logicScore, 0)
  const totalEmotion = results.reduce((sum, r) => sum + r.evaluation.toneAnalysis.emotionScore, 0)
  const logicRatio = round(totalLogic / results.length)
  const emotionRatio = round(totalEmotion / results.length)

  // 감성 분포: dominant tone 기준
  let positive = 0
  let neutral = 0
  let negative = 0

  for (const r of results) {
    const tone = r.evaluation.toneAnalysis
    if (tone.emotionScore > 0.6) positive++
    else if (tone.logicScore > 0.6)
      neutral++ // 논리적 = 중립적
    else neutral++
  }

  return {
    avgResponseLength,
    avgQualityScore,
    logicRatio,
    emotionRatio,
    sentimentDistribution: {
      positive: round(positive / results.length),
      neutral: round(neutral / results.length),
      negative: round(negative / results.length),
    },
  }
}

// ── 배치 테스트 실행 ────────────────────────────────────────────

export function createBatchTestResult(
  personaId: string,
  contents: ContentTestInput[],
  responses: string[],
  l1: SocialPersonaVector
): BatchTestResult {
  const results: SingleContentTestResult[] = contents.map((content, i) =>
    createSingleTestResult(content, responses[i] ?? "", l1)
  )

  return {
    personaId,
    results,
    consistencyScore: calculateConsistency(results),
    anomalies: detectAnomalies(results),
    stats: calculateStats(results),
    completedAt: Date.now(),
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
