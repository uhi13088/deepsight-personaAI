import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

/**
 * GET /api/team - 팀 데이터 조회 (DB 연동)
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    // TODO: Scope to user's organization via session
    const organization = await prisma.organization.findFirst({
      include: {
        members: {
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
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!organization) {
      // Return default data if no organization exists
      return NextResponse.json({
        success: true,
        data: {
          organization: {
            id: "",
            name: "My Organization",
            plan: "Free",
            createdAt: new Date().toISOString(),
            memberCount: 0,
            maxMembers: 5,
          },
          members: [],
          pendingInvites: [],
        },
      })
    }

    const roleMapping: Record<string, string> = {
      OWNER: "owner",
      ADMIN: "admin",
      DEVELOPER: "developer",
      VIEWER: "viewer",
      BILLING: "viewer",
    }

    const planLimits: Record<string, number> = {
      FREE: 5,
      STARTER: 10,
      PRO: 25,
      ENTERPRISE: 100,
    }

    const members = organization.members
      .filter((m) => m.acceptedAt) // Only accepted members
      .map((member) => ({
        id: member.id,
        name: member.user.name || member.user.email.split("@")[0],
        email: member.user.email,
        avatar: member.user.image,
        role: roleMapping[member.role] || "viewer",
        status: "active" as const,
        joinedAt: member.acceptedAt?.toISOString() || member.createdAt.toISOString(),
        lastActive: member.user.lastLoginAt?.toISOString() || null,
      }))

    // Get pending invites (members without acceptedAt)
    const pendingInvites = organization.members
      .filter((m) => !m.acceptedAt && m.invitedAt)
      .map((member) => ({
        id: member.id,
        email: member.user.email,
        role: roleMapping[member.role] || "viewer",
        invitedBy: "Admin",
        invitedAt: member.invitedAt?.toISOString() || member.createdAt.toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          plan: organization.plan,
          createdAt: organization.createdAt.toISOString(),
          memberCount: members.length,
          maxMembers: planLimits[organization.plan] || 5,
        },
        members,
        pendingInvites,
      },
    })
  } catch (error) {
    console.error("Error fetching team:", error)
    // Return empty data on error
    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: "",
          name: "My Organization",
          plan: "Free",
          createdAt: new Date().toISOString(),
          memberCount: 0,
          maxMembers: 5,
        },
        members: [],
        pendingInvites: [],
      },
    })
  }
}
