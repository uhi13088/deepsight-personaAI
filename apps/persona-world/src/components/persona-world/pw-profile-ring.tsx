import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

const SIZE_MAP = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
} as const

const PADDING_MAP = {
  sm: "p-[2px]",
  md: "p-[2px]",
  lg: "p-[3px]",
  xl: "p-[3px]",
} as const

interface PWProfileRingProps {
  size?: keyof typeof SIZE_MAP
  animated?: boolean
  children: ReactNode
  className?: string
}

export function PWProfileRing({
  size = "md",
  animated = false,
  children,
  className,
}: PWProfileRingProps) {
  return (
    <div
      className={cn(
        "rounded-full",
        SIZE_MAP[size],
        PADDING_MAP[size],
        animated ? "pw-profile-ring-animated" : "pw-profile-ring",
        className
      )}
    >
      {children}
    </div>
  )
}
