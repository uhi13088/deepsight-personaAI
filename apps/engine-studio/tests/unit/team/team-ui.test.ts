// ═══════════════════════════════════════════════════════════════
// Team & Access — UI Integration Tests
// T101: Users/Roles/AuditLogs 페이지에서 사용하는 lib/team 함수 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // Team management
  createTeam,
  inviteMember,
  deactivateMember,
  reactivateMember,
  listMembers,
  updateMemberRole,
  // Role & permissions
  ROLE_DEFINITIONS,
  getRoleDefinition,
  getPermissionsForRole,
  hasPermission,
  canPerformAction,
  hasAllPermissions,
  hasAnyPermission,
  // Audit log
  createAuditLog,
  recordAuditEntry,
  searchAuditLog,
  exportAuditLog,
  getAuditSummary,
  type TeamState,
  type TeamMember,
  type Role,
  type Permission,
  type AuditLog,
  type AuditLogFilter,
  type AuditAction,
} from "@/lib/team"

// ── Helpers ─────────────────────────────────────────────────────

function makeTeamWithMembers(): TeamState {
  let team = createTeam("DeepSight", "Admin", "admin@deepsight.ai")

  const members: Array<{ email: string; name: string; role: Role }> = [
    { email: "engineer@deepsight.ai", name: "Kim Engineer", role: "ai_engineer" },
    { email: "content@deepsight.ai", name: "Lee Content", role: "content_manager" },
    { email: "analyst@deepsight.ai", name: "Park Analyst", role: "analyst" },
  ]

  for (const m of members) {
    const { team: updated } = inviteMember(team, {
      email: m.email,
      name: m.name,
      role: m.role,
      invitedBy: team.members[0].id,
    })
    team = updated
  }

  // Activate the engineer and content manager
  team = {
    ...team,
    members: team.members.map((m) =>
      m.email === "engineer@deepsight.ai" || m.email === "content@deepsight.ai"
        ? { ...m, status: "active" as const, lastActiveAt: Date.now() }
        : m
    ),
  }

  return team
}

function makeActiveMember(role: Role): TeamMember {
  return {
    id: `member_${Date.now()}_${role}`,
    name: `Test ${role}`,
    email: `${role}@test.com`,
    role,
    status: "active",
    joinedAt: Date.now(),
    lastActiveAt: Date.now(),
  }
}

function makeSampleAuditLog(): AuditLog {
  let log = createAuditLog()

  log = recordAuditEntry(log, {
    actorId: "u1",
    actorName: "Admin",
    action: "team.created",
    targetType: "team",
    targetId: "team_1",
    details: { name: "DeepSight" },
    ip: "192.168.1.1",
  })
  log = recordAuditEntry(log, {
    actorId: "u1",
    actorName: "Admin",
    action: "user.invited",
    targetType: "user",
    targetId: "u2",
    details: { email: "engineer@test.com", role: "ai_engineer" },
    ip: "192.168.1.1",
  })
  log = recordAuditEntry(log, {
    actorId: "u2",
    actorName: "Kim Engineer",
    action: "persona.created",
    targetType: "persona",
    targetId: "p1",
    details: { name: "심층 분석가" },
    ip: "10.0.0.5",
  })
  log = recordAuditEntry(log, {
    actorId: "u2",
    actorName: "Kim Engineer",
    action: "matching.executed",
    targetType: "matching",
    targetId: "match_1",
    details: { mode: "single", score: "0.87" },
    ip: "10.0.0.5",
  })
  log = recordAuditEntry(log, {
    actorId: "u3",
    actorName: "Lee Content",
    action: "content.created",
    targetType: "content",
    targetId: "c1",
    details: { title: "트렌드 리포트" },
  })
  log = recordAuditEntry(log, {
    actorId: "u1",
    actorName: "Admin",
    action: "settings.updated",
    targetType: "settings",
    targetId: "global",
    details: { key: "threshold", value: "0.6" },
  })

  return log
}

// ═══════════════════════════════════════════════════════════════
// Users Page — Team Management Logic
// ═══════════════════════════════════════════════════════════════

