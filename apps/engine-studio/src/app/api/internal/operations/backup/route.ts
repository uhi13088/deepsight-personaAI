import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
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

// ── In-memory store ─────────────────────────────────────────────

interface BackupStore {
  policies: BackupPolicy[]
  records: BackupRecord[]
  drPlan: DRPlan
  drDrills: DRDrill[]
  capacityReport: CapacityReport
}

function buildInitialRecords(): BackupRecord[] {
  const records: BackupRecord[] = []
  const now = Date.now()

  for (const policy of DEFAULT_BACKUP_POLICIES) {
    for (let i = 0; i < 3; i++) {
      const startedAt = now - (i + 1) * 24 * 60 * 60 * 1000
      const record = createBackupRecord(policy, `${policy.destinationPath}/${now}.bak`)
      const completed = completeBackupRecord(
        { ...record, startedAt },
        1024 * 1024 * (50 + i * 100),
        `sha256-sample-${policy.id}-${i}`
      )
      records.push(completed)
    }
  }

  return records
}

function buildInitialDRPlan(): DRPlan {
  return createDRPlan(
    "데이터베이스 장애 복구",
    "database_failure",
    30,
    5,
    [
      {
        description: "DB 페일오버 실행",
        responsible: "DBA팀",
        estimatedMinutes: 10,
        prerequisites: [],
        verificationCommand: "pg_isready",
      },
      {
        description: "트래픽 리다이렉트",
        responsible: "인프라팀",
        estimatedMinutes: 5,
        prerequisites: ["DB 페일오버 실행"],
        verificationCommand: null,
      },
      {
        description: "서비스 검증",
        responsible: "QA팀",
        estimatedMinutes: 15,
        prerequisites: ["트래픽 리다이렉트"],
        verificationCommand: "curl /health",
      },
    ],
    [
      {
        name: "김DBA",
        role: "DBA Lead",
        phone: "010-1234-5678",
        email: "dba@deepsight.ai",
        isPrimary: true,
      },
      {
        name: "박인프라",
        role: "Infra Lead",
        phone: "010-2345-6789",
        email: "infra@deepsight.ai",
        isPrimary: false,
      },
    ]
  )
}

function buildInitialCapacityReport(): CapacityReport {
  const msPerDay = 86400000
  const now = Date.now()
  const baseTime = now - 30 * msPerDay

  const snapshots: UsageSnapshot[] = []
  for (let day = 0; day < 30; day++) {
    const resources: ResourceUsage[] = [
      createResourceUsage("cpu", 45 + day * 0.5 + (day % 5), 100, "%"),
      createResourceUsage("memory", 55 + day * 0.3 + (day % 3), 100, "%"),
      createResourceUsage("disk", 40 + day * 0.8 + (day % 2), 100, "%"),
      createResourceUsage("network", 30 + (day % 10), 100, "%"),
      createResourceUsage("api_latency", 200 + (day % 100), 5000, "ms"),
      createResourceUsage("error_rate", 0.5 + (day % 5) * 0.1, 100, "%"),
    ]
    snapshots.push({ timestamp: baseTime + day * msPerDay, resources })
  }

  const currentResources: ResourceUsage[] = [
    createResourceUsage("cpu", 60, 100, "%"),
    createResourceUsage("memory", 65, 100, "%"),
    createResourceUsage("disk", 64, 100, "%"),
    createResourceUsage("network", 35, 100, "%"),
    createResourceUsage("api_latency", 250, 5000, "ms"),
    createResourceUsage("error_rate", 0.8, 100, "%"),
  ]

  return buildCapacityReport(snapshots, currentResources, 90, 80)
}

function buildInitialStore(): BackupStore {
  return {
    policies: DEFAULT_BACKUP_POLICIES,
    records: buildInitialRecords(),
    drPlan: buildInitialDRPlan(),
    drDrills: [],
    capacityReport: buildInitialCapacityReport(),
  }
}

let store: BackupStore | null = null

function getStore(): BackupStore {
  if (!store) {
    store = buildInitialStore()
  }
  return store
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
  try {
    const s = getStore()

    const drillEvaluations = s.drDrills
      .filter((d) => d.status === "completed")
      .map((d) => ({
        drillId: d.id,
        evaluation: evaluateDRDrillResult(d, s.drPlan),
      }))

    return NextResponse.json<ApiResponse<BackupResponse>>({
      success: true,
      data: {
        policies: s.policies,
        records: s.records,
        drPlan: s.drPlan,
        drDrills: s.drDrills,
        drillEvaluations,
        capacityReport: s.capacityReport,
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
  try {
    const body = (await request.json()) as BackupPostRequest
    const s = getStore()

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

      const policy = s.policies.find((p) => p.id === body.policyId)
      if (!policy) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `정책을 찾을 수 없습니다: ${body.policyId}` },
          },
          { status: 404 }
        )
      }

      const record = createBackupRecord(policy, `${policy.destinationPath}/${Date.now()}.bak`)
      const completed = completeBackupRecord(
        record,
        1024 * 1024 * 150,
        `sha256-${Math.random().toString(36).slice(2, 10)}`
      )
      s.records = [completed, ...s.records]

      return NextResponse.json<ApiResponse<BackupRecord>>({
        success: true,
        data: completed,
      })
    }

    if (body.action === "schedule_drill") {
      const drill = scheduleDRDrill(s.drPlan.id, s.drPlan.scenario, Date.now() + 7 * 86400000)
      s.drDrills = [...s.drDrills, drill]

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: drill,
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

      const idx = s.drDrills.findIndex((d) => d.id === body.drillId)
      if (idx === -1) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `훈련을 찾을 수 없습니다: ${body.drillId}` },
          },
          { status: 404 }
        )
      }

      const updated = startDRDrill(s.drDrills[idx])
      s.drDrills[idx] = updated

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: updated,
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

      const idx = s.drDrills.findIndex((d) => d.id === body.drillId)
      if (idx === -1) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `훈련을 찾을 수 없습니다: ${body.drillId}` },
          },
          { status: 404 }
        )
      }

      const updated = completeDRDrill(
        s.drDrills[idx],
        25 + Math.floor(Math.random() * 15),
        3 + Math.floor(Math.random() * 5),
        ["페일오버 지연 확인됨"],
        ["자동 페일오버 스크립트 개선"]
      )
      s.drDrills[idx] = updated

      return NextResponse.json<ApiResponse<DRDrill>>({
        success: true,
        data: updated,
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
