// ═══════════════════════════════════════════════════════════════
// RapportScore — 관계 친밀도 품질 지표
// T181: 데이터 축적 → 자동 활성화 구조
//
// 공식: RapportScore = w1×lexicalAlignment + w2×balanceScore + w3×warmth
// 3요소 합성으로 관계 품질을 다차원으로 측정.
//
// - lexicalAlignment: 두 페르소나 간 어휘 유사도 (trigram 교집합/합집합)
// - balanceScore: 대화 균형 (발화량 비율 대칭성)
// - warmth: 기존 관계 온도 (RelationshipScore.warmth)
//
// 활성화 조건: minInteractions >= 5 (대화 데이터 최소 기준)
// LLM 비용 0, 순수 통계 기반.
// ═══════════════════════════════════════════════════════════════

// ── 타입 ─────────────────────────────────────────────────────

export interface RapportInput {
  /** 페르소나 A의 최근 발화 목록 */
  utterancesA: string[]
  /** 페르소나 B의 최근 발화 목록 */
  utterancesB: string[]
  /** 기존 관계 warmth (0.0~1.0) */
  warmth: number
}

export interface RapportResult {
  /** 라포 점수 (0.0~1.0) */
  score: number
  /** 어휘 유사도 (0.0~1.0) */
  lexicalAlignment: number
  /** 대화 균형 (0.0~1.0, 1.0이 완전 균형) */
  balanceScore: number
  /** warmth 입력값 (0.0~1.0) */
  warmth: number
  /** 활성 여부 (충분한 데이터가 있는지) */
  isActive: boolean
}

// ── 가중치 ──────────────────────────────────────────────────

/** 어휘 유사도 가중치 */
export const W_LEXICAL_ALIGNMENT = 0.35

/** 대화 균형 가중치 */
export const W_BALANCE_SCORE = 0.3

/** warmth 가중치 */
export const W_WARMTH = 0.35

/** 최소 인터랙션 수 (활성화 기준) */
export const MIN_INTERACTIONS = 5

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * RapportScore 계산.
 *
 * 3요소 가중합으로 관계 품질 측정:
 * - lexicalAlignment: 대화 어휘 수렴도 (trigram 기반)
 * - balanceScore: 발화량 대칭성
 * - warmth: 기존 관계 온도
 */
export function computeRapportScore(input: RapportInput): RapportResult {
  const hasEnoughData =
    input.utterancesA.length >= MIN_INTERACTIONS && input.utterancesB.length >= MIN_INTERACTIONS

  const lexicalAlignment = computeLexicalAlignment(input.utterancesA, input.utterancesB)

  const balanceScore = computeBalanceScore(input.utterancesA, input.utterancesB)

  const warmth = clamp(input.warmth, 0, 1)

  const score = round(
    W_LEXICAL_ALIGNMENT * lexicalAlignment + W_BALANCE_SCORE * balanceScore + W_WARMTH * warmth
  )

  return {
    score,
    lexicalAlignment: round(lexicalAlignment),
    balanceScore: round(balanceScore),
    warmth: round(warmth),
    isActive: hasEnoughData,
  }
}

// ── 구성 요소 계산 ──────────────────────────────────────────

/**
 * 어휘 유사도 (Lexical Alignment).
 *
 * 두 페르소나의 발화에서 trigram을 추출하고
 * Jaccard 유사도로 어휘 수렴도를 측정.
 *
 * 높을수록 비슷한 어휘 패턴을 사용 → 라포 형성 지표.
 */
export function computeLexicalAlignment(utterancesA: string[], utterancesB: string[]): number {
  if (utterancesA.length === 0 || utterancesB.length === 0) return 0

  const trigramsA = extractTrigramsFromUtterances(utterancesA)
  const trigramsB = extractTrigramsFromUtterances(utterancesB)

  if (trigramsA.size === 0 || trigramsB.size === 0) return 0

  return jaccardSimilarity(trigramsA, trigramsB)
}

/**
 * 대화 균형 (Balance Score).
 *
 * 두 페르소나의 평균 발화 길이 비율로 대칭성 측정.
 * 1.0 = 완전 균형, 0.0 = 한쪽만 발화.
 *
 * 공식: 1 - |avgLenA - avgLenB| / max(avgLenA, avgLenB)
 */
export function computeBalanceScore(utterancesA: string[], utterancesB: string[]): number {
  if (utterancesA.length === 0 && utterancesB.length === 0) return 1.0
  if (utterancesA.length === 0 || utterancesB.length === 0) return 0

  const avgLenA = averageLength(utterancesA)
  const avgLenB = averageLength(utterancesB)

  const maxLen = Math.max(avgLenA, avgLenB)
  if (maxLen === 0) return 1.0

  return 1 - Math.abs(avgLenA - avgLenB) / maxLen
}

// ── 유틸리티 ────────────────────────────────────────────────

/** 발화 목록에서 trigram 집합 추출 */
function extractTrigramsFromUtterances(utterances: string[]): Set<string> {
  const trigrams = new Set<string>()
  for (const text of utterances) {
    const cleaned = text.replace(/[\s\p{P}]/gu, "").toLowerCase()
    for (let i = 0; i <= cleaned.length - 3; i++) {
      trigrams.add(cleaned.slice(i, i + 3))
    }
  }
  return trigrams
}

/** Jaccard 유사도 = |A ∩ B| / |A ∪ B| */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection++
  }
  const union = a.size + b.size - intersection
  if (union === 0) return 0
  return intersection / union
}

/** 문자열 배열의 평균 길이 */
function averageLength(texts: string[]): number {
  if (texts.length === 0) return 0
  const total = texts.reduce((sum, t) => sum + t.length, 0)
  return total / texts.length
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000
}
