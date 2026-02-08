"use client"

import { useMemo } from "react"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

interface TraitColorFingerprintProps {
  data: Record<string, number>
  size?: number
  showLabels?: boolean
  showGrid?: boolean
  showValues?: boolean
}

interface Point {
  x: number
  y: number
}

function smoothPath(points: Point[]): string {
  const n = points.length
  if (n < 3) return ""

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]

    const tension = 6
    const cp1x = p1.x + (p2.x - p0.x) / tension
    const cp1y = p1.y + (p2.y - p0.y) / tension
    const cp2x = p2.x - (p3.x - p1.x) / tension
    const cp2y = p2.y - (p3.y - p1.y) / tension

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  return d
}

export function TraitColorFingerprint({
  data,
  size = 300,
  showLabels = true,
  showGrid = true,
  showValues = false,
}: TraitColorFingerprintProps) {
  const cx = size / 2
  const cy = size / 2
  const labelPadding = showLabels ? 40 : 12
  const maxRadius = size / 2 - labelPadding

  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])
  const n = dimensions.length

  const getAngle = (index: number) => (-90 + index * (360 / n)) * (Math.PI / 180)

  const getPoint = (index: number, value: number): Point => {
    const angle = getAngle(index)
    return {
      x: cx + value * maxRadius * Math.cos(angle),
      y: cy + value * maxRadius * Math.sin(angle),
    }
  }

  const dataPoints = useMemo(
    () => dimensions.map((dim, i) => getPoint(i, Math.max(data[dim.key], 0.05))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, dimensions, maxRadius]
  )

  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  const sectorPaths = useMemo(() => {
    return dimensions.map((dim, i) => {
      const value = Math.max(data[dim.key], 0.05)
      const nextIdx = (i + 1) % n
      const nextValue = Math.max(data[dimensions[nextIdx].key], 0.05)
      const p1 = getPoint(i, value)
      const p2 = getPoint(nextIdx, nextValue)
      return `M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dimensions, maxRadius])

  const outlinePath = useMemo(() => smoothPath(dataPoints), [dataPoints])

  const glowPoints = useMemo(
    () => dimensions.map((dim, i) => getPoint(i, Math.max(data[dim.key], 0.05) * 1.02)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, dimensions, maxRadius]
  )
  const glowPath = useMemo(() => smoothPath(glowPoints), [glowPoints])

  if (n < 3) return null

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      style={{ maxWidth: size, maxHeight: size }}
    >
      <defs>
        <filter id="es-fp-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="es-fp-aura" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        {dimensions.map((dim) => (
          <radialGradient
            key={`es-rg-${dim.key}`}
            id={`es-rg-${dim.key}`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor={dim.color.primary} stopOpacity="0.01" />
            <stop offset="50%" stopColor={dim.color.primary} stopOpacity="0.15" />
            <stop offset="100%" stopColor={dim.color.primary} stopOpacity="0.4" />
          </radialGradient>
        ))}
      </defs>

      {showGrid && (
        <g opacity="0.3">
          {gridLevels.map((level) => {
            const gridPoints = dimensions.map((_, i) => getPoint(i, level))
            const gridPath =
              gridPoints
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(" ") + " Z"
            return (
              <path
                key={level}
                d={gridPath}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={level === 0.5 ? 0.8 : 0.5}
                strokeDasharray={level === 0.5 ? "none" : "2 2"}
              />
            )
          })}
          {dimensions.map((_, i) => {
            const outerPoint = getPoint(i, 1)
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={outerPoint.x}
                y2={outerPoint.y}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
              />
            )
          })}
        </g>
      )}

      <g filter="url(#es-fp-aura)">
        {sectorPaths.map((path, i) => {
          const value = data[dimensions[i].key]
          return (
            <path
              key={`aura-${dimensions[i].key}`}
              d={path}
              fill={dimensions[i].color.primary}
              opacity={0.1 + value * 0.2}
            />
          )
        })}
      </g>

      {sectorPaths.map((path, i) => {
        const value = data[dimensions[i].key]
        return (
          <path
            key={`sector-${dimensions[i].key}`}
            d={path}
            fill={`url(#es-rg-${dimensions[i].key})`}
            opacity={0.3 + value * 0.4}
          />
        )
      })}

      <path
        d={glowPath}
        fill="none"
        stroke="white"
        strokeWidth={4}
        opacity={0.5}
        filter="url(#es-fp-glow)"
      />

      {dataPoints.map((point, i) => {
        const nextIdx = (i + 1) % n
        const nextPoint = dataPoints[nextIdx]
        const prevIdx = (i - 1 + n) % n
        const nextNextIdx = (i + 2) % n
        const p0 = dataPoints[prevIdx]
        const p3 = dataPoints[nextNextIdx]

        const tension = 6
        const cp1x = point.x + (nextPoint.x - p0.x) / tension
        const cp1y = point.y + (nextPoint.y - p0.y) / tension
        const cp2x = nextPoint.x - (p3.x - point.x) / tension
        const cp2y = nextPoint.y - (p3.y - point.y) / tension

        return (
          <path
            key={`edge-${i}`}
            d={`M ${point.x.toFixed(2)} ${point.y.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${nextPoint.x.toFixed(2)} ${nextPoint.y.toFixed(2)}`}
            fill="none"
            stroke={dimensions[i].color.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.8}
          />
        )
      })}

      {dataPoints.map((point, i) => (
        <g key={`dot-${dimensions[i].key}`}>
          <circle
            cx={point.x}
            cy={point.y}
            r={6}
            fill={dimensions[i].color.primary}
            opacity={0.2}
          />
          <circle
            cx={point.x}
            cy={point.y}
            r={4}
            fill={dimensions[i].color.primary}
            stroke="white"
            strokeWidth={2}
          />
        </g>
      ))}

      {showLabels &&
        dimensions.map((dim, i) => {
          const labelPoint = getPoint(i, 1.22)
          const value = data[dim.key]
          return (
            <g key={`label-${dim.key}`}>
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[11px] font-medium"
                fill={dim.color.primary}
              >
                {dim.label}
              </text>
              {showValues && (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px]"
                  fill="hsl(var(--muted-foreground))"
                >
                  {Math.round(value * 100)}%
                </text>
              )}
            </g>
          )
        })}

      <circle cx={cx} cy={cy} r={2} fill="hsl(var(--muted-foreground))" opacity={0.3} />
    </svg>
  )
}
