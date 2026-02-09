"use client"

import { useMemo, useId } from "react"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

interface PingerPrint2DProps {
  /** 6D 벡터 데이터 (key: 0.0~1.0) */
  data: Record<string, number>
  /** SVG 크기 (px) */
  size?: number
  /** 라벨 표시 여부 */
  showLabel?: boolean
}

/**
 * P-inger Print 2D — 사람 지문 형태의 소용돌이 패턴
 * 6D 벡터값에 따라 패턴 밀도/곡률/간격이 변하고,
 * 내부를 6D 기반 고유 컬러 그라디언트로 채움
 */
export function PingerPrint2D({ data, size = 240, showLabel = true }: PingerPrint2DProps) {
  const uid = useId().replace(/:/g, "")
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])

  // 6D 벡터 평균값 — 전체 밀도/사이즈 결정
  const avgValue = useMemo(() => {
    const vals = dimensions.map((d) => data[d.key])
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.5
  }, [data, dimensions])

  // 지문 릿지(ridge) 라인 생성 — 6D값에 따라 변형
  const ridgeLines = useMemo(() => {
    const cx = size / 2
    const cy = size / 2
    const maxR = size * 0.38
    const lines: string[] = []

    // 6D값에서 변형 파라미터 추출
    const depth = data.depth ?? 0.5
    const lens = data.lens ?? 0.5
    const stance = data.stance ?? 0.5
    const scope = data.scope ?? 0.5
    const taste = data.taste ?? 0.5
    const purpose = data.purpose ?? 0.5

    // 릿지 개수 — depth가 높을수록 촘촘
    const ridgeCount = Math.floor(12 + depth * 16)
    // 소용돌이 회전 수 — lens가 높을수록 더 많이 회전
    const spiralTurns = 1.5 + lens * 2.0
    // 비대칭 정도 — stance가 높을수록 비대칭
    const asymmetry = 0.05 + stance * 0.2
    // 세부 주름 — scope가 높을수록 주름 많음
    const wrinkleFactor = scope * 0.08
    // 불규칙성 — taste가 높을수록 불규칙
    const irregularity = taste * 0.12
    // 중심 오프셋 — purpose에 따라 중심이 살짝 이동
    const centerOffsetX = (purpose - 0.5) * size * 0.06
    const centerOffsetY = (depth - 0.5) * size * 0.04

    const ccx = cx + centerOffsetX
    const ccy = cy + centerOffsetY

    for (let i = 0; i < ridgeCount; i++) {
      const t = i / ridgeCount
      const r = maxR * (0.08 + t * 0.92)
      const points: Array<[number, number]> = []
      const segments = 80

      for (let j = 0; j <= segments; j++) {
        const frac = j / segments
        const baseAngle = frac * Math.PI * 2

        // 소용돌이 오프셋
        const spiralOffset = t * spiralTurns * Math.PI * 2 * frac * 0.15

        // 비대칭 변형
        const asymOffset = Math.sin(baseAngle * 2 + t * Math.PI) * asymmetry * r

        // 세부 주름
        const wrinkle = Math.sin(baseAngle * (6 + scope * 8) + t * 12) * wrinkleFactor * r

        // 불규칙 노이즈 (시드 기반 의사난수)
        const seed = (i * 73 + j * 37) % 100
        const noise = Math.sin(seed * 1.7 + baseAngle * 3) * irregularity * r * (1 - t * 0.5)

        const finalR = r + asymOffset + wrinkle + noise
        const angle = baseAngle + spiralOffset

        const x = ccx + finalR * Math.cos(angle)
        const y = ccy + finalR * Math.sin(angle)
        points.push([x, y])
      }

      // SVG path
      let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
      for (let k = 1; k < points.length; k++) {
        d += ` L ${points[k][0].toFixed(1)} ${points[k][1].toFixed(1)}`
      }

      lines.push(d)
    }

    return lines
  }, [data, size, avgValue])

  // 그라디언트 스톱 — 6D 컬러 기반
  const gradientStops = useMemo(() => {
    return dimensions.map((dim, i) => ({
      offset: `${(i / (dimensions.length - 1)) * 100}%`,
      color: dim.color.primary,
      opacity: 0.6 + (data[dim.key] ?? 0.5) * 0.4,
    }))
  }, [data, dimensions])

  // 지문 외곽 마스크 — 타원형 (실제 지문처럼)
  const maskRx = size * 0.4
  const maskRy = size * 0.44

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        style={{ maxWidth: size, maxHeight: size }}
      >
        <defs>
          {/* 지문 영역 마스크 (타원) */}
          <mask id={`pp2d-mask-${uid}`}>
            <ellipse cx={size / 2} cy={size / 2} rx={maskRx} ry={maskRy} fill="white" />
          </mask>

          {/* 6D 컬러 그라디언트 */}
          <linearGradient id={`pp2d-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops.map((stop, i) => (
              <stop
                key={i}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>

          {/* 방사형 페이드 */}
          <radialGradient id={`pp2d-fade-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="85%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          <mask id={`pp2d-fmask-${uid}`}>
            <ellipse
              cx={size / 2}
              cy={size / 2}
              rx={maskRx}
              ry={maskRy}
              fill={`url(#pp2d-fade-${uid})`}
            />
          </mask>
        </defs>

        {/* 배경 그라디언트 (마스크 적용) */}
        <g mask={`url(#pp2d-mask-${uid})`}>
          <rect
            x={0}
            y={0}
            width={size}
            height={size}
            fill={`url(#pp2d-grad-${uid})`}
            opacity={0.15}
          />
        </g>

        {/* 지문 릿지 라인 (마스크 + 페이드) */}
        <g mask={`url(#pp2d-fmask-${uid})`}>
          {ridgeLines.map((d, i) => {
            const t = i / ridgeLines.length
            // 내측은 진하고 외측은 연하게
            const opacity = 0.45 + (1 - t) * 0.45
            // 릿지 색상: 그라디언트 색상 순환
            const dimIdx = i % dimensions.length
            const color = dimensions[dimIdx]?.color.primary ?? "#9CA3AF"

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={1.2 + avgValue * 0.6}
                opacity={opacity}
                strokeLinecap="round"
              />
            )
          })}
        </g>

        {/* 외곽 없음 — 릿지 패턴 자체가 형태를 정의 */}
      </svg>

      {showLabel && <span className="text-xs font-medium text-gray-400">2D P-inger Print</span>}
    </div>
  )
}