describe("Users Page — Team Creation & Initialization", () => {
  it("should create team with owner member", () => {
    const team = createTeam("DeepSight", "Admin", "admin@deepsight.ai")
    expect(team.name).toBe("DeepSight")
    expect(team.members).toHaveLength(1)
    expect(team.members[0].role).toBe("admin")
    expect(team.members[0].status).toBe("active")
    expect(team.members[0].name).toBe("Admin")
  })

  it("should initialize team with multiple sample members", () => {
    const team = makeTeamWithMembers()
    expect(team.members).toHaveLength(4)
    expect(team.members.filter((m) => m.status === "active")).toHaveLength(3)
    expect(team.members.filter((m) => m.status === "invited")).toHaveLength(1)
  })
})

describe("Users Page — Member Invitation", () => {
  it("should successfully invite new member with invited status", () => {
    const team = createTeam("Test", "Owner", "owner@test.com")
    const { team: updated, result } = inviteMember(team, {
      email: "new@test.com",
      name: "New User",
      role: "analyst",
      invitedBy: team.members[0].id,
    })

    expect(result.success).toBe(true)
    expect(result.member).not.toBeNull()
    expect(result.member!.status).toBe("invited")
    expect(result.member!.role).toBe("analyst")
    expect(updated.members).toHaveLength(2)
  })

  it("should reject duplicate email invitation", () => {
    const team = createTeam("Test", "Owner", "owner@test.com")
    const { result } = inviteMember(team, {
      email: "owner@test.com",
      name: "Duplicate",
      role: "analyst",
      invitedBy: team.members[0].id,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.member).toBeNull()
  })

  it("should handle case-insensitive email check", () => {
    const team = createTeam("Test", "Owner", "owner@test.com")
    const { result } = inviteMember(team, {
      email: "OWNER@TEST.COM",
      name: "Same Email",
      role: "analyst",
      invitedBy: team.members[0].id,
    })

    expect(result.success).toBe(false)
  })

  it("should reject invite for deactivated member with specific message", () => {
    let team = makeTeamWithMembers()
    const engineer = team.members.find((m) => m.email === "engineer@deepsight.ai")!
    team = deactivateMember(team, engineer.id)

    const { result } = inviteMember(team, {
      email: "engineer@deepsight.ai",
      name: "Re-invite",
      role: "ai_engineer",
      invitedBy: team.members[0].id,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("비활성화된")
  })
})

describe("Users Page — Member Deactivation/Reactivation", () => {
  it("should deactivate an active member", () => {
    const team = makeTeamWithMembers()
    const engineer = team.members.find((m) => m.email === "engineer@deepsight.ai")!
    const updated = deactivateMember(team, engineer.id)
    const deactivated = updated.members.find((m) => m.id === engineer.id)!
    expect(deactivated.status).toBe("deactivated")
  })

  it("should throw when deactivating already deactivated member", () => {
    let team = makeTeamWithMembers()
    const engineer = team.members.find((m) => m.email === "engineer@deepsight.ai")!
    team = deactivateMember(team, engineer.id)
    expect(() => deactivateMember(team, engineer.id)).toThrow("이미 비활성화")
  })

  it("should prevent deactivating last admin", () => {
    const team = createTeam("Test", "Admin", "admin@test.com")
    expect(() => deactivateMember(team, team.members[0].id)).toThrow("마지막 관리자")
  })

  it("should reactivate a deactivated member", () => {
    let team = makeTeamWithMembers()
    const engineer = team.members.find((m) => m.email === "engineer@deepsight.ai")!
    team = deactivateMember(team, engineer.id)
    team = reactivateMember(team, engineer.id)
    const reactivated = team.members.find((m) => m.id === engineer.id)!
    expect(reactivated.status).toBe("active")
  })

  it("should throw when reactivating active member", () => {
    const team = makeTeamWithMembers()
    const admin = team.members[0]
    expect(() => reactivateMember(team, admin.id)).toThrow("비활성화 상태가 아닌")
  })
})

describe("Users Page — Member Listing with Filters", () => {
  it("should list all members sorted by name", () => {
    const team = makeTeamWithMembers()
    const members = listMembers(team)
    expect(members).toHaveLength(4)
    // Verify sorted by name
    for (let i = 1; i < members.length; i++) {
      expect(members[i].name.localeCompare(members[i - 1].name)).toBeGreaterThanOrEqual(0)
    }
  })

  it("should filter members by role", () => {
    const team = makeTeamWithMembers()
    const admins = listMembers(team, { roles: ["admin"], statuses: null, keyword: null })
    expect(admins).toHaveLength(1)
    expect(admins[0].role).toBe("admin")
  })

  it("should filter members by status", () => {
    const team = makeTeamWithMembers()
    const invited = listMembers(team, { roles: null, statuses: ["invited"], keyword: null })
    expect(invited).toHaveLength(1)
    expect(invited[0].status).toBe("invited")
  })

  it("should filter members by keyword in name", () => {
    const team = makeTeamWithMembers()
    const results = listMembers(team, { roles: null, statuses: null, keyword: "Kim" })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("Kim Engineer")
  })

  it("should filter members by keyword in email", () => {
    const team = makeTeamWithMembers()
    const results = listMembers(team, { roles: null, statuses: null, keyword: "content@" })
    expect(results).toHaveLength(1)
    expect(results[0].email).toBe("content@deepsight.ai")
  })

  it("should return empty for no matching filters", () => {
    const team = makeTeamWithMembers()
    const results = listMembers(team, { roles: null, statuses: null, keyword: "nonexistent" })
    expect(results).toHaveLength(0)
  })
})

describe("Users Page — Role Update", () => {
  it("should change member role successfully", () => {
    const team = makeTeamWithMembers()
    const engineer = team.members.find((m) => m.email === "engineer@deepsight.ai")!
    const updated = updateMemberRole(team, engineer.id, "content_manager")
    const changed = updated.members.find((m) => m.id === engineer.id)!
    expect(changed.role).toBe("content_manager")
  })

  it("should prevent changing last admin's role", () => {
    const team = createTeam("Test", "Admin", "admin@test.com")
    expect(() => updateMemberRole(team, team.members[0].id, "analyst")).toThrow("마지막 관리자")
  })

  it("should prevent role change for invited (non-active) member", () => {
    const team = makeTeamWithMembers()
    const analyst = team.members.find((m) => m.email === "analyst@deepsight.ai")!
    expect(analyst.status).toBe("invited")
    expect(() => updateMemberRole(team, analyst.id, "admin")).toThrow("활성 상태의 멤버만")
  })
})

// ═══════════════════════════════════════════════════════════════
// Roles Page — Role Definitions & Permissions
// ═══════════════════════════════════════════════════════════════

describe("Roles Page — Role Definitions", () => {
  it("should have exactly 4 role definitions", () => {
    expect(ROLE_DEFINITIONS).toHaveLength(4)
  })

  it("should include all 4 role types", () => {
    const roles = ROLE_DEFINITIONS.map((d) => d.role)
    expect(roles).toContain("admin")
    expect(roles).toContain("ai_engineer")
    expect(roles).toContain("content_manager")
    expect(roles).toContain("analyst")
  })

  it("each role should have label and description", () => {
    for (const rd of ROLE_DEFINITIONS) {
      expect(rd.label.length).toBeGreaterThan(0)
      expect(rd.description.length).toBeGreaterThan(0)
      expect(rd.permissions.length).toBeGreaterThan(0)
    }
  })

  it("admin should have most permissions", () => {
    const adminPerms = getPermissionsForRole("admin")
    const analystPerms = getPermissionsForRole("analyst")
    expect(adminPerms.length).toBeGreaterThan(analystPerms.length)
  })
})

describe("Roles Page — Permission Checking", () => {
  it("hasPermission: admin has team:invite", () => {
    const admin = makeActiveMember("admin")
    expect(hasPermission(admin, "team:invite")).toBe(true)
  })

  it("hasPermission: analyst does not have team:invite", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasPermission(analyst, "team:invite")).toBe(false)
  })

  it("hasPermission: deactivated member has no permissions", () => {
    const member: TeamMember = { ...makeActiveMember("admin"), status: "deactivated" }
    expect(hasPermission(member, "team:invite")).toBe(false)
  })

  it("hasPermission: invited member has no permissions", () => {
    const member: TeamMember = { ...makeActiveMember("admin"), status: "invited" }
    expect(hasPermission(member, "team:invite")).toBe(false)
  })

  it("canPerformAction delegates to hasPermission", () => {
    const admin = makeActiveMember("admin")
    expect(canPerformAction(admin, "persona:create")).toBe(true)
    const analyst = makeActiveMember("analyst")
    expect(canPerformAction(analyst, "persona:create")).toBe(false)
  })

  it("hasAllPermissions: true when all permissions granted", () => {
    const admin = makeActiveMember("admin")
    expect(hasAllPermissions(admin, ["team:invite", "persona:create", "content:read"])).toBe(true)
  })

  it("hasAllPermissions: false when any permission missing", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasAllPermissions(analyst, ["analytics:view_dashboard", "team:invite"])).toBe(false)
  })

  it("hasAnyPermission: true when at least one granted", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasAnyPermission(analyst, ["team:invite", "analytics:view_dashboard"])).toBe(true)
  })

  it("hasAnyPermission: false when none granted", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasAnyPermission(analyst, ["team:invite", "team:deactivate"])).toBe(false)
  })
})

