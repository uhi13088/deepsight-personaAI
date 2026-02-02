import { NextRequest, NextResponse } from "next/server"
import { MOCK_PERSONAS, generateRandomId } from "@/services/mock-data.service"

// GET /api/personas - 페르소나 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let filteredPersonas = [...MOCK_PERSONAS]

    // 상태 필터
    if (status && status !== "all") {
      filteredPersonas = filteredPersonas.filter(
        (p) => p.status.toLowerCase() === status.toLowerCase()
      )
    }

    // 검색
    if (search) {
      filteredPersonas = filteredPersonas.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.role.toLowerCase().includes(search.toLowerCase())
      )
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit
    const paginatedPersonas = filteredPersonas.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      success: true,
      data: paginatedPersonas,
      pagination: {
        page,
        limit,
        total: filteredPersonas.length,
        totalPages: Math.ceil(filteredPersonas.length / limit),
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch personas" }, { status: 500 })
  }
}

// POST /api/personas - 페르소나 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, role, expertise, vector, promptTemplate } = body

    // 유효성 검사
    if (!name || !role || !vector) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 새 페르소나 생성 (실제로는 DB에 저장)
    const newPersona = {
      id: generateRandomId("persona-"),
      name,
      role,
      expertise: expertise || [],
      status: "DRAFT",
      vector,
      promptTemplate: promptTemplate || "",
      matchCount: 0,
      accuracy: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: newPersona,
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create persona" }, { status: 500 })
  }
}
