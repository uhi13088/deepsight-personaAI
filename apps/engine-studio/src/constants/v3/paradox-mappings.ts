// ═══════════════════════════════════════════════════════════════
// L1↔L2 Paradox Mapping Table (7 pairs)
// 구현계획서 §14.5, 설계서 §3.6.2 기준
// ═══════════════════════════════════════════════════════════════

import type {
  SocialDimension,
  TemperamentDimension,
  ParadoxDirection,
  ParadoxPriority,
} from "@/types"

export interface ParadoxMappingDef {
  l1: SocialDimension
  l2: TemperamentDimension
  type: ParadoxPriority
  direction: ParadoxDirection
  label: string
}

export const L1_L2_PARADOX_MAPPINGS: ParadoxMappingDef[] = [
  {
    l1: "depth",
    l2: "openness",
    type: "primary",
    direction: "aligned",
    label: "지적 호기심의 역설",
  },
  {
    l1: "lens",
    l2: "neuroticism",
    type: "primary",
    direction: "inverse",
    label: "감성/불안의 역설",
  },
  {
    l1: "stance",
    l2: "agreeableness",
    type: "primary",
    direction: "inverse",
    label: "태도의 역설 (츤데레)",
  },
  {
    l1: "scope",
    l2: "conscientiousness",
    type: "secondary",
    direction: "aligned",
    label: "디테일/규칙의 역설 (게으른 완벽주의자)",
  },
  {
    l1: "taste",
    l2: "openness",
    type: "secondary",
    direction: "aligned",
    label: "심미적 취향의 역설 (보수적 힙스터)",
  },
  {
    l1: "purpose",
    l2: "conscientiousness",
    type: "primary",
    direction: "aligned",
    label: "목표/실천의 역설",
  },
  {
    l1: "sociability",
    l2: "extraversion",
    type: "primary",
    direction: "aligned",
    label: "에너지의 역설 (사교적 내향인)",
  },
] as const

// Extended Paradox Score 가중치
export const EPS_WEIGHTS = {
  l1l2: 0.5, // 가면 vs 본성
  l1l3: 0.3, // 가면 vs 욕망
  l2l3: 0.2, // 본성 vs 욕망
} as const
