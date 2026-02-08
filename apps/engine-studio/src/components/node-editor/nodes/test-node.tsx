"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { Play, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { NodeWrapper } from "../node-wrapper"
import type { TestNodeData } from "../types"

type TestNodeType = Node<TestNodeData, "test">

function TestNodeComponent({ data }: NodeProps<TestNodeType>) {
  const [collapsed, setCollapsed] = useState(false)
  const [contentTitle, setContentTitle] = useState("")
  const [contentDesc, setContentDesc] = useState("")
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  const handleRunTest = () => {
    if (!contentTitle.trim()) return
    data.onRunTest(contentTitle.trim(), contentDesc.trim())
  }

  const scoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-amber-600"
    return "text-red-600"
  }

  const scoreBar = (score: number) => {
    const pct = Math.round(score * 100)
    const bg = score >= 0.8 ? "bg-green-500" : score >= 0.6 ? "bg-amber-500" : "bg-red-500"
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`font-mono text-[10px] ${scoreColor(score)}`}>{pct}%</span>
      </div>
    )
  }

  return (
    <NodeWrapper
      title="테스트 / 미리보기"
      icon={<Play className="h-4 w-4" />}
      color="bg-green-600"
      hasInput={true}
      hasOutput={true}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* 테스트 입력 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">콘텐츠 제목</label>
        <Input
          value={contentTitle}
          onChange={(e) => setContentTitle(e.target.value)}
          placeholder="테스트할 콘텐츠 제목"
          className="h-8 text-xs"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">콘텐츠 설명</label>
        <Textarea
          value={contentDesc}
          onChange={(e) => setContentDesc(e.target.value)}
          placeholder="콘텐츠 설명 (선택)"
          className="min-h-[40px] text-xs"
          rows={2}
        />
      </div>

      <Button
        onClick={handleRunTest}
        disabled={data.isRunning || !contentTitle.trim()}
        className="w-full gap-2"
        size="sm"
      >
        {data.isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            테스트 중...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            테스트 실행
          </>
        )}
      </Button>

      {/* 결과 히스토리 */}
      {data.testHistory.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            결과 히스토리 ({data.testHistory.length})
          </label>
          <div className="max-h-[250px] space-y-2 overflow-y-auto">
            {data.testHistory.map((result) => (
              <div key={result.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                >
                  <span className="line-clamp-1 text-[10px] font-medium text-gray-700">
                    {result.content}
                  </span>
                  {expandedResult === result.id ? (
                    <ChevronUp className="h-3 w-3 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  )}
                </div>

                {/* 점수 요약 */}
                <div className="mt-1.5 space-y-1">
                  <div>
                    <span className="text-[9px] text-gray-400">벡터 정합</span>
                    {scoreBar(result.scores.vectorAlignment)}
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400">톤 매치</span>
                    {scoreBar(result.scores.toneMatch)}
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400">추론 품질</span>
                    {scoreBar(result.scores.reasoningQuality)}
                  </div>
                </div>

                {/* 확장된 응답 */}
                {expandedResult === result.id && (
                  <div className="mt-2 rounded bg-white p-2 text-[10px] text-gray-600">
                    {result.response}
                  </div>
                )}

                <div className="mt-1 text-right text-[9px] text-gray-400">
                  {new Date(result.timestamp).toLocaleString("ko-KR")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </NodeWrapper>
  )
}

export const TestNode = memo(TestNodeComponent)
