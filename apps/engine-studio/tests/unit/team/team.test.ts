// ═══════════════════════════════════════════════════════════════
// Team & Access Management Tests
// T69: team creation, member invite/deactivate, role permissions,
//      hasPermission, audit log recording/search/export
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // Team
  createTeam,
  inviteMember,
  deactivateMember,
  reactivateMember,
  listMembers,
  updateMemberRole,
  // Permissions
  getRoleDefinition,
  getPermissionsForRole,
  hasPermission,
  canPerformAction,
  hasAllPermissions,
  hasAnyPermission,
  ROLE_DEFINITIONS,
  // Audit
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
} from "@/lib/team"

// ── Helpers ─────────────────────────────────────────────────────

function makeTeam(): TeamState {
  return createTeam("DeepSight", "Admin Kim", "admin@deepsight.ai")
}

function makeActiveMember(role: Role): TeamMember {
  return {
    id: `member_${Date.now()}_test`,
    name: "Test User",
    email: "test@deepsight.ai",
    role,
    status: "active",
    joinedAt: Date.now(),
    lastActiveAt: Date.now(),
  }
}

// ═══════════════════════════════════════════════════════════════
// AC1: Team Management
// ═══════════════════════════════════════════════════════════════

describe("Team — createTeam", () => {
  it("should create a team with owner as admin", () => {
    const team = makeTeam()
    expect(team.id).toMatch(/^team_/)
    expect(team.name).toBe("DeepSight")
    expect(team.members).toHaveLength(1)
    expect(team.members[0].role).toBe("admin")
    expect(team.members[0].status).toBe("active")
    expect(team.members[0].email).toBe("admin@deepsight.ai")
  })
})

