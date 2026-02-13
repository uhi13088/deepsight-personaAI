"use client"

// ═══════════════════════════════════════════════════════════════
// 에디터 상태 바
// T60-AC7: 검증 결과, 노드 수
// 검증 에러 클릭 → 이슈 패널 표시
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react"
import type { ValidationResult } from "@/lib/node-graph/graph-validator"

interface EditorStatusBarProps {
  validationResult: ValidationResult | null
  zoom: number
  onNodeClick?: (nodeId: string) => void
  forceOpen?: boolean
}

const LEVEL_STYLES: Record<string, { label: string; color: string }> = {
  error: { label: "에러", color: "text-red-400" },
  warning: { label: "경고", color: "text-amber-400" },
  info: { label: "정보", color: "text-blue-400" },
}

export function EditorStatusBar({
  validationResult,
  zoom,
  onNodeClick,
  forceOpen,
}: EditorStatusBarProps) {
  const [showIssues, setShowIssues] = useState(false)

  // 외부에서 강제 열기
  useEffect(() => {
    if (forceOpen) setShowIssues(true)
  }, [forceOpen])

  const hasIssues = validationResult && validationResult.issues.length > 0

  return (
    <div className="bg-card border-t">
      {/* 검증 이슈 패널 (상태바 위에 펼침) */}
      {showIssues && hasIssues && (
        <div className="max-h-52 overflow-y-auto border-b">
          <div className="flex items-center justify-between px-4 py-1.5">
            <span className="text-xs font-medium">
              검증 결과 ({validationResult.issues.length}건)
            </span>
            <button
              onClick={() => setShowIssues(false)}
              className="text-muted-foreground hover:bg-accent rounded px-2 py-0.5 text-xs"
            >
              닫기
            </button>
          </div>
          {validationResult.issues.map((issue, i) => {
            const style = LEVEL_STYLES[issue.level] ?? LEVEL_STYLES.error
            return (
              <button
                key={`${issue.category}-${i}`}
                onClick={() => {
                  if (issue.nodeId) onNodeClick?.(issue.nodeId)
                }}
                disabled={!issue.nodeId}
                className="hover:bg-accent flex w-full items-center gap-3 px-4 py-1.5 text-xs disabled:cursor-default"
              >
                <span className={`w-8 shrink-0 font-medium ${style.color}`}>{style.label}</span>
                <span className="text-muted-foreground w-24 shrink-0 truncate">
                  {issue.category}
                </span>
                <span className="flex-1 truncate text-left">{issue.message}</span>
                {issue.nodeId && (
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {issue.nodeId.split("_")[0]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 상태 바 */}
      <div className="text-muted-foreground flex items-center gap-4 px-4 py-1.5 text-[10px]">
        {/* 줌 레벨 */}
        <span>줌: {Math.round(zoom * 100)}%</span>

        {/* 검증 결과 (클릭 → 이슈 펼침) */}
        {validationResult && (
          <>
            <div className="bg-border h-3 w-px" />
            {validationResult.valid ? (
              <span className="text-emerald-400">검증 통과</span>
            ) : (
              <button
                onClick={() => setShowIssues((prev) => !prev)}
                className="flex items-center gap-1 text-red-400 hover:underline"
              >
                에러 {validationResult.errorCount}
                <span className="text-[8px]">{showIssues ? "▲" : "▼"}</span>
              </button>
            )}
            {validationResult.warningCount > 0 && (
              <button
                onClick={() => setShowIssues((prev) => !prev)}
                className="flex items-center gap-1 text-amber-400 hover:underline"
              >
                경고 {validationResult.warningCount}
              </button>
            )}
            {validationResult.infoCount > 0 && (
              <span className="text-blue-400">정보 {validationResult.infoCount}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
