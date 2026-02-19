import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_BACKUP_POLICIES,
  createBackupRecord,
  completeBackupRecord,
  createDRPlan,
  scheduleDRDrill,
  startDRDrill,
  completeDRDrill,
  evaluateDRDrillResult,
  buildCapacityReport,
  createResourceUsage,
} from "@/lib/operations"
import type {
  BackupPolicy,
  BackupRecord,
  DRPlan,
  DRDrill,
  CapacityReport,
  ResourceUsage,
  UsageSnapshot,
} from "@/lib/operations"
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

function backupMethodToDbType(method: string): "FULL" | "INCREMENTAL" | "DIFFERENTIAL" {
  switch (method) {
    case "incremental":
      return "INCREMENTAL"
    case "differential":
      return "DIFFERENTIAL"
    default:
      return "FULL"
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
  // Create default from DEMO_DR_PLAN and persist it
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

function buildDefaultCapacityReport(): CapacityReport {
  const msPerDay = 86400000
  const now = Date.now()
  const baseTime = now - 30 * msPerDay

  const snapshots: UsageSnapshot[] = []
  for (let day = 0; day < 30; day++) {
    const resources: ResourceUsage[] = [
      createResourceUsage("active_personas", 10 + day * 0.5, 100, "개"),
      createResourceUsage("llm_calls", 200 + day * 10 + (day % 5), 10000, "회"),
      createResourceUsage("llm_cost", 5 + day * 0.3 + (day % 3), 500, "USD"),
      createResourceUsage("llm_error_rate", 1 + (day % 5) * 0.3, 100, "%"),
      createResourceUsage("avg_latency", 800 + (day % 100) * 10, 15000, "ms"),
      createResourceUsage("matching_count", 50 + day * 3 + (day % 10), 10000, "회"),
    ]
    snapshots.push({ timestamp: baseTime + day * msPerDay, resources })
  }

  const currentResources: ResourceUsage[] = [
    createResourceUsage("active_personas", 25, 100, "개"),
    createResourceUsage("llm_calls", 500, 10000, "회"),
    createResourceUsage("llm_cost", 14, 500, "USD"),
    createResourceUsage("llm_error_rate", 2.5, 100, "%"),
    createResourceUsage("avg_latency", 1200, 15000, "ms"),
    createResourceUsage("matching_count", 140, 10000, "회"),
  ]

  return buildCapacityReport(snapshots, currentResources, 90, 80)
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
  capacityReport: CapacityReport
}

// ── GET: Return backup data ─────────────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    // 1. Load backup policies from SystemConfig (or use defaults)
    const policies = await loadBackupPolicies()

    // 2. Load backup records from DB (recent 50)
    const dbRecords = await prisma.backupRecord.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    })
    const records = dbRecords.map(dbBackupToLib)

    // 3. Load DR plan from SystemConfig (or create default)
    const drPlan = await loadDRPlan()

    // 4. Load DR drills from DB
    const dbDrills = await prisma.dRDrill.findMany({
      orderBy: { createdAt: "desc" },
    })
    const drDrills = dbDrills.map(dbDrillToLib)

    // 5. Compute drill evaluations
    const drillEvaluations = drDrills
      .filter((d) => d.status === "completed")
      .map((d) => ({
        drillId: d.id,
        evaluation: evaluateDRDrillResult(d, drPlan),
      }))

    // 6. Build capacity report (static defaults)
    const capacityReport = buildDefaultCapacityReport()

    return NextResponse.json<ApiResponse<BackupResponse>>({
      success: true,
      data: {
        policies,
        records,
        drPlan,
        drDrills,
        drillEvaluations,
        capacityReport,
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

// ── POST: Create backup, schedule/start/complete drill ──────────

interface BackupPostRequest {
  action: "create_backup" | "schedule_drill" | "start_drill" | "complete_drill"
  // For create_backup
  policyId?: string
  // For start_drill / complete_drill
  drillId?: string
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as BackupPostRequest

    if (body.action === "create_backup") {
      if (!body.policyId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "policyId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const policies = await loadBackupPolicies()
      const policy = policies.find((p) => p.id === body.policyId)
      if (!policy) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `정책을 찾을 수 없습니다: ${body.policyId}` },
          },
          { status: 404 }
        )
      }

      // Create lib record for business logic
      const libRecord = createBackupRecord(policy, `${policy.destinationPath}/${Date.now()}.bak`)
      const completed = completeBackupRecord(
        libRecord,
        1024 * 1024 * 150,
        `sha256-${Math.random().toString(36).slice(2, 10)}`
      )

      // Persist to DB
      const dbRow = await prisma.backupRecord.create({
        data: {
          backupType: backupMethodToDbType(policy.method),
          status: "COMPLETED",
          size: BigInt(completed.sizeBytes),
          location: completed.storagePath,
          notes: policy.id,
          startedAt: new Date(completed.startedAt),
          completedAt: completed.completedAt ? new Date(completed.completedAt) : null,
        },
      })

      // Return the DB-backed record converted to lib type
      const result = dbBackupToLib(dbRow)

      return NextResponse.json<ApiResponse<BackupRecord>>({
        success: true,
        data: result,
      })
    }

    if (body.action === "schedule_drill") {
      const drPlan = await loadDRPlan()
      const libDrill = scheduleDRDrill(drPlan.id, drPlan.scenario, Date.now() + 7 * 86400000)

      // Persist to DB
      const dbRow = await prisma.dRDrill.create({
        data: {
          planId: libDrill.planId,
          scenario: libDrill.scenario,
          status: "SCHEDULED",
          scheduledAt: new Date(libDrill.scheduledAt),
        },
      })

      const result = dbDrillToLib(dbRow)

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: result,
      })
    }

    if (body.action === "start_drill") {
      if (!body.drillId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "drillId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const dbDrill = await prisma.dRDrill.findUnique({
        where: { id: body.drillId },
      })
      if (!dbDrill) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `훈련을 찾을 수 없습니다: ${body.drillId}` },
          },
          { status: 404 }
        )
      }

      // Use lib function for validation
      const libDrill = dbDrillToLib(dbDrill)
      const updated = startDRDrill(libDrill)

      // Persist state change to DB
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
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "drillId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const dbDrill = await prisma.dRDrill.findUnique({
        where: { id: body.drillId },
      })
      if (!dbDrill) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `훈련을 찾을 수 없습니다: ${body.drillId}` },
          },
          { status: 404 }
        )
      }

      // Use lib function for validation and business logic
      const libDrill = dbDrillToLib(dbDrill)
      const actualRto = 25 + Math.floor(Math.random() * 15)
      const actualRpo = 3 + Math.floor(Math.random() * 5)
      const findings = ["페일오버 지연 확인됨"]
      const improvements = ["자동 페일오버 스크립트 개선"]
      const updated = completeDRDrill(libDrill, actualRto, actualRpo, findings, improvements)

      // Persist to DB
      const dbRow = await prisma.dRDrill.update({
        where: { id: body.drillId },
        data: {
          status: "COMPLETED",
          completedAt: updated.completedAt ? new Date(updated.completedAt) : new Date(),
          actualRtoMinutes: actualRto,
          actualRpoMinutes: actualRpo,
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
          message:
            "유효한 action이 필요합니다: create_backup, schedule_drill, start_drill, complete_drill",
        },
      },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "백업 작업 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
