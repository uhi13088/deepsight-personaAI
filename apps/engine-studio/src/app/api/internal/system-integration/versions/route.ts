import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createVersion,
  bumpVersion,
  diffVersions,
  rollbackVersion,
  setVersionTesting,
  activateVersion,
  deprecateVersion,
  DEFAULT_VERSION_POLICY,
} from "@/lib/system-integration"
import type {
  AlgorithmVersion,
  AlgorithmCategory,
  VersionBumpType,
  VersionDiff,
  DeployEnvironment,
} from "@/lib/system-integration"

// ── In-memory Store ────────────────────────────────────────────

let versions: AlgorithmVersion[] = []

// Seed data initialization
function ensureSeedData() {
  if (versions.length > 0) return

  const v1 = createVersion(
    "matching",
    "v1.0.0",
    "admin@deepsight.ai",
    "Initial matching algorithm",
    "First stable release of 3-tier matching",
    { threshold: 0.5, diversity_weight: 0.3, exploration_rate: 0.1 },
    { l1: 0.4, l2: 0.3, l3: 0.2, cross_axis: 0.1 },
    null
  )

  const v11 = createVersion(
    "matching",
    "v1.1.0",
    "admin@deepsight.ai",
    "Improved diversity scoring",
    "Enhanced diversity index calculation",
    { threshold: 0.55, diversity_weight: 0.4, exploration_rate: 0.1 },
    { l1: 0.4, l2: 0.3, l3: 0.2, cross_axis: 0.1 },
    "v1.0.0"
  )

  const v12 = createVersion(
    "matching",
    "v1.2.0",
    "admin@deepsight.ai",
    "Cross-axis optimization",
    "Optimized cross-axis weight distribution",
    { threshold: 0.55, diversity_weight: 0.4, exploration_rate: 0.15 },
    { l1: 0.35, l2: 0.3, l3: 0.2, cross_axis: 0.15 },
    "v1.1.0"
  )

  versions = [
    { ...v1, status: "deprecated" as const },
    { ...v11, status: "active" as const, deployedEnvironments: ["development", "staging"] },
    { ...v12, status: "draft" as const },
  ]
}

// ── Response Types ─────────────────────────────────────────────

interface VersionListResponse {
  versions: AlgorithmVersion[]
}

// GET — 알고리즘 버전 목록 반환
export async function GET() {
  try {
    ensureSeedData()

    return NextResponse.json<ApiResponse<VersionListResponse>>({
      success: true,
      data: {
        versions,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 목록 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── Action Types ───────────────────────────────────────────────

type VersionAction =
  | {
      action: "bump"
      bumpType: VersionBumpType
      category: AlgorithmCategory
      description?: string
    }
  | {
      action: "diff"
      fromId: string
      toId: string
    }
  | {
      action: "set_testing"
      versionId: string
    }
  | {
      action: "activate"
      versionId: string
    }
  | {
      action: "deprecate"
      versionId: string
      reason?: string
    }
  | {
      action: "rollback"
      currentId: string
      targetId: string
      reason?: string
      environments?: DeployEnvironment[]
    }

// POST — 버전 액션 처리
export async function POST(request: NextRequest) {
  try {
    ensureSeedData()
    const body = (await request.json()) as VersionAction

    switch (body.action) {
      case "bump": {
        if (!body.bumpType || !body.category) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_REQUEST", message: "필수 필드가 누락되었습니다" },
            },
            { status: 400 }
          )
        }
        const latest = versions[versions.length - 1]
        if (!latest) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "버전이 존재하지 않습니다" },
            },
            { status: 404 }
          )
        }

        const newVersionStr = bumpVersion(latest.version, body.bumpType)
        const desc = body.description ?? `${body.bumpType} bump from ${latest.version}`
        const changelog =
          body.bumpType === "major"
            ? "Breaking change"
            : body.bumpType === "minor"
              ? "Feature update"
              : "Bug fix"

        const newVer = createVersion(
          body.category,
          newVersionStr,
          "admin@deepsight.ai",
          desc,
          changelog,
          { ...latest.config },
          { ...latest.weights },
          latest.version
        )
        versions.push(newVer)

        return NextResponse.json<ApiResponse<AlgorithmVersion>>({
          success: true,
          data: newVer,
        })
      }

      case "diff": {
        const from = versions.find((v) => v.id === body.fromId)
        const to = versions.find((v) => v.id === body.toId)
        if (!from || !to) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "비교 대상 버전을 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        const result = diffVersions(from, to)
        return NextResponse.json<ApiResponse<VersionDiff>>({
          success: true,
          data: result,
        })
      }

      case "set_testing": {
        const idx = versions.findIndex((v) => v.id === body.versionId)
        if (idx === -1) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "버전을 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        versions[idx] = setVersionTesting(versions[idx])
        return NextResponse.json<ApiResponse<AlgorithmVersion>>({
          success: true,
          data: versions[idx],
        })
      }

      case "activate": {
        const idx = versions.findIndex((v) => v.id === body.versionId)
        if (idx === -1) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "버전을 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        versions[idx] = activateVersion(versions[idx], versions, DEFAULT_VERSION_POLICY)
        return NextResponse.json<ApiResponse<AlgorithmVersion>>({
          success: true,
          data: versions[idx],
        })
      }

      case "deprecate": {
        const idx = versions.findIndex((v) => v.id === body.versionId)
        if (idx === -1) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "버전을 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        versions[idx] = deprecateVersion(versions[idx], body.reason ?? "Replaced by newer version")
        return NextResponse.json<ApiResponse<AlgorithmVersion>>({
          success: true,
          data: versions[idx],
        })
      }

      case "rollback": {
        const currentIdx = versions.findIndex((v) => v.id === body.currentId)
        const targetIdx = versions.findIndex((v) => v.id === body.targetId)
        if (currentIdx === -1 || targetIdx === -1) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "롤백 대상 버전을 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        const { updatedCurrent, updatedTarget } = rollbackVersion(
          versions[currentIdx],
          versions[targetIdx],
          body.reason ?? "Performance regression detected",
          "admin@deepsight.ai",
          body.environments ?? ["development"]
        )
        versions[currentIdx] = updatedCurrent
        versions[targetIdx] = updatedTarget

        return NextResponse.json<
          ApiResponse<{ updatedCurrent: AlgorithmVersion; updatedTarget: AlgorithmVersion }>
        >({
          success: true,
          data: { updatedCurrent, updatedTarget },
        })
      }

      default:
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_ACTION", message: "지원하지 않는 액션입니다" },
          },
          { status: 400 }
        )
    }
  } catch (e) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: e instanceof Error ? e.message : "버전 액션 처리 실패",
        },
      },
      { status: 500 }
    )
  }
}
