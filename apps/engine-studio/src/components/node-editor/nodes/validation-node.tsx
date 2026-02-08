"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NodeWrapper } from "../node-wrapper"
import type { ValidationNodeData } from "../types"

type ValidationNodeType = Node<ValidationNodeData, "validation">

function ValidationNodeComponent({ data }: NodeProps<ValidationNodeType>) {
  const [collapsed, setCollapsed] = useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-amber-600"
    return "text-red-600"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <NodeWrapper
      title="검증"
      icon={<ShieldCheck className="h-4 w-4" />}
      color="bg-teal-600"
      hasInput={true}
      hasOutput={true}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* 전체 품질 점수 */}
      <div className="text-center">
        <div className="mb-1 text-xs text-gray-500">품질 점수</div>
        <div
          className={`text-3xl font-bold ${data.qualityScore > 0 ? getScoreColor(data.qualityScore) : "text-gray-300"}`}
        >
          {data.qualityScore > 0 ? data.qualityScore : "—"}
        </div>
        <div className="mx-auto mt-2 h-2 w-full rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${getScoreBg(data.qualityScore)}`}
            style={{ width: `${Math.min(data.qualityScore, 100)}%` }}
          />
        </div>
      </div>

      {/* 검증 실행 */}
      <Button
        onClick={data.onValidate}
        disabled={data.isValidating}
        variant="outline"
        className="w-full gap-2"
        size="sm"
      >
        {data.isValidating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            검증 중...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            검증 실행
          </>
        )}
      </Button>

      {/* 검증 결과 */}
      {data.validationResult && (
        <div className="space-y-2">
          {/* 통과/실패 */}
          <div
            className={`flex items-center gap-2 rounded-lg p-2 text-xs font-medium ${
              data.validationResult.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {data.validationResult.passed ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {data.validationResult.passed ? "검증 통과" : "검증 실패"}
          </div>

          {/* 세부 항목 */}
          {(
            [
              { key: "promptQuality", label: "프롬프트 품질" },
              { key: "vectorConsistency", label: "벡터 일관성" },
              { key: "expertiseRelevance", label: "전문성 관련도" },
            ] as const
          ).map(({ key, label }) => {
            const item = data.validationResult?.breakdown[key]
            if (!item) return null
            return (
              <div key={key} className="rounded bg-gray-50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-gray-600">{label}</span>
                  <span className={`font-mono text-[10px] ${getScoreColor(item.score)}`}>
                    {item.score}점
                  </span>
                </div>
                <div className="h-1 rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${getScoreBg(item.score)}`}
                    style={{ width: `${Math.min(item.score, 100)}%` }}
                  />
                </div>
                {item.issues.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {item.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-1 text-[9px] text-amber-600">
                        <AlertTriangle className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </NodeWrapper>
  )
}

export const ValidationNode = memo(ValidationNodeComponent)
