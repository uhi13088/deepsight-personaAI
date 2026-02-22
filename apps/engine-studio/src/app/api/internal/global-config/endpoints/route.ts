import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma"
import type { HttpMethod as PrismaHttpMethod } from "@/generated/prisma"
import { getHealthSummary, DEFAULT_RATE_LIMITS, DEFAULT_HEALTH_CHECK } from "@/lib/global-config"
import type {
  APIEndpoint,
  HealthCheckResult,
  APIEndpointManager,
  RateLimitConfig,
  HealthCheckConfig,
  HTTPMethod,
  APIScope,
  EndpointStatus,
  APIVersion,
} from "@/lib/global-config"

// ── Prisma DB row → lib APIEndpoint conversion ──────────────
interface DbApiEndpointRow {
  id: string
  path: string
  method: PrismaHttpMethod
  name: string
  description: string | null
  version: string
  status: "ACTIVE" | "DEPRECATED" | "DISABLED"
  scope: string
  rateLimit: number
  timeout: number
  rateLimitConfig: unknown
  healthCheckConfig: unknown
  tags: string[]
}

function toLibEndpoint(row: DbApiEndpointRow): APIEndpoint {
  const rateLimitConfig = row.rateLimitConfig as Partial<RateLimitConfig> | null
  const healthCheckConfig = row.healthCheckConfig as Partial<HealthCheckConfig> | null

  const scope = row.scope as APIScope
  const defaultRL = DEFAULT_RATE_LIMITS[scope] ?? DEFAULT_RATE_LIMITS.external

  return {
    id: row.id,
    name: row.name,
    path: row.path,
    method: row.method as HTTPMethod,
    scope,
    version: row.version as APIVersion,
    status: row.status.toLowerCase() as EndpointStatus,
    description: row.description ?? "",
    rateLimit: {
      requestsPerMinute: rateLimitConfig?.requestsPerMinute ?? row.rateLimit,
      burstLimit: rateLimitConfig?.burstLimit ?? defaultRL.burstLimit,
      windowMs: rateLimitConfig?.windowMs ?? defaultRL.windowMs,
      retryAfterMs: rateLimitConfig?.retryAfterMs ?? defaultRL.retryAfterMs,
    },
    healthCheck: {
      enabled: healthCheckConfig?.enabled ?? DEFAULT_HEALTH_CHECK.enabled,
      intervalMs: healthCheckConfig?.intervalMs ?? DEFAULT_HEALTH_CHECK.intervalMs,
      timeoutMs: healthCheckConfig?.timeoutMs ?? row.timeout,
      unhealthyThreshold:
        healthCheckConfig?.unhealthyThreshold ?? DEFAULT_HEALTH_CHECK.unhealthyThreshold,
    },
    tags: row.tags,
  }
}

// ── Sample endpoint data for initial seed ────────────────────
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

// ── Seed DB with sample endpoints if empty ───────────────────
async function seedEndpointsIfEmpty(): Promise<void> {
  const count = await prisma.apiEndpoint.count()
  if (count > 0) return

  for (const ep of SAMPLE_ENDPOINTS) {
    const statusMap: Record<string, "ACTIVE" | "DEPRECATED" | "DISABLED"> = {
      active: "ACTIVE",
      deprecated: "DEPRECATED",
      disabled: "DISABLED",
    }

    await prisma.apiEndpoint.create({
      data: {
        path: ep.path,
        method: ep.method as PrismaHttpMethod,
        name: ep.name,
        description: ep.description || null,
        version: ep.version,
        status: statusMap[ep.status] ?? "ACTIVE",
        scope: ep.scope,
        rateLimit: ep.rateLimit.requestsPerMinute,
        timeout: ep.healthCheck.timeoutMs,
        rateLimitConfig: {
          requestsPerMinute: ep.rateLimit.requestsPerMinute,
          burstLimit: ep.rateLimit.burstLimit,
          windowMs: ep.rateLimit.windowMs,
          retryAfterMs: ep.rateLimit.retryAfterMs,
        },
        healthCheckConfig: {
          enabled: ep.healthCheck.enabled,
          intervalMs: ep.healthCheck.intervalMs,
          timeoutMs: ep.healthCheck.timeoutMs,
          unhealthyThreshold: ep.healthCheck.unhealthyThreshold,
        },
        tags: ep.tags,
      },
    })
  }

  // 시드 후 헬스체크 결과는 실제 요청 시 생성됨 (수동 체크 버튼 사용)
}