describe("Team — inviteMember", () => {
  it("should invite a new member", () => {
    const team = makeTeam()
    const { team: updated, result } = inviteMember(team, {
      email: "new@deepsight.ai",
      name: "New User",
      role: "ai_engineer",
      invitedBy: team.members[0].id,
    })
    expect(result.success).toBe(true)
    expect(result.member).not.toBeNull()
    expect(result.member!.status).toBe("invited")
    expect(updated.members).toHaveLength(2)
  })

  it("should reject duplicate email (active)", () => {
    const team = makeTeam()
    const { result } = inviteMember(team, {
      email: "admin@deepsight.ai",
      name: "Duplicate",
      role: "analyst",
      invitedBy: team.members[0].id,
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain("이미 존재하는")
  })

  it("should reject invite for deactivated user (case-insensitive)", () => {
    let team = makeTeam()
    // Add and deactivate a member
    const inviteResult = inviteMember(team, {
      email: "user@deepsight.ai",
      name: "User",
      role: "analyst",
      invitedBy: team.members[0].id,
    })
    team = inviteResult.team
    // Activate then deactivate
    team = {
      ...team,
      members: team.members.map((m) =>
        m.email === "user@deepsight.ai" ? { ...m, status: "active" as const } : m
      ),
    }
    team = deactivateMember(team, team.members[1].id)

    const { result } = inviteMember(team, {
      email: "User@deepsight.ai", // case-insensitive match
      name: "User Again",
      role: "analyst",
      invitedBy: team.members[0].id,
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain("비활성화된")
  })
})

describe("Team — deactivateMember", () => {
  it("should deactivate an active member", () => {
    let team = makeTeam()
    // Add a second admin so the first can be deactivated
    const { team: t2 } = inviteMember(team, {
      email: "engineer@test.com",
      name: "Engineer",
      role: "ai_engineer",
      invitedBy: team.members[0].id,
    })
    team = {
      ...t2,
      members: t2.members.map((m) =>
        m.email === "engineer@test.com" ? { ...m, status: "active" as const } : m
      ),
    }
    const engineerId = team.members.find((m) => m.email === "engineer@test.com")!.id
    const updated = deactivateMember(team, engineerId)
    const member = updated.members.find((m) => m.id === engineerId)!
    expect(member.status).toBe("deactivated")
  })

  it("should prevent deactivating already deactivated member", () => {
    let team = makeTeam()
    const { team: t2 } = inviteMember(team, {
      email: "u@t.com",
      name: "U",
      role: "analyst",
      invitedBy: team.members[0].id,
    })
    team = {
      ...t2,
      members: t2.members.map((m) =>
        m.email === "u@t.com" ? { ...m, status: "active" as const } : m
      ),
    }
    const uid = team.members.find((m) => m.email === "u@t.com")!.id
    team = deactivateMember(team, uid)
    expect(() => deactivateMember(team, uid)).toThrow("이미 비활성화")
  })

  it("should prevent deactivating the last admin", () => {
    const team = makeTeam()
    expect(() => deactivateMember(team, team.members[0].id)).toThrow("마지막 관리자")
  })

  it("should throw for non-existent member", () => {
    const team = makeTeam()
    expect(() => deactivateMember(team, "nonexistent_id")).toThrow("멤버를 찾을 수 없습니다")
  })
})

describe("Team — reactivateMember", () => {
  it("should reactivate a deactivated member", () => {
    let team = makeTeam()
    const { team: t2 } = inviteMember(team, {
      email: "u@t.com",
      name: "U",
      role: "analyst",
      invitedBy: team.members[0].id,
    })
    team = {
      ...t2,
      members: t2.members.map((m) =>
        m.email === "u@t.com" ? { ...m, status: "active" as const } : m
      ),
    }
    const uid = team.members.find((m) => m.email === "u@t.com")!.id
    team = deactivateMember(team, uid)
    team = reactivateMember(team, uid)
    expect(team.members.find((m) => m.id === uid)!.status).toBe("active")
  })

  it("should throw when reactivating non-deactivated member", () => {
    const team = makeTeam()
    expect(() => reactivateMember(team, team.members[0].id)).toThrow("비활성화 상태가 아닌")
  })
})

describe("Team — listMembers", () => {
  it("should list all members sorted by name", () => {
    let team = makeTeam()
    inviteMember(team, { email: "z@t.com", name: "Zara", role: "analyst", invitedBy: "owner" })
    const { team: t2 } = inviteMember(team, {
      email: "a@t.com",
      name: "Alice",
      role: "analyst",
      invitedBy: "owner",
    })
    team = t2

    const members = listMembers(team)
    expect(members[0].name).toBe("Admin Kim")
    expect(members[1].name).toBe("Alice")
  })

  it("should filter by role", () => {
    let team = makeTeam()
    const { team: t2 } = inviteMember(team, {
      email: "eng@t.com",
      name: "Eng",
      role: "ai_engineer",
      invitedBy: "owner",
    })
    team = t2

    const admins = listMembers(team, { roles: ["admin"], statuses: null, keyword: null })
    expect(admins).toHaveLength(1)
    expect(admins[0].role).toBe("admin")
  })

  it("should filter by status", () => {
    const team = makeTeam()
    const active = listMembers(team, { roles: null, statuses: ["active"], keyword: null })
    expect(active).toHaveLength(1)
  })

  it("should filter by keyword (name or email)", () => {
    let team = makeTeam()
    const { team: t2 } = inviteMember(team, {
      email: "bob@test.com",
      name: "Bob Builder",
      role: "analyst",
      invitedBy: "owner",
    })
    team = t2

    const results = listMembers(team, { roles: null, statuses: null, keyword: "bob" })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("Bob Builder")
  })
})

describe("Team — updateMemberRole", () => {
  it("should change a member's role", () => {
    let team = makeTeam()
    const { team: t2 } = inviteMember(team, {
      email: "u@t.com",
      name: "U",
      role: "analyst",
      invitedBy: "owner",
    })
    team = {
      ...t2,
      members: t2.members.map((m) =>
        m.email === "u@t.com" ? { ...m, status: "active" as const } : m
      ),
    }
    const uid = team.members.find((m) => m.email === "u@t.com")!.id
    team = updateMemberRole(team, uid, "content_manager")
    expect(team.members.find((m) => m.id === uid)!.role).toBe("content_manager")
  })

  it("should prevent changing last admin's role", () => {
    const team = makeTeam()
    const adminId = team.members[0].id
    expect(() => updateMemberRole(team, adminId, "analyst")).toThrow("마지막 관리자")
  })

  it("should prevent role change for inactive member", () => {
    let team = makeTeam()
    const { team: t2 } = inviteMember(team, {
      email: "u@t.com",
      name: "U",
      role: "analyst",
      invitedBy: "owner",
    })
    team = t2
    // Member is still "invited" status
    const uid = team.members.find((m) => m.email === "u@t.com")!.id
    expect(() => updateMemberRole(team, uid, "admin")).toThrow("활성 상태의 멤버만")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Role Permissions
// ═══════════════════════════════════════════════════════════════

describe("Team — Role Definitions", () => {
  it("should have exactly 4 role definitions", () => {
    expect(ROLE_DEFINITIONS).toHaveLength(4)
    const roles = ROLE_DEFINITIONS.map((d) => d.role)
    expect(roles).toContain("admin")
    expect(roles).toContain("ai_engineer")
    expect(roles).toContain("content_manager")
    expect(roles).toContain("analyst")
  })

  it("admin should have all team management permissions", () => {
    const adminDef = getRoleDefinition("admin")
    expect(adminDef.permissions).toContain("team:invite")
    expect(adminDef.permissions).toContain("team:manage_roles")
    expect(adminDef.permissions).toContain("team:deactivate")
  })

  it("ai_engineer should not have team:invite", () => {
    const engineerDef = getRoleDefinition("ai_engineer")
    expect(engineerDef.permissions).not.toContain("team:invite")
  })

  it("content_manager should have full content CRUD", () => {
    const cmDef = getRoleDefinition("content_manager")
    expect(cmDef.permissions).toContain("content:create")
    expect(cmDef.permissions).toContain("content:read")
    expect(cmDef.permissions).toContain("content:update")
    expect(cmDef.permissions).toContain("content:delete")
    expect(cmDef.permissions).toContain("content:publish")
  })

  it("analyst should have analytics:create_report", () => {
    const analystDef = getRoleDefinition("analyst")
    expect(analystDef.permissions).toContain("analytics:create_report")
    expect(analystDef.permissions).toContain("analytics:export_data")
  })
})

describe("Team — hasPermission", () => {
  it("should return true for admin with any permission", () => {
    const admin = makeActiveMember("admin")
    expect(hasPermission(admin, "team:invite")).toBe(true)
    expect(hasPermission(admin, "persona:create")).toBe(true)
    expect(hasPermission(admin, "model:configure")).toBe(true)
  })

  it("should return false for deactivated member", () => {
    const member: TeamMember = { ...makeActiveMember("admin"), status: "deactivated" }
    expect(hasPermission(member, "team:invite")).toBe(false)
  })

  it("should return false for invited member", () => {
    const member: TeamMember = { ...makeActiveMember("admin"), status: "invited" }
    expect(hasPermission(member, "team:invite")).toBe(false)
  })

  it("should check ai_engineer permissions correctly", () => {
    const engineer = makeActiveMember("ai_engineer")
    expect(hasPermission(engineer, "persona:create")).toBe(true)
    expect(hasPermission(engineer, "matching:configure")).toBe(true)
    expect(hasPermission(engineer, "team:invite")).toBe(false)
    expect(hasPermission(engineer, "team:deactivate")).toBe(false)
  })

  it("should check content_manager permissions correctly", () => {
    const cm = makeActiveMember("content_manager")
    expect(hasPermission(cm, "content:create")).toBe(true)
    expect(hasPermission(cm, "persona:create")).toBe(false)
    expect(hasPermission(cm, "matching:configure")).toBe(false)
  })

  it("should check analyst permissions correctly", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasPermission(analyst, "analytics:view_dashboard")).toBe(true)
    expect(hasPermission(analyst, "persona:create")).toBe(false)
    expect(hasPermission(analyst, "content:create")).toBe(false)
  })
})

describe("Team — canPerformAction / hasAllPermissions / hasAnyPermission", () => {
  it("canPerformAction delegates to hasPermission", () => {
    const admin = makeActiveMember("admin")
    expect(canPerformAction(admin, "team:invite")).toBe(true)
  })

  it("hasAllPermissions returns true when all granted", () => {
    const admin = makeActiveMember("admin")
    expect(hasAllPermissions(admin, ["team:invite", "persona:create"])).toBe(true)
  })

  it("hasAllPermissions returns false when any missing", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasAllPermissions(analyst, ["analytics:view_dashboard", "persona:create"])).toBe(false)
  })

  it("hasAnyPermission returns true when at least one granted", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasAnyPermission(analyst, ["persona:create", "analytics:view_dashboard"])).toBe(true)
  })

  it("hasAnyPermission returns false when none granted", () => {
    const analyst = makeActiveMember("analyst")
    expect(hasAnyPermission(analyst, ["team:invite", "team:deactivate"])).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Audit Log
// ═══════════════════════════════════════════════════════════════

describe("Team — Audit Log Recording", () => {
  it("should create empty audit log", () => {
    const log = createAuditLog()
    expect(log.entries).toHaveLength(0)
    expect(log.totalCount).toBe(0)
  })

  it("should record an audit entry", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "user_1",
      actorName: "Admin Kim",
      action: "user.invited",
      targetType: "user",
      targetId: "user_2",
      details: { email: "new@test.com" },
    })
    expect(log.entries).toHaveLength(1)
    expect(log.totalCount).toBe(1)
    expect(log.entries[0].action).toBe("user.invited")
    expect(log.entries[0].details.email).toBe("new@test.com")
  })

  it("should record multiple entries", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "A",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
    })
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "A",
      action: "persona.updated",
      targetType: "persona",
      targetId: "p1",
    })
    expect(log.totalCount).toBe(2)
  })
})

