import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const reports = await prisma.personaWorldReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map(
          (r: {
            id: string
            targetType: string
            targetId: string
            reason: string
            status: string
            createdAt: Date
          }) => ({
            id: r.id,
            reporterType: "USER",
            targetType: r.targetType,
            targetId: r.targetId,
            reason: r.reason,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          })
        ),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MODERATION_READ_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, reportId } = body as { action: string; reportId?: string }

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "reportId required" } },
        { status: 400 }
      )
    }

    switch (action) {
      case "dismiss":
        await prisma.personaWorldReport.update({
          where: { id: reportId },
          data: { status: "DISMISSED" },
        })
        break

      case "hide": {
        const report = await prisma.personaWorldReport.findUnique({ where: { id: reportId } })
        if (report) {
          if (report.targetType === "POST") {
            await prisma.personaPost.update({
              where: { id: report.targetId },
              data: { isHidden: true },
            })
          } else if (report.targetType === "COMMENT") {
            await prisma.personaComment.update({
              where: { id: report.targetId },
              data: { isHidden: true },
            })
          }
          await prisma.personaWorldReport.update({
            where: { id: reportId },
            data: { status: "RESOLVED" },
          })
        }
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data: { action, reportId } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MODERATION_ERROR", message } },
      { status: 500 }
    )
  }
}
