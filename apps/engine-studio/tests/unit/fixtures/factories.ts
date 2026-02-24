/**
 * 벡터 팩토리 함수 — 파라미터 기반 벡터 생성
 *
 * 단일 base 값으로 약간의 변이가 있는 벡터를 생성합니다.
 * override 파라미터로 특정 축만 변경할 수 있습니다.
 */
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

export const makeL1 = (
  base = 0.5,
  overrides?: Partial<SocialPersonaVector>
): SocialPersonaVector => ({
  depth: base,
  lens: base + 0.1,
  stance: base - 0.1,
  scope: base,
  taste: base + 0.05,
  purpose: base,
  sociability: base - 0.05,
  ...overrides,
})

export const makeL2 = (
  base = 0.5,
  overrides?: Partial<CoreTemperamentVector>
): CoreTemperamentVector => ({
  openness: base,
  conscientiousness: base + 0.1,
  extraversion: base - 0.1,
  agreeableness: base,
  neuroticism: base + 0.05,
  ...overrides,
})

export const makeL3 = (
  base = 0.5,
  overrides?: Partial<NarrativeDriveVector>
): NarrativeDriveVector => ({
  lack: base,
  moralCompass: base + 0.1,
  volatility: base - 0.1,
  growthArc: base + 0.05,
  ...overrides,
})
