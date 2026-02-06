"use client"

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface PWIconProps {
  icon: LucideIcon
  size?: "sm" | "md" | "lg" | "xl"
  gradient?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
}

/**
 * PersonaWorld 아이콘 컴포넌트
 * gradient prop으로 그라데이션 적용 가능
 */
export function PWIcon({ icon: Icon, size = "md", gradient = false, className }: PWIconProps) {
  if (gradient) {
    return (
      <Icon
        className={cn(sizeClasses[size], className)}
        style={{
          stroke: "url(#pw-gradient)",
        }}
      />
    )
  }

  return <Icon className={cn(sizeClasses[size], className)} />
}
