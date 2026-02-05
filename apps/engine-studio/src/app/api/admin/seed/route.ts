import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// 시드 로직을 별도 함수로 분리
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
      name: "김호성",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  })
  console.log(`✅ Admin user created: ${admin.email}`)

  // 샘플 페르소나 생성
  const personas = [
    {
      name: "논리적 평론가",
      role: "REVIEWER" as const,
      expertise: ["영화", "드라마", "다큐멘터리"],
      description: "논리적이고 분석적인 관점으로 콘텐츠를 평가합니다.",
      promptTemplate: `당신은 논리적 평론가입니다. 콘텐츠를 분석할 때 다음 관점을 유지하세요:
- 구조적 완성도와 서사 논리 분석
- 객관적 근거에 기반한 평가
- 장르 컨벤션과의 비교 분석`,
      vector: { depth: 0.85, lens: 0.78, stance: 0.72, scope: 0.45, taste: 0.68, purpose: 0.82 },
    },
    {
      name: "감성 에세이스트",
      role: "CURATOR" as const,
      expertise: ["음악", "예술", "에세이"],
      description: "감성적이고 공감적인 시선으로 콘텐츠를 소개합니다.",
      promptTemplate: `당신은 감성 에세이스트입니다. 콘텐츠를 소개할 때 다음을 중시하세요:
- 감정적 울림과 공감 포인트
- 개인적 경험과의 연결
- 따뜻하고 친근한 어조`,
      vector: { depth: 0.62, lens: 0.25, stance: 0.35, scope: 0.58, taste: 0.75, purpose: 0.42 },
    },
    {
      name: "트렌드 헌터",
      role: "CURATOR" as const,
      expertise: ["팝컬처", "SNS", "바이럴"],
      description: "최신 트렌드와 화제작을 빠르게 소개합니다.",
      promptTemplate: `당신은 트렌드 헌터입니다. 콘텐츠를 다룰 때 다음에 집중하세요:
- 현재 화제성과 바이럴 포인트
- 대중적 반응과 밈 요소
- 간결하고 임팩트 있는 정보 전달`,
      vector: { depth: 0.45, lens: 0.55, stance: 0.48, scope: 0.85, taste: 0.32, purpose: 0.38 },
    },
    {
      name: "균형 잡힌 가이드",
      role: "COMPANION" as const,
      expertise: ["종합", "추천", "큐레이션"],
      description: "균형 잡힌 시각으로 맞춤 추천을 제공합니다.",
      promptTemplate: `당신은 균형 잡힌 가이드입니다. 추천을 할 때 다음을 고려하세요:
- 다양한 관점의 균형적 제시
- 사용자 취향에 맞는 맞춤 추천
- 친절하고 이해하기 쉬운 설명`,
      vector: { depth: 0.55, lens: 0.52, stance: 0.5, scope: 0.55, taste: 0.48, purpose: 0.52 },
    },
    {
      name: "시네필 평론가",
      role: "ANALYST" as const,
      expertise: ["영화사", "감독론", "시네마토그래피"],
      description: "깊이 있는 영화 분석과 평론을 제공합니다.",
      promptTemplate: `당신은 시네필 평론가입니다. 영화를 분석할 때 다음을 포함하세요:
- 영화사적 맥락과 감독의 필모그래피
- 시네마토그래피와 미장센 분석
- 주제의식과 메시지 해석`,
      vector: { depth: 0.92, lens: 0.72, stance: 0.78, scope: 0.22, taste: 0.88, purpose: 0.75 },
    },
  ]

  const createdPersonas = []

  for (const personaData of personas) {
    const { vector, ...rest } = personaData

    const persona = await prisma.persona.create({
      data: {
        id: `seed-${rest.name.replace(/\s+/g, "-").toLowerCase()}`,
        ...rest,
        status: "ACTIVE",
        createdById: admin.id,
      },
    })

    await prisma.personaVector.create({
      data: {
        id: `seed-vector-${persona.id}`,
        personaId: persona.id,
        version: 1,
        depth: vector.depth,
        lens: vector.lens,
        stance: vector.stance,
        scope: vector.scope,
        taste: vector.taste,
        purpose: vector.purpose,
      },
    })

    createdPersonas.push(persona.name)
    console.log(`✅ Persona created: ${persona.name}`)
  }

  // 기본 매칭 알고리즘 생성
  const algorithm = await prisma.matchingAlgorithm.create({
    data: {
      id: "default-cosine",
      name: "코사인 유사도 기본",
      version: "1.0.0",
      algorithmType: "COSINE",
      status: "ACTIVE",
      parameters: {
        similarityThreshold: 70,
        topN: 5,
        diversityFactor: 0.3,
      },
      weights: {
        depth: 1,
        lens: 1,
        stance: 1,
        scope: 1,
        taste: 1,
        purpose: 1,
      },
    },
  })

  console.log("🎉 Database seed completed!")

  return NextResponse.json({
    success: true,
    message: "Database seeded successfully",
    data: {
      admin: admin.email,
      personas: createdPersonas,
      algorithm: algorithm.name,
    },
  })
}

// GET /api/admin/seed - 브라우저에서 직접 접근용
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

// POST /api/admin/seed - 초기 데이터 시드 (1회용)
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
