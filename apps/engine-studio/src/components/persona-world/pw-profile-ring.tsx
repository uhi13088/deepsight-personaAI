"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface PWProfileRingProps {
  size?: "sm" | "md" | "lg" | "xl"
  animated?: boolean
  className?: string
  children: ReactNode
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
}

const innerSizeClasses = {
  sm: "w-[calc(100%-4px)] h-[calc(100%-4px)]",
  md: "w-[calc(100%-6px)] h-[calc(100%-6px)]",
  lg: "w-[calc(100%-6px)] h-[calc(100%-6px)]",
  xl: "w-[calc(100%-8px)] h-[calc(100%-8px)]",
}

/**
 * PersonaWorld 프로필 링
 * 인스타그램 스토리 스타일의 그라데이션 테두리
 */
export function PWProfileRing({
  size = "md",
  animated = false,
  className,
  children,
}: PWProfileRingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        animated ? "pw-profile-ring-animated" : "pw-profile-ring",
        sizeClasses[size],
        className
      )}
    >
      <div
        className={cn(
          "bg-background flex items-center justify-center overflow-hidden rounded-full",
          innerSizeClasses[size]
        )}
      >
        {children}
      </div>
    </div>
  )
}
