// ═══════════════════════════════════════════════════════════════
// Prompt Tester
// T53-AC3: 프롬프트 품질 평가, 일관성 분석, 금지어 검사
// 스펙 §3.3.3: NLP 자동 평가, 일관성 점수
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface PromptTestInput {
  prompt: string
  contentTitle: string
  contentGenre: string
  contentDescription: string
}

export interface PromptTestResult {
  toneAnalysis: ToneAnalysis
  structureScore: number // 0~100
  prohibitedWords: ProhibitedWordMatch[]
  consistencyScore: number // 0~100
  lengthAnalysis: LengthAnalysis
  overallScore: number // 0~100
}

export interface ToneAnalysis {
  logicScore: number // 0~1: 논리적 어조 비율
  emotionScore: number // 0~1: 감성적 어조 비율
  formalityScore: number // 0~1: 격식체 비율
  dominantTone: "logical" | "emotional" | "balanced"
}

export interface ProhibitedWordMatch {
  word: string
  category: "profanity" | "political" | "religious" | "misinformation"
  severity: "warning" | "error"
}

export interface LengthAnalysis {
  totalChars: number
  totalLines: number
  sectionCount: number
  averageLineLength: number
}

// ── 금지어 사전 ──────────────────────────────────────────────

const PROHIBITED_WORDS: Record<
  string,
  { category: ProhibitedWordMatch["category"]; severity: ProhibitedWordMatch["severity"] }
> = {
  // Profanity (경고)
  시발: { category: "profanity", severity: "error" },
  좆: { category: "profanity", severity: "error" },
  씹: { category: "profanity", severity: "error" },
  병신: { category: "profanity", severity: "error" },
  // Political bias (경고)
  좌파: { category: "political", severity: "warning" },
  우파: { category: "political", severity: "warning" },
  빨갱이: { category: "political", severity: "error" },
  수꼴: { category: "political", severity: "error" },
  // Religious bias (경고)
  사이비: { category: "religious", severity: "warning" },
  이단: { category: "religious", severity: "warning" },
}

// ── 논리/감성 키워드 ─────────────────────────────────────────

const LOGIC_KEYWORDS = [
  "분석",
  "논리",
  "구조",
  "체계",
  "데이터",
  "근거",
  "인과",
  "비교",
  "증거",
  "통계",
  "객관",
  "합리",
  "이유",
  "원인",
  "결과",
  "따라서",
  "그러므로",
  "왜냐하면",
]

const EMOTION_KEYWORDS = [
  "감동",
  "느낌",
  "감정",
  "마음",
  "사랑",
  "슬픔",
  "기쁨",
  "아름다",
  "울컥",
  "설레",
  "따뜻",
  "눈물",
  "행복",
  "감사",
  "그리움",
  "공감",
  "가슴",
]

const FORMAL_KEYWORDS = [
  "하십시오",
  "합니다",
  "입니다",
  "됩니다",
  "바랍니다",
  "드립니다",
  "있습니다",
  "않습니다",
  "이며",
  "으로서",
]

// ── 프롬프트 구조 분석 ──────────────────────────────────────

export function analyzeStructure(prompt: string): number {
  let score = 0

  // 섹션 헤더 존재 여부 (필수 섹션들)
  const requiredSections = ["역할 정의", "성향 가이드", "금지 사항"]
  const optionalSections = [
    "내면 기질",
    "서사적 동기",
    "행동 지침",
    "리뷰 작성",
    "포스트 작성",
    "댓글 작성",
    "대화 스타일",
  ]

  for (const section of requiredSections) {
    if (prompt.includes(section)) score += 15
  }
  for (const section of optionalSections) {
    if (prompt.includes(section)) score += 5
  }

  // 벡터 수치 포함 여부
  const numericPattern = /\(\d+\.\d{2}\)/g
  const numericMatches = prompt.match(numericPattern)
  if (numericMatches && numericMatches.length >= 7) {
    score += 10
  } else if (numericMatches && numericMatches.length >= 3) {
    score += 5
  }

  // 페르소나 이름 포함
  if (prompt.includes('"') && prompt.includes("입니다")) {
    score += 5
  }

  // 전문 분야 언급
  if (prompt.includes("전문 분야")) {
    score += 5
  }

  return Math.min(100, score)
}

// ── 톤 분석 ─────────────────────────────────────────────────

