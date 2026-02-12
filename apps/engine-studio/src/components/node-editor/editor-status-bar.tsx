"use client"

// ═══════════════════════════════════════════════════════════════
// 에디터 상태 바
// T60-AC7: 검증 결과, 노드 수
// ═══════════════════════════════════════════════════════════════

import type { ValidationResult } from "@/lib/node-graph/graph-validator"

interface EditorStatusBarProps {
  validationResult: ValidationResult | null
  zoom: number
}

export function EditorStatusBar({ validationResult, zoom }: EditorStatusBarProps) {
  return (
    <div className="flex items-center gap-4 border-t bg-gray-50 px-4 py-1.5 text-[10px] text-gray-500">
      {/* 줌 레벨 */}
      <span>줌: {Math.round(zoom * 100)}%</span>

      {/* 검증 결과 */}
      {validationResult && (
        <>
          <div className="h-3 w-px bg-gray-200" />
          {validationResult.valid ? (
            <span className="text-green-600">검증 통과</span>
          ) : (
            <span className="text-red-600">에러 {validationResult.errorCount}</span>
          )}
          {validationResult.warningCount > 0 && (
            <span className="text-amber-600">경고 {validationResult.warningCount}</span>
          )}
          {validationResult.infoCount > 0 && (
            <span className="text-blue-600">정보 {validationResult.infoCount}</span>
          )}
        </>
      )}
    </div>
  )
}
