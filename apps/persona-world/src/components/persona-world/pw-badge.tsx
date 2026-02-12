import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type BadgeVariant = "gradient" | "outline" | "pulse"

interface PWBadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function PWBadge({ variant = "gradient", children, className }: PWBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "gradient" && "pw-gradient text-white",
        variant === "outline" && "pw-border-gradient bg-white text-gray-700",
        variant === "pulse" && "pw-gradient pw-badge-pulse text-white",
        className
      )}
    >
      {children}
    </span>
  )
}

interface PWNotificationDotProps {
  count?: number
  className?: string
}

export function PWNotificationDot({ count, className }: PWNotificationDotProps) {
  const display = count !== undefined ? (count > 99 ? "99+" : String(count)) : undefined

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-red-500",
        display ? "min-w-[18px] px-1 py-0.5 text-[10px] font-bold text-white" : "h-2.5 w-2.5",
        className
      )}
    >
      {display}
    </span>
  )
}
