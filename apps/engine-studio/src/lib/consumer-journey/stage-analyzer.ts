// ═══════════════════════════════════════════════════════════════
// Data Source Integration — 가상 유저 생성, 합성 데이터, 데이터 소스 관리
// AC3: Data Source Integration
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { type DataSourceType, round } from "./types"
import {
  type UserDemographics,
  type UserInterestProfile,
  type ConsumerProfile,
  createConsumerProfile,
} from "./journey-tracker"

export type { DataSourceType } from "./types"

/** 데이터 소스 구성 */
export interface DataSourceConfig {
  type: DataSourceType
  label: string
  description: string
  personaFilter?: {
    statuses: string[]
    archetypes?: string[]
    minQualityScore?: number
  }
  virtualUserConfig?: VirtualUserConfig
  syntheticConfig?: SyntheticDataConfig
}

/** 가상 유저 생성 설정 */
export interface VirtualUserConfig {
  count: number
  distributionMode: "uniform" | "gaussian" | "clustered"
  gaussianParams?: {
    mean: number
    stdDev: number
  }
  clusterParams?: {
    clusterCount: number
    spread: number // 클러스터 내 분산 (0.0~0.5)
  }
  demographics?: {
    ageGroups?: UserDemographics["ageGroup"][]
    genders?: UserDemographics["gender"][]
  }
  genres?: string[]
  traitKeywords?: string[]
}

/** 합성 데이터 설정 */
export interface SyntheticDataConfig {
  baseArchetype: string
  variationRange: number // 아키타입 기준 벡터 변동 범위 (0.0~0.5)
  count: number
}

// ── Virtual User Generator ───────────────────────────────────

/** 가상 유저 생성기 */
export function generateVirtualUsers(config: VirtualUserConfig): ConsumerProfile[] {
  const profiles: ConsumerProfile[] = []

  for (let i = 0; i < config.count; i++) {
    const l1 = generateVector7D(config.distributionMode, config.gaussianParams)
    const l2 = generateVector5D(config.distributionMode, config.gaussianParams)
    const l3 = generateVector4D(config.distributionMode, config.gaussianParams)

    const demographics = pickRandomDemographics(config.demographics)
    const interests: UserInterestProfile = {
      preferredGenres: config.genres ?? pickRandomGenres(),
      contentHistory: [],
      traitKeywords: config.traitKeywords ?? [],
    }

    profiles.push(
      createConsumerProfile(
        `Virtual User ${i + 1}`,
        demographics,
        interests,
        l1,
        l2,
        l3,
        "virtual_user"
      )
    )
  }

  return profiles
}

function generateVector7D(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): SocialPersonaVector {
  return {
    depth: generateDimValue(mode, gaussian),
    lens: generateDimValue(mode, gaussian),
    stance: generateDimValue(mode, gaussian),
    scope: generateDimValue(mode, gaussian),
    taste: generateDimValue(mode, gaussian),
    purpose: generateDimValue(mode, gaussian),
    sociability: generateDimValue(mode, gaussian),
  }
}

function generateVector5D(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): CoreTemperamentVector {
  return {
    openness: generateDimValue(mode, gaussian),
    conscientiousness: generateDimValue(mode, gaussian),
    extraversion: generateDimValue(mode, gaussian),
    agreeableness: generateDimValue(mode, gaussian),
    neuroticism: generateDimValue(mode, gaussian),
  }
}

function generateVector4D(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): NarrativeDriveVector {
  return {
    lack: generateDimValue(mode, gaussian),
    moralCompass: generateDimValue(mode, gaussian),
    volatility: generateDimValue(mode, gaussian),
    growthArc: generateDimValue(mode, gaussian),
  }
}

function generateDimValue(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): number {
  switch (mode) {
    case "uniform":
      return round(Math.random())
    case "gaussian": {
      const mean = gaussian?.mean ?? 0.5
      const stdDev = gaussian?.stdDev ?? 0.15
      return round(clamp01(boxMullerGaussian(mean, stdDev)))
    }
    case "clustered":
      // 클러스터 모드: 랜덤 중심점 주변 정규분포
      return round(clamp01(boxMullerGaussian(Math.random(), 0.1)))
  }
}