describe("Roles Page — Permission Matrix", () => {
  it("ai_engineer should have full persona CRUD", () => {
    const perms = getPermissionsForRole("ai_engineer")
    expect(perms).toContain("persona:create")
    expect(perms).toContain("persona:read")
    expect(perms).toContain("persona:update")
    expect(perms).toContain("persona:delete")
  })

  it("content_manager should have full content CRUD but not persona:create", () => {
    const perms = getPermissionsForRole("content_manager")
    expect(perms).toContain("content:create")
    expect(perms).toContain("content:publish")
    expect(perms).not.toContain("persona:create")
  })

  it("analyst should have analytics but not content:create", () => {
    const perms = getPermissionsForRole("analyst")
    expect(perms).toContain("analytics:view_dashboard")
    expect(perms).toContain("analytics:create_report")
    expect(perms).not.toContain("content:create")
  })
})

// ═══════════════════════════════════════════════════════════════
// Audit Logs Page — Audit Log Operations
// ═══════════════════════════════════════════════════════════════

describe("Audit Logs Page — Log Creation & Recording", () => {
  it("should create empty audit log", () => {
    const log = createAuditLog()
    expect(log.entries).toHaveLength(0)
    expect(log.totalCount).toBe(0)
  })

  it("should record audit entry with correct fields", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "user.invited",
      targetType: "user",
      targetId: "u2",
      details: { email: "new@test.com" },
      ip: "192.168.1.1",
    })

    expect(log.entries).toHaveLength(1)
    expect(log.totalCount).toBe(1)
    const entry = log.entries[0]
    expect(entry.actorId).toBe("u1")
    expect(entry.action).toBe("user.invited")
    expect(entry.targetType).toBe("user")
    expect(entry.details.email).toBe("new@test.com")
    expect(entry.ip).toBe("192.168.1.1")
    expect(entry.id).toMatch(/^audit_/)
  })

  it("should record multiple entries incrementally", () => {
    const log = makeSampleAuditLog()
    expect(log.totalCount).toBe(6)
    expect(log.entries).toHaveLength(6)
  })
})

