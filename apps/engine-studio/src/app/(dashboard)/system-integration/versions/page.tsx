"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  AlgorithmVersion,
  AlgorithmVersionStatus,
  AlgorithmCategory,
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

const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  matching: "매칭 알고리즘",
  persona_generator: "페르소나 생성기",
  user_profiler: "유저 프로파일러",
}

const CATEGORY_ORDER: AlgorithmCategory[] = ["matching", "persona_generator", "user_profiler"]

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

// ── 페이지 ────────────────────────────────────────────────────

export default function VersionsPage() {
  const [versions, setVersions] = useState<AlgorithmVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AlgorithmCategory>("matching")

  // ── 데이터 로드 ─────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/system-integration/versions")
      const json = await res.json()
      if (json.success) {
        setVersions(json.data.versions)
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

  // ── 버전 Bump ───────────────────────────────────────────────

  const handleBump = useCallback(
    async (bumpType: VersionBumpType) => {
      try {
        const res = await fetch("/api/internal/system-integration/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bump",
            bumpType,
            category: selectedCategory,
          }),
        })
        const json = await res.json()
        if (json.success) {
          setActionError(null)
          await fetchData()
        } else {
          setActionError(json.error?.message ?? "Bump failed")
        }
      } catch {
        setActionError("서버 연결 실패")
      }
    },
    [fetchData, selectedCategory]
  )

  // ── Diff 비교 ───────────────────────────────────────────────

  const handleDiff = useCallback(async (fromId: string, toId: string) => {
    try {
      const res = await fetch("/api/internal/system-integration/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "diff",
          fromId,
          toId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setDiff(json.data)
        setActionError(null)
      } else {
        setActionError(json.error?.message ?? "Diff failed")
      }
    } catch {
      setActionError("서버 연결 실패")
    }
  }, [])

  // ── 상태 전이: draft → testing ──────────────────────────────

  const handleSetTesting = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/internal/system-integration/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_testing",
            versionId: id,
          }),
        })
        const json = await res.json()
        if (json.success) {
          await fetchData()
        } else {
          setActionError(json.error?.message ?? "Set testing failed")
        }
      } catch {
        setActionError("서버 연결 실패")
      }
    },
    [fetchData]
  )

  // ── 상태 전이: testing → active ─────────────────────────────

  const handleActivate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/internal/system-integration/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "activate",
            versionId: id,
          }),
        })
        const json = await res.json()
        if (json.success) {
          setActionError(null)
          await fetchData()
        } else {
          setActionError(json.error?.message ?? "Activate failed")
        }
      } catch {
        setActionError("서버 연결 실패")
      }
    },
    [fetchData]
  )

  // ── 상태 전이: active → deprecated ──────────────────────────

  const handleDeprecate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/internal/system-integration/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deprecate",
            versionId: id,
          }),
        })
        const json = await res.json()
        if (json.success) {
          await fetchData()
        } else {
          setActionError(json.error?.message ?? "Deprecate failed")
        }
      } catch {
        setActionError("서버 연결 실패")
      }
    },
    [fetchData]
  )

  // ── 롤백 ───────────────────────────────────────────────────

  const handleRollback = useCallback(
    async (currentId: string, targetId: string) => {
      try {
        const res = await fetch("/api/internal/system-integration/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rollback",
            currentId,
            targetId,
          }),
        })
        const json = await res.json()
        if (json.success) {
          setActionError(null)
          await fetchData()
        } else {
          setActionError(json.error?.message ?? "Rollback failed")
        }
      } catch {
        setActionError("서버 연결 실패")
      }
    },
    [fetchData]
  )

  // ── 로딩/에러 UI ──────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header
          title="알고리즘 버전 관리"
          description="매칭·페르소나 생성기·유저 프로파일러 파라미터 버전 이력 관리"
        />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header
          title="알고리즘 버전 관리"
          description="매칭·페르소나 생성기·유저 프로파일러 파라미터 버전 이력 관리"
        />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  const filteredVersions = versions.filter((v) => v.category === selectedCategory)

  return (
    <>
      <Header
        title="알고리즘 버전 관리"
        description="매칭·페르소나 생성기·유저 프로파일러 파라미터 버전 이력 관리"
      />

      <div className="space-y-6 p-6">
        {/* ── 카테고리 탭 ─────────────────────────────── */}
        <div className="flex gap-1 rounded-lg border p-1">
          {CATEGORY_ORDER.map((cat) => {
            const count = versions.filter((v) => v.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {CATEGORY_LABELS[cat]}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    selectedCategory === cat ? "bg-white/20" : "bg-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Bump 컨트롤 ─────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Semantic Version Bump
              <span className="text-muted-foreground ml-2 font-normal">
                — {CATEGORY_LABELS[selectedCategory]}
              </span>
            </h3>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              Latest: {filteredVersions[filteredVersions.length - 1]?.version ?? "버전 없음"}
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
            {filteredVersions.length === 0 && (
              <div className="text-muted-foreground py-10 text-center text-sm">
                {CATEGORY_LABELS[selectedCategory]} 버전이 없습니다
              </div>
            )}
            {filteredVersions.map((ver, idx) => {
              const statusInfo = STATUS_BADGE[ver.status]
              const isExpanded = expandedId === ver.id
              const prevVersion = idx > 0 ? filteredVersions[idx - 1] : null

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
