import { NextRequest, NextResponse } from "next/server"
import { getMockPersonaById, type MockPersona } from "@/services/mock-data.service"

// GET /api/personas/[id] - 페르소나 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const persona = getMockPersonaById(id)

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

    const persona = getMockPersonaById(id)

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

    const persona = getMockPersonaById(id)

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Persona not found" },
        { status: 404 }
      )
    }

    // 부분 업데이트 (실제로는 DB에 저장)
    const updatedPersona: MockPersona = {
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
    const persona = getMockPersonaById(id)

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
