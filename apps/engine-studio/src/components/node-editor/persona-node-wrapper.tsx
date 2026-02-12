"use client"

// ═══════════════════════════════════════════════════════════════
// 노드 래퍼 v3
// T60-AC3: 포트 핸들, 상태 표시, 카테고리별 컬러
// ═══════════════════════════════════════════════════════════════

import { Handle, Position } from "@xyflow/react"
import { getNodeDefinition, CATEGORY_COLORS } from "@/lib/node-graph/node-registry"
import type { NodeCategory } from "@/lib/node-graph/node-registry"
import { getPortColor } from "@/lib/node-graph/port-types"
import type { NodeExecutionResult } from "@/lib/node-graph/dag-engine"

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
  if (!definition) return null

  const categoryColor = CATEGORY_COLORS[definition.category as NodeCategory] ?? "#6b7280"
  const status = executionResult?.status

  return (
    <div
      className={`relative min-w-[180px] max-w-[280px] rounded-lg border-2 bg-white shadow-sm ${selected ? "border-blue-500 shadow-md" : "border-gray-200"} `}
      style={{ borderTopColor: categoryColor, borderTopWidth: "3px" }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-medium text-white"
        style={{ backgroundColor: categoryColor }}
      >
        <span className="truncate">{definition.label}</span>
        {status && (
          <span className={`ml-auto h-2 w-2 rounded-full ${STATUS_STYLES[status] ?? ""}`} />
        )}
      </div>

      {/* 바디 */}
      <div className="px-3 py-2 text-xs">{children}</div>

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
            border: "2px solid white",
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
            border: "2px solid white",
          }}
          title={`${port.label} (${port.type})`}
        />
      ))}
    </div>
  )
}
