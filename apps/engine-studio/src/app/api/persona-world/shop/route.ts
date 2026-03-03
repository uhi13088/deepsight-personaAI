import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/persona-world/shop
 *
 * PersonaWorld용 활성 상점 아이템 목록 조회.
 * isActive=true인 아이템만 sortOrder 순으로 반환.
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const items = await prisma.pWShopItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        itemKey: true,
        name: true,
        description: true,
        price: true,
        priceLabel: true,
        category: true,
        emoji: true,
        repeatable: true,
        tag: true,
      },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error("[PW Shop GET]", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "상점 조회 실패" } },
      { status: 500 }
    )
  }
}
