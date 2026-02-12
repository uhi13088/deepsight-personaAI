// ═══════════════════════════════════════════════════════════════
// PingerPrint3D v3 — 멀티레이어 3D Jacks (Canvas 2D 렌더)
// T64-AC3: L1(7팔) + L2(5팔) + L3(4마커) + 패러독스 아크
// Three.js 미사용 — Canvas 2D isometric 렌더링
// ═══════════════════════════════════════════════════════════════

"use client"

import React, { useRef, useEffect, useMemo, useCallback } from "react"
import type { L1Vector, L2Vector, L3Vector, FingerprintMode } from "./fingerprint-types"
import {
  L1_COLORS,
  L2_COLORS,
  L3_COLORS,
  L1_KEYS,
  L2_KEYS,
  L3_KEYS,
  paradoxToColor,
  pressureToWeights,
} from "./fingerprint-types"

// ── Props ────────────────────────────────────────────────────

export interface PingerPrint3DV3Props {
  l1: L1Vector
  l2?: L2Vector
  l3?: L3Vector
  paradoxScore?: number
  pressure?: number
  size?: number
  mode?: FingerprintMode
  autoRotate?: boolean
  showLabel?: boolean
  showParadoxArcs?: boolean
  pressureAnimation?: boolean
  className?: string
}

// ── 3D → 2D 투영 유틸 ───────────────────────────────────────

interface Point3D {
  x: number
  y: number
  z: number
}

function rotateY(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: p.x * cos + p.z * sin,
    y: p.y,
    z: -p.x * sin + p.z * cos,
  }
}

function rotateX(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: p.x,
    y: p.y * cos - p.z * sin,
    z: p.y * sin + p.z * cos,
  }
}

function project(
  p: Point3D,
  cx: number,
  cy: number,
  fov: number
): { x: number; y: number; scale: number } {
  const z = p.z + fov
  const scale = fov / z
  return {
    x: cx + p.x * scale,
    y: cy - p.y * scale, // Y 반전
    scale,
  }
}

// ── 팔 방향 생성 ────────────────────────────────────────────

function generateArmDirections(count: number): Point3D[] {
  const dirs: Point3D[] = []
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    dirs.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi),
    })
  }
  return dirs
}

// ── 컴포넌트 ────────────────────────────────────────────────

