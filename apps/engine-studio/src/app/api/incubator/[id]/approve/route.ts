import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/incubator/[id]/approve - 페르소나 승인
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 인큐베이터 로그 조회
    const log = await prisma.incubatorLog.findUnique({
      where: { id },
    })

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "인큐베이터 로그를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    if (log.status !== "PASSED" && log.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "이미 처리된 페르소나입니다",
          },
        },
        { status: 400 }
      )
    }

    // 로그 상태 업데이트
    await prisma.incubatorLog.update({
      where: { id },
      data: { status: "APPROVED" },
    })

    // 실제 페르소나 생성
    const config = (log.personaConfig as Record<string, string>) || {}
    const vector = (log.generatedVector as Record<string, number>) || {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
    }

    // 페르소나 생성 (Prisma 트랜잭션으로 Persona와 PersonaVector 함께 생성)
    const persona = await prisma.persona.create({
      data: {
        name: config.name || `Auto-Persona-${log.id.slice(-6)}`,
        description: config.shortDescription || "자동 생성된 페르소나",
        promptTemplate: log.generatedPrompt || "",
        role: "REVIEWER",
        source: "INCUBATOR",
        createdById: session.user.id,
        vectors: {
          create: {
            depth: vector.depth,
            lens: vector.lens,
            stance: vector.stance,
            scope: vector.scope,
            taste: vector.taste,
            purpose: vector.purpose,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        logId: log.id,
        personaId: persona.id,
        personaName: persona.name,
        message: "페르소나가 승인되어 생성되었습니다",
      },
    })
  } catch (error) {
    console.error("[API] POST /api/incubator/[id]/approve error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 승인에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
