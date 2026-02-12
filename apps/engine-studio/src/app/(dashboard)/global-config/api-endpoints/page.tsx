"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, Plus, Activity, Gauge, Heart } from "lucide-react"
import { DEFAULT_RATE_LIMITS, DEFAULT_HEALTH_CHECK } from "@/lib/global-config"
import type {
  APIEndpoint,
  HealthStatus,
  HTTPMethod,
  APIScope,
  APIVersion,
  HealthCheckResult,
  APIVersionInfo,
} from "@/lib/global-config"

// ── Status badges ───────────────────────────────────────────────
const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  active: "success",
  deprecated: "warning",
  disabled: "muted",
}

const HEALTH_VARIANT: Record<HealthStatus, "success" | "warning" | "destructive" | "muted"> = {
  healthy: "success",
  degraded: "warning",
  down: "destructive",
  unknown: "muted",
}

// ── API response shape ───────────────────────────────────────
interface HealthSummary {
  total: number
  healthy: number
  degraded: number
  down: number
  unknown: number
}

interface EndpointManagerData {
  endpoints: APIEndpoint[]
  versions: APIVersionInfo[]
  healthResults: Record<string, HealthCheckResult>
  healthSummary: HealthSummary
}

export default function ApiEndpointsPage() {
  const [data, setData] = useState<EndpointManagerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── New endpoint form state ──────────────────────────────────
  const [newName, setNewName] = useState("")
  const [newPath, setNewPath] = useState("")
  const [newMethod, setNewMethod] = useState<HTTPMethod>("GET")
  const [newScope, setNewScope] = useState<APIScope>("external")
  const [newVersion, setNewVersion] = useState<APIVersion>("v3")
  const [registerError, setRegisterError] = useState<string | null>(null)

  // ── Fetch data from API ────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/global-config/endpoints")
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "데이터 로드 실패")
      }
    } catch {
      setError("서버 연결 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Register endpoint ────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (!newName.trim() || !newPath.trim()) {
      setRegisterError("Name and path are required")
      return
    }
    try {
      const ep: Omit<APIEndpoint, "id"> = {
        name: newName.trim(),
        path: newPath.trim(),
        method: newMethod,
        scope: newScope,
        version: newVersion,
        status: "active",
        description: "",
        rateLimit: { ...DEFAULT_RATE_LIMITS[newScope] },
        healthCheck: { ...DEFAULT_HEALTH_CHECK },
        tags: [],
      }
      const res = await fetch("/api/internal/global-config/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", endpoint: ep }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setNewName("")
        setNewPath("")
        setRegisterError(null)
      } else {
        setRegisterError(json.error?.message ?? "Failed to register endpoint")
      }
    } catch {
      setRegisterError("Failed to register endpoint")
    }
  }, [newName, newPath, newMethod, newScope, newVersion])

  // ── Run health check ─────────────────────────────────────────
  const handleHealthCheck = useCallback(async (endpointId: string) => {
    try {
      const res = await fetch("/api/internal/global-config/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "healthCheck", endpointId }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // ── Update rate limit ────────────────────────────────────────
  const handleUpdateRateLimit = useCallback(async (endpointId: string, rpm: number) => {
    try {
      const res = await fetch("/api/internal/global-config/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRateLimit", endpointId, requestsPerMinute: rpm }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="API Endpoints" description="내부/외부 API 엔드포인트 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (error || !data) {
    return (
      <>
        <Header title="API Endpoints" description="내부/외부 API 엔드포인트 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error ?? "데이터를 불러올 수 없습니다"}</div>
        </div>
      </>
    )
  }

  const { endpoints, healthResults, healthSummary } = data

  return (
    <>
      <Header title="API Endpoints" description="내부/외부 API 엔드포인트 관리" />

      <div className="space-y-6 p-6">
        {/* ── Health Summary Dashboard ────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Health Summary</h3>
            <Badge variant="muted">{healthSummary.total} endpoints</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-[10px] text-emerald-400">Healthy</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{healthSummary.healthy}</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <p className="text-[10px] text-amber-400">Degraded</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{healthSummary.degraded}</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
              <p className="text-[10px] text-red-400">Down</p>
              <p className="mt-1 text-2xl font-bold text-red-400">{healthSummary.down}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-muted-foreground text-[10px]">Unknown</p>
              <p className="text-muted-foreground mt-1 text-2xl font-bold">
                {healthSummary.unknown}
              </p>
            </div>
          </div>
        </div>

        {/* ── Endpoint Registration ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Register Endpoint</h3>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Endpoint name"
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Path</label>
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/api/v3/..."
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Method</label>
              <select
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value as HTTPMethod)}
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Scope</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as APIScope)}
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Version</label>
              <select
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value as APIVersion)}
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              >
                <option value="v1">v1</option>
                <option value="v2">v2</option>
                <option value="v3">v3</option>
              </select>
            </div>
            <Button size="sm" onClick={handleRegister}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Register
            </Button>
          </div>
          {registerError && <p className="mt-2 text-xs text-red-400">{registerError}</p>}
        </div>

        {/* ── Endpoint Table ─────────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Endpoints ({endpoints.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">Name</th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Method / Path
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Version
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Status
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Health
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                    Rate Limit
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => {
                  const health = healthResults[ep.id]
                  const healthStatus: HealthStatus = health?.status ?? "unknown"

                  return (
                    <tr key={ep.id} className="border-border border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{ep.name}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono">
                          <Badge variant="outline" className="mr-1 text-[10px]">
                            {ep.method}
                          </Badge>
                          {ep.path}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="info" className="text-[10px]">
                          {ep.version}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={STATUS_VARIANT[ep.status]} className="text-[10px]">
                          {ep.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={HEALTH_VARIANT[healthStatus]} className="text-[10px]">
                          {healthStatus}
                        </Badge>
                        {health && health.responseTimeMs > 0 && (
                          <span className="text-muted-foreground ml-1 text-[10px]">
                            {health.responseTimeMs}ms
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {ep.rateLimit.requestsPerMinute}/min
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleHealthCheck(ep.id)}
                        >
                          <Activity className="mr-1 h-3 w-3" />
                          Check
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Rate Limit Configuration ───────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Rate Limit Defaults</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-medium">Internal</h4>
                <Badge variant="info" className="text-[10px]">
                  internal
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-muted-foreground flex justify-between">
                  <span>Requests / min</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.internal.requestsPerMinute}
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Burst Limit</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.internal.burstLimit}
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Window</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.internal.windowMs / 1000}s
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Retry After</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.internal.retryAfterMs}ms
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-medium">External</h4>
                <Badge variant="warning" className="text-[10px]">
                  external
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-muted-foreground flex justify-between">
                  <span>Requests / min</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.external.requestsPerMinute}
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Burst Limit</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.external.burstLimit}
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Window</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.external.windowMs / 1000}s
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Retry After</span>
                  <span className="font-mono font-medium">
                    {DEFAULT_RATE_LIMITS.external.retryAfterMs}ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Per-endpoint rate limit adjustments */}
          {endpoints.filter((ep) => ep.status === "active").length > 0 && (
            <div className="mt-4">
              <h4 className="text-muted-foreground mb-2 text-xs font-medium">
                Per-Endpoint Rate Limits
              </h4>
              <div className="space-y-2">
                {endpoints
                  .filter((ep) => ep.status === "active")
                  .map((ep) => (
                    <div
                      key={ep.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {ep.method}
                        </Badge>
                        <span className="font-mono">{ep.path}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">RPM:</span>
                        <select
                          value={ep.rateLimit.requestsPerMinute}
                          onChange={(e) => handleUpdateRateLimit(ep.id, Number(e.target.value))}
                          className="border-border bg-background rounded border px-1.5 py-0.5 text-xs"
                        >
                          <option value={30}>30</option>
                          <option value={60}>60</option>
                          <option value={120}>120</option>
                          <option value={300}>300</option>
                          <option value={600}>600</option>
                          <option value={1200}>1200</option>
                        </select>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
