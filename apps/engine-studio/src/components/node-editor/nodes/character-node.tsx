"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { Heart, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { NodeWrapper } from "../node-wrapper"
import type { CharacterNodeData } from "../types"

type CharacterNodeType = Node<CharacterNodeData, "character">

function CharacterNodeComponent({ data }: NodeProps<CharacterNodeType>) {
  const [collapsed, setCollapsed] = useState(false)
  const [newPattern, setNewPattern] = useState("")
  const [newQuirk, setNewQuirk] = useState("")

  const addTag = (
    field: "speechPatterns" | "quirks",
    value: string,
    setter: (v: string) => void
  ) => {
    const trimmed = value.trim()
    const list = data[field] as string[]
    if (trimmed && !list.includes(trimmed)) {
      data.onChange(field, [...list, trimmed])
      setter("")
    }
  }

  const removeTag = (field: "speechPatterns" | "quirks", item: string) => {
    const list = data[field] as string[]
    data.onChange(
      field,
      list.filter((e) => e !== item)
    )
  }

  return (
    <NodeWrapper
      title="캐릭터 성격"
      icon={<Heart className="h-4 w-4" />}
      color="bg-pink-500"
      hasInput={true}
      hasOutput={true}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* 따뜻함 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">따뜻함</label>
          <span className="font-mono text-xs text-gray-400">{data.warmth.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">차가움</span>
          <Slider
            value={[data.warmth * 100]}
            onValueChange={([v]) => data.onChange("warmth", v / 100)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-gray-400">따뜻함</span>
        </div>
      </div>

      {/* 말투 패턴 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">말투 패턴</label>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {data.speechPatterns.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 text-[10px]">
              {item}
              <X
                className="h-2.5 w-2.5 cursor-pointer"
                onClick={() => removeTag("speechPatterns", item)}
              />
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && addTag("speechPatterns", newPattern, setNewPattern)
            }
            placeholder="예: ~입니다"
            className="h-7 flex-1 text-xs"
          />
          <button
            onClick={() => addTag("speechPatterns", newPattern, setNewPattern)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 특이점 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">특이점</label>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {data.quirks.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 text-[10px]">
              {item}
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeTag("quirks", item)} />
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newQuirk}
            onChange={(e) => setNewQuirk(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag("quirks", newQuirk, setNewQuirk)}
            placeholder="추가..."
            className="h-7 flex-1 text-xs"
          />
          <button
            onClick={() => addTag("quirks", newQuirk, setNewQuirk)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 배경 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">배경 설정</label>
        <Textarea
          value={data.background}
          onChange={(e) => data.onChange("background", e.target.value)}
          placeholder="캐릭터 배경..."
          className="min-h-[50px] text-xs"
          rows={2}
        />
      </div>
    </NodeWrapper>
  )
}

export const CharacterNode = memo(CharacterNodeComponent)
