import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import type { TeamMember, Role, InviteResult } from "@/lib/team"
import type { UserRole } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"

// ── Role conversion helpers ──────────────────────────────────

function toUserRole(role: Role): UserRole {
  const map: Record<Role, UserRole> = {
    admin: "ADMIN" as UserRole,
    ai_engineer: "AI_ENGINEER" as UserRole,
    content_manager: "CONTENT_MANAGER" as UserRole,
    analyst: "ANALYST" as UserRole,
  }
  return map[role]
}

function fromUserRole(role: UserRole): Role {
  return role.toLowerCase() as Role
}

// ── User → TeamMember conversion ─────────────────────────────

function toTeamMember(user: {
  id: string
  name: string | null
  email: string
  role: UserRole
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}): TeamMember {
  let status: TeamMember["status"]
  if (!user.isActive) {
    status = "deactivated"
  } else if (user.lastLoginAt !== null) {
    status = "active"
  } else {
    status = "invited"
  }

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    role: fromUserRole(user.role),
    status,
    joinedAt: user.createdAt.getTime(),
    lastActiveAt: user.lastLoginAt ? user.lastLoginAt.getTime() : null,
  }
}

// ── Response types ───────────────────────────────────────────

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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") as Role | null
    const status = searchParams.get("status") as TeamMember["status"] | null
    const keyword = searchParams.get("keyword")

    // Load all users from DB
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    const allMembers = users.map(toTeamMember)

    // Apply filters
    let members = [...allMembers]

    if (role) {
      members = members.filter((m) => m.role === role)
    }
    if (status) {
      members = members.filter((m) => m.status === status)
    }
    if (keyword && keyword.length > 0) {
      const kw = keyword.toLowerCase()
      members = members.filter(
        (m) => m.name.toLowerCase().includes(kw) || m.email.toLowerCase().includes(kw)
      )
    }

    // Sort by name
    members.sort((a, b) => a.name.localeCompare(b.name))

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
  const { response } = await requireAuth()
  if (response) return response

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

      // Check if email already exists
      const existing = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
        select: { id: true, isActive: true },
      })

      if (existing) {
        if (!existing.isActive) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: {
                code: "INVITE_FAILED",
                message: `비활성화된 사용자입니다. 재활성화를 사용하세요: ${body.email}`,
              },
            },
            { status: 409 }
          )
        }
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "INVITE_FAILED",
              message: `이미 존재하는 이메일입니다: ${body.email}`,
            },
          },
          { status: 409 }
        )
      }

      // TODO: 실제 이메일 초대 발송 구현 필요
      // - 이메일 서비스(Resend/SendGrid 등)와 연동하여 초대 링크 발송
      // - 비밀번호 없이 생성(password: null) → 초대 수락 전까지 로그인 불가
      // - 이메일 인증 토큰(VerificationToken) 생성 후 링크로 비밀번호 설정 유도
      const newUser = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          name: body.name,
          role: toUserRole(body.role),
          isActive: true,
          lastLoginAt: null,
          password: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      })

      const member = toTeamMember(newUser)

      const result: InviteResult = {
        success: true,
        member,
        error: null,
      }

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

      const user = await prisma.user.findUnique({
        where: { id: body.memberId },
        select: { id: true, role: true, isActive: true },
      })

      if (!user) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `멤버를 찾을 수 없습니다: ${body.memberId}` },
          },
          { status: 404 }
        )
      }

      if (!user.isActive) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "INVALID_STATE",
              message: `이미 비활성화된 멤버입니다: ${body.memberId}`,
            },
          },
          { status: 400 }
        )
      }

      // Check last admin constraint
      if (user.role === ("ADMIN" as UserRole)) {
        const activeAdminCount = await prisma.user.count({
          where: {
            role: "ADMIN" as UserRole,
            isActive: true,
            id: { not: body.memberId },
          },
        })
        if (activeAdminCount === 0) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: {
                code: "LAST_ADMIN",
                message: "마지막 관리자는 비활성화할 수 없습니다. 다른 관리자를 먼저 지정하세요",
              },
            },
            { status: 400 }
          )
        }
      }

      await prisma.user.update({
        where: { id: body.memberId },
        data: { isActive: false },
      })

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

      const user = await prisma.user.findUnique({
        where: { id: body.memberId },
        select: { id: true, isActive: true },
      })

      if (!user) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `멤버를 찾을 수 없습니다: ${body.memberId}` },
          },
          { status: 404 }
        )
      }

      if (user.isActive) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "INVALID_STATE",
              message: `비활성화 상태가 아닌 멤버는 재활성화할 수 없습니다: ${body.memberId}`,
            },
          },
          { status: 400 }
        )
      }

      await prisma.user.update({
        where: { id: body.memberId },
        data: { isActive: true },
      })

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

      const user = await prisma.user.findUnique({
        where: { id: body.memberId },
        select: { id: true, role: true, isActive: true, lastLoginAt: true },
      })

      if (!user) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `멤버를 찾을 수 없습니다: ${body.memberId}` },
          },
          { status: 404 }
        )
      }

      // Only active members can have their role changed
      const isActive = user.isActive
      if (!isActive) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "INVALID_STATE",
              message: `활성 상태의 멤버만 역할을 변경할 수 있습니다: ${body.memberId}`,
            },
          },
          { status: 400 }
        )
      }

      // Check last admin constraint
      const newUserRole = toUserRole(body.role)
      if (user.role === ("ADMIN" as UserRole) && newUserRole !== ("ADMIN" as UserRole)) {
        const activeAdminCount = await prisma.user.count({
          where: {
            role: "ADMIN" as UserRole,
            isActive: true,
            id: { not: body.memberId },
          },
        })
        if (activeAdminCount === 0) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: {
                code: "LAST_ADMIN",
                message: "마지막 관리자의 역할을 변경할 수 없습니다. 다른 관리자를 먼저 지정하세요",
              },
            },
            { status: 400 }
          )
        }
      }

      await prisma.user.update({
        where: { id: body.memberId },
        data: { role: newUserRole },
      })

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
