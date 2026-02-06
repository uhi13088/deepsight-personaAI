"use client"

import { cn } from "@/lib/utils"
import { HTMLAttributes, forwardRef } from "react"

interface PWCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
  borderGradient?: boolean
  animated?: boolean
}

/**
 * PersonaWorld 카드 컴포넌트
 * 호버 효과, 글로우, 그라데이션 보더 지원
 */
export const PWCard = forwardRef<HTMLDivElement, PWCardProps>(
  (
    {
      className,
      hover = true,
      glow = false,
      borderGradient = false,
      animated = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card rounded-xl p-4",
          hover && "pw-card-hover",
          glow && "pw-glow",
          borderGradient && (animated ? "pw-border-gradient-animated" : "pw-border-gradient"),
          !borderGradient && "border-border border",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

PWCard.displayName = "PWCard"
