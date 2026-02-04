import { NextResponse } from "next/server"

/**
 * GET /api/team - 팀 데이터 조회
 */
export async function GET() {
  const teamData = {
    organization: {
      id: "org-1",
      name: "DeepSight Team",
      plan: "Free",
      createdAt: new Date().toISOString(),
      memberCount: 2,
      maxMembers: 5,
    },
    members: [
      {
        id: "member-1",
        name: "관리자",
        email: "admin@example.com",
        avatar: null,
        role: "owner",
        status: "active",
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
      },
      {
        id: "member-2",
        name: "개발자",
        email: "developer@example.com",
        avatar: null,
        role: "developer",
        status: "active",
        joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
      },
    ],
    pendingInvites: [],
  }

  return NextResponse.json({
    success: true,
    data: teamData,
  })
}
