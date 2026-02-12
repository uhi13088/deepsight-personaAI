"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  AlgorithmVersionStatus,
  VersionBumpType,
  VersionDiff,
  DiffChangeType,
} from "@/lib/system-integration"
import {
  GitBranch,
  ArrowUpCircle,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react"

// ── 상수 ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  AlgorithmVersionStatus,
  { variant: "success" | "warning" | "info" | "destructive" | "muted" | "outline"; label: string }
> = {
  draft: { variant: "muted", label: "Draft" },
  testing: { variant: "info", label: "Testing" },
  active: { variant: "success", label: "Active" },
  deprecated: { variant: "warning", label: "Deprecated" },
  rolled_back: { variant: "destructive", label: "Rolled Back" },
}

const DIFF_CHANGE_COLORS: Record<DiffChangeType, string> = {
  added: "text-emerald-400 bg-emerald-500/10",
  removed: "text-red-400 bg-red-500/10",
  modified: "text-amber-400 bg-amber-500/10",
}

const DIFF_CHANGE_LABELS: Record<DiffChangeType, string> = {
  added: "Added",
  removed: "Removed",
  modified: "Modified",
}

// ── 샘플 버전 생성 ───────────────────────────────────────────

function createSampleVersions(): AlgorithmVersion[] {
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

  return [
    { ...v1, status: "deprecated" as const },
    { ...v11, status: "active" as const, deployedEnvironments: ["development", "staging"] },
    { ...v12, status: "draft" as const },
  ]
}

// ── 페이지 ────────────────────────────────────────────────────

export default function VersionsPage() {
  const [versions, setVersions] = useState<AlgorithmVersion[]>(() => createSampleVersions())
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // 버전 Bump
  const handleBump = useCallback(
    (bumpType: VersionBumpType) => {
      const latest = versions[versions.length - 1]
      if (!latest) return
      try {
        const newVersionStr = bumpVersion(latest.version, bumpType)
        const newVer = createVersion(
          "matching",
          newVersionStr,
          "admin@deepsight.ai",
          `${bumpType} bump from ${latest.version}`,
          `${bumpType === "major" ? "Breaking change" : bumpType === "minor" ? "Feature update" : "Bug fix"}`,
          { ...latest.config },
          { ...latest.weights },
          latest.version
        )
        setVersions((prev) => [...prev, newVer])
        setActionError(null)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Bump failed")
      }
    },
    [versions]
  )

  // Diff 비교
  const handleDiff = useCallback(
    (fromId: string, toId: string) => {
      const from = versions.find((v) => v.id === fromId)
      const to = versions.find((v) => v.id === toId)
      if (!from || !to) return
      try {
        const result = diffVersions(from, to)
        setDiff(result)
        setActionError(null)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Diff failed")
      }
    },
    [versions]
  )

  // 상태 전이: draft → testing
  const handleSetTesting = useCallback((id: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        try {
          return setVersionTesting(v)
        } catch {
          return v
        }
      })
    )
  }, [])

  // 상태 전이: testing → active
  const handleActivate = useCallback((id: string) => {
    setVersions((prev) => {
      const target = prev.find((v) => v.id === id)
      if (!target) return prev
      try {
        const activated = activateVersion(target, prev, DEFAULT_VERSION_POLICY)
        return prev.map((v) => (v.id === id ? activated : v))
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Activate failed")
        return prev
      }
    })
  }, [])

  // 상태 전이: active → deprecated
  const handleDeprecate = useCallback((id: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        try {
          return deprecateVersion(v, "Replaced by newer version")
        } catch {
          return v
        }
      })
    )
  }, [])

  // 롤백
  const handleRollback = useCallback(
    (currentId: string, targetId: string) => {
      const current = versions.find((v) => v.id === currentId)
      const target = versions.find((v) => v.id === targetId)
      if (!current || !target) return
      try {
        const { updatedCurrent, updatedTarget } = rollbackVersion(
          current,
          target,
          "Performance regression detected",
          "admin@deepsight.ai",
          ["development"]
        )
        setVersions((prev) =>
          prev.map((v) => {
            if (v.id === currentId) return updatedCurrent
            if (v.id === targetId) return updatedTarget
            return v
          })
        )
        setActionError(null)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Rollback failed")
      }
    },
    [versions]
  )

  return (
    <>
      <Header title="Version Control" description="알고리즘 버전 관리 및 롤백" />

      <div className="space-y-6 p-6">
        {/* ── Bump 컨트롤 ─────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Semantic Version Bump</h3>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              Latest: {versions[versions.length - 1]?.version ?? "N/A"}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBump("major")}>
              <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5 text-red-400" />
              Major
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBump("minor")}>
              <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
              Minor
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBump("patch")}>
              <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
              Patch
            </Button>
          </div>
        </div>

        {/* ── 에러 표시 ──────────────────────────────── */}
        {actionError && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {actionError}
          </div>
        )}

        {/* ── 버전 테이블 ─────────────────────────────── */}
        <div className="bg-card rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Algorithm Versions</h3>
          </div>
          <div className="divide-y">
            {versions.map((ver, idx) => {
              const statusInfo = STATUS_BADGE[ver.status]
              const isExpanded = expandedId === ver.id
              const prevVersion = idx > 0 ? versions[idx - 1] : null

              return (
                <div key={ver.id}>
                  <button
                    className="hover:bg-accent/50 flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : ver.id)}
                  >
                    <div className="flex items-center gap-3">
                      <GitBranch className="text-muted-foreground h-4 w-4" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{ver.version}</span>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">{ver.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ver.deployedEnvironments.length > 0 && (
                        <div className="flex gap-1">
                          {ver.deployedEnvironments.map((env) => (
                            <Badge key={env} variant="outline" className="text-[10px]">
                              {env.slice(0, 3).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-accent/20 space-y-3 border-t px-4 py-3">
                      {/* 상세 정보 */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Category</span>
                          <p className="font-medium">{ver.category}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created By</span>
                          <p className="font-medium">{ver.createdBy}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Parent Version</span>
                          <p className="font-medium">{ver.parentVersion ?? "None"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Changelog</span>
                          <p className="font-medium">{ver.changelog}</p>
                        </div>
                      </div>

                      {/* Config/Weights */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground mb-1 text-[10px]">Config</p>
                          <div className="space-y-0.5 font-mono text-xs">
                            {Object.entries(ver.config).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-muted-foreground">{k}</span>
                                <span>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground mb-1 text-[10px]">Weights</p>
                          <div className="space-y-0.5 font-mono text-xs">
                            {Object.entries(ver.weights).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-muted-foreground">{k}</span>
                                <span>{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 액션 */}
                      <div className="flex flex-wrap gap-2">
                        {ver.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetTesting(ver.id)}
                          >
                            Start Testing
                          </Button>
                        )}
                        {ver.status === "testing" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivate(ver.id)}
                          >
                            Activate
                          </Button>
                        )}
                        {ver.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeprecate(ver.id)}
                          >
                            Deprecate
                          </Button>
                        )}
                        {prevVersion && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDiff(prevVersion.id, ver.id)}
                          >
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Diff vs {prevVersion.version}
                          </Button>
                        )}
                        {ver.status === "active" &&
                          prevVersion &&
                          (prevVersion.status === "active" ||
                            prevVersion.status === "deprecated") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRollback(ver.id, prevVersion.id)}
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                              Rollback to {prevVersion.version}
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Diff 패널 ──────────────────────────────── */}
        {diff && (
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Version Diff</h3>
              <Button size="sm" variant="outline" onClick={() => setDiff(null)}>
                Close
              </Button>
            </div>
            <p className="text-muted-foreground mb-3 text-xs">{diff.summary}</p>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <p className="text-muted-foreground text-[10px]">Config Changes</p>
                <p className="text-sm font-bold text-blue-400">{diff.configChanges}</p>
              </div>
              <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                <p className="text-muted-foreground text-[10px]">Weight Changes</p>
                <p className="text-sm font-bold text-purple-400">{diff.weightChanges}</p>
              </div>
            </div>

            {diff.entries.length > 0 ? (
              <div className="space-y-1">
                {diff.entries.map((entry) => (
                  <div
                    key={entry.path}
                    className={`flex items-center justify-between rounded px-3 py-2 text-xs ${DIFF_CHANGE_COLORS[entry.changeType]}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {DIFF_CHANGE_LABELS[entry.changeType]}
                      </Badge>
                      <span className="font-mono">{entry.path}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      {entry.oldValue !== null && (
                        <span className="text-red-400 line-through">{String(entry.oldValue)}</span>
                      )}
                      {entry.newValue !== null && (
                        <span className="text-emerald-400">{String(entry.newValue)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center text-xs">No changes detected</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
