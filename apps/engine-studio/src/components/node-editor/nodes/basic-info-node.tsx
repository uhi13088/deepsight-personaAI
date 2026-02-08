"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { User, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { NodeWrapper } from "../node-wrapper"
import type { BasicInfoNodeData } from "../types"

type BasicInfoNodeType = Node<BasicInfoNodeData, "basicInfo">

function BasicInfoNodeComponent({ data }: NodeProps<BasicInfoNodeType>) {
  const [collapsed, setCollapsed] = useState(false)
  const [newExpertise, setNewExpertise] = useState("")

  const roles = [
    { value: "REVIEWER", label: "리뷰어" },
    { value: "CURATOR", label: "큐레이터" },
    { value: "EDUCATOR", label: "교육자" },
    { value: "COMPANION", label: "동반자" },
    { value: "ANALYST", label: "분석가" },
  ] as const

  const addExpertise = () => {
    const trimmed = newExpertise.trim()
    if (trimmed && !data.expertise.includes(trimmed)) {
      data.onChange("expertise", [...data.expertise, trimmed])
      setNewExpertise("")
    }
  }

  const removeExpertise = (item: string) => {
    data.onChange(
      "expertise",
      data.expertise.filter((e) => e !== item)
    )
  }

  return (
    <NodeWrapper
      title="기본 정보"
      icon={<User className="h-4 w-4" />}
      color="bg-blue-500"
      hasInput={false}
      hasOutput={true}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* 이름 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">이름</label>
        <Input
          value={data.name}
          onChange={(e) => data.onChange("name", e.target.value)}
          placeholder="페르소나 이름"
          className="h-8 text-xs"
        />
      </div>

      {/* 역할 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">역할</label>
        <select
          value={data.role}
          onChange={(e) => data.onChange("role", e.target.value)}
          className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* 전문분야 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">전문분야</label>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {data.expertise.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 text-xs">
              {item}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeExpertise(item)} />
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newExpertise}
            onChange={(e) => setNewExpertise(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExpertise()}
            placeholder="추가..."
            className="h-7 flex-1 text-xs"
          />
          <button
            onClick={addExpertise}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 설명 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">설명</label>
        <Textarea
          value={data.description}
          onChange={(e) => data.onChange("description", e.target.value)}
          placeholder="페르소나 설명..."
          className="min-h-[60px] text-xs"
          rows={3}
        />
      </div>

      {/* 상태 배지 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">상태</span>
        <Badge variant={data.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
          {data.status}
        </Badge>
      </div>
    </NodeWrapper>
  )
}

export const BasicInfoNode = memo(BasicInfoNodeComponent)