/** Box-Muller 변환을 사용한 가우시안 분포 */
function boxMullerGaussian(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
  return mean + stdDev * z0
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

const DEFAULT_AGE_GROUPS: UserDemographics["ageGroup"][] = [
  "10s",
  "20s",
  "30s",
  "40s",
  "50s",
  "60plus",
]

const DEFAULT_GENDERS: UserDemographics["gender"][] = ["male", "female", "other", "unspecified"]

function pickRandomDemographics(config?: VirtualUserConfig["demographics"]): UserDemographics {
  const ageGroups = config?.ageGroups ?? DEFAULT_AGE_GROUPS
  const genders = config?.genders ?? DEFAULT_GENDERS

  return {
    ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
    gender: genders[Math.floor(Math.random() * genders.length)],
  }
}

const DEFAULT_GENRES = ["로맨스", "스릴러", "SF", "드라마", "코미디", "다큐멘터리", "액션", "호러"]

function pickRandomGenres(): string[] {
  const count = 1 + Math.floor(Math.random() * 3) // 1~3개
  const shuffled = [...DEFAULT_GENRES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ── Data Source Resolver ─────────────────────────────────────

/** 데이터 소스 프리셋 */
export const DATA_SOURCE_PRESETS: Record<string, DataSourceConfig> = {
  activePersonas: {
    type: "real_persona",
    label: "활성 페르소나",
    description: "현재 ACTIVE 상태의 실제 페르소나 목록",
    personaFilter: {
      statuses: ["ACTIVE"],
    },
  },
  allPersonas: {
    type: "real_persona",
    label: "전체 페르소나",
    description: "ACTIVE + TESTING 상태의 페르소나 포함",
    personaFilter: {
      statuses: ["ACTIVE", "TESTING"],
    },
  },
  virtualRandom: {
    type: "virtual_user",
    label: "랜덤 가상 유저",
    description: "균등 분포 가상 유저 50명",
    virtualUserConfig: {
      count: 50,
      distributionMode: "uniform",
    },
  },
  virtualGaussian: {
    type: "virtual_user",
    label: "정규분포 가상 유저",
    description: "평균 중심 정규분포 가상 유저 50명",
    virtualUserConfig: {
      count: 50,
      distributionMode: "gaussian",
      gaussianParams: { mean: 0.5, stdDev: 0.15 },
    },
  },
  syntheticFromArchetype: {
    type: "synthetic",
    label: "아키타입 기반 합성",
    description: "특정 아키타입 기준으로 변형된 합성 유저",
    syntheticConfig: {
      baseArchetype: "cinephile",
      variationRange: 0.2,
      count: 20,
    },
  },
}

/** 데이터 소스 해석 (PersonaCandidate는 외부에서 제공) */
export interface ResolvedDataSource {
  sourceType: DataSourceType
  label: string
  description: string
  personaFilter: DataSourceConfig["personaFilter"] | null
  virtualUsers: ConsumerProfile[]
}

export function resolveDataSource(config: DataSourceConfig): ResolvedDataSource {
  let virtualUsers: ConsumerProfile[] = []

  if (config.type === "virtual_user" && config.virtualUserConfig) {
    virtualUsers = generateVirtualUsers(config.virtualUserConfig)
  }

  if (config.type === "synthetic" && config.syntheticConfig) {
    virtualUsers = generateSyntheticUsers(config.syntheticConfig)
  }

  return {
    sourceType: config.type,
    label: config.label,
    description: config.description,
    personaFilter: config.personaFilter ?? null,
    virtualUsers,
  }
}

function generateSyntheticUsers(config: SyntheticDataConfig): ConsumerProfile[] {
  const profiles: ConsumerProfile[] = []
  const range = clamp01(config.variationRange)

  for (let i = 0; i < config.count; i++) {
    // 아키타입 중심값 (0.5 기반) 주변으로 변동
    const l1 = generateVector7D("gaussian", { mean: 0.5, stdDev: range })
    const l2 = generateVector5D("gaussian", { mean: 0.5, stdDev: range })
    const l3 = generateVector4D("gaussian", { mean: 0.5, stdDev: range })

    profiles.push(
      createConsumerProfile(
        `Synthetic ${config.baseArchetype} ${i + 1}`,
        pickRandomDemographics(),
        {
          preferredGenres: [],
          contentHistory: [],
          traitKeywords: [config.baseArchetype],
        },
        l1,
        l2,
        l3,
        "synthetic"
      )
    )
  }

  return profiles
}
