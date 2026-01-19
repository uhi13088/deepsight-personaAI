import { NextRequest, NextResponse } from "next/server"

interface PersonaData {
  id: string
  name: string
  role: string
  expertise: string[]
  status: string
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  }
  promptTemplate: string
  matchCount: number
  accuracy: number
  createdAt: string
  updatedAt: string
}

// Mock 페르소나 데이터 (실제로는 DB에서 조회)
const PERSONAS: Record<string, PersonaData> = {
  "1": {
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
}

// GET /api/personas/[id] - 페르소나 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const persona = PERSONAS[id]

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Persona not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: persona,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch persona" },
      { status: 500 }
    )
  }
}

// PUT /api/personas/[id] - 페르소나 전체 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const persona = PERSONAS[id]

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Persona not found" },
        { status: 404 }
      )
    }

    // 업데이트 (실제로는 DB에 저장)
    const updatedPersona = {
      ...persona,
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: updatedPersona,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update persona" },
      { status: 500 }
    )
  }
}

// PATCH /api/personas/[id] - 페르소나 부분 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const persona = PERSONAS[id]

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Persona not found" },
        { status: 404 }
      )
    }

    // 부분 업데이트 (실제로는 DB에 저장)
    const updatedPersona: PersonaData = {
      ...persona,
      ...(body.name !== undefined && { name: body.name }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.expertise !== undefined && { expertise: body.expertise }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.vector !== undefined && {
        vector: { ...persona.vector, ...body.vector }
      }),
      ...(body.promptTemplate !== undefined && { promptTemplate: body.promptTemplate }),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: updatedPersona,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update persona" },
      { status: 500 }
    )
  }
}

// DELETE /api/personas/[id] - 페르소나 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const persona = PERSONAS[id]

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Persona not found" },
        { status: 404 }
      )
    }

    // 삭제 (실제로는 DB에서 삭제)

    return NextResponse.json({
      success: true,
      message: "Persona deleted successfully",
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete persona" },
      { status: 500 }
    )
  }
}
