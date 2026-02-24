// ═══════════════════════════════════════════════════════════════
// Matching Tests — Shared Fixtures
// 매칭 테스트에서 공통으로 사용하는 샘플 데이터 및 헬퍼 함수.
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  CrossAxisProfile,
  ParadoxProfile,
  VFinalResult,
} from "@/types"
import type { PersonaCandidate, UserProfile } from "@/lib/matching/three-tier-engine"

// ── 샘플 벡터 ──────────────────────────────────────────────

export const sampleL1: SocialPersonaVector = {
  depth: 0.7,
  lens: 0.8,
  stance: 0.6,
  scope: 0.7,
  taste: 0.4,
  purpose: 0.6,
  sociability: 0.3,
}

export const sampleL2: CoreTemperamentVector = {
  openness: 0.7,
  conscientiousness: 0.6,
  extraversion: 0.4,
  agreeableness: 0.5,
  neuroticism: 0.3,
}

export const sampleL3: NarrativeDriveVector = {
  lack: 0.4,
  moralCompass: 0.6,
  volatility: 0.3,
  growthArc: 0.7,
}

// ── 프로필 팩토리 ───────────────────────────────────────────

export function makeCrossAxisProfile(): CrossAxisProfile {
  return {
    axes: Array.from({ length: 83 }, (_, i) => ({
      axisId: `axis_${i}`,
      type: i < 35 ? ("L1xL2" as const) : i < 63 ? ("L1xL3" as const) : ("L2xL3" as const),
      relationship: i % 4 === 0 ? ("paradox" as const) : ("reinforcing" as const),
      score: 0.3 + (i % 7) * 0.1,
      dimA: { layer: "L1" as const, key: "depth", value: 0.5 },
      dimB: { layer: "L2" as const, key: "openness", value: 0.6 },
      interpretation: "test",
    })),
    byType: { l1l2: [], l1l3: [], l2l3: [] },
    summary: {
      paradoxCount: 5,
      reinforcingCount: 10,
      modulatingIntensity: 0.4,
      dominantRelationship: "reinforcing",
      characterComplexity: 0.5,
    },
  }
}

export function makeParadoxProfile(overall: number = 0.35): ParadoxProfile {
  return {
    l1l2: overall,
    l1l3: 0.2,
    l2l3: 0.1,
    overall,
    dimensionality: 0.8,
    dominant: { layer: "L1xL2", score: overall },
  }
}

export function makeVFinalResult(): VFinalResult {
  return {
    vector: [0.7, 0.8, 0.6, 0.7, 0.4, 0.6, 0.3],
    pressure: 0.2,
    layerContributions: { l1Weight: 0.8, l2Weight: 0.12, l3Weight: 0.08 },
    l2Projected: [0.5, 0.6, 0.4, 0.5, 0.3, 0.5, 0.4],
    l3Projected: [0.4, 0.5, 0.3, 0.6, 0.3, 0.7, 0.3],
  }
}

export function makeUserProfile(): UserProfile {
  return {
    id: "user_1",
    l1: sampleL1,
    l2: sampleL2,
    l3: sampleL3,
    vFinal: makeVFinalResult(),
    crossAxisProfile: makeCrossAxisProfile(),
    paradoxProfile: makeParadoxProfile(),
    recentPersonaIds: [],
  }
}

export function makePersonaCandidate(
  id: string,
  override?: Partial<SocialPersonaVector>
): PersonaCandidate {
  return {
    id,
    name: `Persona ${id}`,
    l1: { ...sampleL1, ...override },
    l2: sampleL2,
    l3: sampleL3,
    crossAxisProfile: makeCrossAxisProfile(),
    paradoxProfile: makeParadoxProfile(),
  }
}
