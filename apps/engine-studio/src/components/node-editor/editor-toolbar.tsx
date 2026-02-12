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
    <div className="bg-card flex items-center gap-2 border-b px-4 py-2">
      {/* 프리셋 선택 */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">프리셋:</span>
        {FLOW_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onLoadPreset(preset.id)}
            className="hover:bg-accent rounded border px-2 py-1 text-xs"
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="bg-border mx-2 h-4 w-px" />

      {/* 액션 버튼 */}
      <button
        onClick={onValidate}
        className="rounded bg-blue-500/10 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/20"
      >
        검증
      </button>
      <button
        onClick={onExecute}
        disabled={isExecuting}
        className="rounded bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {isExecuting ? "실행중..." : "실행"}
      </button>
      <button
        onClick={onSave}
        disabled={!isDirty}
        className="bg-muted hover:bg-accent rounded px-3 py-1 text-xs disabled:opacity-50"
      >
        저장
      </button>

      {/* 상태 바 */}
      <div className="text-muted-foreground ml-auto flex items-center gap-3 text-[10px]">
        <span>노드: {nodeCount}</span>
        <span>엣지: {edgeCount}</span>
        {isDirty && <span className="text-amber-500">미저장</span>}
      </div>
    </div>
  )
}