// ── Load health check results from SystemConfig ──────────────
async function loadHealthResults(): Promise<Map<string, HealthCheckResult>> {
  const rows = await prisma.systemConfig.findMany({
    where: { category: "HEALTH_CHECK" },
  })
  const map = new Map<string, HealthCheckResult>()
  for (const row of rows) {
    const value = row.value as unknown as HealthCheckResult
    if (value && typeof value === "object" && "endpointId" in value) {
      map.set(value.endpointId, value)
    }
  }
  return map
}

// ── Build versions grouping (Record<string, string[]>) ───────
function buildVersions(endpoints: APIEndpoint[]): Record<string, string[]> {
  const versions: Record<string, string[]> = {}
  for (const ep of endpoints) {
    if (!versions[ep.version]) {
      versions[ep.version] = []
    }
    versions[ep.version].push(ep.id)
  }
  return versions
}

// ── Serialized response type ─────────────────────────────────
interface EndpointManagerResponse {
  endpoints: APIEndpoint[]
  versions: Record<string, string[]>
  healthResults: Record<string, HealthCheckResult>
  healthSummary: ReturnType<typeof getHealthSummary>
}

function buildResponse(
  endpoints: APIEndpoint[],
  healthResults: Map<string, HealthCheckResult>
): EndpointManagerResponse {
  // Reconstruct an APIEndpointManager-like object for getHealthSummary
  const manager: APIEndpointManager = {
    endpoints,
    versions: [],
    healthResults,
  }

  return {
    endpoints,
    versions: buildVersions(endpoints),
    healthResults: Object.fromEntries(healthResults),
    healthSummary: getHealthSummary(manager),
  }
}

