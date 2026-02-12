// ═══════════════════════════════════════════════════════════════
// Team & Access Management Module
// T69: 팀 & 접근 관리 — 사용자 관리, 역할 권한, 감사 로그
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AC1: 사용자 관리 (목록, 초대, 비활성화)
// ═══════════════════════════════════════════════════════════════

// ── 사용자 상태 및 타입 정의 ────────────────────────────────────

export type UserStatus = "active" | "invited" | "deactivated"

export interface TeamMember {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  joinedAt: number
  lastActiveAt: number | null
}

export interface InviteRequest {
  email: string
  name: string
  role: Role
  invitedBy: string
}

export interface InviteResult {
  success: boolean
  member: TeamMember | null
  error: string | null
}

export interface TeamState {
  id: string
  name: string
  members: TeamMember[]
  createdAt: number
  updatedAt: number
}

// ── 팀 멤버 필터 ─────────────────────────────────────────────

export interface MemberFilter {
  roles: Role[] | null
  statuses: UserStatus[] | null
  keyword: string | null
}

// ── 팀 생성 ────────────────────────────────────────────────────

export function createTeam(name: string, ownerName: string, ownerEmail: string): TeamState {
  const now = Date.now()
  const owner: TeamMember = {
    id: `member_${now}_owner`,
    name: ownerName,
    email: ownerEmail,
    role: "admin",
    status: "active",
    joinedAt: now,
    lastActiveAt: now,
  }

  return {
    id: `team_${now}`,
    name,
    members: [owner],
    createdAt: now,
    updatedAt: now,
  }
}

// ── 멤버 초대 ──────────────────────────────────────────────────

