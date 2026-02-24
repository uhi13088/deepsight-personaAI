// ═══════════════════════════════════════════════════════════════
// Quality Feedback Loop — Paradox expression, voice consistency,
// pressure reaction, quality metrics, few-shot, dashboard,
// integrations
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector } from "@/types"
import type { RAGContext, RAGCacheConfig } from "./rag-engine"
import type {
  ModelTier,
  ModelConfig,
  TierRoutingConfig,
  TierRoutingInput,
  TierRoutingExplanation,
  PromptCacheStore,
  CostEstimate,
  LLMResponse,
} from "./llm-strategy"
import {
  MODEL_CONFIGS,
  DEFAULT_ROUTING_CONFIG,
  explainRouting,
  getCachedPrompt,
  estimateRequestCost,
} from "./llm-strategy"
import {
  roundTo,
  countOccurrences,
  estimateTokenCount,
  trimToTokenBudget,
  formatTimeAgo,
  hashString,
  safeAvg,
} from "./types"

// ── LLM Pipeline Config ───────────────────────────────────────

/**
 * LLM 파이프라인 설정: 모델 + 라우팅 + 캐싱 통합 설정.
 */
export interface LLMPipelineConfig {
  readonly models: Record<ModelTier, ModelConfig>
  readonly routing: TierRoutingConfig
  readonly caching: {
    readonly enabled: boolean
    readonly maxEntries: number
    readonly defaultTTLMs: number
  }
  readonly rateLimiting: {
    readonly maxRequestsPerMinute: number
    readonly maxTokensPerMinute: number
  }
  readonly fallback: {
    readonly enabled: boolean
    readonly fallbackTier: ModelTier
    readonly retryCount: number
    readonly retryDelayMs: number
  }
}

export const DEFAULT_LLM_PIPELINE_CONFIG: LLMPipelineConfig = {
  models: MODEL_CONFIGS,
  routing: DEFAULT_ROUTING_CONFIG,
  caching: {
    enabled: true,
    maxEntries: 1000,
    defaultTTLMs: 300_000, // 5분
  },
  rateLimiting: {
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 100_000,
  },
  fallback: {
    enabled: true,
    fallbackTier: "tier2_light",
    retryCount: 2,
    retryDelayMs: 1000,
  },
} as const

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC3: Quality Feedback                                         ║
// ║ Paradox expression score, Voice consistency,                  ║
// ║ Pressure reaction test                                        ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Paradox Expression Score ──────────────────────────────────

/**
 * 역설 표현 점수: 생성된 텍스트에서 페르소나의 역설(L1↔L2 긴장)이
 * 얼마나 자연스럽게 표현되었는지를 측정한다.
 */
export interface ParadoxExpressionScore {
  readonly personaId: string
  readonly score: number // 0.0~1.0
  readonly contradictionCount: number
  readonly examples: readonly ParadoxExpressionExample[]
  readonly evaluatedAt: number
}

export interface ParadoxExpressionExample {
  readonly paradoxPair: string // "stance_agreeableness"
  readonly naturalLanguage: string // "비판적이면서 공감적인"
  readonly expressionFound: boolean
  readonly confidence: number // 0.0~1.0
  readonly excerpt: string // 해당 부분 발췌
}

export interface ParadoxPairDefinition {
  readonly l1Dimension: keyof SocialPersonaVector
  readonly l2Dimension: keyof CoreTemperamentVector
  readonly l1Value: number
  readonly l2Value: number
  readonly tensionScore: number
}

/**
 * 역설 표현 평가: 텍스트에서 상위 역설 쌍의 표현 여부를 분석한다.
 *
 * 측정 파이프라인:
 * 1. 페르소나의 L1↔L2 역설 쌍 중 상위 3개 추출
 * 2. 각 역설을 자연어로 변환
 * 3. 텍스트에서 역설 표현 패턴 검색 (규칙 기반)
 * 4. 상위 3개 역설의 스코어 평균
 */
export function evaluateParadoxExpression(
  personaId: string,
  generatedText: string,
  paradoxPairs: readonly ParadoxPairDefinition[]
): ParadoxExpressionScore {
  if (paradoxPairs.length === 0) {
    return {
      personaId,
      score: 0,
      contradictionCount: 0,
      examples: [],
      evaluatedAt: Date.now(),
    }
  }

  // 상위 3개 역설 쌍
  const topPairs = [...paradoxPairs].sort((a, b) => b.tensionScore - a.tensionScore).slice(0, 3)

  const examples: ParadoxExpressionExample[] = []

  for (const pair of topPairs) {
    const naturalLanguage = describeParadoxPair(pair)
    const analysis = findParadoxExpression(generatedText, pair)

    examples.push({
      paradoxPair: `${pair.l1Dimension}_${pair.l2Dimension}`,
      naturalLanguage,
      expressionFound: analysis.found,
      confidence: analysis.confidence,
      excerpt: analysis.excerpt,
    })
  }

  const totalScore =
    examples.length > 0 ? examples.reduce((sum, ex) => sum + ex.confidence, 0) / examples.length : 0

  const contradictionCount = examples.filter((ex) => ex.expressionFound).length

  return {
    personaId,
    score: roundTo(totalScore, 3),
    contradictionCount,
    examples,
    evaluatedAt: Date.now(),
  }
}