export function PingerPrint3DV3({
  l1,
  l2,
  l3,
  paradoxScore = 0,
  pressure = 0,
  size = 300,
  mode = "compact",
  autoRotate = true,
  showLabel = false,
  showParadoxArcs = false,
  pressureAnimation = false,
  className,
}: PingerPrint3DV3Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const weights = useMemo(() => pressureToWeights(pressure), [pressure])

  const showL2 = mode !== "compact" && l2 !== undefined
  const showL3 = mode === "full" && l3 !== undefined

  const fov = size * 1.2
  const cx = size / 2
  const cy = size / 2

  // L1 팔 방향
  const l1Dirs = useMemo(() => generateArmDirections(7), [])
  const l2Dirs = useMemo(() => generateArmDirections(5), [])
  const l3Dirs = useMemo(() => generateArmDirections(4), [])

  const draw = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, size, size)

      // 배경
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
      bgGrad.addColorStop(0, "#1E293B")
      bgGrad.addColorStop(1, "#0F172A")
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, size, size)

      const rotY = rotation
      const rotXAngle = 0.3

      // 중심구
      const centerP = project({ x: 0, y: 0, z: 0 }, cx, cy, fov)
      const centerGlow = ctx.createRadialGradient(centerP.x, centerP.y, 0, centerP.x, centerP.y, 12)
      centerGlow.addColorStop(0, paradoxToColor(paradoxScore))
      centerGlow.addColorStop(1, "transparent")
      ctx.fillStyle = centerGlow
      ctx.beginPath()
      ctx.arc(centerP.x, centerP.y, 12, 0, Math.PI * 2)
      ctx.fill()

      // L3 코어 마커
      if (showL3 && l3) {
        L3_KEYS.forEach((key, i) => {
          const dir = l3Dirs[i]
          const len = l3[key] * 20 * weights.l3
          const p3d = rotateX(
            rotateY({ x: dir.x * len, y: dir.y * len, z: dir.z * len }, rotY),
            rotXAngle
          )
          const p2d = project(p3d, cx, cy, fov)

          ctx.fillStyle = L3_COLORS[key]
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(p2d.x, p2d.y, 3 * p2d.scale, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        })
      }

      // L2 팔
      if (showL2 && l2) {
        L2_KEYS.forEach((key, i) => {
          const dir = l2Dirs[i]
          const len = l2[key] * 50 * weights.l2
          const tip3d = rotateX(
            rotateY({ x: dir.x * len, y: dir.y * len, z: dir.z * len }, rotY),
            rotXAngle
          )
          const tip2d = project(tip3d, cx, cy, fov)

          // 팔 라인
          ctx.strokeStyle = L2_COLORS[key]
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.moveTo(centerP.x, centerP.y)
          ctx.lineTo(tip2d.x, tip2d.y)
          ctx.stroke()

          // 팔 끝 구체
          ctx.fillStyle = L2_COLORS[key]
          ctx.beginPath()
          ctx.arc(tip2d.x, tip2d.y, 3 * tip2d.scale, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        })
      }

      // L1 팔 (메인)
      const l1Tips: Array<{ x: number; y: number }> = []
      L1_KEYS.forEach((key, i) => {
        const dir = l1Dirs[i]
        const len = l1[key] * 80 * weights.l1
        const pressureShrink = pressureAnimation ? 1 - pressure * 0.3 : 1
        const finalLen = len * pressureShrink
        const tip3d = rotateX(
          rotateY({ x: dir.x * finalLen, y: dir.y * finalLen, z: dir.z * finalLen }, rotY),
          rotXAngle
        )
        const tip2d = project(tip3d, cx, cy, fov)
        l1Tips.push(tip2d)

        // 크롬 팔
        const gradient = ctx.createLinearGradient(centerP.x, centerP.y, tip2d.x, tip2d.y)
        gradient.addColorStop(0, "#94A3B8")
        gradient.addColorStop(0.5, L1_COLORS[key])
        gradient.addColorStop(1, "#E2E8F0")

        ctx.strokeStyle = gradient
        ctx.lineWidth = 3
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(centerP.x, centerP.y)
        ctx.lineTo(tip2d.x, tip2d.y)
        ctx.stroke()

        // 팔 끝 구체
        ctx.fillStyle = L1_COLORS[key]
        ctx.beginPath()
        ctx.arc(tip2d.x, tip2d.y, 4 * tip2d.scale, 0, Math.PI * 2)
        ctx.fill()

        // 하이라이트
        ctx.fillStyle = "rgba(255,255,255,0.4)"
        ctx.beginPath()
        ctx.arc(tip2d.x - 1, tip2d.y - 1, 1.5 * tip2d.scale, 0, Math.PI * 2)
        ctx.fill()
      })

      // 패러독스 아크
      if (showParadoxArcs && showL2 && l2) {
        ctx.strokeStyle = paradoxToColor(paradoxScore)
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.3
        ctx.setLineDash([4, 4])

        const minCount = Math.min(l1Tips.length, L2_KEYS.length)
        for (let i = 0; i < minCount; i++) {
          const dir = l2Dirs[i]
          const len = l2[L2_KEYS[i]] * 50 * weights.l2
          const tip3d = rotateX(
            rotateY({ x: dir.x * len, y: dir.y * len, z: dir.z * len }, rotY),
            rotXAngle
          )
          const l2Tip = project(tip3d, cx, cy, fov)

          ctx.beginPath()
          ctx.moveTo(l1Tips[i].x, l1Tips[i].y)
          ctx.lineTo(l2Tip.x, l2Tip.y)
          ctx.stroke()
        }

        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }

      // 레이블
      if (showLabel) {
        ctx.fillStyle = "#94A3B8"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("PingerPrint 3D", cx, size - 8)
      }
    },
    [
      l1,
      l2,
      l3,
      size,
      cx,
      cy,
      fov,
      weights,
      showL2,
      showL3,
      paradoxScore,
      pressure,
      showParadoxArcs,
      showLabel,
      pressureAnimation,
      l1Dirs,
      l2Dirs,
      l3Dirs,
    ]
  )

  useEffect(() => {
    if (!autoRotate) {
      draw(0)
      return
    }

    const animate = () => {
      rotationRef.current += 0.008
      draw(rotationRef.current)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [autoRotate, draw])

  // 자동 회전 아닐 때 초기 렌더
  useEffect(() => {
    if (!autoRotate) draw(0)
  }, [autoRotate, draw])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="PingerPrint3D v3"
    />
  )
}
