// ═══════════════════════════════════════════════════════════════
// 정규 SVG 렌더러 — Canonical SVG 출력
// T63-AC6: 효과 없음, 메타데이터 내장, 스캐너 호환
// ═══════════════════════════════════════════════════════════════

import type { RidgeTopology } from "./ridge-generator"
import type { RidgeColor } from "./color-encoder"

// ── 타입 ─────────────────────────────────────────────────────

export interface SvgRenderConfig {
  canvasSize: number // 기본 512
  backgroundColor: string // 기본 "#ffffff"
  strokeLinecap: "round" | "butt" | "square"
  strokeLinejoin: "round" | "bevel" | "miter"
  includeMetadata: boolean
}

export interface SvgMetadata {
  profileId: string
  personaId: string
  schemaVersion: string
  patternType: string
  ridgeCount: number
  createdAt: string
}

export interface SvgRenderResult {
  svg: string
  width: number
  height: number
  ridgeCount: number
}

// ── 기본 설정 ────────────────────────────────────────────────

const DEFAULT_SVG_CONFIG: SvgRenderConfig = {
  canvasSize: 512,
  backgroundColor: "#ffffff",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  includeMetadata: true,
}

// ── 경로 생성 ────────────────────────────────────────────────

/** 포인트 배열 → SVG path d 문자열 (cubic bezier) */
function pointsToPathD(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ""

  const parts: string[] = [`M ${round(points[0].x)} ${round(points[0].y)}`]

  if (points.length === 2) {
    parts.push(`L ${round(points[1].x)} ${round(points[1].y)}`)
    return parts.join(" ")
  }

  // Catmull-Rom → Cubic Bezier 변환
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Catmull-Rom control points → Bezier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    parts.push(
      `C ${round(cp1x)} ${round(cp1y)}, ${round(cp2x)} ${round(cp2y)}, ${round(p2.x)} ${round(p2.y)}`
    )
  }

  return parts.join(" ")
}

function round(n: number): string {
  return n.toFixed(2)
}

// ── 메타데이터 XML ──────────────────────────────────────────

function renderMetadata(meta: SvgMetadata): string {
  return `  <metadata>
    <deepsight:fingerprint xmlns:deepsight="https://deepsight.ai/fingerprint/v1">
      <deepsight:profileId>${escapeXml(meta.profileId)}</deepsight:profileId>
      <deepsight:personaId>${escapeXml(meta.personaId)}</deepsight:personaId>
      <deepsight:schemaVersion>${escapeXml(meta.schemaVersion)}</deepsight:schemaVersion>
      <deepsight:patternType>${escapeXml(meta.patternType)}</deepsight:patternType>
      <deepsight:ridgeCount>${meta.ridgeCount}</deepsight:ridgeCount>
      <deepsight:createdAt>${escapeXml(meta.createdAt)}</deepsight:createdAt>
    </deepsight:fingerprint>
  </metadata>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// ── 공개 API ─────────────────────────────────────────────────

/** 정규(canonical) SVG 렌더링 — 효과 없음, 스캐너 호환 */
export function renderCanonicalSvg(
  topology: RidgeTopology,
  colors: RidgeColor[],
  metadata?: SvgMetadata,
  config?: Partial<SvgRenderConfig>
): SvgRenderResult {
  const cfg = { ...DEFAULT_SVG_CONFIG, ...config }
  const size = cfg.canvasSize

  // 색상 매핑 (릿지 인덱스 → 색상)
  const colorMap = new Map<number, string>()
  for (const c of colors) {
    colorMap.set(c.ridgeIndex, c.hex)
  }

  // SVG 구성
  const lines: string[] = []
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
  )

  // 메타데이터
  if (cfg.includeMetadata && metadata) {
    lines.push(renderMetadata(metadata))
  }

  // 배경
  lines.push(`  <rect width="${size}" height="${size}" fill="${cfg.backgroundColor}" />`)

  // 릿지 그룹
  lines.push(
    `  <g id="ridges" fill="none" stroke-linecap="${cfg.strokeLinecap}" stroke-linejoin="${cfg.strokeLinejoin}">`
  )

  for (const ridge of topology.ridges) {
    const pathD = pointsToPathD(ridge.pathPoints)
    if (!pathD) continue

    const color = colorMap.get(ridge.index) ?? "#000000"
    lines.push(`    <path d="${pathD}" stroke="${color}" stroke-width="${ridge.width}" />`)
  }

  lines.push(`  </g>`)

  // 코어/델타 마커 (작은 원)
  lines.push(`  <g id="landmarks" fill="none" stroke="#333333" stroke-width="1" opacity="0.3">`)
  lines.push(
    `    <circle cx="${round(topology.core.x * size)}" cy="${round(topology.core.y * size)}" r="3" />`
  )
  for (const delta of topology.deltas) {
    lines.push(
      `    <rect x="${round(delta.x * size - 2)}" y="${round(delta.y * size - 2)}" width="4" height="4" />`
    )
  }
  lines.push(`  </g>`)

  lines.push(`</svg>`)

  return {
    svg: lines.join("\n"),
    width: size,
    height: size,
    ridgeCount: topology.ridges.length,
  }
}

/** SVG에서 릿지 수 추출 (검증용) */
export function countRidgesInSvg(svg: string): number {
  const matches = svg.match(/<path /g)
  return matches ? matches.length : 0
}

/** SVG 유효성 간단 검증 */
export function validateSvg(svg: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!svg.includes("<?xml")) errors.push("XML 선언 없음")
  if (!svg.includes("<svg")) errors.push("SVG 태그 없음")
  if (!svg.includes("</svg>")) errors.push("SVG 닫기 태그 없음")
  if (!svg.includes('id="ridges"')) errors.push("릿지 그룹 없음")
  if (svg.includes("filter=") || svg.includes("<filter"))
    errors.push("효과(filter) 포함됨 — canonical 위반")
  if (svg.includes("blur") || svg.includes("glow") || svg.includes("shadow")) {
    errors.push("시각 효과 포함됨 — canonical 위반")
  }

  return { valid: errors.length === 0, errors }
}
