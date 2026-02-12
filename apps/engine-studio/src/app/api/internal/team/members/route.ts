import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createTeam,
  inviteMember,
  deactivateMember,
  reactivateMember,
  updateMemberRole,
  listMembers,
} from "@/lib/team"
import type { TeamMember, TeamState, Role, InviteResult } from "@/lib/team"

// ── Seed team state (in-memory, persists within server session) ──
function initializeSeedTeam(): TeamState {
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

let teamState: TeamState = initializeSeedTeam()

interface MembersResponse {
  members: TeamMember[]
  total: number
  totalByStatus: { active: number; invited: number; deactivated: number }
}

interface MutationBody {
  action: "invite" | "deactivate" | "reactivate" | "change_role"
  email?: string
  name?: string
  role?: Role
  memberId?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") as Role | null
    const status = searchParams.get("status") as TeamMember["status"] | null
    const keyword = searchParams.get("keyword")

    const members = listMembers(teamState, {
      roles: role ? [role] : null,
      statuses: status ? [status] : null,
      keyword: keyword || null,
    })

    const allMembers = teamState.members
    const totalByStatus = {
      active: allMembers.filter((m) => m.status === "active").length,
      invited: allMembers.filter((m) => m.status === "invited").length,
      deactivated: allMembers.filter((m) => m.status === "deactivated").length,
    }

    return NextResponse.json<ApiResponse<MembersResponse>>({
      success: true,
      data: {
        members,
        total: allMembers.length,
        totalByStatus,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "멤버 목록 조회 실패" },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MutationBody

    if (body.action === "invite") {
      if (!body.email || !body.name || !body.role) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "email, name, role은 필수 항목입니다" },
          },
          { status: 400 }
        )
      }

      const { team: updated, result } = inviteMember(teamState, {
        email: body.email,
        name: body.name,
        role: body.role,
        invitedBy: teamState.members[0].id,
      })

      if (!result.success) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVITE_FAILED", message: result.error ?? "초대 실패" },
          },
          { status: 409 }
        )
      }

      teamState = updated

      return NextResponse.json<ApiResponse<InviteResult>>({
        success: true,
        data: result,
      })
    }

    if (body.action === "deactivate") {
      if (!body.memberId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "memberId는 필수 항목입니다" },
          },
          { status: 400 }
        )
      }

      teamState = deactivateMember(teamState, body.memberId)

      return NextResponse.json<ApiResponse<{ memberId: string }>>({
        success: true,
        data: { memberId: body.memberId },
      })
    }

    if (body.action === "reactivate") {
      if (!body.memberId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "memberId는 필수 항목입니다" },
          },
          { status: 400 }
        )
      }

      teamState = reactivateMember(teamState, body.memberId)

      return NextResponse.json<ApiResponse<{ memberId: string }>>({
        success: true,
        data: { memberId: body.memberId },
      })
    }

    if (body.action === "change_role") {
      if (!body.memberId || !body.role) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "memberId와 role은 필수 항목입니다" },
          },
          { status: 400 }
        )
      }

      teamState = updateMemberRole(teamState, body.memberId, body.role)

      return NextResponse.json<ApiResponse<{ memberId: string; role: Role }>>({
        success: true,
        data: { memberId: body.memberId, role: body.role },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INVALID_ACTION", message: `알 수 없는 action: ${body.action}` },
      },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "멤버 작업 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
