import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

// ── GET: 상점 아이템 전체 목록 ─────────────────────────────────
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const items = await prisma.pWShopItem.findMany({
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error("[PW Admin Shop GET]", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "상점 아이템 조회 실패" } },
      { status: 500 }
    )
  }
}

// ── PUT: 상점 아이템 수정 (일괄) ──────────────────────────────
export async function PUT(req: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await req.json()) as {
      items: Array<{
        id: string
        price?: number
        priceLabel?: string | null
        tag?: string | null
        isActive?: boolean
        sortOrder?: number
        name?: string
        description?: string
        emoji?: string
      }>
    }

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "items 배열이 필요합니다" } },
        { status: 400 }
      )
    }

    const results = await prisma.$transaction(
      body.items.map((item) =>
        prisma.pWShopItem.update({
          where: { id: item.id },
          data: {
            ...(item.price !== undefined && { price: item.price }),
            ...(item.priceLabel !== undefined && { priceLabel: item.priceLabel }),
            ...(item.tag !== undefined && { tag: item.tag }),
            ...(item.isActive !== undefined && { isActive: item.isActive }),
            ...(item.sortOrder !== undefined && { sortOrder: item.sortOrder }),
            ...(item.name !== undefined && { name: item.name }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.emoji !== undefined && { emoji: item.emoji }),
          },
        })
      )
    )

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error("[PW Admin Shop PUT]", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "상점 아이템 수정 실패" } },
      { status: 500 }
    )
  }
}

// ── POST: 새 상점 아이템 추가 ──────────────────────────────────
export async function POST(req: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await req.json()) as {
      itemKey: string
      name: string
      description: string
      price: number
      priceLabel?: string
      category: string
      emoji: string
      repeatable: boolean
      tag?: string
    }

    if (!body.itemKey || !body.name) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "itemKey와 name은 필수입니다" },
        },
        { status: 400 }
      )
    }

    // sortOrder는 가장 큰 값 + 1
    const maxOrder = await prisma.pWShopItem.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (maxOrder._max.sortOrder ?? 0) + 1

    const item = await prisma.pWShopItem.create({
      data: {
        itemKey: body.itemKey,
        name: body.name,
        description: body.description,
        price: body.price,
        priceLabel: body.priceLabel ?? null,
        category: body.category,
        emoji: body.emoji,
        repeatable: body.repeatable,
        tag: body.tag ?? null,
        sortOrder: nextOrder,
      },
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (err) {
    console.error("[PW Admin Shop POST]", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "상점 아이템 생성 실패" } },
      { status: 500 }
    )
  }
}
