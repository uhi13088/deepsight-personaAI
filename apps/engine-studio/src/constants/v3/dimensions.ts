// ═══════════════════════════════════════════════════════════════
// v3 Dimension Definitions (106D+)
// 구현계획서 §14.2 기준
// ═══════════════════════════════════════════════════════════════

export interface DimensionDef {
  key: string
  layer: "L1" | "L2" | "L3"
  name: string
  label: string
  low: string
  high: string
  description: string
}

// ── L1 Social Persona (7D) ───────────────────────────────────
export const L1_DIMENSIONS: DimensionDef[] = [
  {
    key: "depth",
    layer: "L1",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하는지",
  },
  {
    key: "lens",
    layer: "L1",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 판단 성향",
  },
  {
    key: "stance",
    layer: "L1",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "콘텐츠에 대한 수용/비판 정도",
  },
  {
    key: "scope",
    layer: "L1",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 요약 vs 세부 사항 관심도",
  },
  {
    key: "taste",
    layer: "L1",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 작품 vs 실험적 작품 선호",
  },
  {
    key: "purpose",
    layer: "L1",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미 추구",
    description: "가벼운 오락 vs 의미 추구",
  },
  {
    key: "sociability",
    layer: "L1",
    name: "Sociability",
    label: "사회적 성향",
    low: "독립적",
    high: "사교적",
    description: "혼자 소비 vs 함께 나누기 선호",
  },
]

// ── L2 Core Temperament / OCEAN (5D) ─────────────────────────
export const L2_DIMENSIONS: DimensionDef[] = [
  {
    key: "openness",
    layer: "L2",
    name: "Openness",
    label: "개방성",
    low: "보수적",
    high: "개방적",
    description: "새로운 경험과 아이디어에 대한 수용도",
  },
  {
    key: "conscientiousness",
    layer: "L2",
    name: "Conscientiousness",
    label: "성실성",
    low: "유연한",
    high: "체계적",
    description: "계획성과 꼼꼼함의 정도",
  },
  {
    key: "extraversion",
    layer: "L2",
    name: "Extraversion",
    label: "외향성",
    low: "내향적",
    high: "외향적",
    description: "에너지의 원천 (내부 vs 외부)",
  },
  {
    key: "agreeableness",
    layer: "L2",
    name: "Agreeableness",
    label: "친화성",
    low: "독립적",
    high: "협조적",
    description: "타인과의 조화를 추구하는 정도",
  },
  {
    key: "neuroticism",
    layer: "L2",
    name: "Neuroticism",
    label: "신경성",
    low: "안정적",
    high: "민감한",
    description: "감정적 반응성과 불안 수준",
  },
]

// ── L3 Narrative Drive (4D) ──────────────────────────────────
export const L3_DIMENSIONS: DimensionDef[] = [
  {
    key: "lack",
    layer: "L3",
    name: "Lack",
    label: "결핍",
    low: "충족",
    high: "결핍",
    description: "내면의 결핍 — 행동의 원인",
  },
  {
    key: "moralCompass",
    layer: "L3",
    name: "Moral Compass",
    label: "도덕 나침반",
    low: "유연한",
    high: "엄격한",
    description: "판단의 기준 — 옳고 그름의 잣대",
  },
  {
    key: "volatility",
    layer: "L3",
    name: "Volatility",
    label: "변동성",
    low: "안정적",
    high: "폭발적",
    description: "감정/행동의 불안정성",
  },
  {
    key: "growthArc",
    layer: "L3",
    name: "Growth Arc",
    label: "성장 곡선",
    low: "정체",
    high: "변화",
    description: "변화의 방향성 (Hero's Journey)",
  },
]

export const ALL_DIMENSIONS = [...L1_DIMENSIONS, ...L2_DIMENSIONS, ...L3_DIMENSIONS] as const

// ── 기본 벡터값 ─────────────────────────────────────────────
export const DEFAULT_L1_VECTOR = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
} as const

export const DEFAULT_L2_VECTOR = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
} as const

export const DEFAULT_L3_VECTOR = {
  lack: 0.0,
  moralCompass: 0.0,
  volatility: 0.0,
  growthArc: 0.0,
} as const