describe("Audit Logs Page — Search with Filters", () => {
  it("should filter by actor", () => {
    const log = makeSampleAuditLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: ["u2"],
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.entries.every((e) => e.actorId === "u2")).toBe(true)
    expect(result.totalCount).toBe(2) // persona.created + matching.executed
  })

  it("should filter by action type", () => {
    const log = makeSampleAuditLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: ["user.invited"],
      targetTypes: null,
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.totalCount).toBe(1)
    expect(result.entries[0].action).toBe("user.invited")
  })

  it("should filter by target type", () => {
    const log = makeSampleAuditLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: ["persona"],
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.entries.every((e) => e.targetType === "persona")).toBe(true)
  })

  it("should filter by keyword in details", () => {
    const log = makeSampleAuditLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: "분석가",
      limit: 100,
      offset: 0,
    })
    expect(result.totalCount).toBeGreaterThanOrEqual(1)
  })

  it("should return all entries when no filters applied", () => {
    const log = makeSampleAuditLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.totalCount).toBe(6)
  })

  it("should paginate results correctly", () => {
    const log = makeSampleAuditLog()
    const page1 = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 3,
      offset: 0,
    })
    expect(page1.entries).toHaveLength(3)
    expect(page1.totalCount).toBe(6)

    const page2 = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 3,
      offset: 3,
    })
    expect(page2.entries).toHaveLength(3)
  })
})

