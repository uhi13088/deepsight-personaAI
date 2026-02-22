import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

async function seedDatabase(secret: string | null) {
  const expectedSecret = process.env.SEED_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "SEED_SECRET not configured" } },
      { status: 500 }
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid secret" } },
      { status: 401 }
    )
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set",
        },
      },
      { status: 500 }
    )
  }

  // 이미 시드된 경우 스킵
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    return NextResponse.json({
      success: true,
      message: "Database already seeded",
      data: { adminExists: true },
    })
  }

  console.log("🌱 Starting database seed...")

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  // 관리자 계정 생성
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "관리자",
      password: hashedPassword,
    },
  })
  console.log("✅ Admin user created")

  // 기본 Organization 생성
  const org = await prisma.organization.create({
    data: {
      name: "DeepSight",
      slug: "deepsight",
      plan: "ENTERPRISE",
    },
  })
  console.log(`✅ Organization created: ${org.name}`)

  // 관리자를 Organization의 Owner로 설정
  await prisma.organizationMember.create({
    data: {
      userId: admin.id,
      organizationId: org.id,
      role: "OWNER",
      acceptedAt: new Date(),
    },
  })
  console.log("✅ Admin added to organization as OWNER")

  console.log("🎉 Database seed completed!")

  return NextResponse.json({
    success: true,
    message: "Database seeded successfully",
    data: {
      organization: org.name,
    },
  })
}

// POST /api/admin/seed (Authorization 헤더로 시크릿 전달)
export async function POST(request: NextRequest) {
  // T216: 프로덕션 환경에서 시드 엔드포인트 비활성화
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 }
    )
  }

  try {
    const authHeader = request.headers.get("authorization")
    const secret = authHeader?.replace("Bearer ", "") || null
    return await seedDatabase(secret)
  } catch (error) {
    console.error("❌ Seed error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SEED_ERROR",
          message: error instanceof Error ? error.message : "Seed failed",
        },
      },
      { status: 500 }
    )
  }
}
