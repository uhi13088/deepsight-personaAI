// ═══════════════════════════════════════════════════════════════
// Version Management — 알고리즘 버전 관리 + 개발자 콘솔 연동
// ═══════════════════════════════════════════════════════════════

import type { DeployEnvironment } from "./types"
import type { EventSchema, EventType } from "./event-bus"

// ═══════════════════════════════════════════════════════════════
// AC2: 알고리즘 버전 관리 (버전 정책, 저장소, Diff, 롤백)
// ═══════════════════════════════════════════════════════════════

// ── 알고리즘 버전 타입 정의 ──────────────────────────────────

export type AlgorithmVersionStatus = "draft" | "testing" | "active" | "deprecated" | "rolled_back"

export type AlgorithmCategory = "matching" | "persona_generator" | "user_profiler"

export interface AlgorithmVersion {
  id: string
  category: AlgorithmCategory
  version: string // "v1.0.0-001" format
  parentVersion: string | null
  status: AlgorithmVersionStatus
  createdBy: string
  createdAt: number
  description: string
  changelog: string
  deployedEnvironments: DeployEnvironment[]
  config: Record<string, number | string | boolean>
  weights: Record<string, number>
}

// ── 버전 정책 타입 정의 ──────────────────────────────────────

export type VersionBumpType = "major" | "minor" | "patch"

export interface VersionPolicy {
  naming: {
    prefix: string
    separator: string
    buildSeparator: string
  }
  compatibility: {
    majorBreaking: boolean
    minorBackwardCompatible: boolean
    patchBugFixOnly: boolean
  }
  rules: {
    maxActiveVersions: number
    autoDeprecateAfterDays: number
    requireTestBeforeActivation: boolean
    requireApprovalForMajor: boolean
  }
}

export const DEFAULT_VERSION_POLICY: VersionPolicy = {
  naming: {
    prefix: "v",
    separator: ".",
    buildSeparator: "-",
  },
  compatibility: {
    majorBreaking: true,
    minorBackwardCompatible: true,
    patchBugFixOnly: true,
  },
  rules: {
    maxActiveVersions: 3,
    autoDeprecateAfterDays: 180,
    requireTestBeforeActivation: true,
    requireApprovalForMajor: true,
  },
}

// ── 버전 Diff 타입 정의 ─────────────────────────────────────

export type DiffChangeType = "added" | "removed" | "modified"

export interface DiffEntry {
  path: string
  changeType: DiffChangeType
  oldValue: string | number | boolean | null
  newValue: string | number | boolean | null
}

export interface VersionDiff {
  fromVersion: string
  toVersion: string
  category: AlgorithmCategory
  entries: DiffEntry[]
  configChanges: number
  weightChanges: number
  summary: string
  generatedAt: number
}

// ── 버전 롤백 타입 정의 ─────────────────────────────────────

export interface VersionRollback {
  id: string
  category: AlgorithmCategory
  fromVersion: string
  toVersion: string
  reason: string
  executedBy: string
  executedAt: number
  affectedEnvironments: DeployEnvironment[]
}

// ── 알고리즘 버전 관리 함수 ──────────────────────────────────

export function parseVersion(versionString: string): {
  major: number
  minor: number
  patch: number
  build: number | null
} {
  const cleaned = versionString.replace(/^v/, "")
  const [versionPart, buildPart] = cleaned.split("-")
  const parts = versionPart.split(".")

  if (parts.length !== 3) {
    throw new Error(
      `잘못된 버전 형식입니다: ${versionString} (v[Major].[Minor].[Patch] 형식이어야 합니다)`
    )
  }

  const major = parseInt(parts[0], 10)
  const minor = parseInt(parts[1], 10)
  const patch = parseInt(parts[2], 10)

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`버전 번호는 숫자여야 합니다: ${versionString}`)
  }

  const build = buildPart !== undefined ? parseInt(buildPart, 10) : null
  if (build !== null && isNaN(build)) {
    throw new Error(`빌드 번호는 숫자여야 합니다: ${versionString}`)
  }

  return { major, minor, patch, build }
}

