import { NextRequest, NextResponse } from "next/server"

// Mock 사용자 데이터
const USERS = [
  {
    id: "1",
    name: "김관리자",
    email: "admin@deepsight.ai",
    role: "ADMIN",
    status: "active",
    lastActive: "2025-01-16T15:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "이엔지니어",
    email: "engineer@deepsight.ai",
    role: "AI_ENGINEER",
    status: "active",
    lastActive: "2025-01-16T15:20:00Z",
    createdAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "3",
    name: "박콘텐츠",
    email: "content@deepsight.ai",
    role: "CONTENT_MANAGER",
    status: "active",
    lastActive: "2025-01-16T14:30:00Z",
    createdAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "4",
    name: "최분석",
    email: "analyst@deepsight.ai",
    role: "ANALYST",
    status: "active",
    lastActive: "2025-01-16T12:00:00Z",
    createdAt: "2024-09-01T00:00:00Z",
  },
]

// GET /api/users - 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const status = searchParams.get("status")

    let filteredUsers = [...USERS]

    if (role && role !== "all") {
      filteredUsers = filteredUsers.filter((u) => u.role === role)
    }

    if (status && status !== "all") {
      filteredUsers = filteredUsers.filter((u) => u.status === status)
    }

    return NextResponse.json({
      success: true,
      data: filteredUsers,
      total: filteredUsers.length,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST /api/users - 사용자 초대
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, role, message } = body

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: "Email and role are required" },
        { status: 400 }
      )
    }

    // 이메일 중복 체크
    const exists = USERS.find((u) => u.email === email)
    if (exists) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // 새 사용자 생성 (실제로는 초대 이메일 발송)
    const newUser = {
      id: String(Date.now()),
      name: email.split("@")[0],
      email,
      role,
      status: "pending",
      lastActive: null,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: newUser,
      message: "Invitation sent successfully",
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to invite user" },
      { status: 500 }
    )
  }
}
