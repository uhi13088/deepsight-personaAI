import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { DEFAULT_BACKUP_POLICIES, createBackupRecord, completeBackupRecord } from "@/lib/operations"
import type { BackupPolicy, BackupRecord } from "@/lib/operations"

// ── Sample data ─────────────────────────────────────────────────

function buildSampleRecords(): BackupRecord[] {
  const records: BackupRecord[] = []
  const now = Date.now()

  for (const policy of DEFAULT_BACKUP_POLICIES) {
    for (let i = 0; i < 2; i++) {
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

interface BackupResponse {
  policies: BackupPolicy[]
  records: BackupRecord[]
}

// ── GET: Return backup policies and records ────────────────────

export async function GET() {
  try {
    const records = buildSampleRecords()

    return NextResponse.json<ApiResponse<BackupResponse>>({
      success: true,
      data: {
        policies: DEFAULT_BACKUP_POLICIES,
        records,
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

// ── POST: Create backup ────────────────────────────────────────

interface CreateBackupRequest {
  policyId: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBackupRequest

    if (!body.policyId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "policyId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const policy = DEFAULT_BACKUP_POLICIES.find((p) => p.id === body.policyId)
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

    return NextResponse.json<ApiResponse<BackupRecord>>({
      success: true,
      data: completed,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "백업 생성 실패" },
      },
      { status: 500 }
    )
  }
}
