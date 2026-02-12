import { cn } from "@/lib/utils"

const SIZE_MAP = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const

interface PWSpinnerProps {
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function PWSpinner({ size = "md", className }: PWSpinnerProps) {
  return (
    <div
      className={cn("pw-spinner", SIZE_MAP[size], className)}
      role="status"
      aria-label="로딩 중"
    />
  )
}