describe("Team — Audit Log Search", () => {
  function populatedLog(): AuditLog {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "user.invited",
      targetType: "user",
      targetId: "u2",
      details: { role: "analyst" },
    })
    log = recordAuditEntry(log, {
      actorId: "u2",
      actorName: "Analyst",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
    })
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "settings.updated",
      targetType: "settings",
      targetId: "global",
    })
    return log
  }

  it("should filter by action", () => {
    const log = populatedLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: ["user.invited"],
      targetTypes: null,
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].action).toBe("user.invited")
  })

  it("should filter by actor", () => {
    const log = populatedLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: ["u2"],
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].actorId).toBe("u2")
  })

  it("should filter by targetType", () => {
    const log = populatedLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: ["persona"],
      keyword: null,
      limit: 100,
      offset: 0,
    })
    expect(result.entries).toHaveLength(1)
  })

  it("should filter by keyword in details", () => {
    const log = populatedLog()
    const result = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: "analyst",
      limit: 100,
      offset: 0,
    })
    expect(result.totalCount).toBeGreaterThanOrEqual(1)
  })

  it("should paginate results", () => {
    const log = populatedLog()
    const page1 = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 2,
      offset: 0,
    })
    expect(page1.entries).toHaveLength(2)
    expect(page1.totalCount).toBe(3)

    const page2 = searchAuditLog(log, {
      dateRange: null,
      actors: null,
      actions: null,
      targetTypes: null,
      keyword: null,
      limit: 2,
      offset: 2,
    })
    expect(page2.entries).toHaveLength(1)
  })
})

