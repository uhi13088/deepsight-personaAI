"use client"

// ═══════════════════════════════════════════════════════════════
// 노드 설정 패널
// T60-AC6: 선택된 노드의 상세 설정
// ═══════════════════════════════════════════════════════════════

import { getNodeDefinition, CATEGORY_COLORS } from "@/lib/node-graph/node-registry"
import type { NodeCategory } from "@/lib/node-graph/node-registry"

// ── 타입 ─────────────────────────────────────────────────────

interface NodeSettingsPanelProps {
  nodeId: string
  nodeType: string
  data: Record<string, unknown>
  onUpdateData: (data: Record<string, unknown>) => void
  onDelete: () => void
}

// ── 컴포넌트 ────────────────────────────────────────────────

export function NodeSettingsPanel({
  nodeId,
  nodeType,
  data,
  onUpdateData,
  onDelete,
}: NodeSettingsPanelProps) {
  const definition = getNodeDefinition(nodeType)
  if (!definition) return null

  const color = CATEGORY_COLORS[definition.category as NodeCategory] ?? "#6b7280"

  return (
    <div className="bg-card w-72 overflow-y-auto border-l">
      {/* 헤더 */}
      <div className="border-b p-3" style={{ borderBottomColor: color }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color }}>
            {definition.label}
          </h3>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">
            삭제
          </button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">{definition.description}</p>
        <p className="text-muted-foreground mt-1 text-[10px]">ID: {nodeId}</p>
      </div>

      {/* 설정 필드 */}
      <div className="space-y-3 p-3">
        {/* 입력 포트 정보 */}
        {definition.inputs.length > 0 && (
          <div>
            <h4 className="text-muted-foreground mb-1 text-xs font-medium">입력 포트</h4>
            {definition.inputs.map((port) => (
              <div key={port.id} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="text-muted-foreground">{port.required ? "*" : "○"}</span>
                <span>{port.label}</span>
                <span className="text-muted-foreground ml-auto text-[10px]">{port.type}</span>
              </div>
            ))}
          </div>
        )}

        {/* 출력 포트 정보 */}
        {definition.outputs.length > 0 && (
          <div>
            <h4 className="text-muted-foreground mb-1 text-xs font-medium">출력 포트</h4>
            {definition.outputs.map((port) => (
              <div key={port.id} className="flex items-center gap-2 py-0.5 text-xs">
                <span>{port.label}</span>
                <span className="text-muted-foreground ml-auto text-[10px]">{port.type}</span>
              </div>
            ))}
          </div>
        )}

        {/* 노드 데이터 편집 */}
        <div>
          <h4 className="text-muted-foreground mb-1 text-xs font-medium">설정</h4>
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 py-1 text-xs">
              <label className="text-muted-foreground w-24 truncate" title={key}>
                {key}
              </label>
              {typeof value === "number" ? (
                <input
                  type="number"
                  value={value}
                  step={0.1}
                  min={0}
                  max={1}
                  onChange={(e) => onUpdateData({ [key]: parseFloat(e.target.value) || 0 })}
                  className="bg-background flex-1 rounded border px-2 py-0.5 text-xs"
                />
              ) : typeof value === "string" ? (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onUpdateData({ [key]: e.target.value })}
                  className="bg-background flex-1 rounded border px-2 py-0.5 text-xs"
                />
              ) : (
                <span className="text-muted-foreground text-[10px]">{JSON.stringify(value)}</span>
              )}
            </div>
          ))}
          {Object.keys(data).length === 0 && (
            <p className="text-muted-foreground text-xs">설정 항목 없음</p>
          )}
        </div>

        {/* 메타 정보 */}
        <div className="border-t pt-2">
          <p className="text-muted-foreground text-[10px]">
            평가: {definition.evaluationStrategy} | 카테고리: {definition.category}
          </p>
        </div>
      </div>
    </div>
  )
}
