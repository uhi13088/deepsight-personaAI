/**
 * 3-Layer 벡터 기본축(L1 7 + L2 5 + L3 4) 컬러 설정
 * Cross-Axis 83축 포함 정량 99D, 전체 시스템 106D+
 * engine-studio dimension-colors.ts와 동기화
 */

export interface TraitDimensionColor {
  /** 차트/지문에서 사용하는 대표색 */
  primary: string
  /** 게이지 그라디언트 시작색 (low 쪽) */
  from: string
  /** 게이지 그라디언트 종료색 (high 쪽) */
  to: string
}

export interface TraitDimensionConfig {
  key: string
  layer: "L1" | "L2" | "L3"
  name: string
  label: string
  low: string
  high: string
  description: string
  color: TraitDimensionColor
}

// ── Layer 1: Social Persona (7D) — Blue/Cool 계열 ────────
export const L1_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "depth",
    layer: "L1",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하는지",
    color: { primary: "#3B82F6", from: "#BFDBFE", to: "#1E3A8A" },
  },
  {
    key: "lens",
    layer: "L1",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 판단 성향",
    color: { primary: "#10B981", from: "#FDA4AF", to: "#059669" },
  },
  {
    key: "stance",
    layer: "L1",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "콘텐츠에 대한 수용/비판 정도",
    color: { primary: "#F59E0B", from: "#BBF7D0", to: "#EF4444" },
  },
  {
    key: "scope",
    layer: "L1",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 요약 vs 세부 사항 관심도",
    color: { primary: "#EF4444", from: "#FEF08A", to: "#7C3AED" },
  },
  {
    key: "taste",
    layer: "L1",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 작품 vs 실험적 작품 선호",
    color: { primary: "#8B5CF6", from: "#FDE68A", to: "#D946EF" },
  },
  {
    key: "purpose",
    layer: "L1",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미 추구",
    description: "가벼운 오락 vs 의미 추구",
    color: { primary: "#EC4899", from: "#FED7AA", to: "#4338CA" },
  },
  {
    key: "sociability",
    layer: "L1",
    name: "Sociability",
    label: "사교성",
    low: "독립적",
    high: "사교적",
    description: "혼자 vs 함께 콘텐츠 소비",
    color: { primary: "#6366F1", from: "#E0E7FF", to: "#4F46E5" },
  },
]

// ── Layer 2: Core Temperament / OCEAN (5D) — Warm 계열 ───
export const L2_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "openness",
    layer: "L2",
    name: "Openness",
    label: "개방성",
    low: "보수적",
    high: "개방적",
    description: "새로운 경험에 대한 수용도",
    color: { primary: "#F97316", from: "#FED7AA", to: "#C2410C" },
  },
  {
    key: "conscientiousness",
    layer: "L2",
    name: "Conscientiousness",
    label: "성실성",
    low: "즉흥적",
    high: "원칙적",
    description: "계획적/체계적 성향",
    color: { primary: "#EAB308", from: "#FEF9C3", to: "#A16207" },
  },
  {
    key: "extraversion",
    layer: "L2",
    name: "Extraversion",
    label: "외향성",
    low: "내향적",
    high: "외향적",
    description: "사회적 상호작용 에너지",
    color: { primary: "#F43F5E", from: "#FECDD3", to: "#BE123C" },
  },
  {
    key: "agreeableness",
    layer: "L2",
    name: "Agreeableness",
    label: "친화성",
    low: "경쟁적",
    high: "협조적",
    description: "타인과의 조화 성향",
    color: { primary: "#FB923C", from: "#FFEDD5", to: "#EA580C" },
  },
  {
    key: "neuroticism",
    layer: "L2",
    name: "Neuroticism",
    label: "신경성",
    low: "안정",
    high: "불안정",
    description: "감정적 안정도",
    color: { primary: "#D97706", from: "#FDE68A", to: "#92400E" },
  },
]

// ── Layer 3: Narrative Drive (4D) — Deep Purple 계열 ─────
export const L3_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "lack",
    layer: "L3",
    name: "Lack",
    label: "결핍감",
    low: "충족",
    high: "결핍",
    description: "내면의 결핍/욕망 강도",
    color: { primary: "#7C3AED", from: "#EDE9FE", to: "#4C1D95" },
  },
  {
    key: "moralCompass",
    layer: "L3",
    name: "Moral Compass",
    label: "도덕 기준",
    low: "유연",
    high: "엄격",
    description: "도덕적 판단의 엄격도",
    color: { primary: "#6D28D9", from: "#DDD6FE", to: "#3B0764" },
  },
  {
    key: "volatility",
    layer: "L3",
    name: "Volatility",
    label: "변동성",
    low: "안정",
    high: "폭발적",
    description: "감정 변동의 폭",
    color: { primary: "#A855F7", from: "#F3E8FF", to: "#7E22CE" },
  },
  {
    key: "growthArc",
    layer: "L3",
    name: "Growth Arc",
    label: "성장 곡선",
    low: "정체",
    high: "성장",
    description: "변화/성장 욕구",
    color: { primary: "#9333EA", from: "#E9D5FF", to: "#581C87" },
  },
]

// ── 기본축 통합 (L1 7 + L2 5 + L3 4) ─────────────────────
export const ALL_DIMENSIONS: TraitDimensionConfig[] = [
  ...L1_DIMENSIONS,
  ...L2_DIMENSIONS,
  ...L3_DIMENSIONS,
]

// ── 레이어별 색상 ────────────────────────────────────────
export const LAYER_COLORS = {
  L1: { primary: "#3B82F6", bg: "#EFF6FF", border: "#93C5FD", label: "사회적 가면" },
  L2: { primary: "#F59E0B", bg: "#FFFBEB", border: "#FCD34D", label: "본원적 기질" },
  L3: { primary: "#8B5CF6", bg: "#F5F3FF", border: "#C4B5FD", label: "서사적 욕망" },
} as const

// ── 유틸리티 ─────────────────────────────────────────────

/** 차원 key로 config 조회 */
export function getTraitDimension(key: string): TraitDimensionConfig | undefined {
  return ALL_DIMENSIONS.find((d) => d.key === key)
}

/** 레이어별 차원 목록 조회 */
export function getDimensionsByLayer(layer: "L1" | "L2" | "L3"): TraitDimensionConfig[] {
  switch (layer) {
    case "L1":
      return L1_DIMENSIONS
    case "L2":
      return L2_DIMENSIONS
    case "L3":
      return L3_DIMENSIONS
  }
}

/** 3-Layer 벡터에서 레이어별 값 추출 */
export function getLayerValues(
  vector: {
    social: Record<string, number>
    temperament: Record<string, number>
    narrative: Record<string, number>
  },
  layer: "L1" | "L2" | "L3"
): Record<string, number> {
  switch (layer) {
    case "L1":
      return vector.social
    case "L2":
      return vector.temperament
    case "L3":
      return vector.narrative
  }
}

/** 벡터 데이터에서 차원 config와 값을 매핑 (레이어 단위) */
export function mapLayerToTraits(
  data: Record<string, number>,
  layer: "L1" | "L2" | "L3"
): Array<TraitDimensionConfig & { value: number }> {
  return getDimensionsByLayer(layer)
    .filter((d) => d.key in data)
    .map((d) => ({
      ...d,
      value: data[d.key],
    }))
}
