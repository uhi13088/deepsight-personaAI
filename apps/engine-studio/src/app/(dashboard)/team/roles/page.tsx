"use client"

import { useState, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Lock, CheckSquare } from "lucide-react"
import { createTeam, inviteMember, ROLE_DEFINITIONS, getPermissionsForRole } from "@/lib/team"
import type { TeamState, Role, Permission } from "@/lib/team"

// ── Permission resource/action matrix ───────────────────────────

interface PermissionResource {
  resource: string
  label: string
  actions: Array<{ action: string; permission: Permission; label: string }>
}

const PERMISSION_MATRIX: PermissionResource[] = [
  {
    resource: "persona",
    label: "페르소나",
    actions: [
      { action: "create", permission: "persona:create", label: "생성" },
      { action: "read", permission: "persona:read", label: "조회" },
      { action: "update", permission: "persona:update", label: "수정" },
      { action: "delete", permission: "persona:delete", label: "삭제" },
      { action: "publish", permission: "persona:publish", label: "게시" },
    ],
  },
  {
    resource: "matching",
    label: "매칭 엔진",
    actions: [
      { action: "execute", permission: "matching:execute", label: "실행" },
      { action: "configure", permission: "matching:configure", label: "설정" },
      { action: "read_results", permission: "matching:read_results", label: "결과 조회" },
    ],
  },
  {
    resource: "content",
    label: "콘텐츠",
    actions: [
      { action: "create", permission: "content:create", label: "생성" },
      { action: "read", permission: "content:read", label: "조회" },
      { action: "update", permission: "content:update", label: "수정" },
      { action: "delete", permission: "content:delete", label: "삭제" },
      { action: "publish", permission: "content:publish", label: "게시" },
    ],
  },
  {
    resource: "analytics",
    label: "분석/리포트",
    actions: [
      { action: "view_dashboard", permission: "analytics:view_dashboard", label: "대시보드" },
      { action: "export_data", permission: "analytics:export_data", label: "데이터 내보내기" },
      { action: "create_report", permission: "analytics:create_report", label: "리포트 생성" },
    ],
  },
  {
    resource: "test",
    label: "테스트",
    actions: [
      { action: "execute", permission: "test:execute", label: "실행" },
      { action: "configure", permission: "test:configure", label: "설정" },
      { action: "read_results", permission: "test:read_results", label: "결과 조회" },
    ],
  },
  {
    resource: "team",
    label: "팀 관리",
    actions: [
      { action: "invite", permission: "team:invite", label: "초대" },
      { action: "manage_roles", permission: "team:manage_roles", label: "역할 관리" },
      { action: "deactivate", permission: "team:deactivate", label: "비활성화" },
      { action: "view_members", permission: "team:view_members", label: "멤버 조회" },
    ],
  },
  {
    resource: "settings",
    label: "설정",
    actions: [
      { action: "manage", permission: "settings:manage", label: "관리" },
      { action: "view", permission: "settings:view", label: "조회" },
    ],
  },
  {
    resource: "audit",
    label: "감사 로그",
    actions: [
      { action: "view", permission: "audit:view", label: "조회" },
      { action: "export", permission: "audit:export", label: "내보내기" },
    ],
  },
  {
    resource: "api",
    label: "API",
    actions: [
      { action: "manage_keys", permission: "api:manage_keys", label: "키 관리" },
      { action: "view_keys", permission: "api:view_keys", label: "키 조회" },
      {
        action: "configure_endpoints",
        permission: "api:configure_endpoints",
        label: "엔드포인트 설정",
      },
    ],
  },
  {
    resource: "model",
    label: "모델/LLM",
    actions: [
      { action: "configure", permission: "model:configure", label: "설정" },
      { action: "view_config", permission: "model:view_config", label: "설정 조회" },
      { action: "view_cost", permission: "model:view_cost", label: "비용 조회" },
    ],
  },
  {
    resource: "node_graph",
    label: "노드 그래프",
    actions: [
      { action: "create", permission: "node_graph:create", label: "생성" },
      { action: "read", permission: "node_graph:read", label: "조회" },
      { action: "update", permission: "node_graph:update", label: "수정" },
      { action: "delete", permission: "node_graph:delete", label: "삭제" },
      { action: "execute", permission: "node_graph:execute", label: "실행" },
    ],
  },
]

// ── Role card colors ────────────────────────────────────────────
const ROLE_COLORS: Record<Role, string> = {
  admin: "border-blue-500/30 bg-blue-500/5",
  ai_engineer: "border-purple-500/30 bg-purple-500/5",
  content_manager: "border-emerald-500/30 bg-emerald-500/5",
  analyst: "border-amber-500/30 bg-amber-500/5",
}

const ROLE_ICON_COLORS: Record<Role, string> = {
  admin: "text-blue-400",
  ai_engineer: "text-purple-400",
  content_manager: "text-emerald-400",
  analyst: "text-amber-400",
}

