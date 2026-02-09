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
 * P-inger Print 2D — 실제 지문처럼 깔끔한 소용돌이 패턴
 * 6D 벡터값에 따라 패턴 구조(loop/whorl/arch)와 릿지 간격이 변하고,
 * 릿지 라인에 6D 컬러 그라디언트를 입힘
 */
export function PingerPrint2D({ data, size = 240, showLabel = true }: PingerPrint2DProps) {
  const uid = useId().replace(/:/g, "")
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])

  // 지문 릿지(ridge) 라인 생성 — 깔끔한 소용돌이 패턴
  const ridgeLines = useMemo(() => {
    const cx = size / 2
    const cy = size / 2
    const maxR = size * 0.42
    const lines: string[] = []

    // 6D 파라미터
    const depth = data.depth ?? 0.5
    const lens = data.lens ?? 0.5
    const stance = data.stance ?? 0.5
    const scope = data.scope ?? 0.5
    const taste = data.taste ?? 0.5
    const purpose = data.purpose ?? 0.5

    // 릿지 개수 — depth가 높을수록 촘촘 (18~30)
    const ridgeCount = Math.floor(18 + depth * 12)
    // 소용돌이 회전 강도 — lens
    const spiralStrength = 0.3 + lens * 0.5
    // 중심 오프셋 — 지문 중심(core)의 위치
    const coreOffsetX = (purpose - 0.5) * size * 0.05
    const coreOffsetY = (stance - 0.5) * size * 0.04
    // 타원 비율 — scope에 따라 가로/세로 비율 변화
    const aspectX = 0.9 + scope * 0.2
    const aspectY = 1.1 - scope * 0.2
    // 패턴 타입 결정 — taste로 loop/whorl/arch 블렌딩
    const archFactor = Math.max(0, 1 - taste * 2) // 0~0.5: arch 성분
    const whorlFactor = Math.max(0, taste * 2 - 1) // 0.5~1: whorl 성분

    const coreCx = cx + coreOffsetX
    const coreCy = cy + coreOffsetY

    for (let i = 0; i < ridgeCount; i++) {
      const t = i / ridgeCount
      const baseR = maxR * (0.06 + t * 0.94)
      const points: Array<[number, number]> = []
      const segments = 100

      for (let j = 0; j <= segments; j++) {
        const frac = j / segments
        const angle = frac * Math.PI * 2

        // 기본 타원형 릿지
        let rx = baseR * aspectX
        let ry = baseR * aspectY

        // 소용돌이 회전 — 내부일수록 더 많이 회전
        const spiralAngle = angle + (1 - t) * spiralStrength * Math.PI * 2 * frac * 0.08

        // Arch 변형: 상단이 평탄해짐
        const archDeform = archFactor * Math.sin(angle) * baseR * 0.15 * (1 - t * 0.5)

        // Whorl 변형: 중심부가 더 타이트하게 감김
        const whorlDeform = whorlFactor * Math.sin(angle * 2 + t * Math.PI) * baseR * 0.06

        // 최종 반지름
        const finalRx = rx + archDeform * 0.5 + whorlDeform
        const finalRy = ry - archDeform + whorlDeform * 0.5

        const x = coreCx + finalRx * Math.cos(spiralAngle)
        const y = coreCy + finalRy * Math.sin(spiralAngle)
        points.push([x, y])
      }

      // 부드러운 곡선 (Catmull-Rom → cubic bezier 근사)
      let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
      for (let k = 1; k < points.length - 1; k++) {
        const prev = points[k - 1]
        const curr = points[k]
        const next = points[k + 1]
        // 컨트롤 포인트 계산
        const cpx = curr[0] + (next[0] - prev[0]) * 0.1
        const cpy = curr[1] + (next[1] - prev[1]) * 0.1
        d += ` Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
      }

      lines.push(d)
    }

    return lines
  }, [data, size])

  // 그라디언트 스톱 — 6D 컬러 기반
  const gradientStops = useMemo(() => {
    return dimensions.map((dim, i) => ({
      offset: `${(i / Math.max(dimensions.length - 1, 1)) * 100}%`,
      color: dim.color.primary,
      opacity: 0.7 + (data[dim.key] ?? 0.5) * 0.3,
    }))
  }, [data, dimensions])

  // 지문 외곽 마스크 — 타원형 (실제 지문처럼)
  const maskRx = size * 0.42
  const maskRy = size * 0.46

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

          {/* 6D 컬러 그라디언트 — 릿지 라인에 적용 */}
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

          {/* 방사형 페이드 — 가장자리 자연스럽게 사라짐 */}
          <radialGradient id={`pp2d-fade-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="1" />
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

        {/* 지문 릿지 라인 (마스크 + 페이드) — 전체에 6D 그라디언트 적용 */}
        <g mask={`url(#pp2d-fmask-${uid})`}>
          {ridgeLines.map((d, i) => {
            const t = i / ridgeLines.length
            // 내측 → 진하게, 외측 → 연하게
            const opacity = 0.5 + (1 - t) * 0.5

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={`url(#pp2d-grad-${uid})`}
                strokeWidth={1.4}
                opacity={opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}
        </g>
      </svg>

      {showLabel && <span className="text-xs font-medium text-gray-400">2D P-inger Print</span>}
    </div>
  )
}