function describeParadoxPair(pair: ParadoxPairDefinition): string {
  const l1Descriptions: Record<string, [string, string]> = {
    depth: ["직관적인", "심층적인"],
    lens: ["감성적인", "논리적인"],
    stance: ["수용적인", "비판적인"],
    scope: ["간결한", "상세한"],
    taste: ["클래식한", "실험적인"],
    purpose: ["오락적인", "의미추구적인"],
    sociability: ["독립적인", "사교적인"],
  }

  const l2Descriptions: Record<string, [string, string]> = {
    openness: ["보수적인", "개방적인"],
    conscientiousness: ["즉흥적인", "원칙적인"],
    extraversion: ["내향적인", "외향적인"],
    agreeableness: ["경쟁적인", "협조적인"],
    neuroticism: ["안정적인", "예민한"],
  }

  const l1Desc = l1Descriptions[pair.l1Dimension]
  const l2Desc = l2Descriptions[pair.l2Dimension]

  if (!l1Desc || !l2Desc) return "알 수 없는 역설"

  const l1Text = pair.l1Value < 0.5 ? l1Desc[0] : l1Desc[1]
  const l2Text = pair.l2Value < 0.5 ? l2Desc[0] : l2Desc[1]

  return `${l1Text}이면서 ${l2Text}`
}

function findParadoxExpression(
  text: string,
  pair: ParadoxPairDefinition
): { found: boolean; confidence: number; excerpt: string } {
  // 역설 표현의 언어적 패턴
  const contrastMarkers = [
    "하지만",
    "그러나",
    "반면",
    "동시에",
    "한편으로는",
    "이면서",
    "에도 불구하고",
    "그럼에도",
    "역설적으로",
    "모순되지만",
    "양면성",
    "이중적",
    "복합적",
  ]

  const dimensionKeywords: Record<string, readonly string[]> = {
    depth: ["깊이", "분석", "직관", "표면", "심층"],
    lens: ["감성", "논리", "감정", "이성", "합리"],
    stance: ["수용", "비판", "비평", "긍정", "부정"],
    scope: ["간결", "상세", "디테일", "핵심"],
    taste: ["클래식", "실험", "전통", "새로운"],
    purpose: ["재미", "의미", "오락", "가치"],
    sociability: ["혼자", "함께", "독립", "사교"],
    openness: ["보수", "개방", "새로운", "전통"],
    conscientiousness: ["즉흥", "원칙", "계획", "자유"],
    extraversion: ["내향", "외향", "조용", "활발"],
    agreeableness: ["경쟁", "협조", "양보", "대립"],
    neuroticism: ["안정", "불안", "예민", "평온"],
  }

  const l1Keywords = dimensionKeywords[pair.l1Dimension] ?? []
  const l2Keywords = dimensionKeywords[pair.l2Dimension] ?? []

  let hasContrast = false
  let hasL1Keyword = false
  let hasL2Keyword = false

  for (const marker of contrastMarkers) {
    if (text.includes(marker)) {
      hasContrast = true
      break
    }
  }

  for (const keyword of l1Keywords) {
    if (text.includes(keyword)) {
      hasL1Keyword = true
      break
    }
  }

  for (const keyword of l2Keywords) {
    if (text.includes(keyword)) {
      hasL2Keyword = true
      break
    }
  }

  const found = hasContrast && (hasL1Keyword || hasL2Keyword)

  let confidence = 0
  if (hasContrast) confidence += 0.3
  if (hasL1Keyword) confidence += 0.3
  if (hasL2Keyword) confidence += 0.3
  if (hasL1Keyword && hasL2Keyword && hasContrast) confidence += 0.1

  // 발췌 추출
  let excerpt = ""
  if (found) {
    for (const marker of contrastMarkers) {
      const idx = text.indexOf(marker)
      if (idx >= 0) {
        const start = Math.max(0, idx - 30)
        const end = Math.min(text.length, idx + marker.length + 50)
        excerpt = text.slice(start, end).trim()
        break
      }
    }
  }

  return {
    found,
    confidence: roundTo(Math.min(confidence, 1.0), 2),
    excerpt,
  }
}

// ── Voice Consistency Metric ──────────────────────────────────

/**
 * Voice 일관성 지표: 페르소나의 과거 글과 새 글 사이의 말투 일관성.
 * LLM 없이 규칙 기반으로 측정 (비용 0원).
 */
export interface VoiceConsistencyMetric {
  readonly personaId: string
  readonly score: number // 0.0~1.0
  readonly deviations: readonly VoiceDeviation[]
  readonly sampleCount: number
  readonly evaluatedAt: number
}

export interface VoiceDeviation {
  readonly feature: string
  readonly baseline: number
  readonly current: number
  readonly deviation: number // |baseline - current|
  readonly severity: "low" | "medium" | "high"
}

export interface VoiceFeatureVector {
  readonly avgSentenceLength: number
  readonly exclamationRate: number
  readonly questionRate: number
  readonly vocabLevel: number
  readonly speechPatternHits: number
}

/**
 * Voice 일관성 측정: 과거 글의 특성과 새 글의 특성을 비교한다.
 *
 * 측정 방법:
 * 1. 페르소나의 최근 글 10개에서 Voice 특성 추출
 * 2. 새로 생성된 글에서 동일 특성 추출
 * 3. 코사인 유사도 계산
 *    - 유사도 < 0.6 → Voice drift 경고
 *    - 유사도 < 0.4 → Voice 심각 이탈
 */
export function measureVoiceConsistency(
  personaId: string,
  baselineTexts: readonly string[],
  newText: string,
  speechPatterns: readonly string[]
): VoiceConsistencyMetric {
  if (baselineTexts.length === 0) {
    return {
      personaId,
      score: 1.0,
      deviations: [],
      sampleCount: 0,
      evaluatedAt: Date.now(),
    }
  }

  const baselineFeatures = extractFeatureVectors(baselineTexts, speechPatterns)
  const newFeatures = extractSingleFeatureVector(newText, speechPatterns)

  const similarity = computeFeatureCosineSimilarity(baselineFeatures, newFeatures)

  const deviations = computeDeviations(baselineFeatures, newFeatures)

  return {
    personaId,
    score: roundTo(similarity, 3),
    deviations,
    sampleCount: baselineTexts.length,
    evaluatedAt: Date.now(),
  }
}

