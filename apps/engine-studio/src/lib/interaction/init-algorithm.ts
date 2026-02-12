// ═══════════════════════════════════════════════════════════════
// Init 알고리즘
// T73-AC1: LLM 키워드 추출 → 의미 카테고리 → 벡터 delta
// 첫 인터랙션 시 콘텐츠/컨텍스트 키워드로 L1 벡터 초기 조정
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types"

// ── 키워드 → 의미 카테고리 매핑 ───────────────────────────────

export type SemanticCategory =
  | "analytical"
  | "emotional"
  | "critical"
  | "social"
  | "creative"
  | "serious"
  | "casual"
  | "detailed"

const KEYWORD_CATEGORY_MAP: Record<string, SemanticCategory> = {
  // Analytical
  분석: "analytical",
  구조: "analytical",
  논리: "analytical",
  체계: "analytical",
  인과: "analytical",
  비교: "analytical",
  데이터: "analytical",
  // Emotional
  감동: "emotional",
  슬픔: "emotional",
  기쁨: "emotional",
  분노: "emotional",
  공감: "emotional",
  감정: "emotional",
  느낌: "emotional",
  // Critical
  비판: "critical",
  문제: "critical",
  아쉬움: "critical",
  실망: "critical",
  결함: "critical",
  부족: "critical",
  // Social
  토론: "social",
  소통: "social",
  공유: "social",
  커뮤니티: "social",
  대화: "social",
  반응: "social",
  // Creative
  실험: "creative",
  독특: "creative",
  창의: "creative",
  예술: "creative",
  인디: "creative",
  대안: "creative",
  // Serious
  의미: "serious",
  철학: "serious",
  깊이: "serious",
  주제: "serious",
  메시지: "serious",
  // Casual
  재미: "casual",
  오락: "casual",
  가볍: "casual",
  웃음: "casual",
  킬링타임: "casual",
  // Detailed
  디테일: "detailed",
  세밀: "detailed",
  꼼꼼: "detailed",
  세부: "detailed",
  묘사: "detailed",
}

// ── 카테고리 → L1 벡터 delta 매핑 ─────────────────────────────

const CATEGORY_DELTA_MAP: Record<SemanticCategory, Partial<Record<SocialDimension, number>>> = {
  analytical: { depth: 0.05, lens: 0.08 },
  emotional: { lens: -0.08, purpose: -0.03 },
  critical: { stance: 0.08, depth: 0.03 },
  social: { sociability: 0.1 },
  creative: { taste: 0.08, scope: 0.03 },
  serious: { purpose: 0.08, depth: 0.05 },
  casual: { purpose: -0.08, depth: -0.05 },
  detailed: { scope: 0.08, depth: 0.03 },
}

// ── 키워드 추출 (간이 NLP) ────────────────────────────────────

export function extractKeywords(text: string): string[] {
  const keywords = Object.keys(KEYWORD_CATEGORY_MAP)
  return keywords.filter((kw) => text.includes(kw))
}

// ── 키워드 → 카테고리 분류 ────────────────────────────────────

export function categorizeKeywords(keywords: string[]): SemanticCategory[] {
  const categories = new Set<SemanticCategory>()
  for (const kw of keywords) {
    const cat = KEYWORD_CATEGORY_MAP[kw]
    if (cat) categories.add(cat)
  }
  return [...categories]
}

// ── Init Delta 계산 ───────────────────────────────────────────

export interface InitResult {
  delta: Partial<SocialPersonaVector>
  adjustedVector: SocialPersonaVector
  extractedKeywords: string[]
  detectedCategories: SemanticCategory[]
}

export function calculateInitDelta(
  currentL1: SocialPersonaVector,
  contextText: string
): InitResult {
  const extractedKeywords = extractKeywords(contextText)
  const detectedCategories = categorizeKeywords(extractedKeywords)

  // 카테고리별 delta 합산
  const delta: Record<string, number> = {}
  for (const cat of detectedCategories) {
    const catDelta = CATEGORY_DELTA_MAP[cat]
    for (const [dim, val] of Object.entries(catDelta)) {
      delta[dim] = (delta[dim] ?? 0) + val
    }
  }

  // Apply delta to vector (clamp to [0, 1])
  const adjustedVector = { ...currentL1 }
  const l1Keys: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  for (const key of l1Keys) {
    if (delta[key]) {
      adjustedVector[key] = clamp(adjustedVector[key] + delta[key])
    }
  }

  return {
    delta: delta as Partial<SocialPersonaVector>,
    adjustedVector,
    extractedKeywords,
    detectedCategories,
  }
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}
