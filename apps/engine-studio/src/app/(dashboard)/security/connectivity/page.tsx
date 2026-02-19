"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Network, AlertTriangle } from "lucide-react"

interface NodeData {
  personaId: string
  personaName?: string
  inDegree: number
  outDegree: number
  totalDegree: number
  avgWarmth: number
  avgTension: number
  clusteringCoefficient: number
  connectivityScore: number
  classification: "HUB" | "NORMAL" | "PERIPHERAL" | "ISOLATE"
}

interface AnomalyData {
  type: string
  personaId: string
  severity: "low" | "medium" | "high"
  description: string
  detectedAt: number
}

interface GraphStats {
  totalNodes: number
  totalEdges: number
  avgDegree: number
  avgClusteringCoefficient: number
  density: number
  hubCount: number
  isolateCount: number
}

interface ConnectivityData {
  stats: GraphStats
  nodes: NodeData[]
  anomalies: AnomalyData[]
}

const CLASS_CONFIG: Record<string, { color: string; bg: string }> = {
  HUB: { color: "text-purple-600", bg: "bg-purple-500/10" },
  NORMAL: { color: "text-green-600", bg: "bg-green-500/10" },
  PERIPHERAL: { color: "text-yellow-600", bg: "bg-yellow-500/10" },
  ISOLATE: { color: "text-red-600", bg: "bg-red-500/10" },
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/10 text-yellow-600",
  high: "bg-red-500/10 text-red-600",
}

export default function ConnectivityPage() {
  const [data, setData] = useState<ConnectivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/security/connectivity")
      const json = (await res.json()) as {
        success: boolean
        data?: ConnectivityData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Connectivity" description="Social Module 관계 그래프 분석" />
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Connectivity" description="Social Module 관계 그래프 분석" />
        <div className="text-destructive">{error ?? "No data"}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Header title="Connectivity" description="Social Module 관계 그래프 분석" />
        <Button variant="outline" size="sm" onClick={() => void fetchData()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Graph Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Nodes</div>
          <div className="text-2xl font-bold">{data.stats.totalNodes}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Edges</div>
          <div className="text-2xl font-bold">{data.stats.totalEdges}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Avg Degree</div>
          <div className="text-2xl font-bold">{data.stats.avgDegree.toFixed(1)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Density</div>
          <div className="text-2xl font-bold">{(data.stats.density * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Classification Summary */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-purple-500/5 px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span className="text-sm font-medium">Hub: {data.stats.hubCount}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium">
            Normal:{" "}
            {data.stats.totalNodes -
              data.stats.hubCount -
              data.stats.isolateCount -
              data.nodes.filter((n) => n.classification === "PERIPHERAL").length}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-yellow-500/5 px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-sm font-medium">
            Peripheral: {data.nodes.filter((n) => n.classification === "PERIPHERAL").length}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-red-500/5 px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-sm font-medium">Isolate: {data.stats.isolateCount}</span>
        </div>
      </div>

      {/* Anomalies */}
      {data.anomalies.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            이상 탐지 ({data.anomalies.length})
          </h3>
          <div className="space-y-2">
            {data.anomalies.map((anomaly, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border p-2">
                <Badge className={SEVERITY_COLOR[anomaly.severity]}>{anomaly.severity}</Badge>
                <span className="text-muted-foreground text-xs">{anomaly.type}</span>
                <span className="text-sm">{anomaly.description}</span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {anomaly.personaId.slice(0, 8)}...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Node Table */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Network className="h-5 w-5" />
          노드 목록 ({data.nodes.length})
        </h3>
        {data.nodes.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">관계 데이터가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="pb-2 pr-4">Persona</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">In</th>
                  <th className="pb-2 pr-4">Out</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Warmth</th>
                  <th className="pb-2 pr-4">Tension</th>
                  <th className="pb-2 pr-4">CC</th>
                  <th className="pb-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.nodes.map((node) => {
                  const classConfig = CLASS_CONFIG[node.classification]
                  return (
                    <tr key={node.personaId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-medium">
                          {node.personaName ?? node.personaId.slice(0, 12)}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge className={`${classConfig.bg} ${classConfig.color}`}>
                          {node.classification}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{node.inDegree}</td>
                      <td className="py-2 pr-4">{node.outDegree}</td>
                      <td className="py-2 pr-4 font-medium">{node.totalDegree}</td>
                      <td className="py-2 pr-4">{node.avgWarmth.toFixed(2)}</td>
                      <td className="py-2 pr-4">{node.avgTension.toFixed(2)}</td>
                      <td className="py-2 pr-4">{node.clusteringCoefficient.toFixed(2)}</td>
                      <td className="py-2 font-medium">{node.connectivityScore.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
