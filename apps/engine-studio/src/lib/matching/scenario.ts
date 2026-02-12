// ═══════════════════════════════════════════════════════════════
// 시나리오 저장/공유
// T57-AC5: 시뮬레이션 시나리오 CRUD, 공유 링크
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import type { MatchResult, MatchingConfig } from "./three-tier-engine"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface SavedScenario {
  id: string
  name: string
  description: string
  virtualUser: {
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
    archetype?: string
  }
  algorithm: {
    tier: "basic" | "advanced" | "exploration" | "all"
    parameters: Record<string, number>
  }
  context: {
    genre?: string
    timeOfDay?: string
    device?: string
  }
  results: MatchResult[] | null
  createdAt: number
  createdBy: string
  updatedAt: number
  sharedWith: string[]
  shareToken: string | null
}

export interface ScenarioListItem {
  id: string
  name: string
  description: string
  archetype?: string
  tier: string
  resultCount: number
  createdAt: number
  createdBy: string
  isShared: boolean
}

// ── 시나리오 생성 ────────────────────────────────────────────

export function createScenario(
  name: string,
  description: string,
  createdBy: string,
  virtualUser: SavedScenario["virtualUser"],
  algorithm: SavedScenario["algorithm"],
  context: SavedScenario["context"] = {}
): SavedScenario {
  const now = Date.now()
  return {
    id: `sc_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description,
    virtualUser,
    algorithm,
    context,
    results: null,
    createdAt: now,
    createdBy,
    updatedAt: now,
    sharedWith: [],
    shareToken: null,
  }
}

// ── 시나리오 업데이트 ────────────────────────────────────────

export function updateScenario(
  scenario: SavedScenario,
  updates: Partial<
    Pick<SavedScenario, "name" | "description" | "virtualUser" | "algorithm" | "context">
  >
): SavedScenario {
  return { ...scenario, ...updates, updatedAt: Date.now() }
}

// ── 결과 저장 ────────────────────────────────────────────────

export function saveResults(scenario: SavedScenario, results: MatchResult[]): SavedScenario {
  return { ...scenario, results, updatedAt: Date.now() }
}

// ── 공유 ─────────────────────────────────────────────────────

export function generateShareToken(scenario: SavedScenario): SavedScenario {
  const token = `share_${scenario.id}_${Math.random().toString(36).slice(2, 12)}`
  return { ...scenario, shareToken: token, updatedAt: Date.now() }
}

export function addSharedUser(scenario: SavedScenario, userId: string): SavedScenario {
  if (scenario.sharedWith.includes(userId)) return scenario
  return {
    ...scenario,
    sharedWith: [...scenario.sharedWith, userId],
    updatedAt: Date.now(),
  }
}

export function removeSharedUser(scenario: SavedScenario, userId: string): SavedScenario {
  return {
    ...scenario,
    sharedWith: scenario.sharedWith.filter((id) => id !== userId),
    updatedAt: Date.now(),
  }
}

export function revokeShareToken(scenario: SavedScenario): SavedScenario {
  return { ...scenario, shareToken: null, updatedAt: Date.now() }
}

// ── 시나리오 목록 변환 ───────────────────────────────────────

export function toListItem(scenario: SavedScenario): ScenarioListItem {
  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    archetype: scenario.virtualUser.archetype,
    tier: scenario.algorithm.tier,
    resultCount: scenario.results?.length ?? 0,
    createdAt: scenario.createdAt,
    createdBy: scenario.createdBy,
    isShared: scenario.sharedWith.length > 0 || scenario.shareToken !== null,
  }
}

// ── 시나리오 복제 ────────────────────────────────────────────

export function duplicateScenario(scenario: SavedScenario, newCreatedBy: string): SavedScenario {
  const now = Date.now()
  return {
    ...scenario,
    id: `sc_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${scenario.name} (복사본)`,
    results: null,
    createdAt: now,
    createdBy: newCreatedBy,
    updatedAt: now,
    sharedWith: [],
    shareToken: null,
  }
}

// ── 시나리오 검증 ────────────────────────────────────────────

export function validateScenario(scenario: SavedScenario): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!scenario.name.trim()) {
    errors.push("시나리오 이름이 비어있습니다")
  }

  const l1 = scenario.virtualUser.l1
  const l1Dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
  for (const dim of l1Dims) {
    const val = l1[dim]
    if (val < 0 || val > 1) {
      errors.push(`L1.${dim} 값이 범위를 벗어남: ${val}`)
    }
  }

  const validTiers = ["basic", "advanced", "exploration", "all"]
  if (!validTiers.includes(scenario.algorithm.tier)) {
    errors.push(`유효하지 않은 티어: ${scenario.algorithm.tier}`)
  }

  return { valid: errors.length === 0, errors }
}
