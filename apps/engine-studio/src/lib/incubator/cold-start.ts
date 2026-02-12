// ═══════════════════════════════════════════════════════════════
// 콜드 스타트 운영 정책
// T62-AC3: 신규 페르소나 초기 학습, 아키타입 기반 전략
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ColdStartPhase = "initial" | "growing" | "mature" | "scaled"

export interface ColdStartPolicy {
  phase: ColdStartPhase
  dailyLimit: number
  explorationQuota: number // 0.0~1.0
  autoTransitionThreshold: number // 유저 데이터 수
  constraints: GenerationConstraints
}

export interface GenerationConstraints {
  minVariance: number // 모든 값이 0.5 근처면 탈락 (default 0.15)
  maxExtremes: number // 극단값(0.9+/0.1-) 개수 제한 (default 3)
  logicalCoherence: boolean // 비논리 조합 방지
}

// ── 페이즈 판정 ────────────────────────────────────────────────

export function determineColdStartPhase(
  userDataCount: number,
  activePersonaCount: number
): ColdStartPhase {
  if (userDataCount < 1000) return "initial"
  if (activePersonaCount < 50) return "growing"
  if (activePersonaCount < 200) return "mature"
  return "scaled"
}

// ── 페이즈별 정책 ──────────────────────────────────────────────

const PHASE_POLICIES: Record<ColdStartPhase, ColdStartPolicy> = {
  initial: {
    phase: "initial",
    dailyLimit: 10,
    explorationQuota: 0.3,
    autoTransitionThreshold: 1000,
    constraints: {
      minVariance: 0.15,
      maxExtremes: 3,
      logicalCoherence: true,
    },
  },
  growing: {
    phase: "growing",
    dailyLimit: 30,
    explorationQuota: 0.25,
    autoTransitionThreshold: 5000,
    constraints: {
      minVariance: 0.15,
      maxExtremes: 3,
      logicalCoherence: true,
    },
  },
  mature: {
    phase: "mature",
    dailyLimit: 50,
    explorationQuota: 0.2,
    autoTransitionThreshold: 20000,
    constraints: {
      minVariance: 0.12,
      maxExtremes: 4,
      logicalCoherence: true,
    },
  },
  scaled: {
    phase: "scaled",
    dailyLimit: 100,
    explorationQuota: 0.15,
    autoTransitionThreshold: Infinity,
    constraints: {
      minVariance: 0.1,
      maxExtremes: 5,
      logicalCoherence: true,
    },
  },
}

export function getColdStartPolicy(
  userDataCount: number,
  activePersonaCount: number
): ColdStartPolicy {
  const phase = determineColdStartPhase(userDataCount, activePersonaCount)
  return { ...PHASE_POLICIES[phase] }
}

// ── 벡터 제약 조건 검증 ──────────────────────────────────────

export function validateGenerationConstraints(
  vector: Record<string, number>,
  constraints: GenerationConstraints
): { valid: boolean; issues: string[] } {
  const dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"]
  const values = dims.map((d) => vector[d] ?? 0.5)
  const issues: string[] = []

  // 최소 분산 검사
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  if (variance < constraints.minVariance * constraints.minVariance) {
    issues.push(
      `분산 부족: ${Math.round(Math.sqrt(variance) * 100) / 100} < ${constraints.minVariance}`
    )
  }

  // 극단값 개수 검사
  const extremes = values.filter((v) => v >= 0.9 || v <= 0.1).length
  if (extremes > constraints.maxExtremes) {
    issues.push(`극단값 초과: ${extremes}개 > ${constraints.maxExtremes}개`)
  }

  return { valid: issues.length === 0, issues }
}

// ── 초기 아키타입 시드 ────────────────────────────────────────

export const COLD_START_ARCHETYPES = [
  {
    id: "analyst",
    label: "냉철한 분석가",
    vector: {
      depth: 0.9,
      lens: 0.9,
      stance: 0.7,
      scope: 0.8,
      taste: 0.3,
      purpose: 0.7,
      sociability: 0.3,
    },
  },
  {
    id: "essayist",
    label: "감성 에세이스트",
    vector: {
      depth: 0.7,
      lens: 0.2,
      stance: 0.3,
      scope: 0.6,
      taste: 0.4,
      purpose: 0.8,
      sociability: 0.5,
    },
  },
  {
    id: "trendhunter",
    label: "트렌드 헌터",
    vector: {
      depth: 0.4,
      lens: 0.5,
      stance: 0.4,
      scope: 0.5,
      taste: 0.9,
      purpose: 0.3,
      sociability: 0.8,
    },
  },
  {
    id: "classic",
    label: "클래식 감정가",
    vector: {
      depth: 0.8,
      lens: 0.4,
      stance: 0.5,
      scope: 0.7,
      taste: 0.1,
      purpose: 0.8,
      sociability: 0.4,
    },
  },
  {
    id: "casual",
    label: "캐주얼 큐레이터",
    vector: {
      depth: 0.2,
      lens: 0.3,
      stance: 0.2,
      scope: 0.2,
      taste: 0.5,
      purpose: 0.2,
      sociability: 0.7,
    },
  },
  {
    id: "detail",
    label: "디테일 매니아",
    vector: {
      depth: 0.6,
      lens: 0.7,
      stance: 0.6,
      scope: 1.0,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.4,
    },
  },
  {
    id: "guide",
    label: "균형 잡힌 가이드",
    vector: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.6,
    },
  },
  {
    id: "explorer",
    label: "실험적 탐험가",
    vector: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.4,
      scope: 0.5,
      taste: 1.0,
      purpose: 0.4,
      sociability: 0.6,
    },
  },
] as const

export function getColdStartArchetypes(): Array<{
  id: string
  label: string
  vector: Record<string, number>
}> {
  return COLD_START_ARCHETYPES.map((a) => ({
    id: a.id,
    label: a.label,
    vector: { ...a.vector },
  }))
}
