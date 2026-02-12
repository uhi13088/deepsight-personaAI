"use client"

import { useState, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, UserMinus, UserCheck, ChevronDown, Search, Shield } from "lucide-react"
import {
  createTeam,
  inviteMember,
  deactivateMember,
  reactivateMember,
  listMembers,
  updateMemberRole,
  ROLE_DEFINITIONS,
} from "@/lib/team"
import type { TeamState, Role, UserStatus, MemberFilter } from "@/lib/team"

// ── Status badge config ─────────────────────────────────────────
const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  active: { label: "Active", variant: "success" },
  invited: { label: "Invited", variant: "warning" },
  deactivated: { label: "Deactivated", variant: "destructive" },
}

// ── Role label lookup ───────────────────────────────────────────
const ROLE_LABELS: Record<Role, string> = {
  admin: "관리자",
  ai_engineer: "AI 엔지니어",
  content_manager: "콘텐츠 매니저",
  analyst: "분석가",
}

// ── Sample data initialization ──────────────────────────────────
function initializeTeam(): TeamState {
  let team = createTeam("DeepSight", "Admin", "admin@deepsight.ai")

  const sampleMembers: Array<{ email: string; name: string; role: Role }> = [
    { email: "engineer@deepsight.ai", name: "Kim Engineer", role: "ai_engineer" },
    { email: "content@deepsight.ai", name: "Lee Content", role: "content_manager" },
    { email: "analyst@deepsight.ai", name: "Park Analyst", role: "analyst" },
  ]

  for (const m of sampleMembers) {
    const { team: updated } = inviteMember(team, {
      email: m.email,
      name: m.name,
      role: m.role,
      invitedBy: team.members[0].id,
    })
    team = updated
  }

  // Activate first two invited members for demo
  team = {
    ...team,
    members: team.members.map((m, i) =>
      i > 0 && i < 3 ? { ...m, status: "active" as const, lastActiveAt: Date.now() } : m
    ),
  }

  return team
}