describe("Team — Audit Log Export", () => {
  it("should export audit log as CSV", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
      details: { name: "Test Persona" },
    })

    const csv = exportAuditLog(log)
    expect(csv).toContain("id,timestamp,actorId,actorName,action,targetType,targetId,details,ip")
    expect(csv).toContain("persona.created")
    expect(csv).toContain("name=Test Persona")
  })

  it("should export filtered audit log", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "A",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
    })
    log = recordAuditEntry(log, {
      actorId: "u2",
      actorName: "B",
      action: "settings.updated",
      targetType: "settings",
      targetId: "s1",
    })

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
    // header + 1 data row
    expect(lines).toHaveLength(2)
  })
})

describe("Team — Audit Summary", () => {
  it("should generate summary with action counts and top actors", () => {
    let log = createAuditLog()
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
    })
    log = recordAuditEntry(log, {
      actorId: "u1",
      actorName: "Admin",
      action: "persona.created",
      targetType: "persona",
      targetId: "p2",
    })
    log = recordAuditEntry(log, {
      actorId: "u2",
      actorName: "Engineer",
      action: "matching.executed",
      targetType: "matching",
      targetId: "m1",
    })

    const summary = getAuditSummary(log)
    expect(summary.totalEntries).toBe(3)
    expect(summary.actionCounts["persona.created"]).toBe(2)
    expect(summary.actionCounts["matching.executed"]).toBe(1)
    expect(summary.topActors[0].actorId).toBe("u1")
    expect(summary.topActors[0].count).toBe(2)
    expect(summary.targetTypeCounts["persona"]).toBe(2)
    expect(summary.recentActivity.length).toBeLessThanOrEqual(10)
    expect(summary.periodStart).toBeGreaterThan(0)
  })

  it("should return empty summary for empty log", () => {
    const log = createAuditLog()
    const summary = getAuditSummary(log)
    expect(summary.totalEntries).toBe(0)
    expect(summary.topActors).toHaveLength(0)
    expect(summary.periodStart).toBeNull()
  })
})
