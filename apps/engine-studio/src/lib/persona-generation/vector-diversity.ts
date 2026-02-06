/**
 * 6D 벡터 자동 배정 (다양성 기반)
 *
 * 기존 페르소나 풀을 분석하여 다양성을 최대화하는 벡터를 자동 배정합니다.
 */

import { prisma } from "@/lib/prisma"

export interface Vector6D {
  depth: number // 분석 깊이: 직관적(0.0) ↔ 심층적(1.0)
  lens: number // 판단 렌즈: 감성적(0.0) ↔ 논리적(1.0)
  stance: number // 평가 태도: 수용적(0.0) ↔ 비판적(1.0)
  scope: number // 관심 범위: 핵심만(0.0) ↔ 디테일(1.0)
  taste: number // 취향 성향: 클래식(0.0) ↔ 실험적(1.0)
  purpose: number // 소비 목적: 오락(0.0) ↔ 의미추구(1.0)
}

// 벡터 공간을 격자로 나누어 분포 분석
const GRID_DIVISIONS = 5 // 각 차원을 5개 구간으로 나눔

interface GridCell {
  coordinates: number[] // 6차원 좌표
  count: number // 해당 셀의 페르소나 수
  center: Vector6D // 셀 중심점
}

interface DiversityAnalysis {
  existingVectors: Vector6D[]
  distribution: Map<string, number> // 격자 셀별 페르소나 수
  emptyCells: GridCell[] // 비어있는 셀
  underrepresentedCells: GridCell[] // 적은 페르소나가 있는 셀
  totalPersonas: number
  coverageScore: number // 전체 커버리지 점수 (0-100)
}

/**
 * 기존 페르소나 풀의 다양성을 분석
 */
export async function analyzeDiversity(): Promise<DiversityAnalysis> {
  // 기존 활성 페르소나의 벡터 조회
  const vectors = await prisma.personaVector.findMany({
    where: {
      persona: {
        status: { in: ["ACTIVE", "STANDARD"] },
      },
    },
    select: {
      depth: true,
      lens: true,
      stance: true,
      scope: true,
      taste: true,
      purpose: true,
    },
  })

  const existingVectors: Vector6D[] = vectors.map((v) => ({
    depth: Number(v.depth),
    lens: Number(v.lens),
    stance: Number(v.stance),
    scope: Number(v.scope),
    taste: Number(v.taste),
    purpose: Number(v.purpose),
  }))

  // 격자 분포 계산
  const distribution = new Map<string, number>()
  const cellSize = 1 / GRID_DIVISIONS

  for (const vector of existingVectors) {
    const cellKey = getCellKey(vector)
    distribution.set(cellKey, (distribution.get(cellKey) || 0) + 1)
  }

  // 빈 셀과 부족한 셀 찾기
  const emptyCells: GridCell[] = []
  const underrepresentedCells: GridCell[] = []
  const avgCount = existingVectors.length / Math.pow(GRID_DIVISIONS, 6)

  // 모든 가능한 셀을 순회 (최적화를 위해 랜덤 샘플링)
  const sampledCells = sampleGridCells(1000) // 1000개 샘플

  for (const cell of sampledCells) {
    const cellKey = getCellKeyFromCoords(cell.coordinates)
    const count = distribution.get(cellKey) || 0

    if (count === 0) {
      emptyCells.push({
        coordinates: cell.coordinates,
        count: 0,
        center: getCellCenter(cell.coordinates),
      })
    } else if (count < avgCount * 0.5) {
      underrepresentedCells.push({
        coordinates: cell.coordinates,
        count,
        center: getCellCenter(cell.coordinates),
      })
    }
  }

  // 커버리지 점수 계산
  const totalCells = Math.pow(GRID_DIVISIONS, 6)
  const occupiedCells = distribution.size
  const coverageScore = Math.min(100, (occupiedCells / totalCells) * 100 * 10) // 스케일 조정

  return {
    existingVectors,
    distribution,
    emptyCells,
    underrepresentedCells,
    totalPersonas: existingVectors.length,
    coverageScore,
  }
}

/**
 * 다양성을 최대화하는 벡터를 자동 배정
 */
