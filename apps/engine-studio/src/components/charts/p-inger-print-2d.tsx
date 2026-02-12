// ═══════════════════════════════════════════════════════════════
// PingerPrint2D v3 — 멀티레이어 지문 패턴
// T64-AC2: L1(외곽) + L2(중간) + L3(코어) 릿지
// ═══════════════════════════════════════════════════════════════

"use client"

import React, { useMemo } from "react"
import type { L1Vector, L2Vector, L3Vector, FingerprintMode } from "./fingerprint-types"
import {
  L1_COLORS,
  L2_COLORS,
  L3_COLORS,
  L1_KEYS,
  L2_KEYS,
  L3_KEYS,
  pressureToWeights,
  paradoxToColor,
} from "./fingerprint-types"

// ── Props ────────────────────────────────────────────────────

export interface PingerPrint2DV3Props {
  l1: L1Vector
  l2?: L2Vector
  l3?: L3Vector
  paradoxScore?: number
  pressure?: number
  size?: number
  mode?: FingerprintMode
  showLabel?: boolean
  animate?: boolean
  className?: string
}

// ── 결정적 PRNG (간소화) ─────────────────────────────────────

function createPRNG(seed: number): () => number {
  let state = seed || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state = state >>> 0
    return state / 0xffffffff
  }
}

function vectorToSeed(values: number[]): number {
  let hash = 5381
  for (const v of values) {
    hash = ((hash << 5) + hash + Math.round(v * 1000)) >>> 0
  }
  return hash || 1
}

// ── 릿지 생성 유틸 ──────────────────────────────────────────

interface RidgePath {
  d: string
  color: string
  width: number
  opacity: number
}

