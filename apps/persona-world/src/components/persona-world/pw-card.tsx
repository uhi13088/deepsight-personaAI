"use client"

import { cn } from "@/lib/utils"
import { HTMLAttributes, forwardRef } from "react"

interface PWCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  borderGradient?: boolean
}

/**
 * PersonaWorld 카드 컴포넌트
 * 흰색 배경 + 부드러운 그림자 + 선택적 그라데이션 보더
 */
export const PWCard = forwardRef<HTMLDivElement, PWCardProps>(
  ({ className, hover = true, borderGradient = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl bg-white p-6",
          hover && "pw-card-hover",
          borderGradient ? "pw-border-gradient" : "border border-gray-100 shadow-sm",
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
