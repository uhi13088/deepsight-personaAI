import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_PREFERENCES,
  type NotificationPreferenceData,
} from "@/lib/persona-world/notification-preference"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/persona-world/notification-preferences?userId=xxx
 * 알림 환경설정 조회
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  try {
    const pref = await prisma.pWNotificationPreference.findUnique({
      where: { userId },
    })

    const data: NotificationPreferenceData = pref
      ? {
          likeEnabled: pref.likeEnabled,
          commentEnabled: pref.commentEnabled,
          followEnabled: pref.followEnabled,
          mentionEnabled: pref.mentionEnabled,
          repostEnabled: pref.repostEnabled,
          recommendationEnabled: pref.recommendationEnabled,
          newPostEnabled: pref.newPostEnabled,
          systemEnabled: pref.systemEnabled,
          quietHoursStart: pref.quietHoursStart,
          quietHoursEnd: pref.quietHoursEnd,
        }
      : { ...DEFAULT_PREFERENCES }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[notification-preferences GET]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch preferences" } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/persona-world/notification-preferences
 * 알림 환경설정 업데이트 (upsert)
 */
export async function PUT(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
        { status: 400 }
      )
    }

    // 허용 필드만 필터링
    const allowedFields = [
      "likeEnabled",
      "commentEnabled",
      "followEnabled",
      "mentionEnabled",
      "repostEnabled",
      "recommendationEnabled",
      "newPostEnabled",
      "systemEnabled",
      "quietHoursStart",
      "quietHoursEnd",
    ]
    const filtered: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        // quietHours 유효성 검사
        if (key === "quietHoursStart" || key === "quietHoursEnd") {
          const val = updates[key]
          if (val !== null && (typeof val !== "number" || val < 0 || val > 23)) {
            return NextResponse.json(
              {
                success: false,
                error: { code: "INVALID_PARAM", message: `${key} must be 0-23 or null` },
              },
              { status: 400 }
            )
          }
        }
        filtered[key] = updates[key]
      }
    }

    const pref = await prisma.pWNotificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_PREFERENCES,
        ...filtered,
      },
      update: filtered,
    })

    const data: NotificationPreferenceData = {
      likeEnabled: pref.likeEnabled,
      commentEnabled: pref.commentEnabled,
      followEnabled: pref.followEnabled,
      mentionEnabled: pref.mentionEnabled,
      repostEnabled: pref.repostEnabled,
      recommendationEnabled: pref.recommendationEnabled,
      newPostEnabled: pref.newPostEnabled,
      systemEnabled: pref.systemEnabled,
      quietHoursStart: pref.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[notification-preferences PUT]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to update preferences" } },
      { status: 500 }
    )
  }
}
