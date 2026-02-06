"use client"

import { cn } from "@/lib/utils"

interface PWSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-14 h-14",
}

/**
 * PersonaWorld 그라데이션 스피너
 */
export function PWSpinner({ size = "md", className }: PWSpinnerProps) {
  return <div className={cn("pw-spinner", sizeClasses[size], className)} />
}

interface PWTypingIndicatorProps {
  className?: string
}

/**
 * PersonaWorld 타이핑 인디케이터
 * 채팅에서 상대방이 입력 중일 때 표시
 */
export function PWTypingIndicator({ className }: PWTypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="pw-typing-dot" />
      <span className="pw-typing-dot" />
      <span className="pw-typing-dot" />
    </div>
  )
}
