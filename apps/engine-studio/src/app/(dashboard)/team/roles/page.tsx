"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Lock, CheckSquare } from "lucide-react"
import type { Role, RoleDefinition, Permission } from "@/lib/team"

// ── Permission resource/action matrix (type for API data) ────────

interface PermissionResource {
  resource: string
  label: string
  actions: Array<{ action: string; permission: Permission; label: string }>
}

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

// ── API response type ───────────────────────────────────────────
interface RolesApiData {
  roles: RoleDefinition[]
  permissionsByRole: Record<string, Permission[]>
  memberCounts: Record<Role, number>
  permissionMatrix: PermissionResource[]
}

export default function RolePermissionsPage() {
  const [data, setData] = useState<RolesApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>("admin")

  // ── Fetch data from API ───────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/team/roles")
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setError(null)
      } else {
        setError(json.error?.message ?? "데이터 로드 실패")
      }
    } catch {
      setError("서버 연결 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Check if role has permission ────────────────────────────
  const roleHasPermission = useCallback(
    (role: Role, permission: Permission): boolean => {
      if (!data) return false
      const perms = data.permissionsByRole[role]
      return perms ? perms.includes(permission) : false
    },
    [data]
  )

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Role Permissions" description="역할별 권한 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (error) {
    return (
      <>
        <Header title="Role Permissions" description="역할별 권한 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  const roles = data?.roles ?? []
  const permissionsByRole = data?.permissionsByRole ?? {}
  const memberCounts = data?.memberCounts ?? {
    admin: 0,
    ai_engineer: 0,
    content_manager: 0,
    analyst: 0,
  }
  const permissionMatrix = data?.permissionMatrix ?? []
  const selectedRolePerms = permissionsByRole[selectedRole] ?? []

  return (
    <>
      <Header title="Role Permissions" description="역할별 권한 관리" />

      <div className="space-y-6 p-6">
        {/* Role cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((rd) => {
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
              {roles.map((rd) => (
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
                  {roles.map((rd) => (
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
                {permissionMatrix.map((resource) =>
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
                      {roles.map((rd) => {
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
            {roles.find((rd) => rd.role === selectedRole)?.label} 역할 상세
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {selectedRolePerms.map((perm) => (
              <div
                key={perm}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
              >
                <span className="font-mono text-xs text-emerald-400">{perm}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            총 {selectedRolePerms.length}개 권한 부여됨 · {memberCounts[selectedRole]}명의 멤버가 이
            역할을 가지고 있습니다
          </p>
        </div>
      </div>
    </>
  )
}
