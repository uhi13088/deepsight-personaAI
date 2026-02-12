/**
 * v3 3-Layer 벡터 차원별 컬러 설정
 * L1 Social Persona (7D) + L2 Core Temperament/OCEAN (5D) + L3 Narrative Drive (4D)
 * engine-studio/src/constants/colors/ 기준 색상 참조
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
  name: string
  label: string
  low: string
  high: string
  description: string
  layer: "L1" | "L2" | "L3"
  color: TraitDimensionColor
}

// ---------------------------------------------------------------------------
// L1: Social Persona (7D) — 가면 (외부에 보이는 콘텐츠 소비 성향)
// ---------------------------------------------------------------------------
const L1_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "depth",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하는지",
    layer: "L1",
    color: { primary: "#3B82F6", from: "#BFDBFE", to: "#1E3A8A" },
  },
  {
    key: "lens",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 판단 성향",
    layer: "L1",
    color: { primary: "#10B981", from: "#A7F3D0", to: "#065F46" },
  },
  {
    key: "stance",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "콘텐츠에 대한 수용/비판 정도",
    layer: "L1",
    color: { primary: "#F59E0B", from: "#FDE68A", to: "#92400E" },
  },
  {
    key: "scope",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 요약 vs 세부 사항 관심도",
    layer: "L1",
    color: { primary: "#EF4444", from: "#FECACA", to: "#991B1B" },
  },
  {
    key: "taste",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 작품 vs 실험적 작품 선호",
    layer: "L1",
    color: { primary: "#8B5CF6", from: "#DDD6FE", to: "#5B21B6" },
  },
  {
    key: "purpose",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미 추구",
    description: "가벼운 오락 vs 의미 추구",
    layer: "L1",
    color: { primary: "#EC4899", from: "#FBCFE8", to: "#9D174D" },
  },
  {
    key: "sociability",
    name: "Sociability",
    label: "사회적 성향",
    low: "독립적",
    high: "사교적",
    description: "혼자 소비 vs 함께 나누기 선호",
    layer: "L1",
    color: { primary: "#6366F1", from: "#C7D2FE", to: "#3730A3" },
  },
]

// ---------------------------------------------------------------------------
// L2: Core Temperament / OCEAN (5D) — 본성 (심리학 Big Five 기반)
// ---------------------------------------------------------------------------
const L2_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "openness",
    name: "Openness",
    label: "개방성",
    low: "보수적",
    high: "개방적",
    description: "새로운 경험과 아이디어에 대한 수용도",
    layer: "L2",
    color: { primary: "#F97316", from: "#FED7AA", to: "#9A3412" },
  },
  {
    key: "conscientiousness",
    name: "Conscientiousness",
    label: "성실성",
    low: "유연한",
    high: "체계적",
    description: "계획성과 꼼꼼함의 정도",
    layer: "L2",
    color: { primary: "#EAB308", from: "#FEF08A", to: "#854D0E" },
  },
  {
    key: "extraversion",
    name: "Extraversion",
    label: "외향성",
    low: "내향적",
    high: "외향적",
    description: "에너지의 원천 (내부 vs 외부)",
    layer: "L2",
    color: { primary: "#F43F5E", from: "#FECDD3", to: "#9F1239" },
  },
  {
    key: "agreeableness",
    name: "Agreeableness",
    label: "친화성",
    low: "독립적",
    high: "협조적",
    description: "타인과의 조화를 추구하는 정도",
    layer: "L2",
    color: { primary: "#FB923C", from: "#FED7AA", to: "#C2410C" },
  },
  {
    key: "neuroticism",
    name: "Neuroticism",
    label: "신경성",
    low: "안정적",
    high: "민감한",
    description: "감정적 반응성과 불안 수준",
    layer: "L2",
    color: { primary: "#D97706", from: "#FDE68A", to: "#78350F" },
  },
]

// ---------------------------------------------------------------------------
// L3: Narrative Drive (4D) — 욕망 (캐릭터 아크 기반 내면 동력)
// ---------------------------------------------------------------------------
const L3_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "lack",
    name: "Lack",
    label: "결핍",
    low: "충족",
    high: "결핍",
    description: "내면의 결핍 — 행동의 원인",
    layer: "L3",
    color: { primary: "#7C3AED", from: "#DDD6FE", to: "#4C1D95" },
  },
  {
    key: "moralCompass",
    name: "Moral Compass",
    label: "도덕 나침반",
    low: "유연한",
    high: "엄격한",
    description: "판단의 기준 — 옳고 그름의 잣대",
    layer: "L3",
    color: { primary: "#6D28D9", from: "#C4B5FD", to: "#3B0764" },
  },
  {
    key: "volatility",
    name: "Volatility",
    label: "변동성",
    low: "안정적",
    high: "폭발적",
    description: "감정/행동의 불안정성",
    layer: "L3",
    color: { primary: "#A855F7", from: "#E9D5FF", to: "#6B21A8" },
  },
  {
    key: "growthArc",
    name: "Growth Arc",
    label: "성장 곡선",
    low: "정체",
    high: "변화",
    description: "변화의 방향성 (Hero's Journey)",
    layer: "L3",
    color: { primary: "#9333EA", from: "#D8B4FE", to: "#581C87" },
  },
]

// ---------------------------------------------------------------------------
// 전체 3-Layer 차원 배열
// ---------------------------------------------------------------------------
export const TRAIT_DIMENSIONS: TraitDimensionConfig[] = [
  ...L1_DIMENSIONS,
  ...L2_DIMENSIONS,
  ...L3_DIMENSIONS,
]

/** L1 차원만 필터링 */
export const L1_TRAIT_DIMENSIONS = L1_DIMENSIONS

/** L2 차원만 필터링 */
export const L2_TRAIT_DIMENSIONS = L2_DIMENSIONS

/** L3 차원만 필터링 */
export const L3_TRAIT_DIMENSIONS = L3_DIMENSIONS

// ---------------------------------------------------------------------------
// 레이어 그룹 색상
// ---------------------------------------------------------------------------
export const LAYER_COLORS = {
  L1: {
    primary: "#3B82F6",
    bg: "#EFF6FF",
    border: "#93C5FD",
    text: "#1E40AF",
    label: "Social Persona",
  },
  L2: {
    primary: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FCD34D",
    text: "#92400E",
    label: "Core Temperament",
  },
  L3: {
    primary: "#8B5CF6",
    bg: "#F5F3FF",
    border: "#C4B5FD",
    text: "#5B21B6",
    label: "Narrative Drive",
  },
} as const
