import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { PersonaRole, PersonaStatus } from "@prisma/client"

// 입력 검증 스키마
const createPersonaSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다").max(100),
  role: z.enum(["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"]),
  expertise: z.array(z.string()).default([]),
  description: z.string().optional(),
  promptTemplate: z.string().min(1, "프롬프트 템플릿은 필수입니다"),
  vector: z.object({
    depth: z.number().min(0).max(1),
    lens: z.number().min(0).max(1),
    stance: z.number().min(0).max(1),
    scope: z.number().min(0).max(1),
    taste: z.number().min(0).max(1),
    purpose: z.number().min(0).max(1),
  }),
})

// GET /api/personas - 페르소나 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const role = searchParams.get("role")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // 필터 조건 구성
    const where: {
      status?: PersonaStatus
      role?: PersonaRole
      OR?: { name: { contains: string; mode: "insensitive" } }[]
    } = {}

    if (status && status !== "all") {
      where.status = status.toUpperCase() as PersonaStatus
    }

    if (role && role !== "all") {
      where.role = role.toUpperCase() as PersonaRole
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: "insensitive" } }]
    }

    // 페르소나 목록 조회
    const [personas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        include: {
          vectors: {
            orderBy: { version: "desc" },
            take: 1,
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.persona.count({ where }),
    ])

    // 응답 데이터 변환
    const data = personas.map((persona) => ({
      id: persona.id,
      name: persona.name,
      role: persona.role,
      expertise: persona.expertise ?? [],
      description: persona.description,
      status: persona.status,
      qualityScore: persona.qualityScore ? Number(persona.qualityScore) : null,
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
      promptTemplate: persona.promptTemplate,
      createdBy: persona.createdBy,
      createdAt: persona.createdAt.toISOString(),
      updatedAt: persona.updatedAt.toISOString(),
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
    console.error("[API] GET /api/personas error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/personas - 페르소나 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createPersonaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { name, role, expertise, description, promptTemplate, vector } = parsed.data

    // 트랜잭션으로 페르소나와 벡터 함께 생성
    const persona = await prisma.$transaction(async (tx) => {
      const newPersona = await tx.persona.create({
        data: {
          name,
          role: role as PersonaRole,
          expertise,
          description,
          promptTemplate,
          status: "DRAFT",
          createdById: session.user.id,
        },
      })

      await tx.personaVector.create({
        data: {
          personaId: newPersona.id,
          version: 1,
          depth: vector.depth,
          lens: vector.lens,
          stance: vector.stance,
          scope: vector.scope,
          taste: vector.taste,
          purpose: vector.purpose,
        },
      })

      return newPersona
    })

    // 생성된 페르소나 조회 (벡터 포함)
    const createdPersona = await prisma.persona.findUnique({
      where: { id: persona.id },
      include: {
        vectors: { orderBy: { version: "desc" }, take: 1 },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: createdPersona!.id,
        name: createdPersona!.name,
        role: createdPersona!.role,
        expertise: createdPersona!.expertise ?? [],
        description: createdPersona!.description,
        status: createdPersona!.status,
        vector: createdPersona!.vectors[0]
          ? {
              depth: Number(createdPersona!.vectors[0].depth),
              lens: Number(createdPersona!.vectors[0].lens),
              stance: Number(createdPersona!.vectors[0].stance),
              scope: Number(createdPersona!.vectors[0].scope),
              taste: Number(createdPersona!.vectors[0].taste),
              purpose: Number(createdPersona!.vectors[0].purpose),
            }
          : null,
        promptTemplate: createdPersona!.promptTemplate,
        createdBy: createdPersona!.createdBy,
        createdAt: createdPersona!.createdAt.toISOString(),
        updatedAt: createdPersona!.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] POST /api/personas error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
