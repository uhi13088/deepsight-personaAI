"use client"

// ═══════════════════════════════════════════════════════════════
// 노드 래퍼 v3
// T60-AC3: 포트 핸들, 상태 표시, 카테고리별 컬러
// 노드 액션 버튼: 설정(선택), 삭제
// ═══════════════════════════════════════════════════════════════

import { Handle, Position } from "@xyflow/react"
import { getNodeDefinition, CATEGORY_COLORS } from "@/lib/node-graph/node-registry"
import type { NodeCategory } from "@/lib/node-graph/node-registry"
import { getPortColor } from "@/lib/node-graph/port-types"
import type { NodeExecutionResult } from "@/lib/node-graph/dag-engine"
import { useNodeEditorStore } from "@/stores/node-editor-store"

// ── 타입 ─────────────────────────────────────────────────────

interface PersonaNodeWrapperProps {
  nodeType: string
  nodeId: string
  data: Record<string, unknown>
  selected: boolean
  executionResult?: NodeExecutionResult
  children: React.ReactNode
}

// ── 상태 배지 ────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  skipped: "bg-gray-400",
  running: "bg-yellow-500 animate-pulse",
}

const STATUS_LABELS: Record<string, string> = {
  success: "성공",
  error: "에러",
  skipped: "스킵",
  running: "실행중",
}

// ── 컴포넌트 ────────────────────────────────────────────────

export function PersonaNodeWrapper({
  nodeType,
  nodeId,
  data,
  selected,
  executionResult,
  children,
}: PersonaNodeWrapperProps) {
  const definition = getNodeDefinition(nodeType)
  const removeNode = useNodeEditorStore((s) => s.removeNode)
  const selectNode = useNodeEditorStore((s) => s.selectNode)

  if (!definition) return null

  const categoryColor = CATEGORY_COLORS[definition.category as NodeCategory] ?? "#6b7280"
  const status = executionResult?.status
  const dataKeys = Object.keys(data)
  const hasEditableData = dataKeys.length > 0

  return (
    <div
      className={`group/node bg-card relative min-w-[180px] max-w-[280px] rounded-lg border-2 shadow-sm ${selected ? "border-blue-500 shadow-md" : "border-border"} `}
      style={{ borderTopColor: categoryColor, borderTopWidth: "3px" }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-medium text-white"
        style={{ backgroundColor: categoryColor }}
      >
        <span className="truncate">{definition.label}</span>

        {/* 호버 시 액션 버튼 */}
        <div className="ml-auto flex items-center gap-1">
          {status && (
            <span
              className={`h-2 w-2 rounded-full ${STATUS_STYLES[status] ?? ""}`}
              title={STATUS_LABELS[status] ?? status}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              selectNode(nodeId)
            }}
            className="hidden rounded px-1 py-0.5 text-[10px] text-white/80 hover:bg-white/20 hover:text-white group-hover/node:inline-block"
            title="설정 패널 열기"
          >
            ⚙
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeNode(nodeId)
            }}
            className="hidden rounded px-1 py-0.5 text-[10px] text-white/80 hover:bg-red-500/50 hover:text-white group-hover/node:inline-block"
            title="노드 삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 바디 */}
      <div className="px-3 py-2 text-xs">{children}</div>

      {/* 편집 가능 힌트 (선택 시) */}
      {selected && hasEditableData && (
        <div className="border-t px-3 py-1.5 text-[10px] text-blue-400">→ 우측 패널에서 편집</div>
      )}

      {/* 입력 포트 핸들 */}
      {definition.inputs.map((port, i) => (
        <Handle
          key={`in-${port.id}`}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: `${40 + i * 24}px`,
            background: getPortColor(port.type),
            width: 10,
            height: 10,
            border: "2px solid var(--color-card, white)",
          }}
          title={`${port.label} (${port.type})${port.required ? " *" : ""}`}
        />
      ))}

      {/* 출력 포트 핸들 */}
      {definition.outputs.map((port, i) => (
        <Handle
          key={`out-${port.id}`}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: `${40 + i * 24}px`,
            background: getPortColor(port.type),
            width: 10,
            height: 10,
            border: "2px solid var(--color-card, white)",
          }}
          title={`${port.label} (${port.type})`}
        />
      ))}
    </div>
  )
}
