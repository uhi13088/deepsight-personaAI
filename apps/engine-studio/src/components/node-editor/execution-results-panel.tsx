"use client"

// ═══════════════════════════════════════════════════════════════
// 실행 결과 패널
// T128-AC3: 실행 요약 + 경로 리스트 + 노드 클릭 연동
// ═══════════════════════════════════════════════════════════════

import { summarizeExecution } from "@/lib/node-graph/execution-engine"
import type { ExecutionEngineResult, ExecutionPathEntry } from "@/lib/node-graph/execution-engine"
import type { NodeExecutionResult } from "@/lib/node-graph/dag-engine"
import { getNodeDefinition } from "@/lib/node-graph/node-registry"

// ── 타입 ─────────────────────────────────────────────────────

interface ExecutionResultsPanelProps {
  result: ExecutionEngineResult
  onClose: () => void
  onNodeClick: (nodeId: string) => void
}

// ── 상태 스타일 ──────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  executed: { label: "성공", color: "text-green-600" },
  skipped: { label: "스킵", color: "text-gray-400" },
  error: { label: "에러", color: "text-red-600" },
}

// ── 메인 패널 ─────────────────────────────────────────────────

export function ExecutionResultsPanel({
  result,
  onClose,
  onNodeClick,
}: ExecutionResultsPanelProps) {
  const summary = summarizeExecution(result)

  return (
    <div className="border-t bg-white">
      {/* 요약 헤더 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium">실행 결과</span>
          {summary.executed > 0 && <span className="text-green-600">{summary.executed} 성공</span>}
          {summary.skipped > 0 && <span className="text-gray-500">{summary.skipped} 스킵</span>}
          {summary.errors > 0 && <span className="text-red-600">{summary.errors} 에러</span>}
          <span className="text-gray-400">{result.totalDurationMs}ms</span>
        </div>
        <button
          onClick={onClose}
          className="rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          닫기
        </button>
      </div>

      {/* 실행 경로 리스트 */}
      <div className="max-h-48 overflow-y-auto">
        {result.executionPath.map((entry, i) => (
          <ExecutionPathRow
            key={`${entry.nodeId}-${i}`}
            entry={entry}
            index={i}
            nodeResult={result.state.results.get(entry.nodeId)}
            onClick={() => onNodeClick(entry.nodeId)}
          />
        ))}
        {result.executionPath.length === 0 && (
          <div className="px-4 py-3 text-center text-xs text-gray-400">실행된 노드 없음</div>
        )}
      </div>
    </div>
  )
}

// ── 경로 행 ──────────────────────────────────────────────────

function ExecutionPathRow({
  entry,
  index,
  nodeResult,
  onClick,
}: {
  entry: ExecutionPathEntry
  index: number
  nodeResult: NodeExecutionResult | undefined
  onClick: () => void
}) {
  const def = getNodeDefinition(entry.nodeType)
  const style = STATUS_STYLES[entry.status] ?? STATUS_STYLES.error

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-1.5 text-xs hover:bg-gray-50"
    >
      <span className="w-5 shrink-0 text-right text-gray-300">{index + 1}</span>
      <span className={`w-8 shrink-0 ${style.color}`}>{style.label}</span>
      <span className="flex-1 truncate text-left font-medium">{def?.label ?? entry.nodeType}</span>
      <span className="shrink-0 text-gray-400">{entry.durationMs}ms</span>
      {entry.reason && (
        <span className="max-w-40 shrink-0 truncate text-red-400" title={entry.reason}>
          {entry.reason}
        </span>
      )}
    </button>
  )
}