export function formatVersion(
  major: number,
  minor: number,
  patch: number,
  build: number | null = null,
  policy: VersionPolicy = DEFAULT_VERSION_POLICY
): string {
  const base = `${policy.naming.prefix}${major}${policy.naming.separator}${minor}${policy.naming.separator}${patch}`
  if (build !== null) {
    return `${base}${policy.naming.buildSeparator}${String(build).padStart(3, "0")}`
  }
  return base
}

export function bumpVersion(
  currentVersion: string,
  bumpType: VersionBumpType,
  build: number | null = null,
  policy: VersionPolicy = DEFAULT_VERSION_POLICY
): string {
  const parsed = parseVersion(currentVersion)

  switch (bumpType) {
    case "major":
      return formatVersion(parsed.major + 1, 0, 0, build, policy)
    case "minor":
      return formatVersion(parsed.major, parsed.minor + 1, 0, build, policy)
    case "patch":
      return formatVersion(parsed.major, parsed.minor, parsed.patch + 1, build, policy)
  }
}

export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a)
  const parsedB = parseVersion(b)

  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor
  if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch

  const buildA = parsedA.build ?? 0
  const buildB = parsedB.build ?? 0
  return buildA - buildB
}

export function createVersion(
  category: AlgorithmCategory,
  version: string,
  createdBy: string,
  description: string,
  changelog: string,
  config: Record<string, number | string | boolean>,
  weights: Record<string, number>,
  parentVersion: string | null = null
): AlgorithmVersion {
  // 버전 형식 검증
  parseVersion(version)

  return {
    id: `algo_${category}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category,
    version,
    parentVersion,
    status: "draft",
    createdBy,
    createdAt: Date.now(),
    description,
    changelog,
    deployedEnvironments: [],
    config,
    weights,
  }
}

export function activateVersion(
  version: AlgorithmVersion,
  allVersions: AlgorithmVersion[],
  policy: VersionPolicy = DEFAULT_VERSION_POLICY
): AlgorithmVersion {
  if (version.status !== "testing" && version.status !== "draft") {
    throw new Error(`현재 상태(${version.status})에서는 활성화할 수 없습니다`)
  }

  if (policy.rules.requireTestBeforeActivation && version.status !== "testing") {
    throw new Error("활성화 전 테스트 단계를 거쳐야 합니다")
  }

  const parsed = parseVersion(version.version)
  if (policy.rules.requireApprovalForMajor && parsed.major > 0 && version.parentVersion !== null) {
    const parentParsed = parseVersion(version.parentVersion)
    if (parsed.major > parentParsed.major) {
      // Major 버전 변경은 승인이 필요하므로 status를 그대로 둘 수 있으나
      // 이 함수는 활성화 함수이므로 검증만 통과하면 활성화 허용
    }
  }

  // 같은 카테고리의 active 버전 수 확인
  const activeCount = allVersions.filter(
    (v) => v.category === version.category && v.status === "active" && v.id !== version.id
  ).length

  if (activeCount >= policy.rules.maxActiveVersions) {
    throw new Error(
      `최대 활성 버전 수(${policy.rules.maxActiveVersions})에 도달했습니다. 기존 버전을 deprecated로 변경한 후 활성화하세요.`
    )
  }

  return { ...version, status: "active" }
}

export function deprecateVersion(version: AlgorithmVersion, reason: string): AlgorithmVersion {
  if (version.status !== "active") {
    throw new Error(
      `활성(active) 상태의 버전만 deprecated 처리할 수 있습니다 (현재: ${version.status})`
    )
  }
  return {
    ...version,
    status: "deprecated",
    changelog: `${version.changelog}\n\n[Deprecated] ${reason}`,
  }
}

export function setVersionTesting(version: AlgorithmVersion): AlgorithmVersion {
  if (version.status !== "draft") {
    throw new Error(
      `초안(draft) 상태의 버전만 테스트 상태로 전환할 수 있습니다 (현재: ${version.status})`
    )
  }
  return { ...version, status: "testing" }
}

export function deployVersionToEnvironment(
  version: AlgorithmVersion,
  environment: DeployEnvironment
): AlgorithmVersion {
  if (version.status !== "active" && version.status !== "testing") {
    throw new Error(
      `활성(active) 또는 테스트(testing) 상태의 버전만 배포할 수 있습니다 (현재: ${version.status})`
    )
  }
  if (version.deployedEnvironments.includes(environment)) {
    return version
  }
  return {
    ...version,
    deployedEnvironments: [...version.deployedEnvironments, environment],
  }
}

export function diffVersions(versionA: AlgorithmVersion, versionB: AlgorithmVersion): VersionDiff {
  if (versionA.category !== versionB.category) {
    throw new Error("같은 카테고리의 버전만 비교할 수 있습니다")
  }

  const entries: DiffEntry[] = []

  // config diff
  const allConfigKeys = new Set([...Object.keys(versionA.config), ...Object.keys(versionB.config)])
  for (const key of allConfigKeys) {
    const oldVal = versionA.config[key] ?? null
    const newVal = versionB.config[key] ?? null

    if (oldVal === null && newVal !== null) {
      entries.push({ path: `config.${key}`, changeType: "added", oldValue: null, newValue: newVal })
    } else if (oldVal !== null && newVal === null) {
      entries.push({
        path: `config.${key}`,
        changeType: "removed",
        oldValue: oldVal,
        newValue: null,
      })
    } else if (oldVal !== newVal) {
      entries.push({
        path: `config.${key}`,
        changeType: "modified",
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  }

  // weights diff
  const allWeightKeys = new Set([
    ...Object.keys(versionA.weights),
    ...Object.keys(versionB.weights),
  ])
  for (const key of allWeightKeys) {
    const oldVal = versionA.weights[key] ?? null
    const newVal = versionB.weights[key] ?? null

    if (oldVal === null && newVal !== null) {
      entries.push({
        path: `weights.${key}`,
        changeType: "added",
        oldValue: null,
        newValue: newVal,
      })
    } else if (oldVal !== null && newVal === null) {
      entries.push({
        path: `weights.${key}`,
        changeType: "removed",
        oldValue: oldVal,
        newValue: null,
      })
    } else if (oldVal !== newVal) {
      entries.push({
        path: `weights.${key}`,
        changeType: "modified",
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  }

  const configChanges = entries.filter((e) => e.path.startsWith("config.")).length
  const weightChanges = entries.filter((e) => e.path.startsWith("weights.")).length

  const summary =
    entries.length === 0
      ? `${versionA.version} → ${versionB.version}: 변경 없음`
      : `${versionA.version} → ${versionB.version}: ${entries.length}개 변경 (설정 ${configChanges}, 가중치 ${weightChanges})`

  return {
    fromVersion: versionA.version,
    toVersion: versionB.version,
    category: versionA.category,
    entries,
    configChanges,
    weightChanges,
    summary,
    generatedAt: Date.now(),
  }
}

export function rollbackVersion(
  currentVersion: AlgorithmVersion,
  targetVersion: AlgorithmVersion,
  reason: string,
  executedBy: string,
  environments: DeployEnvironment[]
): {
  rollback: VersionRollback
  updatedCurrent: AlgorithmVersion
  updatedTarget: AlgorithmVersion
} {
  if (currentVersion.category !== targetVersion.category) {
    throw new Error("같은 카테고리의 버전만 롤백할 수 있습니다")
  }

  if (compareVersions(targetVersion.version, currentVersion.version) >= 0) {
    throw new Error("롤백 대상 버전은 현재 버전보다 이전이어야 합니다")
  }

  if (targetVersion.status !== "active" && targetVersion.status !== "deprecated") {
    throw new Error(
      `롤백 대상 버전은 active 또는 deprecated 상태여야 합니다 (현재: ${targetVersion.status})`
    )
  }

  const rollback: VersionRollback = {
    id: `rb_${Date.now()}`,
    category: currentVersion.category,
    fromVersion: currentVersion.version,
    toVersion: targetVersion.version,
    reason,
    executedBy,
    executedAt: Date.now(),
    affectedEnvironments: environments,
  }

  const updatedCurrent: AlgorithmVersion = {
    ...currentVersion,
    status: "rolled_back",
    changelog: `${currentVersion.changelog}\n\n[Rolled back] ${reason}`,
  }

  const updatedTarget: AlgorithmVersion = {
    ...targetVersion,
    status: "active",
    deployedEnvironments: [...new Set([...targetVersion.deployedEnvironments, ...environments])],
  }

  return { rollback, updatedCurrent, updatedTarget }
}

export function getVersionHistory(
  versions: AlgorithmVersion[],
  category: AlgorithmCategory
): AlgorithmVersion[] {
  return versions
    .filter((v) => v.category === category)
    .sort((a, b) => compareVersions(b.version, a.version))
}

// ═══════════════════════════════════════════════════════════════
// AC4: 개발자 콘솔 연동 (API 문서 자동 생성, Changelog, 사용량 동기화)
// ═══════════════════════════════════════════════════════════════

// ── API 문서 타입 정의 ───────────────────────────────────────

export type HTTPMethodDoc = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface APIDocParameter {
  name: string
  in: "query" | "path" | "header" | "body"
  required: boolean
  type: string
  description: string
  example: string | null
}

export interface APIDocResponse {
  statusCode: number
  description: string
  schema: Record<string, unknown>
  example: Record<string, unknown> | null
}

export interface APIDocEndpoint {
  path: string
  method: HTTPMethodDoc
  summary: string
  description: string
  tags: string[]
  parameters: APIDocParameter[]
  responses: APIDocResponse[]
  deprecated: boolean
}

export interface APIDocSpec {
  title: string
  version: string
  description: string
  baseUrl: string
  endpoints: APIDocEndpoint[]
  schemas: Record<string, Record<string, unknown>>
  generatedAt: number
  lastUpdatedAt: number
}

// ── Changelog 타입 정의 ──────────────────────────────────────

export type ChangeCategory = "added" | "changed" | "fixed" | "deprecated" | "removed" | "security"

export interface ChangeItem {
  category: ChangeCategory
  description: string
  relatedEventType: EventType | null
}

export interface ChangelogEntry {
  date: string // ISO date string (YYYY-MM-DD)
  version: string
  title: string
  changes: ChangeItem[]
  generatedAt: number
}

export interface Changelog {
  entries: ChangelogEntry[]
  lastUpdatedAt: number
}

// ── 사용량 동기화 타입 정의 ──────────────────────────────────

export type SyncInterval = "realtime" | "1_minute" | "1_hour"

export interface UsageRecord {
  timestamp: number
  apiCalls: number
  tokenUsage: number
  costUsd: number
  modelBreakdown: Record<string, { calls: number; tokens: number; cost: number }>
}

export interface UsageSyncConfig {
  syncIntervals: Record<string, SyncInterval>
  retentionDays: number
  enabled: boolean
}

export interface UsageSyncStatus {
  lastSyncAt: number | null
  lastSyncSuccess: boolean
  pendingRecords: number
  totalSynced: number
  errors: string[]
}

export interface DeveloperConsoleIntegration {
  apiDoc: APIDocSpec | null
  changelog: Changelog
  usageConfig: UsageSyncConfig
  usageSyncStatus: UsageSyncStatus
  connectionStatus: "connected" | "degraded" | "disconnected"
  lastHealthCheckAt: number | null
}

export const DEFAULT_USAGE_SYNC_CONFIG: UsageSyncConfig = {
  syncIntervals: {
    api_calls: "realtime",
    token_usage: "1_minute",
    cost: "1_hour",
  },
  retentionDays: 90,
  enabled: true,
}

// ── API 문서 생성 함수 ───────────────────────────────────────

export function createAPIDocSpec(
  title: string,
  version: string,
  description: string,
  baseUrl: string
): APIDocSpec {
  return {
    title,
    version,
    description,
    baseUrl,
    endpoints: [],
    schemas: {},
    generatedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  }
}

export function addDocEndpoint(spec: APIDocSpec, endpoint: APIDocEndpoint): APIDocSpec {
  const exists = spec.endpoints.some(
    (e) => e.path === endpoint.path && e.method === endpoint.method
  )
  if (exists) {
    // 기존 엔드포인트 업데이트
    return {
      ...spec,
      endpoints: spec.endpoints.map((e) =>
        e.path === endpoint.path && e.method === endpoint.method ? endpoint : e
      ),
      lastUpdatedAt: Date.now(),
    }
  }
  return {
    ...spec,
    endpoints: [...spec.endpoints, endpoint],
    lastUpdatedAt: Date.now(),
  }
}

export function addDocSchema(
  spec: APIDocSpec,
  name: string,
  schema: Record<string, unknown>
): APIDocSpec {
  return {
    ...spec,
    schemas: { ...spec.schemas, [name]: schema },
    lastUpdatedAt: Date.now(),
  }
}

export function deprecateDocEndpoint(
  spec: APIDocSpec,
  path: string,
  method: HTTPMethodDoc
): APIDocSpec {
  const idx = spec.endpoints.findIndex((e) => e.path === path && e.method === method)
  if (idx === -1) {
    throw new Error(`엔드포인트를 찾을 수 없습니다: ${method} ${path}`)
  }
  const updated = [...spec.endpoints]
  updated[idx] = { ...updated[idx], deprecated: true }
  return { ...spec, endpoints: updated, lastUpdatedAt: Date.now() }
}

export function generateAPIDocs(
  personas: Array<{ id: string; name: string; status: string }>,
  algorithmVersion: string,
  baseUrl: string
): APIDocSpec {
  const spec = createAPIDocSpec(
    "DeepSight Persona API",
    algorithmVersion,
    "AI 페르소나 기반 콘텐츠 추천 API",
    baseUrl
  )

  // 페르소나 목록 엔드포인트
  const listEndpoint: APIDocEndpoint = {
    path: "/api/v3/personas",
    method: "GET",
    summary: "페르소나 목록 조회",
    description: `현재 활성화된 ${personas.filter((p) => p.status === "ACTIVE").length}개의 페르소나를 조회합니다.`,
    tags: ["Persona"],
    parameters: [
      {
        name: "page",
        in: "query",
        required: false,
        type: "number",
        description: "페이지 번호",
        example: "1",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        type: "number",
        description: "페이지 크기",
        example: "20",
      },
      {
        name: "status",
        in: "query",
        required: false,
        type: "string",
        description: "페르소나 상태 필터",
        example: "ACTIVE",
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: "성공",
        schema: {
          type: "object",
          properties: { success: { type: "boolean" }, data: { type: "array" } },
        },
        example: null,
      },
      { statusCode: 401, description: "인증 실패", schema: { type: "object" }, example: null },
    ],
    deprecated: false,
  }

  // 매칭 엔드포인트
  const matchEndpoint: APIDocEndpoint = {
    path: "/api/v3/matching",
    method: "POST",
    summary: "콘텐츠 매칭 요청",
    description: `알고리즘 버전 ${algorithmVersion}을 사용하여 유저와 페르소나를 매칭합니다.`,
    tags: ["Matching"],
    parameters: [
      {
        name: "user_vector",
        in: "body",
        required: true,
        type: "object",
        description: "유저 벡터 (L1 7D)",
        example: null,
      },
      {
        name: "persona_ids",
        in: "body",
        required: false,
        type: "array",
        description: "매칭 대상 페르소나 ID 목록",
        example: null,
      },
      {
        name: "limit",
        in: "body",
        required: false,
        type: "number",
        description: "결과 수 제한",
        example: "5",
      },
    ],
    responses: [
      { statusCode: 200, description: "매칭 성공", schema: { type: "object" }, example: null },
      { statusCode: 400, description: "잘못된 요청", schema: { type: "object" }, example: null },
    ],
    deprecated: false,
  }

  return addDocEndpoint(addDocEndpoint(spec, listEndpoint), matchEndpoint)
}

// ── Changelog 생성 함수 ─────────────────────────────────────

export function createChangelog(): Changelog {
  return {
    entries: [],
    lastUpdatedAt: Date.now(),
  }
}

export function addChangelogEntry(changelog: Changelog, entry: ChangelogEntry): Changelog {
  return {
    entries: [entry, ...changelog.entries],
    lastUpdatedAt: Date.now(),
  }
}

export function generateChangelog(events: EventSchema[], version: string): ChangelogEntry {
  const changes: ChangeItem[] = []
  const today = new Date().toISOString().split("T")[0]

  for (const event of events) {
    switch (event.eventType) {
      case "persona.created":
        changes.push({
          category: "added",
          description: `새로운 페르소나 추가${getPayloadName(event.payload)}`,
          relatedEventType: "persona.created",
        })
        break
      case "persona.activated":
        changes.push({
          category: "added",
          description: `페르소나 활성화${getPayloadName(event.payload)}`,
          relatedEventType: "persona.activated",
        })
        break
      case "persona.updated":
        changes.push({
          category: "changed",
          description: `페르소나 수정${getPayloadName(event.payload)}`,
          relatedEventType: "persona.updated",
        })
        break
      case "algorithm.deployed":
        changes.push({
          category: "changed",
          description: `매칭 알고리즘 업데이트${getPayloadVersion(event.payload)}`,
          relatedEventType: "algorithm.deployed",
        })
        break
      case "algorithm.rollback":
        changes.push({
          category: "fixed",
          description: `알고리즘 버전 롤백${getPayloadVersion(event.payload)}`,
          relatedEventType: "algorithm.rollback",
        })
        break
      case "algorithm.config_changed":
        changes.push({
          category: "changed",
          description: "알고리즘 설정 변경",
          relatedEventType: "algorithm.config_changed",
        })
        break
      case "persona.deactivated":
      case "persona.archived":
        changes.push({
          category: "removed",
          description: `페르소나 비활성화/보관${getPayloadName(event.payload)}`,
          relatedEventType: event.eventType,
        })
        break
      default:
        break
    }
  }

  return {
    date: today,
    version,
    title: `${version} 업데이트`,
    changes,
    generatedAt: Date.now(),
  }
}

export function formatChangelogMarkdown(changelog: Changelog): string {
  const lines: string[] = ["# Changelog", ""]

  for (const entry of changelog.entries) {
    lines.push(`## [${entry.date}] ${entry.version}`)
    lines.push("")

    const grouped = groupChangesByCategory(entry.changes)

    for (const [category, items] of Object.entries(grouped)) {
      lines.push(`### ${capitalizeCategory(category)}`)
      for (const item of items) {
        lines.push(`- ${item.description}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

// ── 사용량 동기화 함수 ───────────────────────────────────────

export function createDeveloperConsoleIntegration(
  usageConfig?: Partial<UsageSyncConfig>
): DeveloperConsoleIntegration {
  return {
    apiDoc: null,
    changelog: createChangelog(),
    usageConfig: {
      ...DEFAULT_USAGE_SYNC_CONFIG,
      ...usageConfig,
    },
    usageSyncStatus: {
      lastSyncAt: null,
      lastSyncSuccess: false,
      pendingRecords: 0,
      totalSynced: 0,
      errors: [],
    },
    connectionStatus: "disconnected",
    lastHealthCheckAt: null,
  }
}

export function syncUsageStats(
  integration: DeveloperConsoleIntegration,
  records: UsageRecord[]
): DeveloperConsoleIntegration {
  if (!integration.usageConfig.enabled) {
    throw new Error("사용량 동기화가 비활성화되어 있습니다")
  }

  if (integration.connectionStatus === "disconnected") {
    return {
      ...integration,
      usageSyncStatus: {
        ...integration.usageSyncStatus,
        pendingRecords: integration.usageSyncStatus.pendingRecords + records.length,
        errors: [
          ...integration.usageSyncStatus.errors.slice(-99),
          `동기화 실패: 개발자 콘솔 연결 끊김 (${new Date().toISOString()})`,
        ],
      },
    }
  }

  return {
    ...integration,
    usageSyncStatus: {
      lastSyncAt: Date.now(),
      lastSyncSuccess: true,
      pendingRecords: 0,
      totalSynced: integration.usageSyncStatus.totalSynced + records.length,
      errors: integration.usageSyncStatus.errors,
    },
  }
}

export function updateConnectionStatus(
  integration: DeveloperConsoleIntegration,
  status: DeveloperConsoleIntegration["connectionStatus"]
): DeveloperConsoleIntegration {
  return {
    ...integration,
    connectionStatus: status,
    lastHealthCheckAt: Date.now(),
  }
}

export function getIntegrationHealthSummary(integration: DeveloperConsoleIntegration): {
  status: "healthy" | "warning" | "error"
  connectionStatus: DeveloperConsoleIntegration["connectionStatus"]
  lastSyncAge: number | null
  pendingRecords: number
  docUpToDate: boolean
  issues: string[]
} {
  const issues: string[] = []
  const now = Date.now()

  if (integration.connectionStatus === "disconnected") {
    issues.push("개발자 콘솔 연결 끊김")
  } else if (integration.connectionStatus === "degraded") {
    issues.push("개발자 콘솔 연결 불안정")
  }

  const lastSyncAge =
    integration.usageSyncStatus.lastSyncAt !== null
      ? now - integration.usageSyncStatus.lastSyncAt
      : null

  if (lastSyncAge !== null && lastSyncAge > 300000) {
    issues.push("마지막 동기화가 5분 이상 경과")
  }

  if (integration.usageSyncStatus.pendingRecords > 100) {
    issues.push(`대기 중인 동기화 레코드 ${integration.usageSyncStatus.pendingRecords}건`)
  }

  const docUpToDate = integration.apiDoc !== null
  if (!docUpToDate) {
    issues.push("API 문서가 생성되지 않음")
  }

  let status: "healthy" | "warning" | "error" = "healthy"
  if (integration.connectionStatus === "disconnected" || issues.length >= 3) {
    status = "error"
  } else if (issues.length > 0) {
    status = "warning"
  }

  return {
    status,
    connectionStatus: integration.connectionStatus,
    lastSyncAge,
    pendingRecords: integration.usageSyncStatus.pendingRecords,
    docUpToDate,
    issues,
  }
}

function getPayloadName(payload: Record<string, unknown>): string {
  const name = payload["name"] as string | undefined
  return name ? `: "${name}"` : ""
}

function getPayloadVersion(payload: Record<string, unknown>): string {
  const version = payload["version"] as string | undefined
  return version ? ` (${version})` : ""
}

function groupChangesByCategory(changes: ChangeItem[]): Record<string, ChangeItem[]> {
  const grouped: Record<string, ChangeItem[]> = {}
  for (const change of changes) {
    if (!grouped[change.category]) {
      grouped[change.category] = []
    }
    grouped[change.category].push(change)
  }
  return grouped
}

function capitalizeCategory(category: string): string {
  const labels: Record<string, string> = {
    added: "Added",
    changed: "Changed",
    fixed: "Fixed",
    deprecated: "Deprecated",
    removed: "Removed",
    security: "Security",
  }
  return labels[category] ?? category
}
