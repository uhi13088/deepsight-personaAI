import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createAPIEndpointManager,
  registerEndpoint,
  updateRateLimit,
  recordHealthCheck,
  getHealthSummary,
  DEFAULT_RATE_LIMITS,
  DEFAULT_HEALTH_CHECK,
} from "@/lib/global-config"
import type { APIEndpointManager, APIEndpoint, HealthCheckResult } from "@/lib/global-config"

// ── In-memory store (persists within server session) ─────────
let store: APIEndpointManager | null = null

const SAMPLE_ENDPOINTS: Array<Omit<APIEndpoint, "id">> = [
  {
    name: "Get Personas",
    path: "/api/v2/personas",
    method: "GET",
    scope: "external",
    version: "v2",
    status: "active",
    description: "List all personas with filtering",
    rateLimit: { ...DEFAULT_RATE_LIMITS.external },
    healthCheck: { ...DEFAULT_HEALTH_CHECK },
    tags: ["personas", "list"],
  },
  {
    name: "Create Persona",
    path: "/api/v2/personas",
    method: "POST",
    scope: "external",
    version: "v2",
    status: "active",
    description: "Create a new persona",
    rateLimit: { ...DEFAULT_RATE_LIMITS.external },
    healthCheck: { ...DEFAULT_HEALTH_CHECK },
    tags: ["personas", "create"],
  },
  {
    name: "Match User",
    path: "/api/v3/match",
    method: "POST",
    scope: "external",
    version: "v3",
    status: "active",
    description: "6D vector matching for user-persona",
    rateLimit: { ...DEFAULT_RATE_LIMITS.external, requestsPerMinute: 120 },
    healthCheck: { ...DEFAULT_HEALTH_CHECK },
    tags: ["matching", "v3"],
  },
  {
    name: "Internal Health",
    path: "/api/internal/health",
    method: "GET",
    scope: "internal",
    version: "v2",
    status: "active",
    description: "Internal health check endpoint",
    rateLimit: { ...DEFAULT_RATE_LIMITS.internal },
    healthCheck: { ...DEFAULT_HEALTH_CHECK },
    tags: ["health", "internal"],
  },
  {
    name: "Legacy Personas",
    path: "/api/v1/personas",
    method: "GET",
    scope: "external",
    version: "v1",
    status: "deprecated",
    description: "Legacy persona list (deprecated)",
    rateLimit: { ...DEFAULT_RATE_LIMITS.external },
    healthCheck: { ...DEFAULT_HEALTH_CHECK, enabled: false },
    tags: ["personas", "legacy"],
  },
]

function getStore(): APIEndpointManager {
  if (!store) {
    let manager = createAPIEndpointManager()
    for (const ep of SAMPLE_ENDPOINTS) {
      manager = registerEndpoint(manager, ep)
    }
    // Record some sample health checks
    for (const ep of manager.endpoints) {
      if (ep.status === "active" && ep.healthCheck.enabled) {
        const isHealthy = ep.path !== "/api/v3/match"
        const responseTime = isHealthy ? 50 + Math.floor(Math.random() * 200) : 4200
        manager = recordHealthCheck(
          manager,
          ep.id,
          responseTime,
          isHealthy,
          isHealthy ? undefined : "High latency"
        )
      }
    }
    store = manager
  }
  return store
}

// ── Serialized response type ─────────────────────────────────
interface EndpointManagerResponse {
  endpoints: APIEndpoint[]
  versions: APIEndpointManager["versions"]
  healthResults: Record<string, HealthCheckResult>
  healthSummary: ReturnType<typeof getHealthSummary>
}

function serialize(manager: APIEndpointManager): EndpointManagerResponse {
  return {
    endpoints: manager.endpoints,
    versions: manager.versions,
    healthResults: Object.fromEntries(manager.healthResults),
    healthSummary: getHealthSummary(manager),
  }
}

// GET — returns endpoint manager state
export async function GET() {
  try {
    const manager = getStore()

    return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
      success: true,
      data: serialize(manager),
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

// POST — handles multiple actions
type PostAction =
  | { action: "register"; endpoint: Omit<APIEndpoint, "id"> }
  | { action: "healthCheck"; endpointId: string }
  | { action: "updateRateLimit"; endpointId: string; requestsPerMinute: number }

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostAction
    const manager = getStore()

    switch (body.action) {
      case "register": {
        if (!body.endpoint || !body.endpoint.path || !body.endpoint.method) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "path와 method는 필수입니다" },
            },
            { status: 400 }
          )
        }
        store = registerEndpoint(manager, body.endpoint)
        return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
          success: true,
          data: serialize(store),
        })
      }
      case "healthCheck": {
        if (!body.endpointId) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "endpointId는 필수입니다" },
            },
            { status: 400 }
          )
        }
        const success = Math.random() > 0.3
        const responseTime = success ? 50 + Math.floor(Math.random() * 300) : 0
        store = recordHealthCheck(
          manager,
          body.endpointId,
          responseTime,
          success,
          success ? undefined : "Connection timeout"
        )
        return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
          success: true,
          data: serialize(store),
        })
      }
      case "updateRateLimit": {
        if (!body.endpointId) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "endpointId는 필수입니다" },
            },
            { status: 400 }
          )
        }
        store = updateRateLimit(manager, body.endpointId, {
          requestsPerMinute: body.requestsPerMinute,
        })
        return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
          success: true,
          data: serialize(store),
        })
      }
      default: {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "알 수 없는 action입니다" },
          },
          { status: 400 }
        )
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "엔드포인트 업데이트 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
