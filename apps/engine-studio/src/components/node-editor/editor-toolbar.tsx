"use client"

// ═══════════════════════════════════════════════════════════════
// 에디터 툴바
// T60-AC7: 프리셋 4종, 실행, 검증
// ═══════════════════════════════════════════════════════════════

import { FLOW_PRESETS } from "@/constants/flow-presets"

// ── 타입 ─────────────────────────────────────────────────────

interface EditorToolbarProps {
  onLoadPreset: (presetId: string) => void
  onValidate: () => void
  onExecute: () => void
  onSave: () => void
  isExecuting: boolean
  isDirty: boolean
  nodeCount: number
  edgeCount: number
}

// ── 컴포넌트 ────────────────────────────────────────────────

export function EditorToolbar({
  onLoadPreset,
  onValidate,
  onExecute,
  onSave,
  isExecuting,
  isDirty,
  nodeCount,
  edgeCount,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
      {/* 프리셋 선택 */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">프리셋:</span>
        {FLOW_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onLoadPreset(preset.id)}
            className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="mx-2 h-4 w-px bg-gray-200" />

      {/* 액션 버튼 */}
      <button
        onClick={onValidate}
        className="rounded bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
      >
        검증
      </button>
      <button
        onClick={onExecute}
        disabled={isExecuting}
        className="rounded bg-green-50 px-3 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        {isExecuting ? "실행중..." : "실행"}
      </button>
      <button
        onClick={onSave}
        disabled={!isDirty}
        className="rounded bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
      >
        저장
      </button>

      {/* 상태 바 */}
      <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-400">
        <span>노드: {nodeCount}</span>
        <span>엣지: {edgeCount}</span>
        {isDirty && <span className="text-amber-500">미저장</span>}
      </div>
    </div>
  )
}
