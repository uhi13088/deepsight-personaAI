/**
 * 6D 벡터 차원별 컬러 설정
 * N차원 확장 가능 - 새 차원 추가 시 배열에 항목 추가만 하면 됨
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
  color: TraitDimensionColor
}

export const TRAIT_DIMENSIONS: TraitDimensionConfig[] = [
  {
    key: "depth",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하는지",
    color: {
      primary: "#3B82F6",
      from: "#BFDBFE",
      to: "#1E3A8A",
    },
  },
  {
    key: "lens",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 판단 성향",
    color: {
      primary: "#10B981",
      from: "#FDA4AF",
      to: "#059669",
    },
  },
  {
    key: "stance",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "콘텐츠에 대한 수용/비판 정도",
    color: {
      primary: "#F59E0B",
      from: "#BBF7D0",
      to: "#EF4444",
    },
  },
  {
    key: "scope",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 요약 vs 세부 사항 관심도",
    color: {
      primary: "#EF4444",
      from: "#FEF08A",
      to: "#7C3AED",
    },
  },
  {
    key: "taste",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 작품 vs 실험적 작품 선호",
    color: {
      primary: "#8B5CF6",
      from: "#FDE68A",
      to: "#D946EF",
    },
  },
  {
    key: "purpose",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미 추구",
    description: "가벼운 오락 vs 의미 추구",
    color: {
      primary: "#EC4899",
      from: "#FED7AA",
      to: "#4338CA",
    },
  },
]

/** 차원 key로 config 조회 */
export function getTraitDimension(key: string): TraitDimensionConfig | undefined {
  return TRAIT_DIMENSIONS.find((d) => d.key === key)
}

/** 벡터 데이터에서 차원 config와 값을 매핑 */
export function mapVectorToTraits(
  data: Record<string, number>
): Array<TraitDimensionConfig & { value: number }> {
  return TRAIT_DIMENSIONS.filter((d) => d.key in data).map((d) => ({
    ...d,
    value: data[d.key],
  }))
}
