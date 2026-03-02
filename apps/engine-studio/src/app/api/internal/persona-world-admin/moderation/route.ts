import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const reports = await prisma.personaWorldReport
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(
        () =>
          [] as Array<{
            id: string
            targetType: string
            targetId: string
            reason: string
            status: string
            createdAt: Date
          }>
      )

    // v4.0: PWQuarantineEntry 목록 (T298)
    const quarantineEntries = await prisma.pWQuarantineEntry
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        where: { status: "PENDING" },
      })
      .catch(
        () =>
          [] as Array<{
            id: string
            contentType: string
            contentId: string
            personaId: string
            reason: string
            severity: string
            status: string
            expiresAt: Date | null
            createdAt: Date
          }>
      )

    // v4.0: ContentReport 목록 (T296)
    const contentReports = await prisma.contentReport
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(
        () =>
          [] as Array<{
            id: string
            reporterId: string
            targetType: string
            targetId: string
            category: string
            status: string
            createdAt: Date
          }>
      )

    // v4.0: 최근 ModerationLog (T298)
    const moderationLogs = await prisma.moderationLog
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      .catch(
        () =>
          [] as Array<{
            id: string
            contentType: string
            stage: string
            verdict: string
            createdAt: Date
          }>
      )

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map((r) => ({
          id: r.id,
          reporterType: "USER",
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
        // v4.0
        quarantineEntries: quarantineEntries.map((q) => ({
          id: q.id,
          contentType: q.contentType,
          contentId: q.contentId,
          personaId: q.personaId,
          reason: q.reason,
          severity: q.severity,
          status: q.status,
          expiresAt: q.expiresAt?.toISOString() ?? null,
          createdAt: q.createdAt.toISOString(),
        })),
        contentReports: contentReports.map((cr) => ({
          id: cr.id,
          reporterId: cr.reporterId,
          targetType: cr.targetType,
          targetId: cr.targetId,
          category: cr.category,
          status: cr.status,
          createdAt: cr.createdAt.toISOString(),
        })),
        recentModerationLogs: moderationLogs.map((ml) => ({
          id: ml.id,
          contentType: ml.contentType,
          stage: ml.stage,
          verdict: ml.verdict,
          createdAt: ml.createdAt.toISOString(),
        })),
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
  const { response } = await requireAuth()
  if (response) return response

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
            const comment = await prisma.personaComment.findUnique({
              where: { id: report.targetId },
              select: { postId: true, isHidden: true },
            })
            if (comment && !comment.isHidden) {
              await prisma.$transaction([
                prisma.personaComment.update({
                  where: { id: report.targetId },
                  data: { isHidden: true },
                }),
                prisma.personaPost.update({
                  where: { id: comment.postId },
                  data: { commentCount: { decrement: 1 } },
                }),
              ])
            }
          }
          await prisma.personaWorldReport.update({
            where: { id: reportId },
            data: { status: "RESOLVED", resolvedAt: new Date(), resolution: "HIDDEN" },
          })
        }
        break
      }

      case "resolve": {
        const { resolution } = body as { resolution?: string }
        await prisma.personaWorldReport.update({
          where: { id: reportId },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolution: resolution ?? "RESOLVED",
          },
        })
        break
      }

      case "delete": {
        const targetReport = await prisma.personaWorldReport.findUnique({
          where: { id: reportId },
        })
        if (targetReport) {
          if (targetReport.targetType === "POST") {
            await prisma.personaPost.delete({ where: { id: targetReport.targetId } }).catch(() => {
              /* already deleted */
            })
          } else if (targetReport.targetType === "COMMENT") {
            const commentToDelete = await prisma.personaComment.findUnique({
              where: { id: targetReport.targetId },
              select: { postId: true },
            })
            if (commentToDelete) {
              await prisma
                .$transaction([
                  prisma.personaComment.delete({ where: { id: targetReport.targetId } }),
                  prisma.personaPost.update({
                    where: { id: commentToDelete.postId },
                    data: { commentCount: { decrement: 1 } },
                  }),
                ])
                .catch(() => {
                  /* already deleted */
                })
            }
          }
          await prisma.personaWorldReport.update({
            where: { id: reportId },
            data: { status: "RESOLVED", resolvedAt: new Date(), resolution: "DELETED" },
          })
        }
        break
      }

      case "pause_persona": {
        const { personaId } = body as { personaId?: string }
        if (personaId) {
          await prisma.persona.update({
            where: { id: personaId },
            data: { status: "PAUSED" },
          })
        }
        await prisma.personaWorldReport.update({
          where: { id: reportId },
          data: { status: "RESOLVED", resolvedAt: new Date(), resolution: "PERSONA_PAUSED" },
        })
        break
      }

      // v4.0: PWQuarantineEntry 승인/거부 (T298 AC3)
      case "approve_quarantine": {
        const { quarantineId } = body as { quarantineId?: string }
        if (quarantineId) {
          await prisma.pWQuarantineEntry.update({
            where: { id: quarantineId },
            data: { status: "APPROVED", reviewedAt: new Date(), reviewNote: "Admin approved" },
          })
        }
        return NextResponse.json({ success: true, data: { action, quarantineId } })
      }

      case "reject_quarantine": {
        const { quarantineId: rejectId, reviewNote } = body as {
          quarantineId?: string
          reviewNote?: string
        }
        if (rejectId) {
          await prisma.pWQuarantineEntry.update({
            where: { id: rejectId },
            data: {
              status: "REJECTED",
              reviewedAt: new Date(),
              reviewNote: reviewNote ?? "Admin rejected",
            },
          })
        }
        return NextResponse.json({ success: true, data: { action, quarantineId: rejectId } })
      }

      // v4.0: ContentReport 처리 (T296 AC3)
      case "resolve_content_report": {
        const { contentReportId, resolution: reportResolution } = body as {
          contentReportId?: string
          resolution?: string
        }
        if (contentReportId) {
          await prisma.contentReport.update({
            where: { id: contentReportId },
            data: {
              status: "RESOLVED",
              resolvedAt: new Date(),
              resolution: reportResolution ?? "NO_ACTION",
            },
          })
        }
        return NextResponse.json({ success: true, data: { action, contentReportId } })
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