export async function assignVectorForDiversity(
  options: {
    preferredRegion?: Partial<Vector6D> // 선호 범위 (있으면 그 근처에서)
    avoidSimilar?: boolean // 유사한 벡터 회피
  } = {}
): Promise<Vector6D> {
  const analysis = await analyzeDiversity()

  // 1. 빈 셀이 있으면 우선 선택
  if (analysis.emptyCells.length > 0) {
    const selectedCell = selectBestEmptyCell(analysis.emptyCells, options.preferredRegion)
    return addNoise(selectedCell.center)
  }

  // 2. 부족한 셀에서 선택
  if (analysis.underrepresentedCells.length > 0) {
    const selectedCell = selectBestEmptyCell(
      analysis.underrepresentedCells,
      options.preferredRegion
    )
    return addNoise(selectedCell.center)
  }

  // 3. 기존 벡터와 최대 거리를 갖는 벡터 생성
  return generateMaxDistanceVector(analysis.existingVectors, options.preferredRegion)
}

/**
 * 목표 분포에 맞는 벡터 배치 생성
 */
export function generateTargetDistribution(count: number): Vector6D[] {
  const vectors: Vector6D[] = []

  // 다양한 아키타입 조합 생성
  const archetypes = [
    // 감성적 수용자
    { depth: 0.3, lens: 0.2, stance: 0.2, scope: 0.4, taste: 0.3, purpose: 0.6 },
    // 논리적 비평가
    { depth: 0.8, lens: 0.9, stance: 0.8, scope: 0.7, taste: 0.5, purpose: 0.7 },
    // 캐주얼 엔터테이너
    { depth: 0.2, lens: 0.4, stance: 0.3, scope: 0.3, taste: 0.6, purpose: 0.2 },
    // 전문 분석가
    { depth: 0.9, lens: 0.8, stance: 0.6, scope: 0.9, taste: 0.4, purpose: 0.8 },
    // 실험적 탐험가
    { depth: 0.5, lens: 0.5, stance: 0.4, scope: 0.5, taste: 0.9, purpose: 0.5 },
    // 클래식 감상가
    { depth: 0.6, lens: 0.3, stance: 0.3, scope: 0.6, taste: 0.1, purpose: 0.7 },
    // 따뜻한 친구
    { depth: 0.3, lens: 0.2, stance: 0.1, scope: 0.4, taste: 0.5, purpose: 0.4 },
    // 날카로운 독설가
    { depth: 0.7, lens: 0.8, stance: 0.9, scope: 0.6, taste: 0.4, purpose: 0.6 },
  ]

  // 각 아키타입을 기반으로 변형 생성
  for (let i = 0; i < count; i++) {
    const baseArchetype = archetypes[i % archetypes.length]
    vectors.push(addNoise(baseArchetype, 0.15))
  }

  return vectors
}

// ============================================
// Helper Functions
// ============================================

function getCellKey(vector: Vector6D): string {
  const coords = [
    Math.floor(vector.depth * GRID_DIVISIONS),
    Math.floor(vector.lens * GRID_DIVISIONS),
    Math.floor(vector.stance * GRID_DIVISIONS),
    Math.floor(vector.scope * GRID_DIVISIONS),
    Math.floor(vector.taste * GRID_DIVISIONS),
    Math.floor(vector.purpose * GRID_DIVISIONS),
  ].map((c) => Math.min(c, GRID_DIVISIONS - 1))

  return coords.join("-")
}

function getCellKeyFromCoords(coords: number[]): string {
  return coords.join("-")
}

function getCellCenter(coords: number[]): Vector6D {
  const cellSize = 1 / GRID_DIVISIONS
  return {
    depth: (coords[0] + 0.5) * cellSize,
    lens: (coords[1] + 0.5) * cellSize,
    stance: (coords[2] + 0.5) * cellSize,
    scope: (coords[3] + 0.5) * cellSize,
    taste: (coords[4] + 0.5) * cellSize,
    purpose: (coords[5] + 0.5) * cellSize,
  }
}

function sampleGridCells(count: number): { coordinates: number[] }[] {
  const cells: { coordinates: number[] }[] = []

  for (let i = 0; i < count; i++) {
    cells.push({
      coordinates: [
        Math.floor(Math.random() * GRID_DIVISIONS),
        Math.floor(Math.random() * GRID_DIVISIONS),
        Math.floor(Math.random() * GRID_DIVISIONS),
        Math.floor(Math.random() * GRID_DIVISIONS),
        Math.floor(Math.random() * GRID_DIVISIONS),
        Math.floor(Math.random() * GRID_DIVISIONS),
      ],
    })
  }

  return cells
}

