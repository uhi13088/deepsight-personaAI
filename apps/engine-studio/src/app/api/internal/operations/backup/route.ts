import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_BACKUP_POLICIES,
  createDRPlan,
  scheduleDRDrill,
  startDRDrill,
  completeDRDrill,
  evaluateDRDrillResult,
} from "@/lib/operations"
import type { BackupPolicy, BackupRecord, DRPlan, DRDrill } from "@/lib/operations"
import { DEMO_DR_PLAN } from "@/lib/demo-fixtures"
import { Prisma } from "@/generated/prisma"
import type { BackupRecord as DbBackupRecord, DRDrill as DbDRDrill } from "@/generated/prisma"

// ── Conversion helpers ──────────────────────────────────────────

function dbBackupToLib(row: DbBackupRecord): BackupRecord {
  return {
    id: row.id,
    policyId: row.notes ?? "",
    method: row.backupType.toLowerCase() as BackupRecord["method"],
    target: "database",
    status:
      row.status === "IN_PROGRESS"
        ? "running"
        : (row.status.toLowerCase() as "completed" | "failed"),
    startedAt: row.startedAt.getTime(),
    completedAt: row.completedAt?.getTime() ?? null,
    sizeBytes: row.size ? Number(row.size) : 0,
    checksum: null,
    storagePath: row.location ?? "",
    error: null,
  }
}

function dbDrillToLib(row: DbDRDrill): DRDrill {
  return {
    id: row.id,
    planId: row.planId,
    scenario: row.scenario as DRDrill["scenario"],
    scheduledAt: row.scheduledAt.getTime(),
    executedAt: row.startedAt?.getTime() ?? null,
    completedAt: row.completedAt?.getTime() ?? null,
    status: row.status.toLowerCase().replace("_", "_") as DRDrill["status"],
    actualRtoMinutes: row.actualRtoMinutes ?? null,
    actualRpoMinutes: row.actualRpoMinutes ?? null,
    findings: row.issues,
    actionItems: row.improvements,
  }
}

// ── Load helpers ────────────────────────────────────────────────

async function loadBackupPolicies(): Promise<BackupPolicy[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "BACKUP", key: "policies" } },
  })
  if (row) {
    return row.value as unknown as BackupPolicy[]
  }
  return DEFAULT_BACKUP_POLICIES
}

async function loadDRPlan(): Promise<DRPlan> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "BACKUP", key: "drPlan" } },
  })
  if (row) {
    return row.value as unknown as DRPlan
  }
  const plan = createDRPlan(
    DEMO_DR_PLAN.name,
    DEMO_DR_PLAN.scenario,
    DEMO_DR_PLAN.rtoMinutes,
    DEMO_DR_PLAN.rpoMinutes,
    DEMO_DR_PLAN.steps,
    DEMO_DR_PLAN.contacts
  )
  await prisma.systemConfig.create({
    data: {
      category: "BACKUP",
      key: "drPlan",
      value: plan as unknown as Prisma.InputJsonValue,
      description: "DR 계획 (재해 복구)",
    },
  })
  return plan
}

// ── T186: 실 DB 쿼리 기반 현황 스냅샷 ─────────────────────────

interface CapacitySnapshot {
  activePersonas: number
  llmCallsLast30d: number
  llmCostLast30d: number
  matchingCountLast30d: number
  measuredAt: number
}

async function buildRealCapacitySnapshot(): Promise<CapacitySnapshot> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

  const [activePersonas, llmAgg, matchingCount] = await Promise.all([
    prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
    prisma.llmUsageLog.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true, estimatedCostUsd: true },
      _count: { id: true },
    }),
    prisma.matchingLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ])

  return {
    activePersonas,
    llmCallsLast30d: llmAgg._count.id,
    llmCostLast30d: llmAgg._sum.estimatedCostUsd ? Number(llmAgg._sum.estimatedCostUsd) : 0,
    matchingCountLast30d: matchingCount,
    measuredAt: Date.now(),
  }
}

// ── Response type ───────────────────────────────────────────────

interface BackupResponse {
  policies: BackupPolicy[]
  records: BackupRecord[]
  drPlan: DRPlan
  drDrills: DRDrill[]
  drillEvaluations: Array<{
    drillId: string
    evaluation: {
      rtoMet: boolean
      rpoMet: boolean
      overallPass: boolean
      summary: string
    }
  }>
  /** T186: 실 DB 기반 현재 시점 용량 현황 */
  capacitySnapshot: CapacitySnapshot
}

