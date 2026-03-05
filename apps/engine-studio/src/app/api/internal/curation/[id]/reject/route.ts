import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/internal/curation/[id]/reject
 *
 * 큐레이션 status → REJECTED
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response: authResponse } = await requireAuth()
  if (authResponse) return authResponse

  const { id } = await params

  const existing = await prisma.personaCuratedContent.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "큐레이션을 찾을 수 없습니다" } },
      { status: 404 }
    )
  }

  const updated = await prisma.personaCuratedContent.update({
    where: { id },
    data: { status: "REJECTED" },
    select: { id: true, status: true, updatedAt: true },
  })

  return NextResponse.json({
    success: true,
    data: { ...updated, updatedAt: updated.updatedAt.toISOString() },
  })
}
