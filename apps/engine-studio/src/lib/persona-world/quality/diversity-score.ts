// ═══════════════════════════════════════════════════════════════
// DiversityScore — 콘텐츠 다양성 측정
// T179: "페르소나가 맨날 비슷한 말만 해요" 감지
//
// 최근 N개 포스트의 trigram 중복률을 계산하여
// 콘텐츠 다양성 지표를 제공.
// LLM 비용 0, 순수 통계 기반.
// ═══════════════════════════════════════════════════════════════

// ── 결과 타입 ─────────────────────────────────────────────────

export interface DiversityResult {
  /** 다양성 점수 (0.0 = 완전 반복, 1.0 = 완전 다양) */
  score: number
  /** 심각도 */
  severity: DiversitySeverity
  /** 자기반복률 (0.0~1.0) */
  selfRepetitionRate: number
  /** 고유 trigram 수 */
  uniqueTrigramCount: number
  /** 전체 trigram 수 */
  totalTrigramCount: number
  /** 가장 많이 반복된 trigram Top 5 */
  topRepeatedTrigrams: Array<{ trigram: string; count: number }>
}

export type DiversitySeverity = "DIVERSE" | "WARNING" | "CRITICAL"

// ── 임계값 ──────────────────────────────────────────────────

/** 다양성 경고 임계값 (score < 이 값이면 WARNING) */
export const DIVERSITY_WARNING_THRESHOLD = 0.6

/** 다양성 위험 임계값 (score < 이 값이면 CRITICAL) */
export const DIVERSITY_CRITICAL_THRESHOLD = 0.4

/** 분석에 사용할 기본 최근 포스트 수 */
export const DEFAULT_ANALYSIS_WINDOW = 20

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * 콘텐츠 목록의 다양성 점수를 계산.
 *
 * 공식: DiversityScore = 1 - selfRepetitionRate
 * selfRepetitionRate = 1 - (uniqueTrigrams / totalTrigrams)
 *
 * @param contents 분석할 콘텐츠 목록 (최근 포스트/댓글의 텍스트)
 */
export function measureDiversity(contents: string[]): DiversityResult {
  if (contents.length === 0) {
    return {
      score: 1.0,
      severity: "DIVERSE",
      selfRepetitionRate: 0,
      uniqueTrigramCount: 0,
      totalTrigramCount: 0,
      topRepeatedTrigrams: [],
    }
  }

  // 모든 콘텐츠에서 trigram 추출
  const allTrigrams: string[] = []
  for (const content of contents) {
    const trigrams = extractTrigrams(content)
    allTrigrams.push(...trigrams)
  }

  if (allTrigrams.length === 0) {
    return {
      score: 1.0,
      severity: "DIVERSE",
      selfRepetitionRate: 0,
      uniqueTrigramCount: 0,
      totalTrigramCount: 0,
      topRepeatedTrigrams: [],
    }
  }

  // trigram 빈도 집계
  const trigramCounts = new Map<string, number>()
  for (const trigram of allTrigrams) {
    trigramCounts.set(trigram, (trigramCounts.get(trigram) ?? 0) + 1)
  }

  const uniqueCount = trigramCounts.size
  const totalCount = allTrigrams.length

  // 자기반복률: 중복 비율
  const selfRepetitionRate = round(1 - uniqueCount / totalCount)
  const score = round(1 - selfRepetitionRate)

  // Top 5 반복 trigram
  const topRepeatedTrigrams = Array.from(trigramCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trigram, count]) => ({ trigram, count }))

  const severity = classifyDiversitySeverity(score)

  return {
    score,
    severity,
    selfRepetitionRate,
    uniqueTrigramCount: uniqueCount,
    totalTrigramCount: totalCount,
    topRepeatedTrigrams,
  }
}

/**
 * 다양성 심각도 판정.
 */
export function classifyDiversitySeverity(score: number): DiversitySeverity {
  if (score < DIVERSITY_CRITICAL_THRESHOLD) return "CRITICAL"
  if (score < DIVERSITY_WARNING_THRESHOLD) return "WARNING"
  return "DIVERSE"
}

/**
 * 다양성 요약 텍스트 생성 (품질 리포트용).
 */
export function summarizeDiversity(result: DiversityResult): string {
  if (result.severity === "DIVERSE") {
    return `콘텐츠 다양성 양호 (score=${result.score.toFixed(3)}, 고유 trigram ${result.uniqueTrigramCount}개)`
  }

  const topRepeat = result.topRepeatedTrigrams[0]
  const repeatInfo = topRepeat ? `, 최다 반복: "${topRepeat.trigram}" (${topRepeat.count}회)` : ""

  if (result.severity === "CRITICAL") {
    return `콘텐츠 다양성 위험 (score=${result.score.toFixed(3)}, 반복률 ${(result.selfRepetitionRate * 100).toFixed(1)}%${repeatInfo})`
  }

  return `콘텐츠 다양성 경고 (score=${result.score.toFixed(3)}, 반복률 ${(result.selfRepetitionRate * 100).toFixed(1)}%${repeatInfo})`
}

// ── Trigram 추출 ────────────────────────────────────────────

/**
 * 텍스트에서 trigram(3-글자 연속 시퀀스) 추출.
 *
 * 공백/구두점 제거 후 한글/영문 문자만 사용.
 * 한국어 특성상 character-level trigram이 더 효과적.
 */
export function extractTrigrams(text: string): string[] {
  // 공백, 구두점 제거하고 문자만 남김
  const cleaned = text.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()

  if (cleaned.length < 3) return []

  const trigrams: string[] = []
  for (let i = 0; i <= cleaned.length - 3; i++) {
    trigrams.push(cleaned.substring(i, i + 3))
  }

  return trigrams
}

// ── 유틸리티 ────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 1000) / 1000
}