function selectBestEmptyCell(cells: GridCell[], preferredRegion?: Partial<Vector6D>): GridCell {
  if (!preferredRegion || cells.length === 0) {
    // 랜덤 선택
    return cells[Math.floor(Math.random() * cells.length)]
  }

  // 선호 범위와 가장 가까운 셀 선택
  let bestCell = cells[0]
  let minDistance = Infinity

  for (const cell of cells) {
    const distance = calculateDistance(cell.center, preferredRegion as Vector6D)
    if (distance < minDistance) {
      minDistance = distance
      bestCell = cell
    }
  }

  return bestCell
}

function generateMaxDistanceVector(
  existingVectors: Vector6D[],
  preferredRegion?: Partial<Vector6D>
): Vector6D {
  if (existingVectors.length === 0) {
    // 기존 벡터가 없으면 중앙에서 시작
    return {
      depth: 0.5 + (Math.random() - 0.5) * 0.3,
      lens: 0.5 + (Math.random() - 0.5) * 0.3,
      stance: 0.5 + (Math.random() - 0.5) * 0.3,
      scope: 0.5 + (Math.random() - 0.5) * 0.3,
      taste: 0.5 + (Math.random() - 0.5) * 0.3,
      purpose: 0.5 + (Math.random() - 0.5) * 0.3,
    }
  }

  // 기존 벡터와 최대 거리를 갖는 후보 생성
  let bestCandidate: Vector6D | null = null
  let maxMinDistance = -1

  for (let i = 0; i < 100; i++) {
    const candidate: Vector6D = {
      depth: Math.random(),
      lens: Math.random(),
      stance: Math.random(),
      scope: Math.random(),
      taste: Math.random(),
      purpose: Math.random(),
    }

    // 모든 기존 벡터와의 최소 거리 계산
    let minDistance = Infinity
    for (const existing of existingVectors) {
      const distance = calculateDistance(candidate, existing)
      minDistance = Math.min(minDistance, distance)
    }

    if (minDistance > maxMinDistance) {
      maxMinDistance = minDistance
      bestCandidate = candidate
    }
  }

  return (
    bestCandidate || {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
    }
  )
}

function calculateDistance(v1: Vector6D, v2: Partial<Vector6D>): number {
  const dims: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]
  let sum = 0

  for (const dim of dims) {
    if (v2[dim] !== undefined) {
      sum += Math.pow(v1[dim] - (v2[dim] as number), 2)
    }
  }

  return Math.sqrt(sum)
}

function addNoise(vector: Vector6D, magnitude: number = 0.1): Vector6D {
  return {
    depth: clamp(vector.depth + (Math.random() - 0.5) * magnitude * 2),
    lens: clamp(vector.lens + (Math.random() - 0.5) * magnitude * 2),
    stance: clamp(vector.stance + (Math.random() - 0.5) * magnitude * 2),
    scope: clamp(vector.scope + (Math.random() - 0.5) * magnitude * 2),
    taste: clamp(vector.taste + (Math.random() - 0.5) * magnitude * 2),
    purpose: clamp(vector.purpose + (Math.random() - 0.5) * magnitude * 2),
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * 벡터 문자열 설명 생성
 */
export function describeVector(vector: Vector6D): string {
  const descriptions: string[] = []

  if (vector.depth > 0.6) descriptions.push("심층적으로 분석하는")
  else if (vector.depth < 0.4) descriptions.push("직관적으로 느끼는")

  if (vector.lens > 0.6) descriptions.push("논리적인")
  else if (vector.lens < 0.4) descriptions.push("감성적인")

  if (vector.stance > 0.6) descriptions.push("비판적인")
  else if (vector.stance < 0.4) descriptions.push("수용적인")

  if (vector.scope > 0.6) descriptions.push("디테일에 집중하는")
  else if (vector.scope < 0.4) descriptions.push("핵심만 보는")

  if (vector.taste > 0.6) descriptions.push("실험적인")
  else if (vector.taste < 0.4) descriptions.push("클래식을 선호하는")

  if (vector.purpose > 0.6) descriptions.push("의미를 추구하는")
  else if (vector.purpose < 0.4) descriptions.push("재미를 추구하는")

  return descriptions.join(", ") || "균형 잡힌"
}
