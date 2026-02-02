"use client"

import { useMemo } from "react"
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import type { Vector6D } from "@/lib/utils"
import { VECTOR_DIMENSION_LABELS } from "@/lib/utils"

interface RadarChartProps {
  data: Vector6D
  compareData?: Vector6D
  showLabels?: boolean
  showLegend?: boolean
  primaryColor?: string
  secondaryColor?: string
  primaryLabel?: string
  secondaryLabel?: string
  height?: number
}

export function RadarChart({
  data,
  compareData,
  showLegend = true,
  primaryColor = "hsl(var(--primary))",
  secondaryColor = "hsl(var(--chart-2))",
  primaryLabel = "현재",
  secondaryLabel = "비교",
  height = 300,
}: RadarChartProps) {
  const chartData = useMemo(() => {
    const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

    return dimensions.map((dim) => ({
      dimension: VECTOR_DIMENSION_LABELS[dim].label,
      fullName: VECTOR_DIMENSION_LABELS[dim].name,
      primary: Math.round(data[dim] * 100),
      ...(compareData && { secondary: Math.round(compareData[dim] * 100) }),
    }))
  }, [data, compareData])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={chartData}>
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickCount={5}
        />

        <Radar
          name={primaryLabel}
          dataKey="primary"
          stroke={primaryColor}
          fill={primaryColor}
          fillOpacity={0.3}
          strokeWidth={2}
        />

        {compareData && (
          <Radar
            name={secondaryLabel}
            dataKey="secondary"
            stroke={secondaryColor}
            fill={secondaryColor}
            fillOpacity={0.2}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        )}

        {showLegend && <Legend />}

        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null

            return (
              <div className="bg-background rounded-lg border p-3 shadow-lg">
                <p className="mb-2 font-medium">{payload[0]?.payload?.dimension}</p>
                {payload.map((entry, index) => (
                  <p key={index} className="text-sm" style={{ color: entry.color }}>
                    {entry.name}: {entry.value}%
                  </p>
                ))}
              </div>
            )
          }}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  )
}
