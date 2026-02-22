import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

// ── GET /api/internal/arena/sessions/[id]/turns ──────────────
// 세션의 턴 목록 조회

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  const { id } = await params

  try {
    const turns = await prisma.arenaTurn.findMany({
      where: { sessionId: id },
      orderBy: { turnNumber: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        turns: turns.map((t) => ({
          turnNumber: t.turnNumber,
          speakerId: t.speakerId,
          content: t.content,
          tokensUsed: t.tokensUsed,
          timestamp: t.timestamp.toISOString(),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "TURNS_FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
