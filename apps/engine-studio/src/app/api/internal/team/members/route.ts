import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createTeam, inviteMember, listMembers } from "@/lib/team"
import type { TeamMember, Role, InviteResult } from "@/lib/team"

// ── Sample team state (in-memory for demo) ──────────────────────
const team = createTeam("DeepSight", "Admin", "admin@deepsight.ai")

interface MembersResponse {
  members: TeamMember[]
  total: number
}

interface InviteMemberBody {
  email: string
  name: string
  role: Role
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") as Role | null
    const status = searchParams.get("status") as TeamMember["status"] | null
    const keyword = searchParams.get("keyword")

    const members = listMembers(team, {
      roles: role ? [role] : null,
      statuses: status ? [status] : null,
      keyword: keyword || null,
    })

    return NextResponse.json<ApiResponse<MembersResponse>>({
      success: true,
      data: {
        members,
        total: members.length,
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
    const body = (await request.json()) as InviteMemberBody

    if (!body.email || !body.name || !body.role) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "email, name, role은 필수 항목입니다" },
        },
        { status: 400 }
      )
    }

    const { result } = inviteMember(team, {
      email: body.email,
      name: body.name,
      role: body.role,
      invitedBy: team.members[0].id,
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

    return NextResponse.json<ApiResponse<InviteResult>>({
      success: true,
      data: result,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "멤버 초대 실패" },
      },
      { status: 500 }
    )
  }
}
