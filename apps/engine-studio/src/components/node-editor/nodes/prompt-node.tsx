"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { FileText, Plus, X, Wand2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NodeWrapper } from "../node-wrapper"
import type { PromptNodeData } from "../types"

type PromptNodeType = Node<PromptNodeData, "prompt">

function PromptNodeComponent({ data }: NodeProps<PromptNodeType>) {
  const [collapsed, setCollapsed] = useState(false)
  const [newRestriction, setNewRestriction] = useState("")
  const [newExample, setNewExample] = useState("")

  const addRestriction = () => {
    const trimmed = newRestriction.trim()
    if (trimmed && !data.restrictions.includes(trimmed)) {
      data.onChange("restrictions", [...data.restrictions, trimmed])
      setNewRestriction("")
    }
  }

  const removeRestriction = (item: string) => {
    data.onChange(
      "restrictions",
      data.restrictions.filter((r) => r !== item)
    )
  }

  const addExample = () => {
    const trimmed = newExample.trim()
    if (trimmed) {
      data.onChange("exampleResponses", [...data.exampleResponses, trimmed])
      setNewExample("")
    }
  }

  const removeExample = (idx: number) => {
    data.onChange(
      "exampleResponses",
      data.exampleResponses.filter((_, i) => i !== idx)
    )
  }

  return (
    <NodeWrapper
      title="프롬프트"
      icon={<FileText className="h-4 w-4" />}
      color="bg-amber-500"
      hasInput={true}
      hasOutput={true}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* 시스템 프롬프트 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">시스템 프롬프트</label>
          {data.onAutoGenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={data.onAutoGenerate}
              className="h-6 gap-1 px-2 text-[10px]"
            >
              <Wand2 className="h-3 w-3" />
              자동 생성
            </Button>
          )}
        </div>
        <Textarea
          value={data.systemPrompt}
          onChange={(e) => data.onChange("systemPrompt", e.target.value)}
          placeholder="페르소나의 시스템 프롬프트를 입력하세요..."
          className="min-h-[100px] font-mono text-xs"
          rows={5}
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.systemPrompt.length}자
        </div>
      </div>

      {/* 예시 응답 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          예시 응답 ({data.exampleResponses.length})
        </label>
        <div className="max-h-[120px] space-y-1 overflow-y-auto">
          {data.exampleResponses.map((ex, idx) => (
            <div
              key={idx}
              className="flex items-start gap-1 rounded bg-gray-50 p-1.5 text-[10px] text-gray-600"
            >
              <span className="line-clamp-2 flex-1">{ex}</span>
              <X
                className="h-3 w-3 flex-shrink-0 cursor-pointer text-gray-400 hover:text-red-500"
                onClick={() => removeExample(idx)}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1">
          <Input
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExample()}
            placeholder="예시 응답 추가..."
            className="h-7 flex-1 text-xs"
          />
          <button
            onClick={addExample}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 제한사항 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">제한사항</label>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {data.restrictions.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className="gap-1 border-red-200 text-[10px] text-red-600"
            >
              {item}
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeRestriction(item)} />
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newRestriction}
            onChange={(e) => setNewRestriction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRestriction()}
            placeholder="제한사항 추가..."
            className="h-7 flex-1 text-xs"
          />
          <button
            onClick={addRestriction}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </NodeWrapper>
  )
}

export const PromptNode = memo(PromptNodeComponent)
