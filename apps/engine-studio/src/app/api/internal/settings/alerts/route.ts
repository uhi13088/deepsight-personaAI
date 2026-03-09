import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"

const CONFIG_CATEGORY = "NOTIFICATIONS"
const CONFIG_KEY = "alert_settings"

interface AlertSettings {
  slack: { enabled: boolean; webhookUrl: string }
  email: { enabled: boolean; recipients: string[] }
  categories: {
    security: boolean
    cost: boolean
    quality: boolean
    system: boolean
  }
}

const DEFAULT_SETTINGS: AlertSettings = {
  slack: { enabled: false, webhookUrl: "" },
  email: { enabled: false, recipients: [] },
  categories: { security: true, cost: true, quality: true, system: true },
}

/**
 * GET /api/internal/settings/alerts
 * 알림 설정 조회
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  const config = await prisma.systemConfig.findUnique({
    where: { category_key: { category: CONFIG_CATEGORY, key: CONFIG_KEY } },
    select: { value: true },
  })

  const settings = config?.value
    ? { ...DEFAULT_SETTINGS, ...(config.value as object) }
    : DEFAULT_SETTINGS

  return NextResponse.json({ success: true, data: settings })
}

/**
 * POST /api/internal/settings/alerts
 * 알림 설정 저장
 */
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const settings: AlertSettings = {
      slack: {
        enabled: Boolean(body.slack?.enabled),
        webhookUrl: String(body.slack?.webhookUrl ?? ""),
      },
      email: {
        enabled: Boolean(body.email?.enabled),
        recipients: Array.isArray(body.email?.recipients) ? body.email.recipients : [],
      },
      categories: {
        security: body.categories?.security !== false,
        cost: body.categories?.cost !== false,
        quality: body.categories?.quality !== false,
        system: body.categories?.system !== false,
      },
    }

    await prisma.systemConfig.upsert({
      where: { category_key: { category: CONFIG_CATEGORY, key: CONFIG_KEY } },
      update: { value: settings as unknown as Prisma.InputJsonValue },
      create: {
        category: CONFIG_CATEGORY,
        key: CONFIG_KEY,
        value: settings as unknown as Prisma.InputJsonValue,
        description: "Alert notification settings",
      },
    })

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SETTINGS_SAVE_ERROR", message } },
      { status: 500 }
    )
  }
}
