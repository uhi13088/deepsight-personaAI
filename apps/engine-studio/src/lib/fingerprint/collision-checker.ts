// ═══════════════════════════════════════════════════════════════
// 충돌 검사기 — pHash / SSIM / 커브 / 히스토그램
// T63-AC5: 4 메트릭 기반 충돌 탐지
// ═══════════════════════════════════════════════════════════════

import type { RidgeTopology } from "./ridge-generator"
import type { RidgeColor } from "./color-encoder"

// ── 타입 ─────────────────────────────────────────────────────

export interface CollisionThresholds {
  pHashHammingMin: number // 기본 8
  ssimMax: number // 기본 0.85
  curveDistanceMin: number // 기본 0.15
  colorHistogramMax: number // 기본 0.7
}

export interface CollisionCheckResult {
  pHashHamming: number
  ssim: number
  curveDistance: number
  colorHistogramIntersection: number
  isCollision: boolean
  failedMetrics: string[]
}

export interface FingerprintSignature {
  pHash: string // 64-bit hex
  curveSummary: number[] // 특징 벡터
  colorHistogram: number[] // 색상 히스토그램 (12 bins)
}

// ── 기본 임계값 ──────────────────────────────────────────────

export const DEFAULT_THRESHOLDS: CollisionThresholds = {
  pHashHammingMin: 8,
  ssimMax: 0.85,
  curveDistanceMin: 0.15,
  colorHistogramMax: 0.7,
}

// ── pHash (Perceptual Hash) ──────────────────────────────────

/** 릿지 토폴로지 → 간소화 pHash (64-bit) */
export function computePHash(topology: RidgeTopology, canvasSize: number = 512): string {
  // 8x8 그리드 특성 추출
  const grid = new Array(64).fill(0)
  const cellSize = canvasSize / 8

  for (const ridge of topology.ridges) {
    for (const pt of ridge.pathPoints) {
      const gx = Math.min(7, Math.floor(pt.x / cellSize))
      const gy = Math.min(7, Math.floor(pt.y / cellSize))
      if (gx >= 0 && gy >= 0) {
        grid[gy * 8 + gx]++
      }
    }
  }

  // 중앙값 기준 이진화
  const sorted = [...grid].sort((a, b) => a - b)
  const median = sorted[32]

  let hash = ""
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0
    for (let j = 0; j < 4 && i + j < 64; j++) {
      if (grid[i + j] > median) {
        nibble |= 1 << j
      }
    }
    hash += nibble.toString(16)
  }

  return hash.padEnd(16, "0")
}

/** 해밍 거리 (두 hex 문자열 간) */
export function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0
  const len = Math.max(hash1.length, hash2.length)

  for (let i = 0; i < len; i++) {
    const a = parseInt(hash1[i] ?? "0", 16)
    const b = parseInt(hash2[i] ?? "0", 16)
    let xor = a ^ b
    while (xor) {
      distance += xor & 1
      xor >>= 1
    }
  }

  return distance
}

// ── SSIM (Structural Similarity) ─────────────────────────────

/** 간소화 SSIM: 릿지 분포 기반 */
export function computeSSIM(
  topo1: RidgeTopology,
  topo2: RidgeTopology,
  canvasSize: number = 512
): number {
  const grid1 = topologyToGrid(topo1, canvasSize, 16)
  const grid2 = topologyToGrid(topo2, canvasSize, 16)

  const n = grid1.length
  const mean1 = grid1.reduce((s, v) => s + v, 0) / n
  const mean2 = grid2.reduce((s, v) => s + v, 0) / n

  let var1 = 0,
    var2 = 0,
    cov = 0
  for (let i = 0; i < n; i++) {
    const d1 = grid1[i] - mean1
    const d2 = grid2[i] - mean2
    var1 += d1 * d1
    var2 += d2 * d2
    cov += d1 * d2
  }
  var1 /= n
  var2 /= n
  cov /= n

  // SSIM constants
  const c1 = 0.01 * 0.01 * 255 * 255
  const c2 = 0.03 * 0.03 * 255 * 255

  const num = (2 * mean1 * mean2 + c1) * (2 * cov + c2)
  const den = (mean1 * mean1 + mean2 * mean2 + c1) * (var1 + var2 + c2)

  return den === 0 ? 1 : num / den
}

function topologyToGrid(topo: RidgeTopology, canvasSize: number, gridSize: number): number[] {
  const grid = new Array(gridSize * gridSize).fill(0)
  const cellSize = canvasSize / gridSize

  for (const ridge of topo.ridges) {
    for (const pt of ridge.pathPoints) {
      const gx = Math.min(gridSize - 1, Math.max(0, Math.floor(pt.x / cellSize)))
      const gy = Math.min(gridSize - 1, Math.max(0, Math.floor(pt.y / cellSize)))
      grid[gy * gridSize + gx]++
    }
  }
  return grid
}

