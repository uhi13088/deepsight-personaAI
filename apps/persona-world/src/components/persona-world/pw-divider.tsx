"use client"

import { cn } from "@/lib/utils"

interface PWDividerProps {
  gradient?: boolean
  className?: string
}

/**
 * PersonaWorld 구분선 컴포넌트
 */
export function PWDivider({ gradient = false, className }: PWDividerProps) {
  if (gradient) {
    return <div className={cn("pw-line-gradient w-full", className)} />
  }

  return <div className={cn("h-px w-full bg-gray-200", className)} />
}