function extractFeatureVectors(
  texts: readonly string[],
  speechPatterns: readonly string[]
): VoiceFeatureVector {
  const features = texts.map((text) => extractSingleFeatureVector(text, speechPatterns))

  const avg = (arr: readonly number[]): number =>
    arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0

  return {
    avgSentenceLength: avg(features.map((f) => f.avgSentenceLength)),
    exclamationRate: avg(features.map((f) => f.exclamationRate)),
    questionRate: avg(features.map((f) => f.questionRate)),
    vocabLevel: avg(features.map((f) => f.vocabLevel)),
    speechPatternHits: avg(features.map((f) => f.speechPatternHits)),
  }
}

function extractSingleFeatureVector(
  text: string,
  speechPatterns: readonly string[]
): VoiceFeatureVector {
  const sentences = text.split(/[.!?。]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const uniqueWords = new Set(words)

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
  const vocabLevel = words.length > 0 ? uniqueWords.size / words.length : 0
  const exclamationRate = sentences.length > 0 ? (text.split("!").length - 1) / sentences.length : 0
  const questionRate = sentences.length > 0 ? (text.split("?").length - 1) / sentences.length : 0

  let speechPatternHits = 0
  for (const pattern of speechPatterns) {
    speechPatternHits += countOccurrences(text, pattern)
  }

  return {
    avgSentenceLength,
    exclamationRate: Math.min(exclamationRate, 1.0),
    questionRate: Math.min(questionRate, 1.0),
    vocabLevel,
    speechPatternHits,
  }
}

function computeFeatureCosineSimilarity(a: VoiceFeatureVector, b: VoiceFeatureVector): number {
  const vecA = [
    a.avgSentenceLength,
    a.exclamationRate,
    a.questionRate,
    a.vocabLevel,
    a.speechPatternHits,
  ]
  const vecB = [
    b.avgSentenceLength,
    b.exclamationRate,
    b.questionRate,
    b.vocabLevel,
    b.speechPatternHits,
  ]

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 1.0

  return dotProduct / denominator
}

function computeDeviations(
  baseline: VoiceFeatureVector,
  current: VoiceFeatureVector
): readonly VoiceDeviation[] {
  const features: Array<{ feature: string; baseline: number; current: number }> = [
    {
      feature: "avgSentenceLength",
      baseline: baseline.avgSentenceLength,
      current: current.avgSentenceLength,
    },
    {
      feature: "exclamationRate",
      baseline: baseline.exclamationRate,
      current: current.exclamationRate,
    },
    { feature: "questionRate", baseline: baseline.questionRate, current: current.questionRate },
    { feature: "vocabLevel", baseline: baseline.vocabLevel, current: current.vocabLevel },
    {
      feature: "speechPatternHits",
      baseline: baseline.speechPatternHits,
      current: current.speechPatternHits,
    },
  ]

  return features.map(({ feature, baseline: b, current: c }) => {
    const deviation = Math.abs(b - c)
    const normalizedDeviation = b > 0 ? deviation / b : deviation
    const severity: VoiceDeviation["severity"] =
      normalizedDeviation > 0.5 ? "high" : normalizedDeviation > 0.25 ? "medium" : "low"

    return {
      feature,
      baseline: roundTo(b, 3),
      current: roundTo(c, 3),
      deviation: roundTo(deviation, 3),
      severity,
    }
  })
}

// ── Pressure Reaction Test ────────────────────────────────────

/**
 * 압력 반응 테스트: 다양한 pressure 수준에서 페르소나의 반응이
 * 자연스럽게 변화하는지를 검증한다.
 *
 * 테스트 방법:
 * 1. 동일 질문을 P=0.1, 0.4, 0.7, 1.0으로 실행
 * 2. 각 응답의 감정 톤/강도를 분석
 * 3. P↑ → intensity↑가 단조 증가하는지 검증
 */
export interface PressureReactionTest {
  readonly personaId: string
  readonly pressureLevel: number
  readonly expectedBehavior: string
  readonly actualBehavior: string
  readonly passed: boolean
  readonly sentimentScore: number // -1.0 ~ 1.0
  readonly intensityScore: number // 0.0 ~ 1.0
}

export interface PressureTestSuite {
  readonly personaId: string
  readonly tests: readonly PressureReactionTest[]
  readonly monotonicityScore: number // 단조 증가 정도 (0.0~1.0)
  readonly overallPassed: boolean
  readonly testedAt: number
}

export type PressureLevel = 0.1 | 0.4 | 0.7 | 1.0

export const STANDARD_PRESSURE_LEVELS: readonly PressureLevel[] = [0.1, 0.4, 0.7, 1.0] as const

/**
 * Pressure 반응 테스트 실행.
 * 각 pressure 수준에서의 응답을 분석하여 자연스러움을 판단한다.
 */
export function runPressureReactionTest(
  personaId: string,
  responses: readonly { pressure: number; response: string }[]
): PressureTestSuite {
  if (responses.length === 0) {
    return {
      personaId,
      tests: [],
      monotonicityScore: 0,
      overallPassed: false,
      testedAt: Date.now(),
    }
  }

  const sortedResponses = [...responses].sort((a, b) => a.pressure - b.pressure)
  const tests: PressureReactionTest[] = []

  for (const response of sortedResponses) {
    const sentiment = analyzeSentiment(response.response)
    const intensity = analyzeIntensity(response.response)
    const expected = describePressureExpectation(response.pressure)

    tests.push({
      personaId,
      pressureLevel: response.pressure,
      expectedBehavior: expected,
      actualBehavior: `sentiment=${sentiment.toFixed(2)}, intensity=${intensity.toFixed(2)}`,
      passed: true, // 개별 통과 여부는 전체 단조성 분석 후 결정
      sentimentScore: roundTo(sentiment, 2),
      intensityScore: roundTo(intensity, 2),
    })
  }

  // 단조 증가 검증
  const monotonicityScore = computeMonotonicity(tests.map((t) => t.intensityScore))

  // 단조성 ≥ 0.6이면 전체 통과
  const overallPassed = monotonicityScore >= 0.6

  // 개별 테스트 통과 여부 업데이트
  const updatedTests = tests.map((test, i) => {
    if (i === 0) return { ...test, passed: true }

    const prevIntensity = tests[i - 1].intensityScore
    const isIncreasing = test.intensityScore >= prevIntensity - 0.1 // 약간의 허용 범위
    return { ...test, passed: isIncreasing }
  })

  return {
    personaId,
    tests: updatedTests,
    monotonicityScore: roundTo(monotonicityScore, 3),
    overallPassed,
    testedAt: Date.now(),
  }
}

function describePressureExpectation(pressure: number): string {
  if (pressure <= 0.2) return "차분하고 일관적인 톤 (L1 주도)"
  if (pressure <= 0.5) return "약간의 내면 드러남 (L2 영향 시작)"
  if (pressure <= 0.8) return "내면 갈등 표현 증가 (L2 강하게 영향)"
  return "격렬하고 본능적 반응 (L2/L3 주도)"
}

/**
 * 텍스트의 감정 톤을 규칙 기반으로 분석한다.
 * -1.0 (극부정) ~ 1.0 (극긍정)
 */
function analyzeSentiment(text: string): number {
  const positiveWords = [
    "좋은",
    "훌륭한",
    "감동",
    "아름다운",
    "즐거운",
    "행복",
    "뛰어난",
    "완벽",
    "추천",
    "만족",
    "대박",
  ]
  const negativeWords = [
    "나쁜",
    "실망",
    "별로",
    "부족",
    "아쉬운",
    "불만",
    "최악",
    "거부",
    "싫은",
    "지루한",
    "짜증",
  ]

  let positiveCount = 0
  let negativeCount = 0

  for (const word of positiveWords) {
    positiveCount += countOccurrences(text, word)
  }
  for (const word of negativeWords) {
    negativeCount += countOccurrences(text, word)
  }

  const total = positiveCount + negativeCount
  if (total === 0) return 0.0

  return roundTo((positiveCount - negativeCount) / total, 2)
}

/**
 * 텍스트의 감정 강도를 규칙 기반으로 분석한다.
 * 0.0 (차분) ~ 1.0 (격렬)
 */
function analyzeIntensity(text: string): number {
  let intensity = 0.3 // 기본 강도

  // 느낌표 수
  const exclamationCount = (text.match(/!/g) ?? []).length
  intensity += Math.min(exclamationCount * 0.08, 0.3)

  // 물음표 수 (특히 연속)
  const multiQuestionMarks = (text.match(/\?{2,}/g) ?? []).length
  intensity += multiQuestionMarks * 0.1

  // 강조 표현
  const intensifiers = ["정말", "진짜", "매우", "너무", "극도로", "완전히", "절대"]
  for (const word of intensifiers) {
    intensity += countOccurrences(text, word) * 0.05
  }

  // 대문자/특수 표현
  const capsCount = (text.match(/[A-Z]{2,}/g) ?? []).length
  intensity += capsCount * 0.05

  // 반복 문자 (ㅋㅋㅋ, ㅎㅎㅎ, ...)
  const repeats = (text.match(/(.)\1{2,}/g) ?? []).length
  intensity += repeats * 0.05

  return roundTo(Math.min(intensity, 1.0), 2)
}

/**
 * 수열의 단조 증가 정도를 측정한다.
 * 1.0 = 완전 단조 증가, 0.0 = 완전 단조 감소
 */
function computeMonotonicity(values: readonly number[]): number {
  if (values.length < 2) return 1.0

  let increases = 0
  let total = 0

  for (let i = 1; i < values.length; i++) {
    total++
    if (values[i] >= values[i - 1] - 0.05) {
      // 약간의 허용 범위
      increases++
    }
  }

  return total > 0 ? increases / total : 1.0
}

// ── Quality Metrics (통합) ────────────────────────────────────

/**
 * 품질 지표 통합: 3대 지표를 하나로 종합한다.
 */
export interface QualityMetrics {
  readonly paradoxExpression: ParadoxExpressionScore
  readonly voiceConsistency: VoiceConsistencyMetric
  readonly pressureReaction: PressureTestSuite
  readonly overallScore: number // 0.0~1.0 가중 평균
  readonly grade: QualityGrade
  readonly evaluatedAt: number
}

export type QualityGrade = "A" | "B" | "C" | "D" | "F"

export interface QualityWeights {
  readonly paradoxExpression: number // 기본 0.35
  readonly voiceConsistency: number // 기본 0.40
  readonly pressureReaction: number // 기본 0.25
}

export const DEFAULT_QUALITY_WEIGHTS: QualityWeights = {
  paradoxExpression: 0.35,
  voiceConsistency: 0.4,
  pressureReaction: 0.25,
} as const

/**
 * 종합 품질 점수를 계산한다.
 */
export function computeOverallQuality(
  paradoxScore: ParadoxExpressionScore,
  voiceMetric: VoiceConsistencyMetric,
  pressureSuite: PressureTestSuite,
  weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS
): QualityMetrics {
  const paradoxVal = paradoxScore.score
  const voiceVal = voiceMetric.score
  const pressureVal = pressureSuite.monotonicityScore

  const overallScore = roundTo(
    paradoxVal * weights.paradoxExpression +
      voiceVal * weights.voiceConsistency +
      pressureVal * weights.pressureReaction,
    3
  )

  const grade = scoreToGrade(overallScore)

  return {
    paradoxExpression: paradoxScore,
    voiceConsistency: voiceMetric,
    pressureReaction: pressureSuite,
    overallScore,
    grade,
    evaluatedAt: Date.now(),
  }
}

function scoreToGrade(score: number): QualityGrade {
  if (score >= 0.9) return "A"
  if (score >= 0.75) return "B"
  if (score >= 0.6) return "C"
  if (score >= 0.4) return "D"
  return "F"
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC4: Few-shot Collector + Quality Dashboard                   ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Few-shot Types ────────────────────────────────────────────

/**
 * Few-shot 예시: 품질이 높은 생성 결과를 저장하여 프롬프트에 재활용.
 */
export interface FewShotExample {
  readonly id: string
  readonly personaId: string
  readonly input: string // 생성 시 입력 (프롬프트/질문)
  readonly output: string // 생성 결과 텍스트
  readonly quality: FewShotQuality
  readonly tags: readonly string[]
  readonly paradoxType: string // "stance_agreeableness"
  readonly collectedAt: number
}

export interface FewShotQuality {
  readonly paradoxExpressionScore: number
  readonly voiceConsistencyScore: number
  readonly userFeedback: "like" | "dislike" | "none"
  readonly overallScore: number // 종합 품질 (0.0~1.0)
}

export interface FewShotCollection {
  readonly examples: readonly FewShotExample[]
  readonly filters: FewShotFilters
}

export interface FewShotFilters {
  readonly minQuality: number // 최소 품질 점수 (기본 0.7)
  readonly paradoxType?: string
  readonly tags?: readonly string[]
  readonly maxAge?: number // ms 단위 최대 수집 기간
  readonly maxPerType: number // 유형당 최대 개수 (기본 10)
}

export const DEFAULT_FEW_SHOT_FILTERS: FewShotFilters = {
  minQuality: 0.7,
  maxPerType: 10,
} as const

/**
 * Few-shot 예시 수집: 품질 기준을 충족하는 생성 결과를 수집한다.
 *
 * 수집 기준:
 * - paradoxExpression >= 0.8
 * - voiceConsistency >= 0.7
 * - 유저 LIKE 피드백
 */
export function collectFewShot(
  collection: FewShotCollection,
  newExample: Omit<FewShotExample, "id" | "collectedAt">
): FewShotCollection {
  const { filters } = collection

  // 품질 기준 미달이면 수집하지 않음
  if (newExample.quality.overallScore < filters.minQuality) {
    return collection
  }

  const id = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const example: FewShotExample = {
    ...newExample,
    id,
    collectedAt: Date.now(),
  }

  // 같은 paradoxType의 기존 예시
  const sameType = collection.examples.filter((ex) => ex.paradoxType === newExample.paradoxType)
  const otherTypes = collection.examples.filter((ex) => ex.paradoxType !== newExample.paradoxType)

  // 유형당 최대 개수 제한 (FIFO)
  const updatedSameType = [...sameType, example]
    .sort((a, b) => b.quality.overallScore - a.quality.overallScore)
    .slice(0, filters.maxPerType)

  return {
    examples: [...otherTypes, ...updatedSameType],
    filters,
  }
}

/**
 * Few-shot 예시 랭킹: 품질 순으로 정렬한다.
 */
export function rankFewShots(examples: readonly FewShotExample[]): readonly FewShotExample[] {
  return [...examples].sort((a, b) => {
    // 1차: 종합 품질
    const qualityDiff = b.quality.overallScore - a.quality.overallScore
    if (Math.abs(qualityDiff) > 0.01) return qualityDiff

    // 2차: 유저 피드백 (like > none > dislike)
    const feedbackOrder: Record<string, number> = { like: 2, none: 1, dislike: 0 }
    const feedbackDiff =
      (feedbackOrder[b.quality.userFeedback] ?? 0) - (feedbackOrder[a.quality.userFeedback] ?? 0)
    if (feedbackDiff !== 0) return feedbackDiff

    // 3차: 최신 수집 우선
    return b.collectedAt - a.collectedAt
  })
}

/**
 * 프롬프트 주입을 위한 최적 Few-shot 예시를 선택한다.
 *
 * 선택 기준:
 * - paradoxType 일치하는 것 우선
 * - 품질 순으로 상위 N개
 */
export function selectBestExamples(
  collection: FewShotCollection,
  paradoxType: string,
  count: number = 3
): readonly FewShotExample[] {
  // 같은 paradoxType 우선
  const sameTypeExamples = collection.examples.filter((ex) => ex.paradoxType === paradoxType)
  const otherExamples = collection.examples.filter((ex) => ex.paradoxType !== paradoxType)

  const ranked = [...rankFewShots(sameTypeExamples), ...rankFewShots(otherExamples)]

  return ranked.slice(0, count)
}

/**
 * Few-shot 예시를 프롬프트 텍스트로 포맷한다.
 */
export function formatFewShotsForPrompt(examples: readonly FewShotExample[]): string {
  if (examples.length === 0) return ""

  const lines: string[] = ["[Few-shot 참고 예시 — 이 페르소나의 우수 응답]"]

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i]
    lines.push(``)
    lines.push(`예시 ${i + 1}:`)
    lines.push(`입력: ${ex.input.slice(0, 100)}`)
    lines.push(`응답: ${ex.output.slice(0, 300)}`)
  }

  return lines.join("\n")
}