// ── 커브 거리 ────────────────────────────────────────────────

/** 릿지 곡률 특성 벡터 */
export function computeCurveSummary(topology: RidgeTopology): number[] {
  // 각 릿지의 frequency, amplitude, phase → 평균
  const summary: number[] = []
  const step = Math.max(1, Math.floor(topology.ridges.length / 10))

  for (let i = 0; i < topology.ridges.length; i += step) {
    const r = topology.ridges[i]
    summary.push(
      r.curvature.frequency / 10,
      r.curvature.amplitude / 20,
      r.curvature.phase / (Math.PI * 2)
    )
  }

  return summary
}

/** 두 커브 요약 간 유클리드 정규화 거리 */
export function curveDistance(summary1: number[], summary2: number[]): number {
  const len = Math.min(summary1.length, summary2.length)
  if (len === 0) return 1

  let sumSq = 0
  for (let i = 0; i < len; i++) {
    const d = summary1[i] - summary2[i]
    sumSq += d * d
  }

  return Math.sqrt(sumSq / len)
}

// ── 색상 히스토그램 ──────────────────────────────────────────

/** 색상을 12-bin 히스토그램으로 변환 */
export function computeColorHistogram(colors: RidgeColor[]): number[] {
  const bins = new Array(12).fill(0) // 30도 간격
  const total = colors.length || 1

  for (const c of colors) {
    const hue = c.oklch.h
    const bin = Math.min(11, Math.floor(hue / 30))
    bins[bin]++
  }

  // 정규화
  return bins.map((v) => v / total)
}

/** 히스토그램 교차 (intersection) */
export function histogramIntersection(hist1: number[], hist2: number[]): number {
  let intersection = 0
  const len = Math.min(hist1.length, hist2.length)

  for (let i = 0; i < len; i++) {
    intersection += Math.min(hist1[i], hist2[i])
  }

  return intersection
}

// ── 통합 충돌 검사 ──────────────────────────────────────────

/** 지문 서명 생성 */
export function createSignature(
  topology: RidgeTopology,
  colors: RidgeColor[],
  canvasSize: number = 512
): FingerprintSignature {
  return {
    pHash: computePHash(topology, canvasSize),
    curveSummary: computeCurveSummary(topology),
    colorHistogram: computeColorHistogram(colors),
  }
}

/** 두 서명 간 충돌 검사 */
export function checkCollision(
  sig1: FingerprintSignature,
  sig2: FingerprintSignature,
  topo1: RidgeTopology,
  topo2: RidgeTopology,
  thresholds: CollisionThresholds = DEFAULT_THRESHOLDS
): CollisionCheckResult {
  const pHashHamming = hammingDistance(sig1.pHash, sig2.pHash)
  const ssim = computeSSIM(topo1, topo2)
  const cDistance = curveDistance(sig1.curveSummary, sig2.curveSummary)
  const histIntersection = histogramIntersection(sig1.colorHistogram, sig2.colorHistogram)

  const failedMetrics: string[] = []
  if (pHashHamming < thresholds.pHashHammingMin) failedMetrics.push("pHash")
  if (ssim > thresholds.ssimMax) failedMetrics.push("ssim")
  if (cDistance < thresholds.curveDistanceMin) failedMetrics.push("curveDistance")
  if (histIntersection > thresholds.colorHistogramMax) failedMetrics.push("colorHistogram")

  return {
    pHashHamming,
    ssim,
    curveDistance: cDistance,
    colorHistogramIntersection: histIntersection,
    isCollision: failedMetrics.length > 0,
    failedMetrics,
  }
}

/** 기존 서명 풀에서 충돌 여부 확인 */
export function checkAgainstPool(
  newSig: FingerprintSignature,
  newTopo: RidgeTopology,
  existingSignatures: Array<{ signature: FingerprintSignature; topology: RidgeTopology }>,
  thresholds: CollisionThresholds = DEFAULT_THRESHOLDS
): { hasCollision: boolean; collisionIndex: number; result: CollisionCheckResult | null } {
  for (let i = 0; i < existingSignatures.length; i++) {
    const existing = existingSignatures[i]
    const result = checkCollision(
      newSig,
      existing.signature,
      newTopo,
      existing.topology,
      thresholds
    )
    if (result.isCollision) {
      return { hasCollision: true, collisionIndex: i, result }
    }
  }
  return { hasCollision: false, collisionIndex: -1, result: null }
}
