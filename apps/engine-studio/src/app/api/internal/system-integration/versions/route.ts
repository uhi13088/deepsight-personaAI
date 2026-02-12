import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createVersion, bumpVersion } from "@/lib/system-integration"
import type { AlgorithmVersion, AlgorithmCategory, VersionBumpType } from "@/lib/system-integration"

interface VersionListResponse {
  versions: AlgorithmVersion[]
}

// GET — 알고리즘 버전 목록 반환
export async function GET() {
  try {
    const v1 = createVersion(
      "matching",
      "v1.0.0",
      "admin@deepsight.ai",
      "Initial matching algorithm",
      "First stable release",
      { threshold: 0.5, diversity_weight: 0.3 },
      { l1: 0.4, l2: 0.3, l3: 0.2, cross_axis: 0.1 },
      null
    )

    const v11 = createVersion(
      "matching",
      "v1.1.0",
      "admin@deepsight.ai",
      "Improved diversity",
      "Enhanced diversity index",
      { threshold: 0.55, diversity_weight: 0.4 },
      { l1: 0.4, l2: 0.3, l3: 0.2, cross_axis: 0.1 },
      "v1.0.0"
    )

    return NextResponse.json<ApiResponse<VersionListResponse>>({
      success: true,
      data: {
        versions: [
          { ...v1, status: "deprecated" as const },
          { ...v11, status: "active" as const },
        ],
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

interface BumpVersionBody {
  currentVersion: string
  bumpType: VersionBumpType
  category: AlgorithmCategory
  description: string
}

// POST — 버전 Bump
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BumpVersionBody

    if (!body.currentVersion || !body.bumpType || !body.category) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "필수 필드가 누락되었습니다" },
        },
        { status: 400 }
      )
    }

    const newVersionStr = bumpVersion(body.currentVersion, body.bumpType)
    const newVersion = createVersion(
      body.category,
      newVersionStr,
      "admin@deepsight.ai",
      body.description ?? `${body.bumpType} bump`,
      `Bumped from ${body.currentVersion}`,
      {},
      {},
      body.currentVersion
    )

    return NextResponse.json<ApiResponse<AlgorithmVersion>>({
      success: true,
      data: newVersion,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 Bump 실패" },
      },
      { status: 500 }
    )
  }
}
