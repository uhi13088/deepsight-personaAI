"use client"

import { memo, useState } from "react"
import type { NodeProps, Node } from "@xyflow/react"
import { Radar } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { NodeWrapper } from "../node-wrapper"
import type { VectorNodeData } from "../types"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

type VectorNodeType = Node<VectorNodeData, "vector">

function VectorNodeComponent({ data }: NodeProps<VectorNodeType>) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <NodeWrapper
      title="6D 벡터"
      icon={<Radar className="h-4 w-4" />}
      color="bg-purple-500"
      hasInput={true}
      hasOutput={true}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      <div className="space-y-3">
        {TRAIT_DIMENSIONS.map((dim) => {
          const value = data.vector[dim.key as keyof typeof data.vector] ?? 0.5
          return (
            <div key={dim.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">{dim.label}</span>
                <span className="font-mono text-xs text-gray-400">{value.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 text-right text-[10px] text-gray-400">{dim.low}</span>
                <Slider
                  value={[value * 100]}
                  onValueChange={([v]) => data.onChange(dim.key, v / 100)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-10 text-[10px] text-gray-400">{dim.high}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 미니 레이더 시각화 */}
      <div className="flex justify-center pt-1">
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          {/* 배경 그리드 */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((r) => (
            <polygon
              key={r}
              points={TRAIT_DIMENSIONS.map((_, i) => {
                const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
                const x = 60 + Math.cos(angle) * r * 45
                const y = 60 + Math.sin(angle) * r * 45
                return `${x},${y}`
              }).join(" ")}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}
          {/* 데이터 */}
          <polygon
            points={TRAIT_DIMENSIONS.map((dim, i) => {
              const val = data.vector[dim.key as keyof typeof data.vector] ?? 0.5
              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
              const x = 60 + Math.cos(angle) * val * 45
              const y = 60 + Math.sin(angle) * val * 45
              return `${x},${y}`
            }).join(" ")}
            fill="rgba(139,92,246,0.15)"
            stroke="#8B5CF6"
            strokeWidth="1.5"
          />
          {/* 꼭지점 */}
          {TRAIT_DIMENSIONS.map((dim, i) => {
            const val = data.vector[dim.key as keyof typeof data.vector] ?? 0.5
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
            const x = 60 + Math.cos(angle) * val * 45
            const y = 60 + Math.sin(angle) * val * 45
            return <circle key={dim.key} cx={x} cy={y} r="2.5" fill="#8B5CF6" />
          })}
          {/* 라벨 */}
          {TRAIT_DIMENSIONS.map((dim, i) => {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
            const x = 60 + Math.cos(angle) * 55
            const y = 60 + Math.sin(angle) * 55
            return (
              <text
                key={dim.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-gray-400 text-[7px]"
              >
                {dim.name[0]}
              </text>
            )
          })}
        </svg>
      </div>
    </NodeWrapper>
  )
}

export const VectorNode = memo(VectorNodeComponent)