describe("Audit Logs Page — CSV Export", () => {
  it("should export all entries as CSV", () => {
    const log = makeSampleAuditLog()
    const csv = exportAuditLog(log)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("id,timestamp,actorId,actorName,action,targetType,targetId,details,ip")
    expect(lines.length).toBe(7) // header + 6 data rows
  })

  it("should export filtered entries as CSV", () => {
    const log = makeSampleAuditLog()
    const csv = exportAuditLog(log, {
      dateRange: null,
      actors: ["u1"],
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 100,
      offset: 0,
    })
    const lines = csv.split("\n")
    // header + entries for u1 (team.created, user.invited, settings.updated = 3)
    expect(lines.length).toBe(4)
  })

  it("should contain correct CSV data fields", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
      details: { name: "TestPersona" },
    })
    const csv = exportAuditLog(log)
    expect(csv).toContain("persona.created")
    expect(csv).toContain("name=TestPersona")
  })
})

describe("Audit Logs Page — Summary Stats", () => {
  it("should calculate correct total entries", () => {
    const log = makeSampleAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.totalEntries).toBe(6)
  })

  it("should calculate action counts", () => {
    const log = makeSampleAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.actionCounts["team.created"]).toBe(1)
    expect(summary.actionCounts["user.invited"]).toBe(1)
  })

  it("should identify top actors", () => {
    const log = makeSampleAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.topActors.length).toBeGreaterThan(0)
    // Admin (u1) has 3 entries, Kim Engineer (u2) has 2
    expect(summary.topActors[0].actorId).toBe("u1")
    expect(summary.topActors[0].count).toBe(3)
  })

  it("should calculate target type counts", () => {
    const log = makeSampleAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.targetTypeCounts["user"]).toBe(1)
    expect(summary.targetTypeCounts["persona"]).toBe(1)
    expect(summary.targetTypeCounts["team"]).toBe(1)
  })

  it("should include period start and end", () => {
    const log = makeSampleAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.periodStart).not.toBeNull()
    expect(summary.periodEnd).not.toBeNull()
    expect(summary.periodStart!).toBeLessThanOrEqual(summary.periodEnd!)
  })

  it("should return empty summary for empty log", () => {
    const log = createAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.totalEntries).toBe(0)
    expect(summary.topActors).toHaveLength(0)
    expect(summary.periodStart).toBeNull()
    expect(summary.periodEnd).toBeNull()
  })

  it("should include recent activity", () => {
    const log = makeSampleAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.recentActivity.length).toBeLessThanOrEqual(10)
    expect(summary.recentActivity.length).toBe(6)
    // Recent activity should be sorted newest first
    for (let i = 1; i < summary.recentActivity.length; i++) {
      expect(summary.recentActivity[i].timestamp).toBeLessThanOrEqual(
        summary.recentActivity[i - 1].timestamp
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("should throw for non-existent member deactivation", () => {
    const team = createTeam("Test", "Admin", "admin@test.com")
    expect(() => deactivateMember(team, "fake_id")).toThrow("멤버를 찾을 수 없습니다")
  })

  it("should throw for non-existent member reactivation", () => {
    const team = createTeam("Test", "Admin", "admin@test.com")
    expect(() => reactivateMember(team, "fake_id")).toThrow("멤버를 찾을 수 없습니다")
  })

  it("should handle empty filter gracefully", () => {
    const team = createTeam("Test", "Admin", "admin@test.com")
    const members = listMembers(team, { roles: [], statuses: [], keyword: "" })
    expect(members).toHaveLength(1) // Empty arrays treated as no filter
  })

  it("getPermissionsForRole returns array copy", () => {
    const perms1 = getPermissionsForRole("admin")
    const perms2 = getPermissionsForRole("admin")
    expect(perms1).toEqual(perms2)
    expect(perms1).not.toBe(perms2) // Different references
  })

  it("getRoleDefinition throws for invalid role", () => {
    expect(() => getRoleDefinition("invalid" as Role)).toThrow("알 수 없는 역할")
  })
})
