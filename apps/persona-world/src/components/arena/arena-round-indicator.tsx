"use client"

import { cn } from "@/lib/utils"

interface ArenaRoundIndicatorProps {
  currentRound: number
  maxRounds: number
  className?: string
}

export function ArenaRoundIndicator({
  currentRound,
  maxRounds,
  className,
}: ArenaRoundIndicatorProps) {
  const progress = maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          라운드 {currentRound} / {maxRounds}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
