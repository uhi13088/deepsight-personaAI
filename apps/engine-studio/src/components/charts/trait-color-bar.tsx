"use client"

import type { TraitDimensionConfig } from "@/lib/trait-colors"

interface TraitColorBarProps {
  dimension: TraitDimensionConfig
  value: number
  /** sm: 카드 내 미니, md: 기본, lg: 상세 편집 */
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  showLabels?: boolean
}

const SIZE_CONFIG = {
  sm: { barHeight: "h-2", text: "text-[10px]", gap: "gap-1", marker: 6 },
  md: { barHeight: "h-3", text: "text-xs", gap: "gap-1.5", marker: 8 },
  lg: { barHeight: "h-4", text: "text-sm", gap: "gap-2", marker: 10 },
} as const

export function TraitColorBar({
  dimension,
  value,
  size = "md",
  showValue = true,
  showLabels = true,
}: TraitColorBarProps) {
  const percentage = Math.round(value * 100)
  const config = SIZE_CONFIG[size]
  const { from, to } = dimension.color

  return (
    <div className={`flex flex-col ${config.gap}`}>
      {/* 라벨 행 */}
      {showLabels && (
        <div className={`flex items-center justify-between ${config.text} text-muted-foreground`}>
          <span>{dimension.low}</span>
          <span className="text-foreground font-medium">{dimension.label}</span>
          <span>{dimension.high}</span>
        </div>
      )}

      {/* 게이지 바 */}
      <div className="relative">
        {/* 그라디언트 바 배경 (전체 길이) */}
        <div
          className={`${config.barHeight} w-full overflow-hidden rounded-full`}
          style={{
            background: `linear-gradient(to right, ${from}, ${to})`,
          }}
        />

        {/* 50% 센터라인 */}
        <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />

        {/* 값 마커 (▼ 삼각형 + 세로선) */}
        <div
          className="absolute top-0 flex h-full flex-col items-center"
          style={{ left: `${percentage}%`, transform: "translateX(-50%)" }}
        >
          {/* 세로 인디케이터 라인 */}
          <div
            className={`${config.barHeight} w-0.5 rounded-full bg-white shadow-sm`}
            style={{
              boxShadow: "0 0 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* 마커 삼각형 (바 위) */}
        <svg
          className="absolute"
          style={{
            left: `${percentage}%`,
            transform: "translateX(-50%)",
            top: `-${config.marker + 2}px`,
            width: config.marker,
            height: config.marker,
          }}
          viewBox="0 0 10 10"
        >
          <polygon points="5,10 0,2 10,2" fill="currentColor" className="text-foreground" />
        </svg>
      </div>

      {/* 퍼센트 값 */}
      {showValue && (
        <div className={`text-foreground text-center ${config.text} font-semibold`}>
          {percentage}%
        </div>
      )}
    </div>
  )
}
