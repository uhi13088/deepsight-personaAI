// ═══════════════════════════════════════════════════════════════
// 콘텐츠 평가 시스템
// T58-AC3: 리뷰 스타일 12종, 페르소나→스타일 매핑, 2단계 생성
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export type ReviewStyleId =
  | "S01"
  | "S02"
  | "S03"
  | "S04"
  | "S05"
  | "S06"
  | "S07"
  | "S08"
  | "S09"
  | "S10"
  | "S11"
  | "S12"

export interface ReviewStyle {
  id: ReviewStyleId
  name: string
  nameEn: string
  combination: string // 조합 설명
  characteristics: string
  exampleTone: string
}

export interface StyleReviewEntry {
  styleId: ReviewStyleId
  contentId: string
  review: string
  generatedAt: number
  source: "llm" | "cache"
}

export interface PersonaReview {
  personaId: string
  contentId: string
  styleId: ReviewStyleId
  baseReview: string // 스타일 리뷰
  finalReview: string // 말투 변환 후
  generationMethod: "cache_hit" | "llm_generated" | "private_direct"
  estimatedCost: number
}

export type PersonaVisibility = "public" | "private"

export interface ReviewGenerationConfig {
  visibility: PersonaVisibility
  enableToneTransform: boolean
  toneTransformMethod: "template" | "llm"
}

export interface CacheStats {
  totalEntries: number
  hitRate: number // 0~1
  esTimatedMonthlyCost: number
}

// ── 12종 리뷰 스타일 정의 ───────────────────────────────────

export const REVIEW_STYLES: ReviewStyle[] = [
  {
    id: "S01",
    name: "시네필 비평가",
    nameEn: "Cinephile Critic",
    combination: "D↑ Le↑ St↑",
    characteristics: "심층+논리+비판",
    exampleTone: "서사 구조의 결함을 분석하면...",
  },
  {
    id: "S02",
    name: "친절한 해설자",
    nameEn: "Friendly Commentator",
    combination: "D↑ Le↑ St↓",
    characteristics: "심층+논리+수용",
    exampleTone: "이 장면의 의미를 설명하자면...",
  },
  {
    id: "S03",
    name: "예민한 감상가",
    nameEn: "Sensitive Reviewer",
    combination: "D↑ Le↓ St↑",
    characteristics: "심층+감성+비판",
    exampleTone: "감정선이 어딘가 어긋나는데...",
  },
  {
    id: "S04",
    name: "공감형 에세이스트",
    nameEn: "Empathetic Essayist",
    combination: "D↑ Le↓ St↓",
    characteristics: "심층+감성+수용",
    exampleTone: "이 장면에서 느낀 감정의 결...",
  },
  {
    id: "S05",
    name: "날카로운 한줄평",
    nameEn: "Sharp One-Liner",
    combination: "D↓ Le↑ St↑",
    characteristics: "직관+논리+비판",
    exampleTone: "한 마디로, 연출력 부족.",
  },
  {
    id: "S06",
    name: "담백한 정리러",
    nameEn: "Concise Summarizer",
    combination: "D↓ Le↑ St↓",
    characteristics: "직관+논리+수용",
    exampleTone: "괜찮은 작품. 볼만함.",
  },
  {
    id: "S07",
    name: "솔직한 독설러",
    nameEn: "Brutally Honest",
    combination: "D↓ Le↓ St↑",
    characteristics: "직관+감성+비판",
    exampleTone: "솔직히 좀 별로였어ㅠ",
  },
  {
    id: "S08",
    name: "힐링 한줄평",
    nameEn: "Healing Liner",
    combination: "D↓ Le↓ St↓",
    characteristics: "직관+감성+수용",
    exampleTone: "마음이 따뜻해지는 영화",
  },
  {
    id: "S09",
    name: "트렌드 헌터",
    nameEn: "Trend Hunter",
    combination: "T↑ 특화",
    characteristics: "실험적 강조",
    exampleTone: "기존 문법을 파괴하는 시도!",
  },
  {
    id: "S10",
    name: "클래식 감정가",
    nameEn: "Classic Connoisseur",
    combination: "T↓ 특화",
    characteristics: "고전적 강조",
    exampleTone: "영화사적 맥락에서 보면...",
  },
  {
    id: "S11",
    name: "디테일 매니아",
    nameEn: "Detail Mania",
    combination: "Sc↑ 특화",
    characteristics: "세부사항 강조",
    exampleTone: "이 장면의 소품 하나하나가...",
  },
  {
    id: "S12",
    name: "핵심 요약러",
    nameEn: "TL;DR Master",
    combination: "Sc↓ 특화",
    characteristics: "요점 강조",
    exampleTone: "결론: 추천/비추천",
  },
]

// ── 페르소나 → 스타일 매핑 ───────────────────────────────────

