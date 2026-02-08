"use client"

import { useMemo } from "react"
import { TRAIT_DIMENSIONS, type TraitDimensionConfig } from "@/lib/trait-colors"

interface TraitColorFingerprintProps {
  /** 벡터 데이터 (key: value 형태, 예: { depth: 0.8, lens: 0.3, ... }) */
  data: Record<string, number>
  /** SVG 크기 (px) */
  size?: number
  /** 라벨 표시 여부 */
  showLabels?: boolean
  /** 그리드 표시 여부 */
  showGrid?: boolean
  /** 값 표시 여부 */
  showValues?: boolean
}

interface Point {
  x: number
  y: number
}

/** Catmull-Rom 스플라인 → Cubic Bezier 변환 (부드러운 곡선 생성) */
function smoothPath(points: Point[]): string {
  const n = points.length
  if (n < 3) return ""

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]

    // Catmull-Rom → Bezier 제어점 (tension=6 → 자연스러운 곡률)
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
  size = 260,
  showLabels = true,
  showGrid = true,
  showValues = false,
}: TraitColorFingerprintProps) {
  const cx = size / 2
  const cy = size / 2
  const labelPadding = showLabels ? 36 : 12
  const maxRadius = size / 2 - labelPadding

  // data에 존재하는 차원만 필터 (N차원 확장 대응)
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])
  const n = dimensions.length

  // 축 각도 계산 (상단 시작, 시계방향)
  const getAngle = (index: number) => (-90 + index * (360 / n)) * (Math.PI / 180)

  // 좌표 계산
  const getPoint = (index: number, value: number): Point => {
    const angle = getAngle(index)
    return {
      x: cx + value * maxRadius * Math.cos(angle),
      y: cy + value * maxRadius * Math.sin(angle),
    }
  }

  // 데이터 포인트
  const dataPoints = useMemo(
    () => dimensions.map((dim, i) => getPoint(i, Math.max(data[dim.key], 0.05))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, dimensions, maxRadius]
  )

  // 그리드 다각형
  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  // 섹터 경로 (각 차원별 삼각형)
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

  // 부드러운 외곽선
  const outlinePath = useMemo(() => smoothPath(dataPoints), [dataPoints])

  // 글로우용 경로 (약간 더 큰)
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
        {/* 글로우 블러 필터 */}
        <filter id="fp-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 소프트 블러 (오라용) */}
        <filter id="fp-aura" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>

        {/* 각 차원별 방사형 그라디언트 */}
        {dimensions.map((dim) => (
          <radialGradient key={`rg-${dim.key}`} id={`rg-${dim.key}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={dim.color.primary} stopOpacity="0.01" />
            <stop offset="50%" stopColor={dim.color.primary} stopOpacity="0.15" />
            <stop offset="100%" stopColor={dim.color.primary} stopOpacity="0.4" />
          </radialGradient>
        ))}
      </defs>

      {/* 1. 배경 그리드 */}
      {showGrid && (
        <g opacity="0.3">
          {/* 동심 다각형 */}
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
                stroke="#E5E7EB"
                strokeWidth={level === 0.5 ? 0.8 : 0.5}
                strokeDasharray={level === 0.5 ? "none" : "2 2"}
              />
            )
          })}
          {/* 축선 */}
          {dimensions.map((_, i) => {
            const outerPoint = getPoint(i, 1)
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={outerPoint.x}
                y2={outerPoint.y}
                stroke="#E5E7EB"
                strokeWidth={0.5}
              />
            )
          })}
        </g>
      )}

      {/* 2. 컬러 오라 (블러 처리된 색상 영역) */}
      <g filter="url(#fp-aura)">
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

      {/* 3. 컬러 섹터 (선명한 색상 영역) */}
      {sectorPaths.map((path, i) => {
        const value = data[dimensions[i].key]
        return (
          <path
            key={`sector-${dimensions[i].key}`}
            d={path}
            fill={`url(#rg-${dimensions[i].key})`}
            opacity={0.3 + value * 0.4}
          />
        )
      })}

      {/* 4. 글로우 외곽선 */}
      <path
        d={glowPath}
        fill="none"
        stroke="white"
        strokeWidth={4}
        opacity={0.5}
        filter="url(#fp-glow)"
      />

      {/* 5. 부드러운 외곽선 (차원별 색상 세그먼트) */}
      {dataPoints.map((point, i) => {
        const nextIdx = (i + 1) % n
        const nextPoint = dataPoints[nextIdx]

        // Catmull-Rom 제어점으로 부드러운 세그먼트
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

      {/* 6. 꼭짓점 도트 */}
      {dataPoints.map((point, i) => (
        <g key={`dot-${dimensions[i].key}`}>
          {/* 글로우 */}
          <circle
            cx={point.x}
            cy={point.y}
            r={6}
            fill={dimensions[i].color.primary}
            opacity={0.2}
          />
          {/* 도트 */}
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

      {/* 7. 라벨 */}
      {showLabels &&
        dimensions.map((dim, i) => {
          const labelPoint = getPoint(i, 1.22)
          const value = data[dim.key]
          const angle = (-90 + i * (360 / n)) % 360
          // 텍스트 앵커 결정
          const normalizedAngle = ((angle % 360) + 360) % 360
          const textAnchor =
            normalizedAngle > 80 && normalizedAngle < 280
              ? "middle"
              : normalizedAngle >= 280 || normalizedAngle <= 80
                ? "middle"
                : "middle"

          return (
            <g key={`label-${dim.key}`}>
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="text-[10px] font-medium"
                fill={dim.color.primary}
              >
                {dim.label}
              </text>
              {showValues && (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 12}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  className="text-[9px]"
                  fill="#9CA3AF"
                >
                  {Math.round(value * 100)}%
                </text>
              )}
            </g>
          )
        })}

      {/* 8. 중심점 */}
      <circle cx={cx} cy={cy} r={2} fill="#D1D5DB" />
    </svg>
  )
}