export function inviteMember(
  team: TeamState,
  request: InviteRequest
): { team: TeamState; result: InviteResult } {
  // 이메일 중복 확인
  const existing = team.members.find((m) => m.email.toLowerCase() === request.email.toLowerCase())
  if (existing) {
    if (existing.status === "deactivated") {
      return {
        team,
        result: {
          success: false,
          member: null,
          error: `비활성화된 사용자입니다. 재활성화를 사용하세요: ${request.email}`,
        },
      }
    }
    return {
      team,
      result: {
        success: false,
        member: null,
        error: `이미 존재하는 이메일입니다: ${request.email}`,
      },
    }
  }

  const now = Date.now()
  const newMember: TeamMember = {
    id: `member_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: request.name,
    email: request.email,
    role: request.role,
    status: "invited",
    joinedAt: now,
    lastActiveAt: null,
  }

  const updatedTeam: TeamState = {
    ...team,
    members: [...team.members, newMember],
    updatedAt: now,
  }

  return {
    team: updatedTeam,
    result: {
      success: true,
      member: newMember,
      error: null,
    },
  }
}

// ── 멤버 비활성화 ──────────────────────────────────────────────

export function deactivateMember(team: TeamState, memberId: string): TeamState {
  const member = team.members.find((m) => m.id === memberId)
  if (!member) {
    throw new Error(`멤버를 찾을 수 없습니다: ${memberId}`)
  }
  if (member.status === "deactivated") {
    throw new Error(`이미 비활성화된 멤버입니다: ${memberId}`)
  }

  // admin이 마지막 1명이면 비활성화 불가
  const activeAdmins = team.members.filter(
    (m) => m.role === "admin" && m.status === "active" && m.id !== memberId
  )
  if (member.role === "admin" && activeAdmins.length === 0) {
    throw new Error("마지막 관리자는 비활성화할 수 없습니다. 다른 관리자를 먼저 지정하세요")
  }

  const now = Date.now()
  return {
    ...team,
    members: team.members.map((m) =>
      m.id === memberId ? { ...m, status: "deactivated" as const, lastActiveAt: now } : m
    ),
    updatedAt: now,
  }
}

// ── 멤버 재활성화 ──────────────────────────────────────────────

export function reactivateMember(team: TeamState, memberId: string): TeamState {
  const member = team.members.find((m) => m.id === memberId)
  if (!member) {
    throw new Error(`멤버를 찾을 수 없습니다: ${memberId}`)
  }
  if (member.status !== "deactivated") {
    throw new Error(
      `비활성화 상태가 아닌 멤버는 재활성화할 수 없습니다: ${memberId} (현재: ${member.status})`
    )
  }

  const now = Date.now()
  return {
    ...team,
    members: team.members.map((m) =>
      m.id === memberId ? { ...m, status: "active" as const, lastActiveAt: now } : m
    ),
    updatedAt: now,
  }
}

// ── 멤버 목록 조회 (필터링) ───────────────────────────────────

export function listMembers(team: TeamState, filter?: MemberFilter): TeamMember[] {
  let result = [...team.members]

  if (filter) {
    if (filter.roles !== null && filter.roles.length > 0) {
      result = result.filter((m) => filter.roles!.includes(m.role))
    }
    if (filter.statuses !== null && filter.statuses.length > 0) {
      result = result.filter((m) => filter.statuses!.includes(m.status))
    }
    if (filter.keyword !== null && filter.keyword.length > 0) {
      const kw = filter.keyword.toLowerCase()
      result = result.filter(
        (m) => m.name.toLowerCase().includes(kw) || m.email.toLowerCase().includes(kw)
      )
    }
  }

  // 이름순 정렬
  result.sort((a, b) => a.name.localeCompare(b.name))

  return result
}

// ═══════════════════════════════════════════════════════════════
// AC2: 역할 권한 (Admin/AI Engineer/Content Manager/Analyst 4종)
// ═══════════════════════════════════════════════════════════════

// ── 역할 및 권한 타입 정의 ─────────────────────────────────────

export type Role = "admin" | "ai_engineer" | "content_manager" | "analyst"

export type Permission =
  // 페르소나 관련
  | "persona:create"
  | "persona:read"
  | "persona:update"
  | "persona:delete"
  | "persona:publish"
  // 매칭 엔진
  | "matching:execute"
  | "matching:configure"
  | "matching:read_results"
  // 콘텐츠 관련
  | "content:create"
  | "content:read"
  | "content:update"
  | "content:delete"
  | "content:publish"
  // 분석/리포트
  | "analytics:view_dashboard"
  | "analytics:export_data"
  | "analytics:create_report"
  // 테스트
  | "test:execute"
  | "test:configure"
  | "test:read_results"
  // 설정 관리
  | "settings:manage"
  | "settings:view"
  // 팀 관리
  | "team:invite"
  | "team:manage_roles"
  | "team:deactivate"
  | "team:view_members"
  // 감사 로그
  | "audit:view"
  | "audit:export"
  // API 관리
  | "api:manage_keys"
  | "api:view_keys"
  | "api:configure_endpoints"
  // 모델/LLM 설정
  | "model:configure"
  | "model:view_config"
  | "model:view_cost"
  // 노드 그래프
  | "node_graph:create"
  | "node_graph:read"
  | "node_graph:update"
  | "node_graph:delete"
  | "node_graph:execute"

export interface RoleDefinition {
  role: Role
  label: string
  description: string
  permissions: Permission[]
}

// ── 권한 매트릭스: 4종 역할 정의 ──────────────────────────────

/**
 * Admin: 모든 권한. 팀/설정/모델/API 전체 관리.
 * AI Engineer: 페르소나/매칭/노드그래프/테스트/모델 설정. 팀 관리 불가.
 * Content Manager: 콘텐츠/페르소나 읽기/매칭 결과 확인. 엔진 설정 불가.
 * Analyst: 읽기 전용 + 분석/리포트/데이터 내보내기.
 */
export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    role: "admin",
    label: "관리자",
    description: "모든 기능에 대한 전체 접근 권한. 팀 관리, 설정, 모델, API 관리 포함",
    permissions: [
      // 페르소나
      "persona:create",
      "persona:read",
      "persona:update",
      "persona:delete",
      "persona:publish",
      // 매칭
      "matching:execute",
      "matching:configure",
      "matching:read_results",
      // 콘텐츠
      "content:create",
      "content:read",
      "content:update",
      "content:delete",
      "content:publish",
      // 분석
      "analytics:view_dashboard",
      "analytics:export_data",
      "analytics:create_report",
      // 테스트
      "test:execute",
      "test:configure",
      "test:read_results",
      // 설정
      "settings:manage",
      "settings:view",
      // 팀
      "team:invite",
      "team:manage_roles",
      "team:deactivate",
      "team:view_members",
      // 감사
      "audit:view",
      "audit:export",
      // API
      "api:manage_keys",
      "api:view_keys",
      "api:configure_endpoints",
      // 모델
      "model:configure",
      "model:view_config",
      "model:view_cost",
      // 노드 그래프
      "node_graph:create",
      "node_graph:read",
      "node_graph:update",
      "node_graph:delete",
      "node_graph:execute",
    ],
  },
  {
    role: "ai_engineer",
    label: "AI 엔지니어",
    description: "페르소나 엔진, 매칭, 노드 그래프, 테스트 관련 전체 권한. 팀 관리 불가",
    permissions: [
      // 페르소나 — 전체 CRUD
      "persona:create",
      "persona:read",
      "persona:update",
      "persona:delete",
      "persona:publish",
      // 매칭 — 전체
      "matching:execute",
      "matching:configure",
      "matching:read_results",
      // 콘텐츠 — 읽기만
      "content:read",
      // 분석 — 대시보드, 리포트
      "analytics:view_dashboard",
      "analytics:export_data",
      "analytics:create_report",
      // 테스트 — 전체
      "test:execute",
      "test:configure",
      "test:read_results",
      // 설정 — 읽기만
      "settings:view",
      // 팀 — 멤버 조회만
      "team:view_members",
      // 감사 — 읽기만
      "audit:view",
      // API — 키 조회, 엔드포인트 설정
      "api:view_keys",
      "api:configure_endpoints",
      // 모델 — 설정 및 조회
      "model:configure",
      "model:view_config",
      "model:view_cost",
      // 노드 그래프 — 전체
      "node_graph:create",
      "node_graph:read",
      "node_graph:update",
      "node_graph:delete",
      "node_graph:execute",
    ],
  },
  {
    role: "content_manager",
    label: "콘텐츠 매니저",
    description: "콘텐츠 관리 전체 권한. 페르소나/매칭 결과 읽기. 엔진 설정 불가",
    permissions: [
      // 페르소나 — 읽기만
      "persona:read",
      // 매칭 — 결과 확인만
      "matching:read_results",
      // 콘텐츠 — 전체 CRUD
      "content:create",
      "content:read",
      "content:update",
      "content:delete",
      "content:publish",
      // 분석 — 대시보드
      "analytics:view_dashboard",
      "analytics:export_data",
      // 테스트 — 결과 확인만
      "test:read_results",
      // 설정 — 읽기만
      "settings:view",
      // 팀 — 멤버 조회만
      "team:view_members",
      // 감사 — 읽기만
      "audit:view",
      // API — 키 조회만
      "api:view_keys",
      // 모델 — 조회만
      "model:view_config",
      "model:view_cost",
      // 노드 그래프 — 읽기만
      "node_graph:read",
    ],
  },
  {
    role: "analyst",
    label: "분석가",
    description: "읽기 전용 접근. 분석 대시보드, 리포트 생성, 데이터 내보내기 가능",
    permissions: [
      // 페르소나 — 읽기만
      "persona:read",
      // 매칭 — 결과 확인만
      "matching:read_results",
      // 콘텐츠 — 읽기만
      "content:read",
      // 분석 — 전체 (핵심 역할)
      "analytics:view_dashboard",
      "analytics:export_data",
      "analytics:create_report",
      // 테스트 — 결과 확인만
      "test:read_results",
      // 설정 — 읽기만
      "settings:view",
      // 팀 — 멤버 조회만
      "team:view_members",
      // 감사 — 읽기 + 내보내기
      "audit:view",
      "audit:export",
      // API — 키 조회만
      "api:view_keys",
      // 모델 — 비용 조회
      "model:view_config",
      "model:view_cost",
      // 노드 그래프 — 읽기만
      "node_graph:read",
    ],
  },
] as const

// ── 권한 확인 함수 ────────────────────────────────────────────

export function getRoleDefinition(role: Role): RoleDefinition {
  const definition = ROLE_DEFINITIONS.find((d) => d.role === role)
  if (!definition) {
    throw new Error(`알 수 없는 역할입니다: ${role}`)
  }
  return definition
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...getRoleDefinition(role).permissions]
}

export function hasPermission(member: TeamMember, permission: Permission): boolean {
  // 비활성화 또는 초대 상태의 멤버는 권한 없음
  if (member.status !== "active") {
    return false
  }

  const definition = getRoleDefinition(member.role)
  return definition.permissions.includes(permission)
}

export function canPerformAction(member: TeamMember, action: Permission): boolean {
  return hasPermission(member, action)
}

/**
 * 여러 권한을 동시에 확인 (AND 조건)
 */
export function hasAllPermissions(member: TeamMember, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(member, p))
}

/**
 * 여러 권한 중 하나라도 있는지 확인 (OR 조건)
 */
export function hasAnyPermission(member: TeamMember, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(member, p))
}

// ── 역할 변경 ──────────────────────────────────────────────────

export function updateMemberRole(team: TeamState, memberId: string, newRole: Role): TeamState {
  const member = team.members.find((m) => m.id === memberId)
  if (!member) {
    throw new Error(`멤버를 찾을 수 없습니다: ${memberId}`)
  }
  if (member.status !== "active") {
    throw new Error(
      `활성 상태의 멤버만 역할을 변경할 수 있습니다: ${memberId} (현재: ${member.status})`
    )
  }

  // admin → 다른 역할 전환 시, 마지막 admin이면 불가
  if (member.role === "admin" && newRole !== "admin") {
    const otherActiveAdmins = team.members.filter(
      (m) => m.role === "admin" && m.status === "active" && m.id !== memberId
    )
    if (otherActiveAdmins.length === 0) {
      throw new Error("마지막 관리자의 역할을 변경할 수 없습니다. 다른 관리자를 먼저 지정하세요")
    }
  }

  const now = Date.now()
  return {
    ...team,
    members: team.members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
    updatedAt: now,
  }
}

// ═══════════════════════════════════════════════════════════════
// AC3: 감사 로그 (전체 작업 기록, 필터링, 내보내기)
// ═══════════════════════════════════════════════════════════════

// ── 감사 로그 타입 정의 ────────────────────────────────────────

export type AuditAction =
  // 사용자 관련
  | "user.invited"
  | "user.activated"
  | "user.deactivated"
  | "user.reactivated"
  | "user.role_changed"
  // 페르소나 관련
  | "persona.created"
  | "persona.updated"
  | "persona.deleted"
  | "persona.published"
  // 매칭 관련
  | "matching.executed"
  | "matching.configured"
  // 콘텐츠 관련
  | "content.created"
  | "content.updated"
  | "content.deleted"
  | "content.published"
  // 설정 관련
  | "settings.updated"
  | "model.configured"
  | "api.key_created"
  | "api.key_revoked"
  | "api.endpoint_configured"
  // 테스트 관련
  | "test.executed"
  | "test.configured"
  // 노드 그래프
  | "node_graph.created"
  | "node_graph.updated"
  | "node_graph.deleted"
  | "node_graph.executed"
  // 팀 관련
  | "team.created"
  | "team.updated"

export type AuditTargetType =
  | "user"
  | "persona"
  | "content"
  | "matching"
  | "settings"
  | "api"
  | "test"
  | "node_graph"
  | "model"
  | "team"

export interface AuditLogEntry {
  id: string
  timestamp: number
  actorId: string
  actorName: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  details: Record<string, string>
  ip: string | null
}

export interface AuditLogFilter {
  dateRange: { start: number; end: number } | null
  actors: string[] | null
  actions: AuditAction[] | null
  targetTypes: AuditTargetType[] | null
  keyword: string | null
  limit: number
  offset: number
}

export interface AuditLog {
  entries: AuditLogEntry[]
  totalCount: number
}

export interface AuditSummary {
  totalEntries: number
  actionCounts: Partial<Record<AuditAction, number>>
  topActors: Array<{ actorId: string; actorName: string; count: number }>
  recentActivity: AuditLogEntry[]
  targetTypeCounts: Partial<Record<AuditTargetType, number>>
  periodStart: number | null
  periodEnd: number | null
}

// ── 감사 로그 기록 ────────────────────────────────────────────

export function recordAuditEntry(
  auditLog: AuditLog,
  params: {
    actorId: string
    actorName: string
    action: AuditAction
    targetType: AuditTargetType
    targetId: string
    details?: Record<string, string>
    ip?: string
  }
): AuditLog {
  const now = Date.now()
  const entry: AuditLogEntry = {
    id: `audit_${now}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    actorId: params.actorId,
    actorName: params.actorName,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    details: params.details ?? {},
    ip: params.ip ?? null,
  }

  return {
    entries: [...auditLog.entries, entry],
    totalCount: auditLog.totalCount + 1,
  }
}

