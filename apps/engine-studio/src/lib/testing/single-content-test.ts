// ═══════════════════════════════════════════════════════════════
// 단일 콘텐츠 테스트
// T55-AC1: 입력 콘텐츠 → 페르소나 응답 평가
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ContentTestInput {
  contentTitle: string
  contentGenre: string
  contentDescription: string
}

export interface ToneAnalysis {
  logicScore: number // 0~1
  emotionScore: number // 0~1
  formalityScore: number // 0~1
  dominantTone: "logical" | "emotional" | "balanced"
}

export interface ProhibitedWordMatch {
  word: string
  category: string
}

export interface ContentTestEvaluation {
  toneAnalysis: ToneAnalysis
  vectorAlignment: number // 0~100
  prohibitedWordMatches: ProhibitedWordMatch[]
  lengthScore: number // 0~100
  overallQuality: number // 0~100
}

export interface SingleContentTestResult {
  contentInput: ContentTestInput
  response: string
  evaluation: ContentTestEvaluation
  timestamp: number
}

// ── 키워드 사전 ─────────────────────────────────────────────────

const LOGIC_KEYWORDS = [
  "분석",
  "구조",
  "체계",
  "논리",
  "근거",
  "데이터",
  "비교",
  "검토",
  "기준",
  "평가",
  "객관",
  "합리",
  "인과",
  "결론",
  "증거",
  "방법론",
  "원리",
  "맥락",
]

const EMOTION_KEYWORDS = [
  "감동",
  "아름다운",
  "울컥",
  "가슴",
  "느낌",
  "감정",
  "마음",
  "행복",
  "슬픈",
  "설레",
  "따뜻",
  "사랑",
  "그리운",
  "벅찬",
  "눈물",
  "감탄",
  "공감",
]

const FORMAL_KEYWORDS = [
  "~습니다",
  "~합니다",
  "~입니다",
  "~됩니다",
  "~겠습니다",
  "고찰",
  "견해",
  "사료",
  "판단",
  "관점",
]

const PROHIBITED_WORDS: { word: string; category: string }[] = [
  { word: "시발", category: "profanity" },
  { word: "씨발", category: "profanity" },
  { word: "지랄", category: "profanity" },
  { word: "병신", category: "profanity" },
  { word: "좆", category: "profanity" },
  { word: "정치적", category: "political" },
  { word: "종교적", category: "religious" },
]

// ── 톤 분석 ─────────────────────────────────────────────────────

export function analyzeTone(text: string): ToneAnalysis {
  const lower = text.toLowerCase()

  const logicCount = LOGIC_KEYWORDS.filter((k) => lower.includes(k)).length
  const emotionCount = EMOTION_KEYWORDS.filter((k) => lower.includes(k)).length
  const formalCount = FORMAL_KEYWORDS.filter((k) => lower.includes(k)).length

  const totalKeywords = Math.max(logicCount + emotionCount, 1)
  const logicScore = round(logicCount / totalKeywords)
  const emotionScore = round(emotionCount / totalKeywords)
  const formalityScore = round(Math.min(formalCount / 3, 1))

  let dominantTone: ToneAnalysis["dominantTone"]
  if (logicScore > emotionScore + 0.2) dominantTone = "logical"
  else if (emotionScore > logicScore + 0.2) dominantTone = "emotional"
  else dominantTone = "balanced"

  return { logicScore, emotionScore, formalityScore, dominantTone }
}

// ── 금지어 검사 ─────────────────────────────────────────────────

export function checkProhibitedWords(text: string): ProhibitedWordMatch[] {
  const lower = text.toLowerCase()
  return PROHIBITED_WORDS.filter((pw) => lower.includes(pw.word))
}

// ── 벡터 정합성 ─────────────────────────────────────────────────

export function evaluateVectorAlignment(response: string, l1: SocialPersonaVector): number {
  const lower = response.toLowerCase()
  let score = 50 // 기본 점수

  // depth: 심층적 응답이면 depth와 일치해야
  const deepSignals = ["분석", "구조", "심층", "층위", "맥락"]
  const deepCount = deepSignals.filter((s) => lower.includes(s)).length
  const depthInferred = deepCount > 0 ? Math.min(deepCount * 0.2 + 0.3, 1) : 0.3
  score += (1 - Math.abs(l1.depth - depthInferred)) * 10

  // lens: 논리/감성 비중
  const tone = analyzeTone(response)
  const lensInferred =
    tone.logicScore > tone.emotionScore ? 0.7 : tone.emotionScore > tone.logicScore ? 0.3 : 0.5
  score += (1 - Math.abs(l1.lens - lensInferred)) * 10

  // stance: 비판적 시그널
  const criticalSignals = ["비판", "문제", "지적", "아쉬운", "부족"]
  const criticalCount = criticalSignals.filter((s) => lower.includes(s)).length
  const stanceInferred = Math.min(criticalCount * 0.2 + 0.2, 1)
  score += (1 - Math.abs(l1.stance - stanceInferred)) * 10

  // scope: 길이와 디테일
  const scopeInferred = response.length > 300 ? 0.8 : response.length > 150 ? 0.5 : 0.3
  score += (1 - Math.abs(l1.scope - scopeInferred)) * 10

  // sociability: 소통 시그널
  const socialSignals = ["같이", "함께", "우리", "공유", "토론"]
  const socialCount = socialSignals.filter((s) => lower.includes(s)).length
  const socInferred = Math.min(socialCount * 0.2 + 0.2, 1)
  score += (1 - Math.abs(l1.sociability - socInferred)) * 10

  return Math.round(Math.min(100, Math.max(0, score)))
}

// ── 길이 점수 ───────────────────────────────────────────────────

export function evaluateLengthScore(response: string): number {
  const len = response.trim().length
  // 이상적 범위: 200~500자
  if (len >= 200 && len <= 500) return 100
  if (len >= 100 && len < 200) return 70
  if (len > 500 && len <= 800) return 80
  if (len >= 50 && len < 100) return 40
  if (len > 800) return 60
  return 20
}

// ── 종합 평가 ───────────────────────────────────────────────────

export function evaluateResponse(response: string, l1: SocialPersonaVector): ContentTestEvaluation {
  const toneAnalysis = analyzeTone(response)
  const prohibitedWordMatches = checkProhibitedWords(response)
  const vectorAlignment = evaluateVectorAlignment(response, l1)
  const lengthScore = evaluateLengthScore(response)

  // 종합: vectorAlignment(40%) + lengthScore(20%) + tone적합(20%) + 금지어(20%)
  const prohibitedPenalty = prohibitedWordMatches.length > 0 ? 0 : 100
  const overallQuality = Math.round(
    vectorAlignment * 0.4 +
      lengthScore * 0.2 +
      50 * 0.2 + // tone 기본점
      prohibitedPenalty * 0.2
  )

  return {
    toneAnalysis,
    vectorAlignment,
    prohibitedWordMatches,
    lengthScore,
    overallQuality,
  }
}

// ── 테스트 실행 (응답은 외부에서 제공) ──────────────────────────

export function createSingleTestResult(
  input: ContentTestInput,
  response: string,
  l1: SocialPersonaVector
): SingleContentTestResult {
  return {
    contentInput: input,
    response,
    evaluation: evaluateResponse(response, l1),
    timestamp: Date.now(),
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
