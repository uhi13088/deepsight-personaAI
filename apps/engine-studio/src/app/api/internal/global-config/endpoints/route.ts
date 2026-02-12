import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createAPIEndpointManager, registerEndpoint } from "@/lib/global-config"
import type { APIEndpoint } from "@/lib/global-config"

// GET — returns endpoint manager state
export async function GET() {
  try {
    const manager = createAPIEndpointManager()

    // Return a serializable version (Map -> object)
    const serializable = {
      endpoints: manager.endpoints,
      versions: manager.versions,
      healthResults: Object.fromEntries(manager.healthResults),
    }

    return NextResponse.json<ApiResponse<typeof serializable>>({
      success: true,
      data: serializable,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "엔드포인트 관리자 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// POST — registers a new endpoint
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { endpoint: Omit<APIEndpoint, "id"> }

    if (!body.endpoint || !body.endpoint.path || !body.endpoint.method) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "path와 method는 필수입니다" },
        },
        { status: 400 }
      )
    }

    let manager = createAPIEndpointManager()
    manager = registerEndpoint(manager, body.endpoint)

    const serializable = {
      endpoints: manager.endpoints,
      versions: manager.versions,
      healthResults: Object.fromEntries(manager.healthResults),
    }

    return NextResponse.json<ApiResponse<typeof serializable>>({
      success: true,
      data: serializable,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "엔드포인트 등록 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