// ── Sample team for member counts ───────────────────────────────
function initializeTeam(): TeamState {
  let team = createTeam("DeepSight", "Admin", "admin@deepsight.ai")

  const sampleMembers: Array<{ email: string; name: string; role: Role }> = [
    { email: "engineer1@deepsight.ai", name: "Kim Engineer", role: "ai_engineer" },
    { email: "engineer2@deepsight.ai", name: "Park Engineer", role: "ai_engineer" },
    { email: "content@deepsight.ai", name: "Lee Content", role: "content_manager" },
    { email: "analyst@deepsight.ai", name: "Choi Analyst", role: "analyst" },
  ]

  for (const m of sampleMembers) {
    const { team: updated } = inviteMember(team, {
      email: m.email,
      name: m.name,
      role: m.role,
      invitedBy: team.members[0].id,
    })
    team = {
      ...updated,
      members: updated.members.map((member) =>
        member.email === m.email
          ? { ...member, status: "active" as const, lastActiveAt: Date.now() }
          : member
      ),
    }
  }

  return team
}

export default function RolePermissionsPage() {
  const [team] = useState<TeamState>(() => initializeTeam())
  const [selectedRole, setSelectedRole] = useState<Role>("admin")

  // ── Member counts per role ──────────────────────────────────
  const memberCounts = useMemo(() => {
    const counts: Record<Role, number> = {
      admin: 0,
      ai_engineer: 0,
      content_manager: 0,
      analyst: 0,
    }
    for (const m of team.members) {
      counts[m.role]++
    }
    return counts
  }, [team])

  // ── Check if role has permission ────────────────────────────
  const roleHasPermission = useCallback((role: Role, permission: Permission): boolean => {
    const perms = getPermissionsForRole(role)
    return perms.includes(permission)
  }, [])

  return (
    <>
      <Header title="Role Permissions" description="역할별 권한 관리" />

      <div className="space-y-6 p-6">
        {/* Role cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_DEFINITIONS.map((rd) => {
            const permCount = rd.permissions.length
            const isSelected = selectedRole === rd.role
            return (
              <button
                key={rd.role}
                className={`rounded-lg border p-4 text-left transition-all ${ROLE_COLORS[rd.role]} ${
                  isSelected ? "ring-primary ring-2" : "hover:ring-1 hover:ring-white/10"
                }`}
                onClick={() => setSelectedRole(rd.role)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${ROLE_ICON_COLORS[rd.role]}`} />
                    <h3 className="text-sm font-medium">{rd.label}</h3>
                  </div>
                  {isSelected && <Badge variant="info">선택됨</Badge>}
                </div>
                <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                  {rd.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="text-muted-foreground h-3 w-3" />
                    <span className="text-xs font-medium">{permCount}개 권한</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="text-muted-foreground h-3 w-3" />
                    <span className="text-xs font-medium">{memberCounts[rd.role]}명</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Permission matrix table */}
        <div className="bg-card rounded-lg border">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4" />
              권한 매트릭스
            </h3>
            <div className="flex gap-2">
              {ROLE_DEFINITIONS.map((rd) => (
                <button
                  key={rd.role}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    selectedRole === rd.role
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSelectedRole(rd.role)}
                >
                  {rd.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    리소스
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    액션
                  </th>
                  {ROLE_DEFINITIONS.map((rd) => (
                    <th
                      key={rd.role}
                      className={`px-4 py-3 text-center text-xs font-medium ${
                        selectedRole === rd.role ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {rd.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((resource) =>
                  resource.actions.map((action, actionIdx) => (
                    <tr
                      key={action.permission}
                      className={`border-border border-b last:border-0 ${
                        actionIdx === 0 ? "" : ""
                      }`}
                    >
                      {actionIdx === 0 && (
                        <td
                          className="px-4 py-2 text-xs font-medium"
                          rowSpan={resource.actions.length}
                        >
                          {resource.label}
                        </td>
                      )}
                      <td className="text-muted-foreground px-4 py-2 text-xs">{action.label}</td>
                      {ROLE_DEFINITIONS.map((rd) => {
                        const has = roleHasPermission(rd.role, action.permission)
                        const isHighlighted = selectedRole === rd.role
                        return (
                          <td key={rd.role} className="px-4 py-2 text-center">
                            {has ? (
                              <span
                                className={`inline-block h-4 w-4 rounded-sm text-center text-xs leading-4 ${
                                  isHighlighted
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-emerald-500/10 text-emerald-400/60"
                                }`}
                              >
                                ✓
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 inline-block h-4 w-4 text-center text-xs leading-4">
                                -
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected role detail */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">
            {ROLE_DEFINITIONS.find((rd) => rd.role === selectedRole)?.label} 역할 상세
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {getPermissionsForRole(selectedRole).map((perm) => (
              <div
                key={perm}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
              >
                <span className="font-mono text-xs text-emerald-400">{perm}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            총 {getPermissionsForRole(selectedRole).length}개 권한 부여됨 ·{" "}
            {memberCounts[selectedRole]}명의 멤버가 이 역할을 가지고 있습니다
          </p>
        </div>
      </div>
    </>
  )
}
