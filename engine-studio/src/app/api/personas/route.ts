import { NextRequest, NextResponse } from "next/server"

// Mock 페르소나 데이터
const PERSONAS = [
  {
    id: "1",
    name: "논리적 평론가",
    role: "평론",
    expertise: ["영화", "드라마"],
    status: "ACTIVE",
    vector: {
      depth: 0.85,
      lens: 0.78,
      stance: 0.72,
      scope: 0.45,
      taste: 0.68,
      purpose: 0.82,
    },
    promptTemplate: "당신은 논리적이고 분석적인 평론가입니다...",
    matchCount: 12340,
    accuracy: 96.2,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "감성 에세이스트",
    role: "에세이",
    expertise: ["문학", "음악"],
    status: "ACTIVE",
    vector: {
      depth: 0.62,
      lens: 0.25,
      stance: 0.35,
      scope: 0.58,
      taste: 0.75,
      purpose: 0.42,
    },
    promptTemplate: "당신은 감성적이고 공감적인 에세이스트입니다...",
    matchCount: 10890,
    accuracy: 94.8,
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-14T14:20:00Z",
  },
  {
    id: "3",
    name: "트렌드 헌터",
    role: "트렌드 분석",
    expertise: ["패션", "음악", "팝컬처"],
    status: "ACTIVE",
    vector: {
      depth: 0.45,
      lens: 0.55,
      stance: 0.48,
      scope: 0.85,
      taste: 0.32,
      purpose: 0.38,
    },
    promptTemplate: "당신은 최신 트렌드에 민감한 트렌드 헌터입니다...",
    matchCount: 9560,
    accuracy: 93.5,
    createdAt: "2025-01-03T00:00:00Z",
    updatedAt: "2025-01-13T09:15:00Z",
  },
]

// GET /api/personas - 페르소나 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let filteredPersonas = [...PERSONAS]

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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch personas" },
      { status: 500 }
    )
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
      id: String(Date.now()),
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create persona" },
      { status: 500 }
    )
  }
}
