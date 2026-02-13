import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { MemberRole } from "@/generated/prisma"

// Role mapping (frontend → DB)
const frontendToDbRole: Record<string, MemberRole> = {
  owner: "OWNER",
  admin: "ADMIN",
  developer: "DEVELOPER",
  viewer: "VIEWER",
}

// Role mapping (DB → frontend)
const dbToFrontendRole: Record<MemberRole, string> = {
  OWNER: "owner",
  ADMIN: "admin",
  DEVELOPER: "developer",
  VIEWER: "viewer",
  BILLING: "viewer",
}

/**
 * PATCH /api/team/members/:id - 멤버 역할 수정
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "역할을 지정해주세요." } },
        { status: 400 }
      )
    }

    // Convert frontend role to DB role
    const dbRole = frontendToDbRole[role]
    if (!dbRole) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROLE", message: "유효하지 않은 역할입니다." } },
        { status: 400 }
      )
    }

    // Prevent changing to OWNER role
    if (dbRole === "OWNER") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Owner 역할로 변경할 수 없습니다." },
        },
        { status: 403 }
      )
    }

    // Find the member
    const member = await prisma.organizationMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastLoginAt: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Prevent changing OWNER role
    if (member.role === "OWNER") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Owner의 역할은 변경할 수 없습니다." },
        },
        { status: 403 }
      )
    }

    // Update the member role
    const updatedMember = await prisma.organizationMember.update({
      where: { id },
      data: { role: dbRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastLoginAt: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        member: {
          id: updatedMember.id,
          name: updatedMember.user.name || updatedMember.user.email.split("@")[0],
          email: updatedMember.user.email,
          avatar: updatedMember.user.image,
          role: dbToFrontendRole[updatedMember.role],
          status: "active",
          joinedAt:
            updatedMember.acceptedAt?.toISOString() || updatedMember.createdAt.toISOString(),
          lastActive: updatedMember.user.lastLoginAt?.toISOString() || null,
        },
      },
    })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "멤버 수정에 실패했습니다." } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/team/members/:id - 멤버 제거
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find the member
    const member = await prisma.organizationMember.findUnique({
      where: { id },
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Prevent removing OWNER
    if (member.role === "OWNER") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Owner는 제거할 수 없습니다." } },
        { status: 403 }
      )
    }

    // Delete the member
    await prisma.organizationMember.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { message: "멤버가 제거되었습니다." },
    })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "멤버 제거에 실패했습니다." } },
      { status: 500 }
    )
  }
}
