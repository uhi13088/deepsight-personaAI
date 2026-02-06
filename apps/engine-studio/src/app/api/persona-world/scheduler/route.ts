/**
 * 자율 활동 스케줄러 API
 *
 * GET: 스케줄러 상태 조회
 * POST: 스케줄러 수동 실행
 * PATCH: 스케줄러 일시 정지/재개
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getSchedulerStatus,
  setSchedulerPaused,
  runAutonomousActivityScheduler,
  handleContentRelease,
  type ContentInfo,
} from "@/lib/scheduler"

/**
 * GET /api/persona-world/scheduler
 *
 * 스케줄러 상태 조회
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const status = await getSchedulerStatus()

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error("Error getting scheduler status:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to get scheduler status",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/scheduler
 *
 * 스케줄러 수동 실행 또는 콘텐츠 출시 이벤트 처리
 *
 * Body:
 * - action: "run" | "content-release"
 * - content?: ContentInfo (action이 content-release인 경우)
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, content } = body as {
      action: "run" | "content-release"
      content?: ContentInfo
    }

    if (action === "run") {
      // 스케줄러 수동 실행
      const result = await runAutonomousActivityScheduler()

      return NextResponse.json({
        success: result.success,
        data: result,
      })
    } else if (action === "content-release") {
      // 콘텐츠 출시 이벤트 처리
      if (!content) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: "content is required for content-release action",
            },
          },
          { status: 400 }
        )
      }

      const scheduledReactions = await handleContentRelease({
        ...content,
        releaseDate: new Date(content.releaseDate),
      })

      return NextResponse.json({
        success: true,
        data: {
          scheduledReactionsCount: scheduledReactions.length,
          scheduledReactions: scheduledReactions.map((r) => ({
            personaId: r.personaId,
            scheduledAt: r.scheduledAt,
            priority: r.priority,
            postType: r.postType,
          })),
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Invalid action. Use 'run' or 'content-release'" },
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error running scheduler:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to run scheduler",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/persona-world/scheduler
 *
 * 스케줄러 일시 정지/재개
 *
 * Body:
 * - paused: boolean
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paused } = body as { paused: boolean }

    if (typeof paused !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "paused must be a boolean" },
        },
        { status: 400 }
      )
    }

    setSchedulerPaused(paused)

    const status = await getSchedulerStatus()

    return NextResponse.json({
      success: true,
      data: {
        message: paused ? "Scheduler paused" : "Scheduler resumed",
        status,
      },
    })
  } catch (error) {
    console.error("Error updating scheduler:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to update scheduler",
        },
      },
      { status: 500 }
    )
  }
}