export default function UserManagementPage() {
  const [team, setTeam] = useState<TeamState>(() => initializeTeam())

  // ── Invite form state ───────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("analyst")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // ── Filter state ────────────────────────────────────────────
  const [filterRole, setFilterRole] = useState<Role | "">("")
  const [filterStatus, setFilterStatus] = useState<UserStatus | "">("")
  const [filterKeyword, setFilterKeyword] = useState("")

  // ── Role change dropdown ────────────────────────────────────
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null)

  // ── Filtered members ────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const filter: MemberFilter = {
      roles: filterRole ? [filterRole] : null,
      statuses: filterStatus ? [filterStatus] : null,
      keyword: filterKeyword || null,
    }
    return listMembers(team, filter)
  }, [team, filterRole, filterStatus, filterKeyword])

  // ── Invite handler ──────────────────────────────────────────
  const handleInvite = useCallback(() => {
    setInviteError(null)
    setInviteSuccess(null)

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError("이메일과 이름을 모두 입력하세요")
      return
    }

    const { team: updated, result } = inviteMember(team, {
      email: inviteEmail.trim(),
      name: inviteName.trim(),
      role: inviteRole,
      invitedBy: team.members[0].id,
    })

    if (!result.success) {
      setInviteError(result.error)
      return
    }

    setTeam(updated)
    setInviteEmail("")
    setInviteName("")
    setInviteRole("analyst")
    setInviteSuccess(`${inviteName.trim()} 초대 완료`)
    setTimeout(() => setInviteSuccess(null), 3000)
  }, [team, inviteEmail, inviteName, inviteRole])

  // ── Deactivate handler ──────────────────────────────────────
  const handleDeactivate = useCallback(
    (memberId: string) => {
      try {
        const updated = deactivateMember(team, memberId)
        setTeam(updated)
      } catch (err) {
        alert(err instanceof Error ? err.message : "비활성화 실패")
      }
    },
    [team]
  )

  // ── Reactivate handler ──────────────────────────────────────
  const handleReactivate = useCallback(
    (memberId: string) => {
      try {
        const updated = reactivateMember(team, memberId)
        setTeam(updated)
      } catch (err) {
        alert(err instanceof Error ? err.message : "재활성화 실패")
      }
    },
    [team]
  )

  // ── Role change handler ─────────────────────────────────────
  const handleRoleChange = useCallback(
    (memberId: string, newRole: Role) => {
      try {
        const updated = updateMemberRole(team, memberId, newRole)
        setTeam(updated)
        setRoleDropdownOpen(null)
      } catch (err) {
        alert(err instanceof Error ? err.message : "역할 변경 실패")
      }
    },
    [team]
  )

  return (
    <>
      <Header title="User Management" description="팀 사용자 관리" />

      <div className="space-y-6 p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <p className="text-muted-foreground text-xs">전체 멤버</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{team.members.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <p className="text-muted-foreground text-xs">활성</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {team.members.filter((m) => m.status === "active").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-400" />
              <p className="text-muted-foreground text-xs">초대됨</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {team.members.filter((m) => m.status === "invited").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-red-400" />
              <p className="text-muted-foreground text-xs">비활성화</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-400">
              {team.members.filter((m) => m.status === "deactivated").length}
            </p>
          </div>
        </div>

        {/* Invite section */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" />
            멤버 초대
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className="text-muted-foreground mb-1 block text-xs">이름</label>
              <input
                type="text"
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                placeholder="홍길동"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="text-muted-foreground mb-1 block text-xs">이메일</label>
              <input
                type="email"
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                placeholder="user@deepsight.ai"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <label className="text-muted-foreground mb-1 block text-xs">역할</label>
              <select
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
              >
                {ROLE_DEFINITIONS.map((rd) => (
                  <option key={rd.role} value={rd.role}>
                    {rd.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleInvite}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              초대
            </Button>
          </div>
          {inviteError && <p className="mt-2 text-xs text-red-400">{inviteError}</p>}
          {inviteSuccess && <p className="mt-2 text-xs text-emerald-400">{inviteSuccess}</p>}
        </div>

        {/* Filter bar */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                className="border-border bg-background w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                placeholder="이름 또는 이메일 검색..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
              />
            </div>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as Role | "")}
            >
              <option value="">전체 역할</option>
              {ROLE_DEFINITIONS.map((rd) => (
                <option key={rd.role} value={rd.role}>
                  {rd.label}
                </option>
              ))}
            </select>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as UserStatus | "")}
            >
              <option value="">전체 상태</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Member table */}
        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    이름
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    이메일
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    역할
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    상태
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-border border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{member.name}</td>
                    <td className="text-muted-foreground px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <button
                          className="hover:border-border flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs"
                          onClick={() =>
                            setRoleDropdownOpen(roleDropdownOpen === member.id ? null : member.id)
                          }
                          disabled={member.status !== "active"}
                        >
                          <Shield className="h-3 w-3" />
                          {ROLE_LABELS[member.role]}
                          {member.status === "active" && <ChevronDown className="h-3 w-3" />}
                        </button>
                        {roleDropdownOpen === member.id && member.status === "active" && (
                          <div className="bg-popover border-border absolute left-0 top-full z-10 mt-1 min-w-[160px] rounded-md border py-1 shadow-lg">
                            {ROLE_DEFINITIONS.map((rd) => (
                              <button
                                key={rd.role}
                                className={`hover:bg-accent w-full px-3 py-1.5 text-left text-xs ${
                                  rd.role === member.role ? "text-primary font-medium" : ""
                                }`}
                                onClick={() => handleRoleChange(member.id, rd.role)}
                              >
                                {rd.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_CONFIG[member.status].variant}>
                        {STATUS_CONFIG[member.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(member.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <UserMinus className="mr-1 h-3 w-3" />
                          비활성화
                        </Button>
                      )}
                      {member.status === "deactivated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReactivate(member.id)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <UserCheck className="mr-1 h-3 w-3" />
                          재활성화
                        </Button>
                      )}
                      {member.status === "invited" && (
                        <span className="text-muted-foreground text-xs">초대 대기 중</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center text-sm">
                      조건에 맞는 멤버가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
