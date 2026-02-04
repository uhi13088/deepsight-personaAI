import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

async function seedDatabase(secret: string | null) {
  if (secret !== process.env.SEED_SECRET && secret !== "deepsight-init-2024") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid secret" } },
      { status: 401 }
    )
  }

  // 이미 시드된 경우 스킵
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "uhi1308@naver.com" },
  })

  if (existingAdmin) {
    return NextResponse.json({
      success: true,
      message: "Database already seeded",
      data: { adminExists: true },
    })
  }

  console.log("🌱 Starting database seed...")

  // 관리자 비밀번호 해싱
  const adminPassword = "Ghrnfldks12!!@"
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  // 관리자 계정 생성
  const admin = await prisma.user.create({
    data: {
      email: "uhi1308@naver.com",
      name: "관리자",
      password: hashedPassword,
    },
  })
  console.log(`✅ Admin user created: ${admin.email}`)

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
  console.log(`✅ Admin added to organization as OWNER`)

  console.log("🎉 Database seed completed!")

  return NextResponse.json({
    success: true,
    message: "Database seeded successfully",
    data: {
      admin: admin.email,
      organization: org.name,
    },
  })
}

// GET /api/admin/seed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")
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

// POST /api/admin/seed
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")
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
