import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface AIModelConfig {
  id: string
  name: string
  provider: string
  modelId: string
  status: string
  endpoint: string
  apiKeySet: boolean
  maxTokens: number
  temperature: number
  usage: number
  costPer1kTokens: number
  description: string
}

const createModelSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  endpoint: z.string().url().optional().or(z.literal("")),
  maxTokens: z.number().min(1).max(200000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  costPer1kTokens: z.number().min(0).optional(),
  description: z.string().optional(),
})

// GET /api/ai-models - AI 모델 목록 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const modelConfigs = await prisma.systemConfig
      .findMany({
        where: { category: "AI_MODEL" },
        orderBy: { updatedAt: "desc" },
      })
      .catch(() => [])

    const models: AIModelConfig[] = modelConfigs.map((config) => {
      const value = config.value as Record<string, unknown>
      return {
        id: config.key,
        name: (value.name as string) ?? config.key,
        provider: (value.provider as string) ?? "unknown",
        modelId: (value.modelId as string) ?? "",
        status: (value.status as string) ?? "inactive",
        endpoint: (value.endpoint as string) ?? "",
        apiKeySet: (value.apiKeySet as boolean) ?? false,
        maxTokens: (value.maxTokens as number) ?? 4096,
        temperature: (value.temperature as number) ?? 0.7,
        usage: (value.usage as number) ?? 0,
        costPer1kTokens: (value.costPer1kTokens as number) ?? 0,
        description: (value.description as string) ?? "",
      }
    })

    return NextResponse.json({
      success: true,
      data: { models, total: models.length },
    })
  } catch (error) {
    console.error("[API] GET /api/ai-models error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모델 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/ai-models - AI 모델 등록
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
    const parsed = createModelSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const {
      name,
      provider,
      modelId,
      endpoint,
      maxTokens,
      temperature,
      costPer1kTokens,
      description,
    } = parsed.data

    const id = `${provider.toLowerCase()}-${modelId.replace(/[^a-zA-Z0-9]/g, "-")}`

    await prisma.systemConfig.upsert({
      where: {
        category_key: { category: "AI_MODEL", key: id },
      },
      create: {
        category: "AI_MODEL",
        key: id,
        value: {
          name,
          provider,
          modelId,
          status: "active",
          endpoint: endpoint || "",
          apiKeySet: false,
          maxTokens: maxTokens ?? 4096,
          temperature: temperature ?? 0.7,
          usage: 0,
          costPer1kTokens: costPer1kTokens ?? 0,
          description: description ?? "",
        },
        description: `AI Model: ${name}`,
      },
      update: {
        value: {
          name,
          provider,
          modelId,
          status: "active",
          endpoint: endpoint || "",
          apiKeySet: false,
          maxTokens: maxTokens ?? 4096,
          temperature: temperature ?? 0.7,
          usage: 0,
          costPer1kTokens: costPer1kTokens ?? 0,
          description: description ?? "",
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: { id, name, provider, modelId, status: "active" },
    })
  } catch (error) {
    console.error("[API] POST /api/ai-models error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모델 등록에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/ai-models - AI 모델 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "모델 ID가 필요합니다" } },
        { status: 400 }
      )
    }

    await prisma.systemConfig.delete({
      where: {
        category_key: { category: "AI_MODEL", key: id },
      },
    })

    return NextResponse.json({
      success: true,
      message: "모델이 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/ai-models error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모델 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