export function analyzeTone(text: string): ToneAnalysis {
  const lowerText = text.toLowerCase()

  let logicCount = 0
  for (const kw of LOGIC_KEYWORDS) {
    if (lowerText.includes(kw)) logicCount++
  }

  let emotionCount = 0
  for (const kw of EMOTION_KEYWORDS) {
    if (lowerText.includes(kw)) emotionCount++
  }

  let formalCount = 0
  for (const kw of FORMAL_KEYWORDS) {
    if (lowerText.includes(kw)) formalCount++
  }

  const total = logicCount + emotionCount || 1
  const logicScore = Math.round((logicCount / total) * 100) / 100
  const emotionScore = Math.round((emotionCount / total) * 100) / 100
  const formalityScore = Math.round(Math.min(1, formalCount / 5) * 100) / 100

  let dominantTone: ToneAnalysis["dominantTone"]
  if (logicScore > emotionScore + 0.2) {
    dominantTone = "logical"
  } else if (emotionScore > logicScore + 0.2) {
    dominantTone = "emotional"
  } else {
    dominantTone = "balanced"
  }

  return { logicScore, emotionScore, formalityScore, dominantTone }
}

// ── 금지어 검사 ─────────────────────────────────────────────

export function checkProhibitedWords(text: string): ProhibitedWordMatch[] {
  const matches: ProhibitedWordMatch[] = []

  for (const [word, meta] of Object.entries(PROHIBITED_WORDS)) {
    if (text.includes(word)) {
      matches.push({
        word,
        category: meta.category,
        severity: meta.severity,
      })
    }
  }

  return matches
}

// ── 길이 분석 ───────────────────────────────────────────────

export function analyzeLength(prompt: string): LengthAnalysis {
  const lines = prompt.split("\n")
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0)
  const sectionHeaders = lines.filter((l) => /^\[.+\]$/.test(l.trim()))

  return {
    totalChars: prompt.length,
    totalLines: nonEmptyLines.length,
    sectionCount: sectionHeaders.length,
    averageLineLength:
      nonEmptyLines.length > 0
        ? Math.round(nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / nonEmptyLines.length)
        : 0,
  }
}

// ── L1 벡터 vs 프롬프트 일관성 ──────────────────────────────

export function checkVectorConsistency(prompt: string, l1: SocialPersonaVector): number {
  let score = 100
  const penalties: number[] = []

  // depth: 높으면 "심층" "분석" 키워드 있어야
  if (l1.depth > 0.65 && !prompt.includes("심층") && !prompt.includes("분석")) {
    penalties.push(10)
  }
  if (l1.depth < 0.35 && !prompt.includes("직관") && !prompt.includes("가벼운")) {
    penalties.push(10)
  }

  // lens: 높으면 "논리" 있어야
  if (l1.lens > 0.65 && !prompt.includes("논리")) {
    penalties.push(10)
  }
  if (l1.lens < 0.35 && !prompt.includes("감성")) {
    penalties.push(10)
  }

  // stance: 높으면 "비판" 있어야
  if (l1.stance > 0.65 && !prompt.includes("비판")) {
    penalties.push(10)
  }
  if (l1.stance < 0.35 && !prompt.includes("수용") && !prompt.includes("따뜻")) {
    penalties.push(10)
  }

  // sociability: 높으면 "사교" 있어야
  if (l1.sociability > 0.65 && !prompt.includes("사교")) {
    penalties.push(10)
  }
  if (l1.sociability < 0.35 && !prompt.includes("독립") && !prompt.includes("내향")) {
    penalties.push(10)
  }

  // 수치 일관성: L1 값이 프롬프트에 포함되어야
  const vectorValues = [
    l1.depth,
    l1.lens,
    l1.stance,
    l1.scope,
    l1.taste,
    l1.purpose,
    l1.sociability,
  ]
  let foundCount = 0
  for (const val of vectorValues) {
    if (prompt.includes(val.toFixed(2))) foundCount++
  }
  if (foundCount < 5) {
    penalties.push((7 - foundCount) * 3)
  }

  for (const p of penalties) {
    score -= p
  }

  return Math.max(0, Math.min(100, score))
}

// ── 종합 프롬프트 테스트 실행 ───────────────────────────────

export function testPrompt(prompt: string, l1?: SocialPersonaVector): PromptTestResult {
  const toneAnalysis = analyzeTone(prompt)
  const structureScore = analyzeStructure(prompt)
  const prohibitedWords = checkProhibitedWords(prompt)
  const lengthAnalysis = analyzeLength(prompt)

  // 벡터 일관성 (l1 제공 시)
  const consistencyScore = l1 ? checkVectorConsistency(prompt, l1) : 80

  // 금지어 패널티
  const prohibitedPenalty = prohibitedWords.reduce(
    (sum, pw) => sum + (pw.severity === "error" ? 20 : 5),
    0
  )

  // 종합 점수
  const overallScore = Math.max(
    0,
    Math.round(structureScore * 0.3 + consistencyScore * 0.4 + (100 - prohibitedPenalty) * 0.3)
  )

  return {
    toneAnalysis,
    structureScore,
    prohibitedWords,
    consistencyScore,
    lengthAnalysis,
    overallScore,
  }
}
