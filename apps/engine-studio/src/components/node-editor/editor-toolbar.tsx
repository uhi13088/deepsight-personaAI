"use client"

// ═══════════════════════════════════════════════════════════════
// 에디터 툴바
// T60-AC7: 프리셋 4종, 실행, 검증, 저장
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
        <span className="text-muted-foreground text-xs font-medium">프리셋:</span>
        {FLOW_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onLoadPreset(preset.id)}
            className="border-border bg-muted hover:bg-accent rounded border px-2 py-1 text-xs font-medium transition-colors"
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="bg-border mx-2 h-5 w-px" />

      {/* 액션 버튼 — 명확한 컬러 & 보더 */}
      <button
        onClick={onValidate}
        className="rounded border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20"
      >
        검증
      </button>
      <button
        onClick={onExecute}
        disabled={isExecuting}
        className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:opacity-50"
        title="Ctrl+Enter"
      >
        {isExecuting ? "⏳ 실행중..." : "▶ 실행"}
      </button>
      <button
        onClick={onSave}
        disabled={nodeCount === 0}
        className={`rounded border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isDirty
            ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:border-amber-500 hover:bg-amber-500/20"
            : "border-border bg-muted hover:bg-accent"
        }`}
      >
        💾 {isDirty ? "저장 *" : "저장"}
      </button>

      {/* 상태 바 */}
      <div className="text-muted-foreground ml-auto flex items-center gap-3 text-[10px]">
        <span>노드: {nodeCount}</span>
        <span>엣지: {edgeCount}</span>
        {isDirty && <span className="font-medium text-amber-500">● 미저장</span>}
      </div>
    </div>
  )
}
