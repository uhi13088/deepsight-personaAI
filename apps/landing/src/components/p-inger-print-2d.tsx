"use client"

import { useMemo, useId } from "react"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

interface PingerPrint2DProps {
  data: Record<string, number>
  size?: number
  showLabel?: boolean
}

// Simplex-like 2D noise (deterministic, seedable)
function hash(x: number, y: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  h = h ^ (h >> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = hash(ix, iy, seed)
  const n10 = hash(ix + 1, iy, seed)
  const n01 = hash(ix, iy + 1, seed)
  const n11 = hash(ix + 1, iy + 1, seed)
  const nx0 = n00 + (n10 - n00) * sx
  const nx1 = n01 + (n11 - n01) * sx
  return nx0 + (nx1 - nx0) * sy
}

function fbmNoise(x: number, y: number, seed: number, octaves = 3): number {
  let val = 0
  let amp = 1
  let freq = 1
  let max = 0
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 100) * amp
    max += amp
    amp *= 0.5
    freq *= 2
  }
  return val / max
}

/**
 * P-inger Print 2D — Flow field 기반 진짜 지문 패턴
 * 6D 벡터가 flow field의 특성을 결정 → 각 페르소나별 고유한 지문
 */
export function PingerPrint2D({ data, size = 240, showLabel = true }: PingerPrint2DProps) {
  const uid = useId().replace(/:/g, "")
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])

  const ridgeLines = useMemo(() => {
    const cx = size / 2
    const cy = size / 2
    const rx = size * 0.44
    const ry = size * 0.48

    const depth = data.depth ?? 0.5
    const lens = data.lens ?? 0.5
    const stance = data.stance ?? 0.5
    const scope = data.scope ?? 0.5
    const taste = data.taste ?? 0.5
    const purpose = data.purpose ?? 0.5

    // 6D로 시드 생성 (각 페르소나 고유)
    const seed = Math.floor(
      (depth * 17 + lens * 31 + stance * 53 + scope * 97 + taste * 151 + purpose * 199) * 1000
    )

    // Core(소용돌이 중심) 위치 — stance, purpose로 결정
    const coreX = cx + (stance - 0.5) * size * 0.15
    const coreY = cy - size * 0.1 + (purpose - 0.5) * size * 0.1

    // Flow field angle 계산
    // 실제 지문: 중심 근처는 소용돌이, 외곽은 아치형
    const getFlowAngle = (px: number, py: number): number => {
      const dx = px - coreX
      const dy = py - coreY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.sqrt(rx * rx + ry * ry)
      const t = Math.min(dist / maxDist, 1) // 0=center, 1=edge

      // 기본 각도: 중심을 향한 방향의 수직 (소용돌이)
      const toCenter = Math.atan2(dy, dx)
      const perpendicular = toCenter + Math.PI / 2

      // 소용돌이 강도: 중심에 가까울수록 강하게 회전
      const spiralStrength = (1 - t) * (0.5 + taste * 0.8)
      const spiralAngle = perpendicular + spiralStrength * Math.PI * 0.5

      // 아치 성분: 외곽일수록 수평에 가까워짐
      const archAngle = Math.PI * 0.5 + (lens - 0.5) * 0.3 // 약간의 기울기
      const blended = spiralAngle * (1 - t * t) + archAngle * (t * t)

      // 노이즈 교란: 자연스러운 불규칙성
      const noiseScale = 2.5 + scope * 2
      const noiseVal = fbmNoise((px / size) * noiseScale, (py / size) * noiseScale, seed, 3)
      const noisePerturbation = (noiseVal - 0.5) * Math.PI * (0.3 + depth * 0.4)

      return blended + noisePerturbation
    }

    // 릿지 라인 생성: 시작점을 촘촘하게 배치하고 flow field을 따라 그림
    interface Ridge {
      path: string
      colorIdx: number
    }
    const ridges: Ridge[] = []

    // 릿지 간격 — depth가 높을수록 촘촘
    const spacing = 3.5 - depth * 1.5 // 2.0 ~ 3.5 px
    const stepSize = 2.0

    // 시작점: 좌측 변에서 수직으로 촘촘하게 배치
    const startPoints: Array<[number, number, number]> = [] // [x, y, colorIdx]
    const margin = size * 0.02

    // 좌측 변 시작점
    for (let y = margin; y < size - margin; y += spacing) {
      const ci = startPoints.length % dimensions.length
      startPoints.push([margin, y, ci])
    }
    // 상단 변 시작점
    for (let x = margin + spacing; x < size - margin; x += spacing) {
      const ci = startPoints.length % dimensions.length
      startPoints.push([x, margin, ci])
    }
    // 우측에서도 약간 (하단 커버)
    for (let y = margin; y < size - margin; y += spacing * 2) {
      const ci = startPoints.length % dimensions.length
      startPoints.push([size - margin, y, ci])
    }
    // 하단에서도
    for (let x = margin; x < size - margin; x += spacing * 2) {
      const ci = startPoints.length % dimensions.length
      startPoints.push([x, size - margin, ci])
    }

    for (const [sx, sy, ci] of startPoints) {
      const points: Array<[number, number]> = []
      let px = sx
      let py = sy
      const maxSteps = 200

      for (let step = 0; step < maxSteps; step++) {
        // 타원 내부인지 체크
        const ndx = (px - cx) / rx
        const ndy = (py - cy) / ry
        if (ndx * ndx + ndy * ndy > 1.05) break
        // 경계 체크
        if (px < 0 || px > size || py < 0 || py > size) break

        points.push([px, py])

        const angle = getFlowAngle(px, py)
        px += Math.cos(angle) * stepSize
        py += Math.sin(angle) * stepSize
      }

      if (points.length < 8) continue

      // SVG path 생성
      let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
      for (let k = 1; k < points.length; k++) {
        d += ` L ${points[k][0].toFixed(1)} ${points[k][1].toFixed(1)}`
      }

      ridges.push({ path: d, colorIdx: ci })
    }

    return ridges
  }, [data, size, dimensions.length])

  const colors = useMemo(() => dimensions.map((d) => d.color.primary), [dimensions])

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
          <radialGradient id={`pp2d-fade-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="80%" stopColor="white" stopOpacity="1" />
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
            const color = colors[ridge.colorIdx] ?? "#333333"
            return (
              <path
                key={i}
                d={ridge.path}
                fill="none"
                stroke={color}
                strokeWidth={1.8}
                opacity={0.85}
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