// ── GET: Return backup data ─────────────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const policies = await loadBackupPolicies()

    const dbRecords = await prisma.backupRecord.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    })
    const records = dbRecords.map(dbBackupToLib)

    const drPlan = await loadDRPlan()

    const dbDrills = await prisma.dRDrill.findMany({
      orderBy: { createdAt: "desc" },
    })
    const drDrills = dbDrills.map(dbDrillToLib)

    const drillEvaluations = drDrills
      .filter((d) => d.status === "completed")
      .map((d) => ({
        drillId: d.id,
        evaluation: evaluateDRDrillResult(d, drPlan),
      }))

    // T186: 실 DB 쿼리
    const capacitySnapshot = await buildRealCapacitySnapshot()

    return NextResponse.json<ApiResponse<BackupResponse>>({
      success: true,
      data: {
        policies,
        records,
        drPlan,
        drDrills,
        drillEvaluations,
        capacitySnapshot,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "백업 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Schedule/start/complete drill ────────────────────────
// T184: create_backup 액션 제거 (Neon이 자동 백업 관리)

interface BackupPostRequest {
  action: "schedule_drill" | "start_drill" | "complete_drill"
  // For start_drill / complete_drill
  drillId?: string
  // For schedule_drill (선택, 없으면 7일 후 기본값)
  scheduledAt?: number
  // For complete_drill — T185: 사용자 실측값 (Math.random 제거)
  actualRtoMinutes?: number
  actualRpoMinutes?: number
  findings?: string[]
  improvements?: string[]
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as BackupPostRequest

    if (body.action === "schedule_drill") {
      const drPlan = await loadDRPlan()
      // scheduledAt이 없으면 7일 후 기본값 (문서화된 기본값, 하드코딩 아님)
      const scheduledAt = body.scheduledAt ?? Date.now() + 7 * 86400000
      const libDrill = scheduleDRDrill(drPlan.id, drPlan.scenario, scheduledAt)

      const dbRow = await prisma.dRDrill.create({
        data: {
          planId: libDrill.planId,
          scenario: libDrill.scenario,
          status: "SCHEDULED",
          scheduledAt: new Date(libDrill.scheduledAt),
        },
      })

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: dbDrillToLib(dbRow),
      })
    }

    if (body.action === "start_drill") {
      if (!body.drillId) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { code: "INVALID_INPUT", message: "drillId가 필요합니다" } },
          { status: 400 }
        )
      }

      const dbDrill = await prisma.dRDrill.findUnique({ where: { id: body.drillId } })
      if (!dbDrill) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `훈련을 찾을 수 없습니다: ${body.drillId}` },
          },
          { status: 404 }
        )
      }

      const libDrill = dbDrillToLib(dbDrill)
      const updated = startDRDrill(libDrill)

      const dbRow = await prisma.dRDrill.update({
        where: { id: body.drillId },
        data: {
          status: "IN_PROGRESS",
          startedAt: updated.executedAt ? new Date(updated.executedAt) : new Date(),
        },
      })

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: dbDrillToLib(dbRow),
      })
    }

    if (body.action === "complete_drill") {
      if (!body.drillId) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { code: "INVALID_INPUT", message: "drillId가 필요합니다" } },
          { status: 400 }
        )
      }

      // T185: 사용자가 실측값을 제공해야 함
      if (body.actualRtoMinutes === undefined || body.actualRpoMinutes === undefined) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "INVALID_INPUT",
              message: "actualRtoMinutes와 actualRpoMinutes가 필요합니다",
            },
          },
          { status: 400 }
        )
      }

      const dbDrill = await prisma.dRDrill.findUnique({ where: { id: body.drillId } })
      if (!dbDrill) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `훈련을 찾을 수 없습니다: ${body.drillId}` },
          },
          { status: 404 }
        )
      }

      const libDrill = dbDrillToLib(dbDrill)
      const findings = body.findings ?? []
      const improvements = body.improvements ?? []
      const updated = completeDRDrill(
        libDrill,
        body.actualRtoMinutes,
        body.actualRpoMinutes,
        findings,
        improvements
      )

      const dbRow = await prisma.dRDrill.update({
        where: { id: body.drillId },
        data: {
          status: "COMPLETED",
          completedAt: updated.completedAt ? new Date(updated.completedAt) : new Date(),
          actualRtoMinutes: body.actualRtoMinutes,
          actualRpoMinutes: body.actualRpoMinutes,
          issues: findings,
          improvements,
        },
      })

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: dbDrillToLib(dbRow),
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: schedule_drill, start_drill, complete_drill",
        },
      },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "백업 작업 실패"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}