// ── Quality Dashboard ─────────────────────────────────────────

/**
 * 품질 대시보드 데이터: 운영자가 페르소나 품질을 모니터링하기 위한 집계 데이터.
 */
export interface QualityDashboardData {
  readonly overview: QualityOverview
  readonly archetypeMetrics: Readonly<Record<string, QualityMetricsSummary>>
  readonly paradoxTypeSuccess: Readonly<Record<string, number>> // paradoxType → 성공률
  readonly voiceDriftDistribution: readonly VoiceDriftEntry[]
  readonly pressureCurveByArchetype: Readonly<Record<string, readonly PressureCurvePoint[]>>
  readonly fewShotLibrarySize: Readonly<Record<string, number>>
  readonly trends: readonly QualityTrend[]
  readonly alerts: readonly QualityAlert[]
  readonly builtAt: number
}

export interface QualityOverview {
  readonly totalPersonas: number
  readonly avgParadoxExpression: number
  readonly avgVoiceConsistency: number
  readonly avgPressureResponse: number
  readonly avgOverallScore: number
  readonly gradeDistribution: Readonly<Record<QualityGrade, number>>
}

export interface QualityMetricsSummary {
  readonly archetypeId: string
  readonly personaCount: number
  readonly avgParadoxExpression: number
  readonly avgVoiceConsistency: number
  readonly avgPressureResponse: number
  readonly avgOverall: number
}

