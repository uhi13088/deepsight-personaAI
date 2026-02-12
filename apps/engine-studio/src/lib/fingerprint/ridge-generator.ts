// ═══════════════════════════════════════════════════════════════
// 릿지 생성기 — 패턴/코어/델타/곡률
// T63-AC3: L1 dominant axis → 7 패턴, 결정적 생성
// ═══════════════════════════════════════════════════════════════

// ── 타입 ─────────────────────────────────────────────────────

/** L1 소셜 페르소나 벡터 (7D) */
export interface L1Vector {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
  sociability: number
}

/** 지문 패턴 타입 — L1 dominant axis 결정적 매핑 */
export type PatternType =
  | "plain_whorl"
  | "tented_arch"
  | "double_loop_whorl"
  | "central_pocket_whorl"
  | "radial_loop"
  | "ulnar_loop"
  | "plain_arch"

/** 코어/델타 좌표 (0~1 정규화) */
export interface CoreDeltaPoint {
  x: number
  y: number
}

/** 릿지 곡률 파라미터 */
export interface RidgeCurvature {
  frequency: number // 곡률 빈도
  amplitude: number // 곡률 진폭
  phase: number // 위상 오프셋
}

/** 릿지 데이터 */
export interface Ridge {
  index: number // 0부터 증가 (center → outward)
  pathPoints: Array<{ x: number; y: number }> // SVG path 좌표
  curvature: RidgeCurvature
  width: number // px
}

/** 릿지 토폴로지 전체 */
export interface RidgeTopology {
  patternType: PatternType
  core: CoreDeltaPoint
  deltas: CoreDeltaPoint[] // 1~2개
  ridgeCount: number
  ridges: Ridge[]
  lineWidthPx: number
  lineSpacingPx: number
}

export interface RidgeGeneratorConfig {
  l1Vector: L1Vector
  ridgeCount: number // 40~800
  lineWidthPx: number // 3~24 (권장 6~10)
  lineSpacingPx: number // 3~32 (권장 6~12)
  seedHex: string // 시드의 관련 청크 (hex)
  canvasSize: number // 기본 512
}

// ── L1 Axis → 패턴 매핑 ─────────────────────────────────────

const L1_AXIS_ORDER: (keyof L1Vector)[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]

const AXIS_TO_PATTERN: Record<keyof L1Vector, PatternType> = {
  depth: "plain_whorl",
  lens: "tented_arch",
  stance: "double_loop_whorl",
  scope: "central_pocket_whorl",
  taste: "radial_loop",
  purpose: "ulnar_loop",
  sociability: "plain_arch",
}

/** L1 dominant axis 결정 (tie: smallest index wins) */
export function determineDominantAxis(l1: L1Vector): keyof L1Vector {
  let maxVal = -Infinity
  let dominant: keyof L1Vector = "depth"

  for (const axis of L1_AXIS_ORDER) {
    if (l1[axis] > maxVal) {
      maxVal = l1[axis]
      dominant = axis
    }
  }

  return dominant
}

/** L1 → 패턴 타입 결정 */
export function determinePatternType(l1: L1Vector): PatternType {
  return AXIS_TO_PATTERN[determineDominantAxis(l1)]
}

// ── 시드 → 파라미터 추출 ────────────────────────────────────

function hexToNorm(hex: string, start: number, len: number): number {
  const chunk = hex.slice(start, start + len)
  return parseInt(chunk, 16) / (Math.pow(16, len) - 1)
}

/** seed[0:8] → 코어/델타 좌표 */
export function extractCoreDeltas(
  seedHex: string,
  patternType: PatternType
): { core: CoreDeltaPoint; deltas: CoreDeltaPoint[] } {
  // 코어: seed[0:4] → x, seed[4:8] → y (중심 근처로 제한)
  const cx = 0.3 + hexToNorm(seedHex, 0, 4) * 0.4 // 0.3~0.7
  const cy = 0.3 + hexToNorm(seedHex, 4, 4) * 0.4

  const core: CoreDeltaPoint = { x: cx, y: cy }

  // 델타: 패턴에 따라 1~2개
  const deltas: CoreDeltaPoint[] = []
  const d1x = hexToNorm(seedHex, 8, 4)
  const d1y = hexToNorm(seedHex, 12, 4)
  deltas.push({ x: d1x, y: d1y })

  // double_loop_whorl은 2번째 델타 필요
  if (patternType === "double_loop_whorl") {
    const d2x = hexToNorm(seedHex, 16, 4)
    const d2y = hexToNorm(seedHex, 20, 4)
    deltas.push({ x: d2x, y: d2y })
  }

  return { core, deltas }
}

// ── 릿지 경로 생성 ──────────────────────────────────────────

