// ═══════════════════════════════════════════════════════════════
// TraitColorFingerprint v3 — 멀티레이어 레이더 차트
// T64-AC1: L1(7D) + L2(5D) + L3(4D) + 패러독스 + V_Final
// ═══════════════════════════════════════════════════════════════

"use client"

import React, { useMemo } from "react"
import type { L1Vector, L2Vector, L3Vector, FingerprintMode } from "./fingerprint-types"
import {
  L1_COLORS,
  L2_COLORS,
  L3_COLORS,
  L1_LABELS,
  L2_LABELS,
  L3_LABELS,
  L1_KEYS,
  L2_KEYS,
  L3_KEYS,
  getAxisAngle,
  polarToCartesian,
  paradoxToColor,
  pressureToWeights,
  smoothRadarPath,
} from "./fingerprint-types"

// ── Props ────────────────────────────────────────────────────

export interface TraitColorFingerprintV3Props {
  l1: L1Vector
  l2?: L2Vector
  l3?: L3Vector
  paradoxScore?: number
  pressure?: number
  vFinal?: number[]
  size?: number
  mode?: FingerprintMode
  showLabels?: boolean
  showGrid?: boolean
  showValues?: boolean
  showParadoxLinks?: boolean
  showVFinalOverlay?: boolean
  interactive?: boolean
  className?: string
}

// ── 상수 ─────────────────────────────────────────────────────

const L1_RADIUS_RATIO = 0.85
const L2_RADIUS_RATIO = 0.55
const L3_RADIUS_RATIO = 0.25
const GRID_LEVELS = 5
const LABEL_OFFSET = 18

// ── 컴포넌트 ────────────────────────────────────────────────