export function mapPersonaToStyle(vector: SocialPersonaVector): ReviewStyleId {
  const { depth, lens, stance, taste, scope } = vector

  // 특화 스타일 먼저 체크 (극단값)
  if (taste >= 0.8) return "S09" // 트렌드 헌터
  if (taste <= 0.2) return "S10" // 클래식 감정가
  if (scope >= 0.8) return "S11" // 디테일 매니아
  if (scope <= 0.2) return "S12" // 핵심 요약러

  // 기본 8개 스타일 (3차원 이진화)
  const depthBit = depth >= 0.5 ? 1 : 0
  const lensBit = lens >= 0.5 ? 1 : 0
  const stanceBit = stance >= 0.5 ? 1 : 0

  // 이진수 → 스타일 번호 (111=S01, 110=S02, ..., 000=S08)
  const bits = (depthBit << 2) | (lensBit << 1) | stanceBit
  const styleMap: Record<number, ReviewStyleId> = {
    7: "S01", // 111: D↑ Le↑ St↑
    6: "S02", // 110: D↑ Le↑ St↓
    5: "S03", // 101: D↑ Le↓ St↑
    4: "S04", // 100: D↑ Le↓ St↓
    3: "S05", // 011: D↓ Le↑ St↑
    2: "S06", // 010: D↓ Le↑ St↓
    1: "S07", // 001: D↓ Le↓ St↑
    0: "S08", // 000: D↓ Le↓ St↓
  }

  return styleMap[bits] ?? "S08"
}

// ── 스타일 정보 조회 ─────────────────────────────────────────

export function getStyleInfo(styleId: ReviewStyleId): ReviewStyle | undefined {
  return REVIEW_STYLES.find((s) => s.id === styleId)
}

// ── 캐시 조회 (시뮬레이션) ───────────────────────────────────

export function lookupStyleReview(
  cache: StyleReviewEntry[],
  styleId: ReviewStyleId,
  contentId: string
): StyleReviewEntry | null {
  return cache.find((e) => e.styleId === styleId && e.contentId === contentId) ?? null
}

// ── 2단계 리뷰 생성 파이프라인 ───────────────────────────────

export function generateReviewPipeline(
  personaId: string,
  personaVector: SocialPersonaVector,
  contentId: string,
  cache: StyleReviewEntry[],
  config: ReviewGenerationConfig
): PersonaReview {
  // Private 페르소나: 스타일 시스템 bypass → 직접 생성
  if (config.visibility === "private") {
    return {
      personaId,
      contentId,
      styleId: mapPersonaToStyle(personaVector), // 참고용
      baseReview: "", // LLM 직접 생성 (외부에서 처리)
      finalReview: "",
      generationMethod: "private_direct",
      estimatedCost: 0.002,
    }
  }

  // 1) 스타일 매핑
  const styleId = mapPersonaToStyle(personaVector)

  // 2) 캐시 조회
  const cached = lookupStyleReview(cache, styleId, contentId)

  if (cached) {
    // 캐시 히트: 말투 변환만
    const transformCost = config.enableToneTransform
      ? config.toneTransformMethod === "llm"
        ? 0.0003
        : 0
      : 0

    return {
      personaId,
      contentId,
      styleId,
      baseReview: cached.review,
      finalReview: cached.review, // 실제로는 말투 변환 적용
      generationMethod: "cache_hit",
      estimatedCost: transformCost,
    }
  }

  // 캐시 미스: LLM 생성 필요
  return {
    personaId,
    contentId,
    styleId,
    baseReview: "", // LLM 생성 (외부에서 처리)
    finalReview: "",
    generationMethod: "llm_generated",
    estimatedCost:
      0.002 + (config.enableToneTransform && config.toneTransformMethod === "llm" ? 0.0003 : 0),
  }
}

// ── 비용 추정 ────────────────────────────────────────────────

export function estimateCost(
  totalContents: number,
  totalPersonas: number,
  cacheHitRate: number,
  publicRatio: number = 0.8
): { traditional: number; styleBased: number; savings: number } {
  const traditional = totalContents * totalPersonas * 0.002 // 페르소나별 전부 생성

  const publicCount = Math.round(totalPersonas * publicRatio)
  const privateCount = totalPersonas - publicCount

  // Public: 12 스타일 × 콘텐츠 (캐시 미스분만 생성)
  const styleReviewCost = totalContents * 12 * (1 - cacheHitRate) * 0.002
  // Public 말투 변환: 전체 Public 조합 × 0.0003
  const toneTransformCost = totalContents * publicCount * 0.0003
  // Private: 직접 생성
  const privateCost = totalContents * privateCount * 0.002

  const styleBased = round(styleReviewCost + toneTransformCost + privateCost)

  return {
    traditional: round(traditional),
    styleBased,
    savings: round(traditional - styleBased),
  }
}

// ── 캐시 통계 ────────────────────────────────────────────────

export function calculateCacheStats(
  cache: StyleReviewEntry[],
  totalLookups: number,
  cacheHits: number
): CacheStats {
  return {
    totalEntries: cache.length,
    hitRate: totalLookups > 0 ? round(cacheHits / totalLookups) : 0,
    esTimatedMonthlyCost: round(cache.length * 0.002), // 초기 생성 비용
  }
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