/** 패턴별 릿지 포인트 생성 함수 */
function generateRidgePoints(
  ridgeIndex: number,
  total: number,
  pattern: PatternType,
  core: CoreDeltaPoint,
  curvature: RidgeCurvature,
  canvasSize: number,
  lineSpacing: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const cx = core.x * canvasSize
  const cy = core.y * canvasSize
  const radius = (ridgeIndex + 1) * lineSpacing
  const segments = Math.max(24, Math.min(64, Math.round(radius * 0.5)))

  switch (pattern) {
    case "plain_whorl": {
      // 나선형
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2
        const r = radius + curvature.amplitude * Math.sin(curvature.frequency * t + curvature.phase)
        points.push({
          x: cx + r * Math.cos(t),
          y: cy + r * Math.sin(t),
        })
      }
      break
    }
    case "tented_arch": {
      // 첨형 아치
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI - Math.PI / 2
        const r = radius
        const peak = curvature.amplitude * Math.exp(-Math.pow(t, 2) * 2)
        points.push({
          x: cx + r * Math.cos(t) * 1.5,
          y: cy + r * Math.sin(t) - peak * (1 + ridgeIndex * 0.3),
        })
      }
      break
    }
    case "double_loop_whorl": {
      // 이중 루프
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2
        const offset = curvature.amplitude * Math.sin(2 * t + curvature.phase)
        const r = radius + offset
        points.push({
          x: cx + r * Math.cos(t),
          y: cy + r * Math.sin(t) + offset * 0.5,
        })
      }
      break
    }
    case "central_pocket_whorl": {
      // 중심 포켓
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2
        const squeeze = 1 - 0.3 * Math.exp(-ridgeIndex * 0.1)
        const r = radius * squeeze + curvature.amplitude * Math.sin(curvature.frequency * t)
        points.push({
          x: cx + r * Math.cos(t),
          y: cy + r * Math.sin(t) * 0.8,
        })
      }
      break
    }
    case "radial_loop": {
      // 방사형 루프
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI - Math.PI / 2
        const r = radius
        const wave = curvature.amplitude * Math.sin(curvature.frequency * t)
        points.push({
          x: cx + r * Math.cos(t) + wave,
          y: cy + r * Math.sin(t),
        })
      }
      break
    }
    case "ulnar_loop": {
      // 척골측 루프
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI - Math.PI / 2
        const r = radius
        const wave = curvature.amplitude * Math.sin(curvature.frequency * t + Math.PI)
        points.push({
          x: cx + r * Math.cos(t) - wave,
          y: cy + r * Math.sin(t),
        })
      }
      break
    }
    case "plain_arch": {
      // 평면 아치
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * 2 - 1 // -1 ~ 1
        const archHeight = radius * 0.6 * (1 - t * t)
        const wave = curvature.amplitude * Math.sin(curvature.frequency * t * Math.PI)
        points.push({
          x: cx + t * radius * 1.8,
          y: cy - archHeight - wave,
        })
      }
      break
    }
  }

  return points
}

// ── 공개 API ─────────────────────────────────────────────────

const DEFAULT_RIDGE_CONFIG: Omit<RidgeGeneratorConfig, "l1Vector" | "seedHex"> = {
  ridgeCount: 60,
  lineWidthPx: 6,
  lineSpacingPx: 8,
  canvasSize: 512,
}

/** 릿지 토폴로지 전체 생성 */
export function generateRidgeTopology(
  config: Partial<RidgeGeneratorConfig> & { l1Vector: L1Vector; seedHex: string }
): RidgeTopology {
  const full: RidgeGeneratorConfig = { ...DEFAULT_RIDGE_CONFIG, ...config }
  const patternType = determinePatternType(full.l1Vector)

  // 코어/델타 추출
  const { core, deltas } = extractCoreDeltas(full.seedHex, patternType)

  // 릿지 곡률 파라미터 (seed[8:16])
  const baseCurvature: RidgeCurvature = {
    frequency: 2 + hexToNorm(full.seedHex, 16, 4) * 6, // 2~8
    amplitude: 2 + hexToNorm(full.seedHex, 20, 4) * 10, // 2~12
    phase: hexToNorm(full.seedHex, 24, 4) * Math.PI * 2,
  }

  // 릿지 생성 (center → outward)
  const ridges: Ridge[] = []
  for (let i = 0; i < full.ridgeCount; i++) {
    const curvature: RidgeCurvature = {
      frequency: baseCurvature.frequency + (i % 3) * 0.5,
      amplitude: baseCurvature.amplitude * (1 + i * 0.02),
      phase: baseCurvature.phase + i * 0.1,
    }

    const pathPoints = generateRidgePoints(
      i,
      full.ridgeCount,
      patternType,
      core,
      curvature,
      full.canvasSize,
      full.lineSpacingPx
    )

    ridges.push({
      index: i,
      pathPoints,
      curvature,
      width: full.lineWidthPx,
    })
  }

  return {
    patternType,
    core,
    deltas,
    ridgeCount: full.ridgeCount,
    ridges,
    lineWidthPx: full.lineWidthPx,
    lineSpacingPx: full.lineSpacingPx,
  }
}

/** 릿지 인덱스가 단조 증가인지 검증 */
export function validateRidgeIndices(ridges: Ridge[]): boolean {
  for (let i = 1; i < ridges.length; i++) {
    if (ridges[i].index <= ridges[i - 1].index) return false
  }
  return true
}

/** 릿지 자기 교차 없는지 간단 검증 (인접 세그먼트 교차) */
export function validateNoSelfIntersection(points: Array<{ x: number; y: number }>): boolean {
  if (points.length < 4) return true

  for (let i = 0; i < points.length - 3; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      if (i === 0 && j === points.length - 2) continue // 닫힌 경로 허용
      if (segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) {
        return false
      }
    }
  }
  return true
}

function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  return false
}

function direction(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)
}

/** 릿지 카운트 범위 검증 (40~800) */
export function validateRidgeCount(count: number): boolean {
  return count >= 40 && count <= 800
}
