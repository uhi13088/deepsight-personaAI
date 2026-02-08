"use client"

import type { ReactNode } from "react"
import { Handle, Position } from "@xyflow/react"

interface NodeWrapperProps {
  title: string
  icon: ReactNode
  color: string
  children: ReactNode
  hasInput?: boolean
  hasOutput?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function NodeWrapper({
  title,
  icon,
  color,
  children,
  hasInput = true,
  hasOutput = true,
  collapsed = false,
  onToggleCollapse,
}: NodeWrapperProps) {
  return (
    <div className="min-w-[280px] max-w-[320px] rounded-xl border border-gray-200 bg-white shadow-lg">
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-gray-400"
        />
      )}

      {/* Header */}
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-t-xl px-4 py-2.5 text-white ${color}`}
        onClick={onToggleCollapse}
      >
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <span className="text-xs opacity-70">{collapsed ? "+" : "−"}</span>
      </div>

      {/* Body */}
      {!collapsed && <div className="nopan nodrag nowheel space-y-3 p-4 text-sm">{children}</div>}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-gray-400"
        />
      )}
    </div>
  )
}
