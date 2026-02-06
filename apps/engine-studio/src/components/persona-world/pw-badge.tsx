"use client"

import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react"

interface PWBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "gradient" | "outline" | "pulse"
  size?: "sm" | "md"
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
}

/**
 * PersonaWorld 뱃지
 * 그라데이션, 아웃라인, 펄스 효과 지원
 */
export function PWBadge({
  variant = "gradient",
  size = "sm",
  className,
  children,
  ...props
}: PWBadgeProps) {
  const variantClasses = {
    gradient: "pw-gradient text-white font-medium",
    outline: "pw-border-gradient bg-background pw-text-gradient font-medium",
    pulse: "bg-red-500 text-white font-medium pw-badge-pulse",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

interface PWNotificationDotProps {
  count?: number
  className?: string
}

/**
 * PersonaWorld 알림 도트
 * 펄스 애니메이션이 있는 알림 표시
 */
export function PWNotificationDot({ count, className }: PWNotificationDotProps) {
  return (
    <span
      className={cn(
        "pw-badge-pulse flex items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white",
        count ? "h-[18px] min-w-[18px] px-1" : "h-3 w-3",
        className
      )}
    >
      {count && count > 0 ? (count > 99 ? "99+" : count) : null}
    </span>
  )
}