export interface VoiceDriftEntry {
  readonly turnCount: number
  readonly driftRate: number
}

export interface PressureCurvePoint {
  readonly pressure: number
  readonly avgIntensity: number
  readonly avgSentiment: number
}

export interface QualityTrend {
  readonly date: string // "2026-02-12"
  readonly avgScore: number
  readonly sampleCount: number
}

export type QualityAlertType =
  | "voice_drift"
  | "paradox_unexpressed"
  | "pressure_anomaly"
  | "quality_drop"

export type QualityAlertSeverity = "info" | "warning" | "critical"

export interface QualityAlert {
  readonly id: string
  readonly type: QualityAlertType
  readonly severity: QualityAlertSeverity
  readonly message: string
  readonly personaId?: string
  readonly archetypeId?: string
  readonly triggeredAt: number
  readonly acknowledged: boolean
}

/**
 * 품질 대시보드 데이터를 빌드한다.
 */
export function buildQualityDashboard(
  metricsPerPersona: readonly { personaId: string; archetypeId: string; metrics: QualityMetrics }[],
  fewShotCollection: FewShotCollection,
  previousTrends: readonly QualityTrend[] = []
): QualityDashboardData {
  // Overview 계산
  const totalPersonas = metricsPerPersona.length
  const avgParadoxExpression = safeAvg(
    metricsPerPersona.map((m) => m.metrics.paradoxExpression.score)
  )
  const avgVoiceConsistency = safeAvg(
    metricsPerPersona.map((m) => m.metrics.voiceConsistency.score)
  )
  const avgPressureResponse = safeAvg(
    metricsPerPersona.map((m) => m.metrics.pressureReaction.monotonicityScore)
  )
  const avgOverallScore = safeAvg(metricsPerPersona.map((m) => m.metrics.overallScore))

  const gradeDistribution: Record<QualityGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const m of metricsPerPersona) {
    gradeDistribution[m.metrics.grade]++
  }

  const overview: QualityOverview = {
    totalPersonas,
    avgParadoxExpression: roundTo(avgParadoxExpression, 3),
    avgVoiceConsistency: roundTo(avgVoiceConsistency, 3),
    avgPressureResponse: roundTo(avgPressureResponse, 3),
    avgOverallScore: roundTo(avgOverallScore, 3),
    gradeDistribution,
  }

  // 아키타입별 지표
  type PersonaMetricEntry = { personaId: string; archetypeId: string; metrics: QualityMetrics }
  const archetypeGroups = new Map<string, PersonaMetricEntry[]>()
  for (const m of metricsPerPersona) {
    const existing = archetypeGroups.get(m.archetypeId)
    if (existing) {
      existing.push({ personaId: m.personaId, archetypeId: m.archetypeId, metrics: m.metrics })
    } else {
      archetypeGroups.set(m.archetypeId, [
        { personaId: m.personaId, archetypeId: m.archetypeId, metrics: m.metrics },
      ])
    }
  }

  const archetypeMetrics: Record<string, QualityMetricsSummary> = {}
  for (const [archetypeId, group] of archetypeGroups) {
    archetypeMetrics[archetypeId] = {
      archetypeId,
      personaCount: group.length,
      avgParadoxExpression: roundTo(
        safeAvg(group.map((m) => m.metrics.paradoxExpression.score)),
        3
      ),
      avgVoiceConsistency: roundTo(safeAvg(group.map((m) => m.metrics.voiceConsistency.score)), 3),
      avgPressureResponse: roundTo(
        safeAvg(group.map((m) => m.metrics.pressureReaction.monotonicityScore)),
        3
      ),
      avgOverall: roundTo(safeAvg(group.map((m) => m.metrics.overallScore)), 3),
    }
  }

  // Paradox 유형별 성공률
  const paradoxTypeSuccess: Record<string, number> = {}
  for (const m of metricsPerPersona) {
    for (const example of m.metrics.paradoxExpression.examples) {
      const type = example.paradoxPair
      if (!paradoxTypeSuccess[type]) {
        paradoxTypeSuccess[type] = 0
      }
      if (example.expressionFound) {
        paradoxTypeSuccess[type] = paradoxTypeSuccess[type] + 1
      }
    }
  }
  // 정규화 (총 페르소나 수 대비)
  for (const type of Object.keys(paradoxTypeSuccess)) {
    paradoxTypeSuccess[type] = roundTo(paradoxTypeSuccess[type] / Math.max(totalPersonas, 1), 3)
  }

  // Voice drift 분포
  const voiceDriftDistribution: VoiceDriftEntry[] = []
  const driftBuckets = [5, 10, 20, 50, 100]
  for (const turnCount of driftBuckets) {
    const driftRate = safeAvg(
      metricsPerPersona
        .filter((m) => m.metrics.voiceConsistency.sampleCount >= turnCount * 0.5)
        .map((m) => 1 - m.metrics.voiceConsistency.score)
    )
    voiceDriftDistribution.push({ turnCount, driftRate: roundTo(driftRate, 3) })
  }

  // Pressure 곡선 (아키타입별)
  const pressureCurveByArchetype: Record<string, PressureCurvePoint[]> = {}
  for (const [archetypeId, group] of archetypeGroups) {
    const allTests = group.flatMap((m) => m.metrics.pressureReaction.tests)
    const pressureLevels = [0.1, 0.4, 0.7, 1.0]
    pressureCurveByArchetype[archetypeId] = pressureLevels.map((p) => {
      const testsAtLevel = allTests.filter((t) => Math.abs(t.pressureLevel - p) < 0.05)
      return {
        pressure: p,
        avgIntensity: roundTo(safeAvg(testsAtLevel.map((t) => t.intensityScore)), 3),
        avgSentiment: roundTo(safeAvg(testsAtLevel.map((t) => t.sentimentScore)), 3),
      }
    })
  }

  // Few-shot 라이브러리 크기
  const fewShotLibrarySize: Record<string, number> = {}
  for (const example of fewShotCollection.examples) {
    fewShotLibrarySize[example.paradoxType] = (fewShotLibrarySize[example.paradoxType] ?? 0) + 1
  }

  // 트렌드 업데이트
  const today = new Date().toISOString().split("T")[0]
  const newTrend: QualityTrend = {
    date: today,
    avgScore: roundTo(avgOverallScore, 3),
    sampleCount: totalPersonas,
  }
  const updatedTrends = [...previousTrends.filter((t) => t.date !== today), newTrend]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // 최근 30일

  // 알림 생성
  const alerts = generateQualityAlerts(metricsPerPersona, archetypeMetrics)

  return {
    overview,
    archetypeMetrics,
    paradoxTypeSuccess,
    voiceDriftDistribution,
    pressureCurveByArchetype,
    fewShotLibrarySize,
    trends: updatedTrends,
    alerts,
    builtAt: Date.now(),
  }
}

