// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Hero's Journey Evolution Stages
// T135: L3 기반 장기 행동 진화 — growthArc → 5단계 매핑
// ═══════════════════════════════════════════════════════════════

export interface EvolutionStage {
  id: string
  name: string
  nameKo: string
  range: [number, number] // growthArc 값 범위 [min, max)
  description: string
  behaviorTraits: {
    /** 포스트 다양성 경향 (0~1, 높을수록 다양한 타입) */
    postDiversity: number
    /** 자기 성찰 빈도 (0~1) */
    selfReflection: number
    /** 위험 감수 경향 (0~1) */
    riskTaking: number
    /** 타인 공감 수준 (0~1) */
    empathyLevel: number
  }
}

/**
 * Hero's Journey 5단계.
 *
 * growthArc 0.0~1.0 → 5개 스테이지 매핑:
 * 1. Ordinary World (0.0~0.2): 일상, 안전 영역
 * 2. Call to Adventure (0.2~0.4): 변화 감지, 탐색 시작
 * 3. Trials & Growth (0.4~0.6): 도전, 시행착오, 성장
 * 4. Transformation (0.6~0.8): 변화 체화, 새로운 관점
 * 5. Return & Mastery (0.8~1.0): 성숙, 멘토링, 통합
 */
export const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    id: "ordinary-world",
    name: "Ordinary World",
    nameKo: "일상 세계",
    range: [0.0, 0.2],
    description: "안전한 영역에서 활동하며, 익숙한 패턴을 반복한다",
    behaviorTraits: {
      postDiversity: 0.2,
      selfReflection: 0.1,
      riskTaking: 0.1,
      empathyLevel: 0.3,
    },
  },
  {
    id: "call-to-adventure",
    name: "Call to Adventure",
    nameKo: "모험의 부름",
    range: [0.2, 0.4],
    description: "새로운 관심사를 탐색하기 시작하며, 변화의 조짐이 보인다",
    behaviorTraits: {
      postDiversity: 0.4,
      selfReflection: 0.3,
      riskTaking: 0.3,
      empathyLevel: 0.4,
    },
  },
  {
    id: "trials-and-growth",
    name: "Trials & Growth",
    nameKo: "시련과 성장",
    range: [0.4, 0.6],
    description: "다양한 도전을 통해 성장하며, 자신만의 관점을 형성한다",
    behaviorTraits: {
      postDiversity: 0.7,
      selfReflection: 0.5,
      riskTaking: 0.6,
      empathyLevel: 0.5,
    },
  },
  {
    id: "transformation",
    name: "Transformation",
    nameKo: "변화",
    range: [0.6, 0.8],
    description: "내면의 변화가 행동으로 드러나며, 새로운 관점이 확립된다",
    behaviorTraits: {
      postDiversity: 0.8,
      selfReflection: 0.7,
      riskTaking: 0.5,
      empathyLevel: 0.7,
    },
  },
  {
    id: "return-and-mastery",
    name: "Return & Mastery",
    nameKo: "귀환과 성숙",
    range: [0.8, 1.0],
    description: "성숙한 관점으로 통합하며, 다른 페르소나에게 영향을 준다",
    behaviorTraits: {
      postDiversity: 0.6,
      selfReflection: 0.8,
      riskTaking: 0.3,
      empathyLevel: 0.9,
    },
  },
]

/**
 * growthArc 값으로 현재 스테이지 결정.
 */
export function getEvolutionStage(growthArc: number): EvolutionStage {
  const clamped = Math.max(0, Math.min(1, growthArc))

  for (const stage of EVOLUTION_STAGES) {
    if (clamped >= stage.range[0] && clamped < stage.range[1]) {
      return stage
    }
  }

  // growthArc === 1.0 → 마지막 단계
  return EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1]
}

/**
 * 스테이지 전이 여부 확인.
 */
export function hasStageTransition(
  previousGrowthArc: number,
  currentGrowthArc: number
): { transitioned: boolean; from: EvolutionStage; to: EvolutionStage } {
  const from = getEvolutionStage(previousGrowthArc)
  const to = getEvolutionStage(currentGrowthArc)
  return {
    transitioned: from.id !== to.id,
    from,
    to,
  }
}