// ── 감사 로그 검색 ────────────────────────────────────────────

export function searchAuditLog(auditLog: AuditLog, filter: AuditLogFilter): AuditLog {
  let filtered = [...auditLog.entries]

  // 날짜 범위
  if (filter.dateRange !== null) {
    filtered = filtered.filter(
      (e) => e.timestamp >= filter.dateRange!.start && e.timestamp <= filter.dateRange!.end
    )
  }

  // 행위자 필터
  if (filter.actors !== null && filter.actors.length > 0) {
    filtered = filtered.filter((e) => filter.actors!.includes(e.actorId))
  }

  // 액션 필터
  if (filter.actions !== null && filter.actions.length > 0) {
    filtered = filtered.filter((e) => filter.actions!.includes(e.action))
  }

  // 대상 타입 필터
  if (filter.targetTypes !== null && filter.targetTypes.length > 0) {
    filtered = filtered.filter((e) => filter.targetTypes!.includes(e.targetType))
  }

  // 키워드 필터 (details 값, actorName, targetId에서 검색)
  if (filter.keyword !== null && filter.keyword.length > 0) {
    const kw = filter.keyword.toLowerCase()
    filtered = filtered.filter((e) => {
      const detailValues = Object.values(e.details).join(" ").toLowerCase()
      return (
        e.actorName.toLowerCase().includes(kw) ||
        e.targetId.toLowerCase().includes(kw) ||
        e.action.toLowerCase().includes(kw) ||
        detailValues.includes(kw)
      )
    })
  }

  // 최신순 정렬
  filtered.sort((a, b) => b.timestamp - a.timestamp)

  const totalCount = filtered.length

  // 페이지네이션
  const paginated = filtered.slice(filter.offset, filter.offset + filter.limit)

  return {
    entries: paginated,
    totalCount,
  }
}