function generateQualityAlerts(
  metricsPerPersona: readonly { personaId: string; archetypeId: string; metrics: QualityMetrics }[],
  archetypeMetrics: Record<string, QualityMetricsSummary>
): readonly QualityAlert[] {
  const alerts: QualityAlert[] = []
  const now = Date.now()

  // 개별 페르소나 알림
  for (const m of metricsPerPersona) {
    if (m.metrics.voiceConsistency.score < 0.4) {
      alerts.push({
        id: `alert_vd_${m.personaId}_${now}`,
        type: "voice_drift",
        severity: "critical",
        message: `페르소나 ${m.personaId}의 Voice 일관성이 심각하게 이탈했습니다 (${(m.metrics.voiceConsistency.score * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    } else if (m.metrics.voiceConsistency.score < 0.6) {
      alerts.push({
        id: `alert_vd_${m.personaId}_${now}`,
        type: "voice_drift",
        severity: "warning",
        message: `페르소나 ${m.personaId}의 Voice 일관성이 낮습니다 (${(m.metrics.voiceConsistency.score * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }

    if (
      m.metrics.paradoxExpression.score < 0.3 &&
      m.metrics.paradoxExpression.examples.length > 0
    ) {
      alerts.push({
        id: `alert_pe_${m.personaId}_${now}`,
        type: "paradox_unexpressed",
        severity: "warning",
        message: `페르소나 ${m.personaId}의 역설이 충분히 표현되지 않고 있습니다 (${(m.metrics.paradoxExpression.score * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }

    if (!m.metrics.pressureReaction.overallPassed && m.metrics.pressureReaction.tests.length > 0) {
      alerts.push({
        id: `alert_pa_${m.personaId}_${now}`,
        type: "pressure_anomaly",
        severity: "warning",
        message: `페르소나 ${m.personaId}의 Pressure 반응이 비정상적입니다 (단조성 ${(m.metrics.pressureReaction.monotonicityScore * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }
  }

  // 아키타입별 알림
  for (const [archetypeId, summary] of Object.entries(archetypeMetrics)) {
    if (summary.avgOverall < 0.5) {
      alerts.push({
        id: `alert_qd_${archetypeId}_${now}`,
        type: "quality_drop",
        severity: "critical",
        message: `아키타입 ${archetypeId}의 전체 품질이 낮습니다 (${(summary.avgOverall * 100).toFixed(0)}%)`,
        archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }
  }

  return alerts
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC5: Integration                                              ║
// ║ RAG → Prompt Builder, Tier Router → Generation Pipeline       ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── RAG → Prompt Builder Integration ──────────────────────────

/**
 * RAG 컨텍스트를 프롬프트 빌더와 통합하기 위한 설정.
 *
 * 프롬프트 구성 순서:
 * [A] 시스템 프롬프트 (고정, 캐시 대상) ~2,000 tok
 * [B] Voice 앵커 (RAG 검색) ~500 tok
 * [C] 관계 기억 (RAG 조건부 검색) ~800 tok
 * [D] 관심사 연속성 (RAG 검색) ~100 tok
 * [E] Few-shot 예시 ~300 tok
 * [F] 현재 컨텍스트 + 유저 입력 ~500 tok
 */
export interface RAGPromptIntegration {
  readonly ragContext: RAGContext
  readonly fewShotExamples: readonly FewShotExample[]
  readonly systemPromptBase: string
  readonly maxTotalTokens: number
  readonly cacheConfig: RAGCacheConfig
}

export interface IntegratedPrompt {
  readonly systemPrompt: string // [A] 시스템 프롬프트
  readonly ragSection: string // [B]+[C]+[D] RAG 컨텍스트
  readonly fewShotSection: string // [E] Few-shot 예시
  readonly totalTokenEstimate: number
  readonly cacheable: boolean // [A] 부분 캐시 가능 여부
  readonly cacheKey: string
}

/**
 * RAG 컨텍스트와 프롬프트 빌더를 통합하여 완성된 프롬프트를 생성한다.
 */
export function integrateRAGWithPromptBuilder(integration: RAGPromptIntegration): IntegratedPrompt {
  const { ragContext, fewShotExamples, systemPromptBase, maxTotalTokens } = integration

  // [B]+[C]+[D] RAG 섹션
  const ragSection = ragContext.compiledText

  // [E] Few-shot 섹션
  const fewShotSection = formatFewShotsForPrompt(fewShotExamples)

  // 토큰 예산 관리
  const systemTokens = estimateTokenCount(systemPromptBase)
  const ragTokens = estimateTokenCount(ragSection)
  const fewShotTokens = estimateTokenCount(fewShotSection)
  const totalTokenEstimate = systemTokens + ragTokens + fewShotTokens

  // 예산 초과 시 RAG 섹션 트리밍
  let finalRagSection = ragSection
  let finalFewShotSection = fewShotSection

  if (totalTokenEstimate > maxTotalTokens) {
    const available = maxTotalTokens - systemTokens
    const ragBudget = Math.floor(available * 0.7) // RAG 70%
    const fewShotBudget = available - ragBudget // Few-shot 30%

    finalRagSection = trimToTokenBudget(ragSection, ragBudget)
    finalFewShotSection = trimToTokenBudget(fewShotSection, fewShotBudget)
  }

  // 캐시 키: 시스템 프롬프트는 페르소나별로 고정 → 캐시 가능
  const cacheKey = `system:${hashString(systemPromptBase)}`

  return {
    systemPrompt: systemPromptBase,
    ragSection: finalRagSection,
    fewShotSection: finalFewShotSection,
    totalTokenEstimate: estimateTokenCount(
      systemPromptBase + finalRagSection + finalFewShotSection
    ),
    cacheable: systemTokens >= 1024, // Anthropic cache_control 최소 1,024 tok
    cacheKey,
  }
}

// ── Tier Router → Generation Pipeline Integration ─────────────

/**
 * Tier 라우터와 생성 파이프라인을 통합하기 위한 설정.
 */
export interface TierPipelineIntegration {
  readonly routingConfig: TierRoutingConfig
  readonly pipelineConfig: LLMPipelineConfig
  readonly promptCacheStore: PromptCacheStore
}

export interface PipelineExecutionPlan {
  readonly tier: ModelTier
  readonly modelConfig: ModelConfig
  readonly prompt: IntegratedPrompt
  readonly estimatedCost: CostEstimate
  readonly cacheHit: boolean
  readonly routingExplanation: TierRoutingExplanation
}

/**
 * Tier 라우터와 생성 파이프라인을 통합하여 실행 계획을 수립한다.
 */
export function integrateTierWithPipeline(
  integration: TierPipelineIntegration,
  routingInput: TierRoutingInput,
  prompt: IntegratedPrompt
): PipelineExecutionPlan {
  // 1. Tier 결정
  const routingExplanation = explainRouting(routingInput, integration.routingConfig)
  const tier = routingExplanation.selectedTier
  const modelConfig = integration.pipelineConfig.models[tier]

  // 2. 캐시 확인
  const { prompt: cachedPrompt } = getCachedPrompt(integration.promptCacheStore, prompt.cacheKey)
  const cacheHit = cachedPrompt !== null

  // 3. 비용 추정
  const estimatedInputTokens = prompt.totalTokenEstimate
  const estimatedOutputTokens = modelConfig.maxTokens // 최대치로 추정
  const estimatedCost = estimateRequestCost(
    tier,
    estimatedInputTokens,
    estimatedOutputTokens,
    cacheHit
  )

  return {
    tier,
    modelConfig,
    prompt,
    estimatedCost,
    cacheHit,
    routingExplanation,
  }
}

/**
 * 파이프라인 실행 결과를 품질 피드백 루프에 연결한다.
 */
export interface PipelineExecutionResult {
  readonly plan: PipelineExecutionPlan
  readonly response: LLMResponse
  readonly qualityMetrics: QualityMetrics | null // 샘플링 대상일 때만
}

/**
 * 실행 결과를 기반으로 Few-shot 수집 여부를 판단한다.
 */
export function shouldCollectFewShot(
  result: PipelineExecutionResult,
  thresholds: { minParadoxScore: number; minVoiceScore: number } = {
    minParadoxScore: 0.8,
    minVoiceScore: 0.7,
  }
): boolean {
  if (!result.qualityMetrics) return false

  return (
    result.qualityMetrics.paradoxExpression.score >= thresholds.minParadoxScore &&
    result.qualityMetrics.voiceConsistency.score >= thresholds.minVoiceScore
  )
}

/**
 * 실행 결과를 기반으로 품질 샘플링 대상인지 판단한다.
 *
 * 샘플링 전략:
 * - Heavy tier 호출 → 항상 품질 측정 (비용이 높으므로 품질 보장 필요)
 * - Light tier 호출 → 10% 확률로 품질 측정
 */
export function shouldSampleForQuality(tier: ModelTier, samplingRate: number = 0.1): boolean {
  if (tier === "tier1_heavy") return true
  return Math.random() < samplingRate
}
