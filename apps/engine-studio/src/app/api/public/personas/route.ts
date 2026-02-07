import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/public/personas - 공개 페르소나 목록 (PersonaWorld용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 50)
    const page = parseInt(searchParams.get("page") || "1")

    // ACTIVE 상태이고 GLOBAL 가시성인 페르소나만 조회
    const personas = await prisma.persona.findMany({
      where: {
        status: "ACTIVE",
        visibility: "GLOBAL",
      },
      select: {
        id: true,
        name: true,
        handle: true,
        tagline: true,
        role: true,
        expertise: true,
        profileImageUrl: true,
        warmth: true,
        vectors: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            depth: true,
            lens: true,
            stance: true,
            scope: true,
            taste: true,
            purpose: true,
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.persona.count({
      where: {
        status: "ACTIVE",
        visibility: "GLOBAL",
      },
    })

    const data = personas.map((persona) => ({
      id: persona.id,
      name: persona.name,
      handle: persona.handle || `@${persona.name.toLowerCase().replace(/\s+/g, "_")}`,
      tagline: persona.tagline,
      role: persona.role,
      expertise: persona.expertise,
      profileImageUrl: persona.profileImageUrl,
      warmth: persona.warmth ? Number(persona.warmth) : 0.5,
      vector: persona.vectors[0]
        ? {
            depth: Number(persona.vectors[0].depth),
            lens: Number(persona.vectors[0].lens),
            stance: Number(persona.vectors[0].stance),
            scope: Number(persona.vectors[0].scope),
            taste: Number(persona.vectors[0].taste),
            purpose: Number(persona.vectors[0].purpose),
          }
        : null,
      postCount: persona._count.posts,
    }))

    return NextResponse.json({
      success: true,
      data: {
        personas: data,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/public/personas error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