// ── 감사 로그 내보내기 (CSV) ──────────────────────────────────

export function exportAuditLog(auditLog: AuditLog, filter?: AuditLogFilter): string {
  // 필터가 있으면 적용, 없으면 전체 내보내기
  const targetLog = filter ? searchAuditLog(auditLog, filter) : auditLog

  const header = "id,timestamp,actorId,actorName,action,targetType,targetId,details,ip"

  const rows = targetLog.entries.map((entry) => {
    const detailsStr = Object.entries(entry.details)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")

    return [
      escapeCSV(entry.id),
      new Date(entry.timestamp).toISOString(),
      escapeCSV(entry.actorId),
      escapeCSV(entry.actorName),
      entry.action,
      entry.targetType,
      escapeCSV(entry.targetId),
      escapeCSV(detailsStr),
      entry.ip ?? "",
    ].join(",")
  })

  return [header, ...rows].join("\n")
}

// ── 감사 로그 요약 ────────────────────────────────────────────

export function getAuditSummary(
  auditLog: AuditLog,
  topActorCount: number = 5,
  recentCount: number = 10
): AuditSummary {
  const entries = auditLog.entries

  // 액션별 카운트
  const actionCounts: Partial<Record<AuditAction, number>> = {}
  for (const entry of entries) {
    actionCounts[entry.action] = (actionCounts[entry.action] ?? 0) + 1
  }

  // 대상 타입별 카운트
  const targetTypeCounts: Partial<Record<AuditTargetType, number>> = {}
  for (const entry of entries) {
    targetTypeCounts[entry.targetType] = (targetTypeCounts[entry.targetType] ?? 0) + 1
  }

  // Top actors
  const actorMap = new Map<string, { actorName: string; count: number }>()
  for (const entry of entries) {
    const existing = actorMap.get(entry.actorId)
    if (existing) {
      existing.count++
    } else {
      actorMap.set(entry.actorId, { actorName: entry.actorName, count: 1 })
    }
  }

  const topActors = Array.from(actorMap.entries())
    .map(([actorId, data]) => ({
      actorId,
      actorName: data.actorName,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topActorCount)

  // 최근 활동 (최신순)
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)
  const recentActivity = sorted.slice(0, recentCount)

  // 기간 범위
  let periodStart: number | null = null
  let periodEnd: number | null = null
  if (entries.length > 0) {
    periodStart = entries.reduce(
      (min, e) => (e.timestamp < min ? e.timestamp : min),
      entries[0].timestamp
    )
    periodEnd = entries.reduce(
      (max, e) => (e.timestamp > max ? e.timestamp : max),
      entries[0].timestamp
    )
  }

  return {
    totalEntries: entries.length,
    actionCounts,
    topActors,
    recentActivity,
    targetTypeCounts,
    periodStart,
    periodEnd,
  }
}

// ── 빈 감사 로그 생성 ────────────────────────────────────────

export function createAuditLog(): AuditLog {
  return {
    entries: [],
    totalCount: 0,
  }
}

// ═══════════════════════════════════════════════════════════════
// 내부 유틸리티
// ═══════════════════════════════════════════════════════════════

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
