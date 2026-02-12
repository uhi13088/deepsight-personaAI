"use client"

// ═══════════════════════════════════════════════════════════════
// 노드 팔레트
// T60-AC5: 드래그&드롭, 카테고리별 필터
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react"
import {
  getNodeCategories,
  getNodesByCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/node-graph/node-registry"
import type { NodeCategory, NodeDefinition } from "@/lib/node-graph/node-registry"

// ── 타입 ─────────────────────────────────────────────────────

interface NodePaletteProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void
}

// ── 컴포넌트 ────────────────────────────────────────────────

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [expandedCategory, setExpandedCategory] = useState<NodeCategory | null>("input")
  const categories = getNodeCategories()

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/persona-node", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }, [])

  const handleClickAdd = useCallback(
    (nodeType: string) => {
      // 캔버스 중앙에 추가
      onAddNode(nodeType, { x: 300, y: 300 })
    },
    [onAddNode]
  )

  return (
    <div className="bg-card w-56 overflow-y-auto border-r">
      <div className="border-b p-3">
        <h3 className="text-sm font-semibold">노드 팔레트</h3>
      </div>

      {categories.map((category) => {
        const nodes = getNodesByCategory(category)
        const isExpanded = expandedCategory === category
        const color = CATEGORY_COLORS[category]

        return (
          <div key={category} className="border-b">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
              className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-xs font-medium"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{CATEGORY_LABELS[category]}</span>
              <span className="text-muted-foreground ml-auto">{nodes.length}</span>
              <span className="text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {isExpanded && (
              <div className="space-y-1 px-2 pb-2">
                {nodes.map((nodeDef) => (
                  <PaletteItem
                    key={nodeDef.type}
                    definition={nodeDef}
                    color={color}
                    onDragStart={onDragStart}
                    onClick={handleClickAdd}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 팔레트 아이템 ────────────────────────────────────────────

interface PaletteItemProps {
  definition: NodeDefinition
  color: string
  onDragStart: (event: React.DragEvent, nodeType: string) => void
  onClick: (nodeType: string) => void
}

function PaletteItem({ definition, color, onDragStart, onClick }: PaletteItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, definition.type)}
      onClick={() => onClick(definition.type)}
      className="hover:bg-accent flex cursor-grab items-center gap-2 rounded px-2 py-1.5 text-xs active:cursor-grabbing"
      title={definition.description}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{definition.label}</span>
    </div>
  )
}
