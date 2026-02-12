// ═══════════════════════════════════════════════════════════════
// 색상 인코더 — 릿지별 색상 할당 + ΔE00 검증
// T63-AC2: min_adjacent_delta_e00 ≥ 5 보장
// ═══════════════════════════════════════════════════════════════

import type { LabColor, OklchColor } from "./color-space"
import { deltaE00, rgbToLab, rgbToHex, labToRgb, labToOklch } from "./color-space"

// ── 타입 ─────────────────────────────────────────────────────

export interface RidgeColor {
  ridgeIndex: number
  hex: string
  oklch: OklchColor
  lab: LabColor
  deltaE00ToPrev: number | null // 첫 번째 릿지는 null
}

export interface ColorEncoderConfig {
  ridgeCount: number
  hueSeed: number // seed[24:32] → 0~360
  hueStep: number // 릿지 간 색상 회전 (도)
  lightness: number // Lab L 기본값 (40~80)
  chroma: number // Lab C 기본값 (30~70)
  minAdjacentDeltaE00: number // 최소 인접 ΔE00 (기본 5)
}

export interface ColorEncodeResult {
  colors: RidgeColor[]
  minDeltaE00: number
  maxDeltaE00: number
  valid: boolean // 모든 인접 ΔE00 ≥ threshold
}

// ── 기본값 ───────────────────────────────────────────────────

const DEFAULT_CONFIG: Omit<ColorEncoderConfig, "ridgeCount" | "hueSeed"> = {
  hueStep: 37, // 황금각 근사 (360/φ² ≈ 137.5 → mod용 37)
  lightness: 55,
  chroma: 50,
  minAdjacentDeltaE00: 5,
}

// ── 핵심 함수 ────────────────────────────────────────────────

/** 릿지 인덱스에 대한 Lab 색상 생성 */
function generateRidgeLabColor(index: number, config: ColorEncoderConfig): LabColor {
  // LCh 기반: 색상각만 회전, 밝기/채도 유지
  const hue = (config.hueSeed + index * config.hueStep) % 360
  const rad = hue * (Math.PI / 180)
  return {
    L: config.lightness,
    a: config.chroma * Math.cos(rad),
    b: config.chroma * Math.sin(rad),
  }
}

/** hueStep을 조정하여 ΔE00 ≥ threshold 달성 */
function adjustHueStep(config: ColorEncoderConfig): number {
  // 릿지가 적으면 큰 각도, 많으면 황금각
  if (config.ridgeCount <= 5) return 72 // 360/5
  if (config.ridgeCount <= 10) return 36
  if (config.ridgeCount <= 20) return 18
  return config.hueStep
}

/** 인접 릿지 간 ΔE00 부족 시 밝기 교대 적용 */
function applyLightnessAlternation(
  colors: LabColor[],
  minDelta: number,
  threshold: number
): LabColor[] {
  if (minDelta >= threshold) return colors

  return colors.map((c, i) => ({
    ...c,
    L: c.L + (i % 2 === 0 ? 8 : -8), // ±8 교대
  }))
}

// ── 공개 API ─────────────────────────────────────────────────

/** 릿지별 색상 인코딩 (ΔE00 ≥ 5 보장) */
export function encodeRidgeColors(
  config: Partial<ColorEncoderConfig> & { ridgeCount: number; hueSeed: number }
): ColorEncodeResult {
  const fullConfig: ColorEncoderConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    hueStep:
      config.hueStep ??
      adjustHueStep({
        ...DEFAULT_CONFIG,
        ridgeCount: config.ridgeCount,
        hueSeed: config.hueSeed,
      }),
  }

  // 1단계: 기본 색상 생성
  let labColors = Array.from({ length: fullConfig.ridgeCount }, (_, i) =>
    generateRidgeLabColor(i, fullConfig)
  )

  // 2단계: ΔE00 계산 + 부족 시 밝기 교대
  let minDelta = Infinity
  for (let i = 1; i < labColors.length; i++) {
    const d = deltaE00(labColors[i - 1], labColors[i])
    minDelta = Math.min(minDelta, d)
  }

  if (minDelta < fullConfig.minAdjacentDeltaE00) {
    labColors = applyLightnessAlternation(labColors, minDelta, fullConfig.minAdjacentDeltaE00)
  }

  // 3단계: 최종 색상 + ΔE00 결과
  const ridgeColors: RidgeColor[] = []
  let finalMin = Infinity
  let finalMax = -Infinity

  for (let i = 0; i < labColors.length; i++) {
    const lab = labColors[i]
    const rgb = labToRgb(lab)
    const oklch = labToOklch(lab)
    const hex = rgbToHex(rgb)

    let delta: number | null = null
    if (i > 0) {
      delta = deltaE00(labColors[i - 1], lab)
      finalMin = Math.min(finalMin, delta)
      finalMax = Math.max(finalMax, delta)
    }

    ridgeColors.push({
      ridgeIndex: i,
      hex,
      oklch,
      lab,
      deltaE00ToPrev: delta,
    })
  }

  if (labColors.length <= 1) {
    finalMin = 0
    finalMax = 0
  }

  return {
    colors: ridgeColors,
    minDeltaE00: finalMin === Infinity ? 0 : finalMin,
    maxDeltaE00: finalMax === -Infinity ? 0 : finalMax,
    valid: labColors.length <= 1 || finalMin >= fullConfig.minAdjacentDeltaE00,
  }
}

/** 색상 배열에서 최소 ΔE00 계산 */
export function findMinAdjacentDeltaE00(labs: LabColor[]): number {
  if (labs.length <= 1) return Infinity
  let min = Infinity
  for (let i = 1; i < labs.length; i++) {
    min = Math.min(min, deltaE00(labs[i - 1], labs[i]))
  }
  return min
}
