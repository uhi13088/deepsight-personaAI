// ═══════════════════════════════════════════════════════════════
// Shared utility functions for RAG + LLM modules
// ═══════════════════════════════════════════════════════════════

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function countOccurrences(text: string, search: string): number {
  if (search.length === 0) return 0
  let count = 0
  let pos = 0
  while (true) {
    pos = text.indexOf(search, pos)
    if (pos === -1) break
    count++
    pos += search.length
  }
  return count
}

export function safeAvg(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * 토큰 수 추정 (한국어 기준: 1글자 ≈ 1.5 토큰, 영어 기준: 1단어 ≈ 1.3 토큰).
 * 정확하지 않지만 비용/예산 추정에 충분한 근사치.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0
  // 한국어/CJK 문자 개수
  const cjkCount = (text.match(/[\u3000-\u9fff\uac00-\ud7af]/g) ?? []).length
  // 영문 단어 개수
  const englishWords = text
    .replace(/[\u3000-\u9fff\uac00-\ud7af]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  return Math.ceil(cjkCount * 1.5 + englishWords * 1.3)
}

export function trimToTokenBudget(text: string, maxTokens: number): string {
  const currentTokens = estimateTokenCount(text)
  if (currentTokens <= maxTokens) return text

  // 비율 기반 트리밍
  const ratio = maxTokens / currentTokens
  const targetLength = Math.floor(text.length * ratio * 0.9) // 10% 여유
  return text.slice(0, targetLength) + "\n[... 토큰 예산으로 인해 축약됨]"
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return "방금 전"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  return `${Math.floor(seconds / 86400)}일 전`
}

export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
