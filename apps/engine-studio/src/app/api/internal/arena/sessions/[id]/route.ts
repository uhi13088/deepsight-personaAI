import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

// ── DELETE /api/internal/arena/sessions/[id] ─────────────────
// 아레나 세션 삭제 (PENDING / COMPLETED / CANCELLED)
// RUNNING 상태는 삭제 불가 (진행 중 강제 종료 방지)

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  const { id } = await params

  try {
    const session = await prisma.arenaSession.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `세션을 찾을 수 없습니다: ${id}` } },
        { status: 404 }
      )
    }

    if (session.status === "RUNNING") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_STATE", message: "진행 중인 세션은 삭제할 수 없습니다." },
        },
        { status: 400 }
      )
    }

    // 관련 레코드는 DB 스키마의 onDelete: Cascade로 자동 삭제
    await prisma.arenaSession.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { deletedId: id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message } },
      { status: 500 }
    )
  }
}