// GET — returns endpoint manager state from DB
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    await seedEndpointsIfEmpty()

    const rows = await prisma.apiEndpoint.findMany({ orderBy: { createdAt: "asc" } })
    const endpoints = rows.map(toLibEndpoint)
    const healthResults = await loadHealthResults()

    return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
      success: true,
      data: buildResponse(endpoints, healthResults),
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as PostAction

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

        const ep = body.endpoint
        const statusMap: Record<string, "ACTIVE" | "DEPRECATED" | "DISABLED"> = {
          active: "ACTIVE",
          deprecated: "DEPRECATED",
          disabled: "DISABLED",
        }

        await prisma.apiEndpoint.create({
          data: {
            path: ep.path,
            method: ep.method as PrismaHttpMethod,
            name: ep.name,
            description: ep.description || null,
            version: ep.version,
            status: statusMap[ep.status] ?? "ACTIVE",
            scope: ep.scope,
            rateLimit: ep.rateLimit.requestsPerMinute,
            timeout: ep.healthCheck.timeoutMs,
            rateLimitConfig: {
              requestsPerMinute: ep.rateLimit.requestsPerMinute,
              burstLimit: ep.rateLimit.burstLimit,
              windowMs: ep.rateLimit.windowMs,
              retryAfterMs: ep.rateLimit.retryAfterMs,
            },
            healthCheckConfig: {
              enabled: ep.healthCheck.enabled,
              intervalMs: ep.healthCheck.intervalMs,
              timeoutMs: ep.healthCheck.timeoutMs,
              unhealthyThreshold: ep.healthCheck.unhealthyThreshold,
            },
            tags: ep.tags,
          },
        })

        const rows = await prisma.apiEndpoint.findMany({ orderBy: { createdAt: "asc" } })
        const endpoints = rows.map(toLibEndpoint)
        const healthResults = await loadHealthResults()

        return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
          success: true,
          data: buildResponse(endpoints, healthResults),
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

        // Verify the endpoint exists
        const dbEndpoint = await prisma.apiEndpoint.findUnique({
          where: { id: body.endpointId },
        })
        if (!dbEndpoint) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "엔드포인트를 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }

        const ep = toLibEndpoint(dbEndpoint)

        // Load previous result to track consecutive failures
        const prevConfig = await prisma.systemConfig.findUnique({
          where: { category_key: { category: "HEALTH_CHECK", key: body.endpointId } },
        })
        const prevResult = prevConfig ? (prevConfig.value as unknown as HealthCheckResult) : null

        // 실제 HTTP 요청으로 헬스체크
        let success = false
        let responseTimeMs = 0
        let errorMessage: string | null = null

        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
        const targetUrl = `${baseUrl}${ep.path}`
        const startTime = Date.now()

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), ep.healthCheck.timeoutMs)

          const res = await fetch(targetUrl, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
          })
          clearTimeout(timeout)

          responseTimeMs = Date.now() - startTime
          success = res.status < 500
          if (!success) {
            errorMessage = `HTTP ${res.status}`
          }
        } catch (err) {
          responseTimeMs = Date.now() - startTime
          errorMessage =
            err instanceof Error && err.name === "AbortError"
              ? `Timeout (${ep.healthCheck.timeoutMs}ms)`
              : err instanceof Error
                ? err.message
                : "Connection failed"
        }

        const consecutiveFailures = success ? 0 : (prevResult?.consecutiveFailures ?? 0) + 1

        let status: HealthCheckResult["status"]
        if (!success && consecutiveFailures >= ep.healthCheck.unhealthyThreshold) {
          status = "down"
        } else if (!success) {
          status = "degraded"
        } else if (responseTimeMs > ep.healthCheck.timeoutMs * 0.8) {
          status = "degraded"
        } else {
          status = "healthy"
        }

        const result: HealthCheckResult = {
          endpointId: body.endpointId,
          status,
          responseTimeMs,
          checkedAt: Date.now(),
          consecutiveFailures,
          lastSuccessAt: success ? Date.now() : (prevResult?.lastSuccessAt ?? null),
          errorMessage,
        }

        await prisma.systemConfig.upsert({
          where: { category_key: { category: "HEALTH_CHECK", key: body.endpointId } },
          update: { value: result as unknown as Prisma.InputJsonValue },
          create: {
            category: "HEALTH_CHECK",
            key: body.endpointId,
            value: result as unknown as Prisma.InputJsonValue,
            description: `Health check result for ${ep.name}`,
          },
        })

        const rows = await prisma.apiEndpoint.findMany({ orderBy: { createdAt: "asc" } })
        const endpoints = rows.map(toLibEndpoint)
        const healthResults = await loadHealthResults()

        return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
          success: true,
          data: buildResponse(endpoints, healthResults),
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

        // Verify the endpoint exists and get current rateLimitConfig
        const existing = await prisma.apiEndpoint.findUnique({
          where: { id: body.endpointId },
        })
        if (!existing) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "엔드포인트를 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }

        const currentConfig = (existing.rateLimitConfig as Partial<RateLimitConfig> | null) ?? {}
        const updatedConfig = {
          ...currentConfig,
          requestsPerMinute: body.requestsPerMinute,
        }

        await prisma.apiEndpoint.update({
          where: { id: body.endpointId },
          data: {
            rateLimit: body.requestsPerMinute,
            rateLimitConfig: updatedConfig as unknown as Prisma.InputJsonValue,
          },
        })

        const rows = await prisma.apiEndpoint.findMany({ orderBy: { createdAt: "asc" } })
        const endpoints = rows.map(toLibEndpoint)
        const healthResults = await loadHealthResults()

        return NextResponse.json<ApiResponse<EndpointManagerResponse>>({
          success: true,
          data: buildResponse(endpoints, healthResults),
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
