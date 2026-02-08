"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { Rocket, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NodeWrapper } from "../node-wrapper"
import type { DeployNodeData } from "../types"
import type { PersonaStatus } from "@/types"

type DeployNodeType = Node<DeployNodeData, "deploy">

const STATUS_OPTIONS: { value: PersonaStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "초안", color: "bg-gray-100 text-gray-700" },
  { value: "REVIEW", label: "검토중", color: "bg-yellow-100 text-yellow-700" },
  { value: "ACTIVE", label: "활성", color: "bg-green-100 text-green-700" },
  { value: "PAUSED", label: "일시정지", color: "bg-orange-100 text-orange-700" },
  { value: "ARCHIVED", label: "보관", color: "bg-gray-100 text-gray-500" },
]

function DeployNodeComponent({ data }: NodeProps<DeployNodeType>) {
  const [collapsed, setCollapsed] = useState(false)

  const currentOption = STATUS_OPTIONS.find((s) => s.value === data.status) ?? STATUS_OPTIONS[0]

  return (
    <NodeWrapper
      title="저장 / 배포"
      icon={<Rocket className="h-4 w-4" />}
      color="bg-indigo-600"
      hasInput={true}
      hasOutput={false}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* 현재 상태 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">현재 상태</label>
        <div className="flex items-center gap-2">
          <Badge className={`${currentOption.color} text-xs`}>{currentOption.label}</Badge>
        </div>
      </div>

      {/* 상태 변경 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">상태 변경</label>
        <select
          value={data.status}
          onChange={(e) => data.onStatusChange(e.target.value as PersonaStatus)}
          className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 저장 버튼 */}
      <Button
        onClick={data.onSave}
        disabled={data.isSaving}
        className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
        size="sm"
      >
        {data.isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            저장
          </>
        )}
      </Button>

      {/* 버전 히스토리 */}
      {data.versions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">버전 히스토리</label>
          <div className="max-h-[120px] space-y-1 overflow-y-auto">
            {data.versions.map((ver) => (
              <div
                key={ver.version}
                className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5"
              >
                <div>
                  <span className="font-mono text-[10px] font-medium text-indigo-600">
                    v{ver.version}
                  </span>
                  <span className="ml-2 text-[10px] text-gray-500">{ver.changes}</span>
                </div>
                <span className="text-[9px] text-gray-400">{ver.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </NodeWrapper>
  )
}

export const DeployNode = memo(DeployNodeComponent)