export function TraitColorFingerprintV3({
  l1,
  l2,
  l3,
  paradoxScore = 0,
  pressure = 0,
  vFinal,
  size = 300,
  mode = "compact",
  showLabels = true,
  showGrid = true,
  showValues = false,
  showParadoxLinks = false,
  showVFinalOverlay = false,
  interactive = false,
  className,
}: TraitColorFingerprintV3Props) {
  const cx = size / 2
  const cy = size / 2
  const weights = useMemo(() => pressureToWeights(pressure), [pressure])

  const showL2 = mode !== "compact" && l2 !== undefined
  const showL3 = mode === "full" && l3 !== undefined

  // ── L1 레이더 포인트 ───────────────────────────────────
  const l1Points = useMemo(() => {
    const radius = (size / 2) * L1_RADIUS_RATIO * weights.l1
    return L1_KEYS.map((key, i) => {
      const angle = getAxisAngle(i, L1_KEYS.length)
      const value = l1[key]
      return polarToCartesian(cx, cy, radius * value, angle)
    })
  }, [l1, size, cx, cy, weights.l1])

  // ── L2 레이더 포인트 ───────────────────────────────────
  const l2Points = useMemo(() => {
    if (!l2) return []
    const radius = (size / 2) * L2_RADIUS_RATIO * (weights.l2 / 0.15)
    return L2_KEYS.map((key, i) => {
      const angle = getAxisAngle(i, L2_KEYS.length)
      const value = l2[key]
      return polarToCartesian(cx, cy, radius * value, angle)
    })
  }, [l2, size, cx, cy, weights.l2])

  // ── V_Final 오버레이 ──────────────────────────────────
  const vFinalPoints = useMemo(() => {
    if (!vFinal || vFinal.length < 7) return []
    const radius = (size / 2) * L1_RADIUS_RATIO
    return vFinal.slice(0, 7).map((v, i) => {
      const angle = getAxisAngle(i, 7)
      return polarToCartesian(cx, cy, radius * v, angle)
    })
  }, [vFinal, size, cx, cy])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="TraitColorFingerprint v3"
    >
      <defs>
        <filter id="fp-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="center-glow">
          <stop offset="0%" stopColor={paradoxToColor(paradoxScore)} stopOpacity="0.4" />
          <stop offset="100%" stopColor={paradoxToColor(paradoxScore)} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 그리드 */}
      {showGrid && (
        <g opacity="0.15">
          {Array.from({ length: GRID_LEVELS }, (_, i) => {
            const r = ((size / 2) * L1_RADIUS_RATIO * (i + 1)) / GRID_LEVELS
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#94A3B8"
                strokeWidth="0.5"
              />
            )
          })}
          {L1_KEYS.map((_, i) => {
            const angle = getAxisAngle(i, L1_KEYS.length)
            const end = polarToCartesian(cx, cy, (size / 2) * L1_RADIUS_RATIO, angle)
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="#94A3B8"
                strokeWidth="0.5"
              />
            )
          })}
        </g>
      )}

      {/* 중심 광택 (paradoxScore) */}
      <circle cx={cx} cy={cy} r={(size / 2) * L3_RADIUS_RATIO * 2} fill="url(#center-glow)" />

      {/* L3 코어 심볼 */}
      {showL3 && l3 && (
        <g opacity="0.7">
          {L3_KEYS.map((key, i) => {
            const angle = getAxisAngle(i, L3_KEYS.length)
            const radius = (size / 2) * L3_RADIUS_RATIO * l3[key]
            const pos = polarToCartesian(cx, cy, radius, angle)
            const color = L3_COLORS[key]

            switch (key) {
              case "lack":
                return <circle key={key} cx={pos.x} cy={pos.y} r={4} fill={color} opacity="0.8" />
              case "moralCompass":
                return (
                  <g key={key}>
                    <line
                      x1={pos.x - 4}
                      y1={pos.y}
                      x2={pos.x + 4}
                      y2={pos.y}
                      stroke={color}
                      strokeWidth="2"
                    />
                    <line
                      x1={pos.x}
                      y1={pos.y - 4}
                      x2={pos.x}
                      y2={pos.y + 4}
                      stroke={color}
                      strokeWidth="2"
                    />
                  </g>
                )
              case "volatility":
                return (
                  <path
                    key={key}
                    d={`M${pos.x - 3} ${pos.y + 5} L${pos.x} ${pos.y - 5} L${pos.x + 3} ${pos.y + 5}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                  />
                )
              case "growthArc":
                return (
                  <path
                    key={key}
                    d={`M${pos.x} ${pos.y + 4} L${pos.x} ${pos.y - 4} L${pos.x + 3} ${pos.y - 1}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                  />
                )
              default:
                return null
            }
          })}
        </g>
      )}

      {/* L2 레이더 */}
      {showL2 && l2Points.length > 0 && (
        <g>
          {/* 섹터 채움 */}
          {l2Points.map((pt, i) => {
            const key = L2_KEYS[i]
            return (
              <path
                key={`l2-sector-${key}`}
                d={`M ${cx} ${cy} L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} L ${l2Points[(i + 1) % l2Points.length].x.toFixed(2)} ${l2Points[(i + 1) % l2Points.length].y.toFixed(2)} Z`}
                fill={L2_COLORS[key]}
                fillOpacity="0.08"
              />
            )
          })}
          <path
            d={smoothRadarPath(l2Points)}
            fill="none"
            stroke="#D97706"
            strokeWidth="1.5"
            opacity="0.7"
          />
          {l2Points.map((pt, i) => (
            <circle key={`l2-dot-${i}`} cx={pt.x} cy={pt.y} r="2.5" fill={L2_COLORS[L2_KEYS[i]]} />
          ))}
        </g>
      )}

      {/* 패러독스 링크 (L1↔L2) */}
      {showParadoxLinks && showL2 && l2Points.length > 0 && (
        <g>
          {/* L1[0..4] ↔ L2[0..4] 대응쌍 점선 */}
          {L2_KEYS.map((_, i) => {
            if (i >= l1Points.length) return null
            const from = l1Points[i]
            const to = l2Points[i]
            return (
              <line
                key={`paradox-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={paradoxToColor(paradoxScore)}
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.5"
              />
            )
          })}
        </g>
      )}

      {/* L1 레이더 (메인) */}
      <g>
        {/* 섹터 채움 */}
        {l1Points.map((pt, i) => {
          const key = L1_KEYS[i]
          return (
            <path
              key={`l1-sector-${key}`}
              d={`M ${cx} ${cy} L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} L ${l1Points[(i + 1) % l1Points.length].x.toFixed(2)} ${l1Points[(i + 1) % l1Points.length].y.toFixed(2)} Z`}
              fill={L1_COLORS[key]}
              fillOpacity="0.12"
            />
          )
        })}
        <path
          d={smoothRadarPath(l1Points)}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          filter="url(#fp-glow)"
        />
        {l1Points.map((pt, i) => (
          <circle key={`l1-dot-${i}`} cx={pt.x} cy={pt.y} r="3" fill={L1_COLORS[L1_KEYS[i]]} />
        ))}
      </g>

      {/* V_Final 오버레이 */}
      {showVFinalOverlay && vFinalPoints.length > 0 && (
        <path
          d={smoothRadarPath(vFinalPoints)}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="1.5"
          strokeDasharray="6,3"
          opacity="0.5"
        />
      )}

      {/* 레이블 */}
      {showLabels && (
        <g>
          {L1_KEYS.map((key, i) => {
            const angle = getAxisAngle(i, L1_KEYS.length)
            const pos = polarToCartesian(cx, cy, (size / 2) * L1_RADIUS_RATIO + LABEL_OFFSET, angle)
            return (
              <text
                key={key}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill="#64748B"
              >
                {L1_LABELS[key]}
              </text>
            )
          })}
        </g>
      )}

      {/* 수치 표시 */}
      {showValues && (
        <g>
          {L1_KEYS.map((key, i) => {
            const angle = getAxisAngle(i, L1_KEYS.length)
            const radius = (size / 2) * L1_RADIUS_RATIO * l1[key]
            const pos = polarToCartesian(cx, cy, radius + 12, angle)
            return (
              <text
                key={`val-${key}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="#94A3B8"
              >
                {(l1[key] * 100).toFixed(0)}
              </text>
            )
          })}
        </g>
      )}
    </svg>
  )
}