function generateLayerRidges(
  cx: number,
  cy: number,
  values: number[],
  keys: string[],
  colors: Record<string, string>,
  baseRadius: number,
  maxRadius: number,
  ridgeCount: number,
  rng: () => number,
  opacity: number,
  lineWidth: number
): RidgePath[] {
  const paths: RidgePath[] = []
  const avgValue = values.reduce((s, v) => s + v, 0) / values.length

  for (let r = 0; r < ridgeCount; r++) {
    const radius = baseRadius + ((maxRadius - baseRadius) * (r + 1)) / ridgeCount
    const segments = 48
    const points: string[] = []

    for (let s = 0; s <= segments; s++) {
      const angle = (s / segments) * Math.PI * 2
      const dimIdx = Math.floor((s / segments) * values.length) % values.length
      const dimValue = values[dimIdx]

      // 릿지 변형: 차원값 기반 + PRNG 노이즈
      const spiralOffset = avgValue * 2 * Math.sin(angle * 3 + r * 0.5)
      const noise = (rng() - 0.5) * dimValue * 8
      const asymmetry = values[2 % values.length] * 3 * Math.cos(angle)

      const finalR = radius + spiralOffset + noise + asymmetry
      const x = cx + finalR * Math.cos(angle)
      const y = cy + finalR * Math.sin(angle)

      points.push(`${s === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    }

    points.push("Z")
    const colorKey = keys[r % keys.length]
    paths.push({
      d: points.join(" "),
      color: colors[colorKey] ?? "#666666",
      width: lineWidth,
      opacity,
    })
  }

  return paths
}

// ── 컴포넌트 ────────────────────────────────────────────────

export function PingerPrint2DV3({
  l1,
  l2,
  l3,
  paradoxScore = 0,
  pressure = 0,
  size = 240,
  mode = "compact",
  showLabel = false,
  animate = false,
  className,
}: PingerPrint2DV3Props) {
  const cx = size / 2
  const cy = size / 2
  const weights = useMemo(() => pressureToWeights(pressure), [pressure])

  const showL2 = mode !== "compact" && l2 !== undefined
  const showL3 = mode === "full" && l3 !== undefined

  const l1Values = useMemo(() => L1_KEYS.map((k) => l1[k]), [l1])

  // ── L1 릿지 ────────────────────────────────────────────
  const l1Ridges = useMemo(() => {
    const ridgeCount = Math.round(12 + l1.depth * 16)
    const rng = createPRNG(vectorToSeed(l1Values))
    const outerR = (size / 2) * 0.9
    const innerR = showL2 ? (size / 2) * 0.5 : (size / 2) * 0.15
    return generateLayerRidges(
      cx,
      cy,
      l1Values,
      L1_KEYS as unknown as string[],
      L1_COLORS as Record<string, string>,
      innerR,
      outerR,
      ridgeCount,
      rng,
      weights.l1,
      1.5
    )
  }, [l1Values, l1.depth, size, cx, cy, showL2, weights.l1])

  // ── L2 릿지 ────────────────────────────────────────────
  const l2Ridges = useMemo(() => {
    if (!l2) return []
    const l2Values = L2_KEYS.map((k) => l2[k])
    const ridgeCount = Math.round(8 + l2.openness * 10)
    const rng = createPRNG(vectorToSeed(l2Values) + 7919)
    const outerR = (size / 2) * 0.48
    const innerR = showL3 ? (size / 2) * 0.22 : (size / 2) * 0.1
    return generateLayerRidges(
      cx,
      cy,
      l2Values,
      L2_KEYS as unknown as string[],
      L2_COLORS as Record<string, string>,
      innerR,
      outerR,
      ridgeCount,
      rng,
      0.7,
      1.2
    )
  }, [l2, size, cx, cy, showL3])

  // ── L3 릿지 ────────────────────────────────────────────
  const l3Ridges = useMemo(() => {
    if (!l3) return []
    const l3Values = L3_KEYS.map((k) => l3[k])
    const ridgeCount = Math.round(4 + l3.volatility * 6)
    const rng = createPRNG(vectorToSeed(l3Values) + 104729)
    const outerR = (size / 2) * 0.2
    const innerR = (size / 2) * 0.03
    return generateLayerRidges(
      cx,
      cy,
      l3Values,
      L3_KEYS as unknown as string[],
      L3_COLORS as Record<string, string>,
      innerR,
      outerR,
      ridgeCount,
      rng,
      0.5,
      1
    )
  }, [l3, size, cx, cy])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="PingerPrint2D v3"
    >
      <defs>
        <radialGradient id="pp2d-bg">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </radialGradient>
      </defs>

      {/* 배경 */}
      <circle
        cx={cx}
        cy={cy}
        r={size / 2 - 1}
        fill="url(#pp2d-bg)"
        stroke="#CBD5E1"
        strokeWidth="1"
      />

      {/* L3 코어 릿지 */}
      {showL3 &&
        l3Ridges.map((ridge, i) => (
          <path
            key={`l3-${i}`}
            d={ridge.d}
            fill="none"
            stroke={ridge.color}
            strokeWidth={ridge.width}
            opacity={ridge.opacity}
          />
        ))}

      {/* L2 중간 릿지 */}
      {showL2 &&
        l2Ridges.map((ridge, i) => (
          <path
            key={`l2-${i}`}
            d={ridge.d}
            fill="none"
            stroke={ridge.color}
            strokeWidth={ridge.width}
            opacity={ridge.opacity}
          />
        ))}

      {/* L1 외곽 릿지 */}
      {l1Ridges.map((ridge, i) => (
        <path
          key={`l1-${i}`}
          d={ridge.d}
          fill="none"
          stroke={ridge.color}
          strokeWidth={ridge.width}
          opacity={ridge.opacity}
        >
          {animate && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`${i % 2 === 0 ? 360 : -360} ${cx} ${cy}`}
              dur={`${60 + i * 5}s`}
              repeatCount="indefinite"
            />
          )}
        </path>
      ))}

      {/* 중심 패러독스 점 */}
      <circle cx={cx} cy={cy} r={4} fill={paradoxToColor(paradoxScore)} opacity="0.6" />

      {/* 레이블 */}
      {showLabel && (
        <text x={cx} y={size - 8} textAnchor="middle" fontSize="9" fill="#94A3B8">
          PingerPrint 2D
        </text>
      )}
    </svg>
  )
}
