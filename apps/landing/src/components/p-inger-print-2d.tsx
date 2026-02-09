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
 * P-inger Print 2D — 실제 지문처럼 loop/whorl/arch 패턴
 * - 두꺼운 릿지 라인
 * - 선별 단색 (6D 차원 컬러를 라인별로 배정, 그라데이션 X)
 * - 6D 벡터에 따라 소용돌이 중심/곡률/밀도 변화
 */
export function PingerPrint2D({ data, size = 240, showLabel = true }: PingerPrint2DProps) {
  const uid = useId().replace(/:/g, "")
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])

  const ridgeLines = useMemo(() => {
    const cx = size / 2
    const cy = size / 2
    const maxR = size * 0.44

    // 6D 파라미터
    const depth = data.depth ?? 0.5
    const lens = data.lens ?? 0.5
    const stance = data.stance ?? 0.5
    const scope = data.scope ?? 0.5
    const taste = data.taste ?? 0.5
    const purpose = data.purpose ?? 0.5

    // 릿지 수: depth 기반 (20~35 — 두꺼운 선이니 적당히)
    const ridgeCount = Math.floor(20 + depth * 15)
    // 소용돌이 중심 오프셋 — stance, purpose
    const coreCx = cx + (stance - 0.5) * size * 0.08
    const coreCy = cy - size * 0.06 + (purpose - 0.5) * size * 0.06
    // 델타 포인트 (지문의 삼각점) — lens에 의해 위치 결정
    const deltaCx = cx + (lens - 0.5) * size * 0.12
    const deltaCy = cy + size * 0.18

    // 패턴 강도 — taste: 0=arch, 0.5=loop, 1=whorl
    const whorlStrength = taste
    // scope: 타원 비율
    const aspectX = 0.85 + scope * 0.3
    const aspectY = 1.15 - scope * 0.3

    interface Ridge {
      path: string
      colorIdx: number
    }
    const ridges: Ridge[] = []

    for (let i = 0; i < ridgeCount; i++) {
      const t = i / ridgeCount // 0=중심, 1=외곽
      const r = maxR * (0.04 + t * 0.96)
      const points: Array<[number, number]> = []

      // 상반부 곡선 (core 주변 소용돌이)
      // 하반부 곡선 (delta 쪽으로 열림)
      const segments = 80
      const openAngle = Math.PI * (0.15 + t * 0.3) // 외곽으로 갈수록 더 열림 (arch 느낌)

      // 소용돌이 회전각 — 내부일수록 더 많이 회전
      const spiralTwist = whorlStrength * (1 - t) * Math.PI * 0.6

      for (let j = 0; j <= segments; j++) {
        const frac = j / segments
        // 각도 범위: 하단 열림을 표현 (-openAngle ~ PI+openAngle)
        const angleRange = Math.PI * 2 - openAngle * 2
        const startAngle = -Math.PI / 2 + openAngle
        const angle = startAngle + frac * angleRange

        // 소용돌이 효과
        const twistAngle = angle + spiralTwist * Math.sin(frac * Math.PI)

        // 타원형 반지름
        const rx = r * aspectX
        const ry = r * aspectY

        // 상단 core 쪽은 타이트하게, 하단 delta 쪽은 넓게
        const verticalBias = 1.0 + Math.sin(angle) * 0.15 * (1 - t)

        // 중심을 core와 delta 사이 보간 (외곽은 전체 중심, 내부는 core 중심)
        const centerX = coreCx * (1 - t) + cx * t
        const centerY = coreCy * (1 - t) + cy * t

        const x = centerX + rx * Math.cos(twistAngle) * verticalBias
        const y = centerY + ry * Math.sin(twistAngle)

        points.push([x, y])
      }

      // 부드러운 곡선 패스 생성
      if (points.length < 3) continue
      let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`

      for (let k = 1; k < points.length - 1; k++) {
        const prev = points[k - 1]
        const curr = points[k]
        const next = points[k + 1]
        const cpx = curr[0] + (next[0] - prev[0]) * 0.15
        const cpy = curr[1] + (next[1] - prev[1]) * 0.15
        d += ` Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
      }
      // 마지막 점
      const last = points[points.length - 1]
      d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`

      // 컬러 인덱스: 6D 차원 색상을 순환 배정 (그라데이션 X, 선별 단색)
      const colorIdx = i % dimensions.length

      ridges.push({ path: d, colorIdx })
    }

    return ridges
  }, [data, size, dimensions.length])

  // 6D 색상 배열
  const colors = useMemo(() => dimensions.map((d) => d.color.primary), [dimensions])

  // 지문 외곽 마스크 — 타원형
  const maskRx = size * 0.44
  const maskRy = size * 0.48

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        style={{ maxWidth: size, maxHeight: size }}
      >
        <defs>
          {/* 지문 영역 페이드 마스크 */}
          <radialGradient id={`pp2d-fade-${uid}`} cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="75%" stopColor="white" stopOpacity="1" />
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

        <g mask={`url(#pp2d-fmask-${uid})`}>
          {ridgeLines.map((ridge, i) => {
            const t = i / ridgeLines.length
            const opacity = 0.65 + (1 - t) * 0.35
            const color = colors[ridge.colorIdx] ?? "#333333"

            return (
              <path
                key={i}
                d={ridge.path}
                fill="none"
                stroke={color}
                strokeWidth={2.2}
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
