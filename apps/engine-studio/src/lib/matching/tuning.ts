// ═══════════════════════════════════════════════════════════════
// 알고리즘 튜닝
// T57-AC3: 하이퍼파라미터, 장르별 가중치, 자동 튜닝
// ═══════════════════════════════════════════════════════════════

import type {
  SocialDimension,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import { cosineSimilarity } from "@/lib/vector/utils"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface HyperParameter {
  key: string
  label: string
  value: number
  min: number
  max: number
  step: number
  description: string
}

export interface TuningProfile {
  id: string
  name: string
  parameters: HyperParameter[]
  genreWeights: GenreWeightTable
  createdAt: number
  updatedAt: number
}

export interface GenreWeightEntry {
  genre: string
  weights: Record<SocialDimension, number> // 가중치 배율 (0.5~2.0)
}

export type GenreWeightTable = GenreWeightEntry[]

export interface TuningExperiment {
  id: string
  profileId: string
  method: "grid_search" | "bayesian"
  parameterSpace: Array<{ key: string; values: number[] }>
  status: "pending" | "running" | "completed" | "failed"
  bestParameters: HyperParameter[] | null
  bestScore: number | null
  iterations: number
  maxIterations: number
  startedAt: number | null
  completedAt: number | null
}

export interface TuningResult {
  experimentId: string
  parameter: string
  value: number
  score: number
}

// ── 기본 하이퍼파라미터 ──────────────────────────────────────

export const DEFAULT_HYPERPARAMETERS: HyperParameter[] = [
  {
    key: "similarity_threshold",
    label: "최소 매칭 점수",
    value: 50,
    min: 0,
    max: 100,
    step: 5,
    description: "이 점수 미만의 매칭은 결과에서 제외됩니다 (0~100%)",
  },
  {
    key: "top_n",
    label: "추천 페르소나 수",
    value: 5,
    min: 1,
    max: 20,
    step: 1,
    description: "유저에게 추천할 페르소나 최대 수",
  },
  {
    key: "diversity_factor",
    label: "추천 다양성",
    value: 0.3,
    min: 0,
    max: 1,
    step: 0.05,
    description: "높을수록 다양한 유형의 페르소나를 추천합니다",
  },
]

// ── 하이퍼파라미터 추출 유틸리티 ─────────────────────────────

/**
 * 튜닝 프로필에서 하이퍼파라미터를 key:value 맵으로 추출.
 * 매칭 파이프라인에서 사용하기 쉬운 형태로 변환.
 */
export interface ExtractedHyperParameters {
  /** 최소 매칭 점수 0~1 (원본 0~100을 0~1로 변환) */
  similarityThreshold: number
  /** 추천 페르소나 수 */
  topN: number
  /** 추천 다양성 0~1 */
  diversityFactor: number
}

/**
 * 튜닝 프로필 parameters 배열에서 실제 사용 가능한 하이퍼파라미터 추출.
 * 파이프라인에 주입할 때 이 함수를 통해 정규화된 값을 얻음.
 */
export function extractHyperParameters(parameters: HyperParameter[]): ExtractedHyperParameters {
  const map = new Map(parameters.map((p) => [p.key, p.value]))
  return {
    similarityThreshold: (map.get("similarity_threshold") ?? 50) / 100,
    topN: map.get("top_n") ?? 5,
    diversityFactor: map.get("diversity_factor") ?? 0.3,
  }
}

// ── 장르 카탈로그 (엔진이 인식하는 공식 장르 목록) ──────────

export interface GenreDefinition {
  id: string
  label: string // 한국어 표시명
  /** 장르 특성에 맞는 기본 가중치 프리셋 */
  preset: Record<SocialDimension, number>
}

/**
 * 엔진이 인식하는 공식 장르 목록.
 * - 새 장르를 추가할 때 이 목록에서 선택해야 엔진이 인식 가능
 * - preset: 장르 특성에 맞는 기본 가중치 (자동 튜닝 시 사용)
 */
export const KNOWN_GENRES: GenreDefinition[] = [
  // ── 기본 장르 ──
  {
    id: "drama",
    label: "드라마",
    preset: {
      depth: 1.1,
      lens: 1.0,
      stance: 1.0,
      scope: 1.1,
      taste: 1.0,
      purpose: 1.2,
      sociability: 0.9,
    },
  },
  {
    id: "comedy",
    label: "코미디",
    preset: {
      depth: 0.8,
      lens: 0.9,
      stance: 0.8,
      scope: 0.8,
      taste: 1.1,
      purpose: 0.7,
      sociability: 1.3,
    },
  },
  {
    id: "romance",
    label: "로맨스",
    preset: {
      depth: 0.9,
      lens: 0.7,
      stance: 0.8,
      scope: 0.9,
      taste: 1.0,
      purpose: 1.1,
      sociability: 1.2,
    },
  },
  {
    id: "thriller",
    label: "스릴러",
    preset: {
      depth: 1.2,
      lens: 1.2,
      stance: 1.1,
      scope: 1.0,
      taste: 1.0,
      purpose: 1.1,
      sociability: 0.8,
    },
  },
  {
    id: "horror",
    label: "호러",
    preset: {
      depth: 1.1,
      lens: 1.3,
      stance: 1.2,
      scope: 0.8,
      taste: 1.1,
      purpose: 0.9,
      sociability: 0.7,
    },
  },
  {
    id: "action",
    label: "액션",
    preset: {
      depth: 0.8,
      lens: 0.9,
      stance: 0.9,
      scope: 0.9,
      taste: 1.2,
      purpose: 0.8,
      sociability: 1.1,
    },
  },
  {
    id: "scifi",
    label: "SF",
    preset: {
      depth: 1.2,
      lens: 1.1,
      stance: 1.0,
      scope: 1.1,
      taste: 1.2,
      purpose: 1.0,
      sociability: 0.8,
    },
  },
  {
    id: "fantasy",
    label: "판타지",
    preset: {
      depth: 1.0,
      lens: 1.0,
      stance: 0.9,
      scope: 1.2,
      taste: 1.3,
      purpose: 0.9,
      sociability: 0.9,
    },
  },
  // ── 서사/문화 장르 ──
  {
    id: "documentary",
    label: "다큐멘터리",
    preset: {
      depth: 1.3,
      lens: 1.2,
      stance: 1.1,
      scope: 1.2,
      taste: 0.9,
      purpose: 1.2,
      sociability: 0.7,
    },
  },
  {
    id: "animation",
    label: "애니메이션",
    preset: {
      depth: 0.9,
      lens: 0.8,
      stance: 0.8,
      scope: 1.0,
      taste: 1.3,
      purpose: 0.8,
      sociability: 1.1,
    },
  },
  {
    id: "mystery",
    label: "미스터리",
    preset: {
      depth: 1.3,
      lens: 1.3,
      stance: 1.1,
      scope: 0.9,
      taste: 1.0,
      purpose: 1.1,
      sociability: 0.7,
    },
  },
  {
    id: "musical",
    label: "뮤지컬",
    preset: {
      depth: 0.8,
      lens: 0.7,
      stance: 0.7,
      scope: 1.0,
      taste: 1.3,
      purpose: 0.9,
      sociability: 1.3,
    },
  },
  {
    id: "war",
    label: "전쟁",
    preset: {
      depth: 1.2,
      lens: 1.1,
      stance: 1.3,
      scope: 1.1,
      taste: 0.8,
      purpose: 1.2,
      sociability: 0.7,
    },
  },
  {
    id: "history",
    label: "역사",
    preset: {
      depth: 1.3,
      lens: 1.2,
      stance: 1.2,
      scope: 1.3,
      taste: 0.8,
      purpose: 1.2,
      sociability: 0.7,
    },
  },
  {
    id: "crime",
    label: "범죄",
    preset: {
      depth: 1.2,
      lens: 1.2,
      stance: 1.2,
      scope: 1.0,
      taste: 0.9,
      purpose: 1.1,
      sociability: 0.8,
    },
  },
  {
    id: "sports",
    label: "스포츠",
    preset: {
      depth: 0.8,
      lens: 0.8,
      stance: 0.9,
      scope: 0.9,
      taste: 1.1,
      purpose: 0.8,
      sociability: 1.3,
    },
  },
  {
    id: "family",
    label: "가족",
    preset: {
      depth: 0.9,
      lens: 0.8,
      stance: 0.8,
      scope: 1.0,
      taste: 0.9,
      purpose: 1.1,
      sociability: 1.2,
    },
  },
  // ── 콘텐츠 형식 장르 ──
  {
    id: "reality",
    label: "리얼리티",
    preset: {
      depth: 0.7,
      lens: 0.8,
      stance: 0.8,
      scope: 0.9,
      taste: 1.1,
      purpose: 0.7,
      sociability: 1.4,
    },
  },
  {
    id: "variety",
    label: "예능",
    preset: {
      depth: 0.7,
      lens: 0.8,
      stance: 0.7,
      scope: 0.8,
      taste: 1.2,
      purpose: 0.7,
      sociability: 1.4,
    },
  },
  {
    id: "noir",
    label: "느와르",
    preset: {
      depth: 1.3,
      lens: 1.2,
      stance: 1.2,
      scope: 0.9,
      taste: 1.1,
      purpose: 1.1,
      sociability: 0.7,
    },
  },
  {
    id: "western",
    label: "서부극",
    preset: {
      depth: 1.0,
      lens: 1.0,
      stance: 1.1,
      scope: 1.0,
      taste: 1.1,
      purpose: 0.9,
      sociability: 0.8,
    },
  },
  {
    id: "indie",
    label: "인디/독립",
    preset: {
      depth: 1.3,
      lens: 1.1,
      stance: 1.0,
      scope: 0.8,
      taste: 1.2,
      purpose: 1.1,
      sociability: 0.7,
    },
  },
]

// ── 기본 장르별 가중치 ───────────────────────────────────────

/** 기본 프로필에 포함되는 장르 (주요 장르 12개) */
const DEFAULT_GENRE_IDS = [
  "drama",
  "comedy",
  "romance",
  "thriller",
  "horror",
  "action",
  "scifi",
  "fantasy",
  "documentary",
  "animation",
  "mystery",
  "crime",
] as const

export const DEFAULT_GENRE_WEIGHTS: GenreWeightTable = DEFAULT_GENRE_IDS.map((id) => {
  const def = KNOWN_GENRES.find((g) => g.id === id)!
  return { genre: id, weights: { ...def.preset } }
})

// ── 튜닝 프로필 생성 ────────────────────────────────────────

export function createTuningProfile(
  name: string,
  parameters: HyperParameter[] = DEFAULT_HYPERPARAMETERS,
  genreWeights: GenreWeightTable = DEFAULT_GENRE_WEIGHTS
): TuningProfile {
  const now = Date.now()
  return {
    id: `tp_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    parameters: parameters.map((p) => ({ ...p })),
    genreWeights: genreWeights.map((g) => ({ ...g, weights: { ...g.weights } })),
    createdAt: now,
    updatedAt: now,
  }
}

// ── 파라미터 업데이트 ────────────────────────────────────────

export function updateParameter(profile: TuningProfile, key: string, value: number): TuningProfile {
  const param = profile.parameters.find((p) => p.key === key)
  if (!param) throw new Error(`파라미터 '${key}'를 찾을 수 없습니다`)

  const clamped = Math.max(param.min, Math.min(param.max, value))

  return {
    ...profile,
    parameters: profile.parameters.map((p) => (p.key === key ? { ...p, value: clamped } : p)),
    updatedAt: Date.now(),
  }
}

// ── 장르 가중치 업데이트 ─────────────────────────────────────

export function updateGenreWeight(
  profile: TuningProfile,
  genre: string,
  dimension: SocialDimension,
  weight: number
): TuningProfile {
  const clamped = Math.max(0.5, Math.min(2.0, weight))
  const genreWeights = profile.genreWeights.map((g) =>
    g.genre === genre ? { ...g, weights: { ...g.weights, [dimension]: clamped } } : g
  )

  return { ...profile, genreWeights, updatedAt: Date.now() }
}

// ── 장르 추가/삭제 ───────────────────────────────────────────

export function addGenre(profile: TuningProfile, genre: string): TuningProfile {
  if (profile.genreWeights.some((g) => g.genre === genre)) {
    throw new Error(`장르 '${genre}'가 이미 존재합니다`)
  }

  // KNOWN_GENRES에서 프리셋 가중치를 찾아 적용 (없으면 1.0 기본값)
  const known = KNOWN_GENRES.find((g) => g.id === genre)
  const weights: Record<SocialDimension, number> = known
    ? { ...known.preset }
    : { depth: 1.0, lens: 1.0, stance: 1.0, scope: 1.0, taste: 1.0, purpose: 1.0, sociability: 1.0 }

  return {
    ...profile,
    genreWeights: [...profile.genreWeights, { genre, weights }],
    updatedAt: Date.now(),
  }
}

export function removeGenre(profile: TuningProfile, genre: string): TuningProfile {
  return {
    ...profile,
    genreWeights: profile.genreWeights.filter((g) => g.genre !== genre),
    updatedAt: Date.now(),
  }
}

// ── 자동 튜닝 실험 생성 ─────────────────────────────────────

export function createTuningExperiment(
  profileId: string,
  method: TuningExperiment["method"],
  parameterSpace: TuningExperiment["parameterSpace"],
  maxIterations: number = 100
): TuningExperiment {
  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    profileId,
    method,
    parameterSpace,
    status: "pending",
    bestParameters: null,
    bestScore: null,
    iterations: 0,
    maxIterations,
    startedAt: null,
    completedAt: null,
  }
}

// ── 실험 상태 전환 ───────────────────────────────────────────

export function startExperiment(experiment: TuningExperiment): TuningExperiment {
  if (experiment.status !== "pending") {
    throw new Error(`실험이 '${experiment.status}' 상태여서 시작할 수 없습니다`)
  }
  return { ...experiment, status: "running", startedAt: Date.now() }
}

export function recordExperimentIteration(
  experiment: TuningExperiment,
  parameters: HyperParameter[],
  score: number
): TuningExperiment {
  if (experiment.status !== "running") {
    throw new Error("실험이 실행 중이 아닙니다")
  }

  const isBetter = experiment.bestScore === null || score > experiment.bestScore
  const newIterations = experiment.iterations + 1
  const isComplete = newIterations >= experiment.maxIterations

  return {
    ...experiment,
    iterations: newIterations,
    bestParameters: isBetter ? parameters : experiment.bestParameters,
    bestScore: isBetter ? score : experiment.bestScore,
    status: isComplete ? "completed" : "running",
    completedAt: isComplete ? Date.now() : null,
  }
}

export function failExperiment(experiment: TuningExperiment): TuningExperiment {
  return { ...experiment, status: "failed", completedAt: Date.now() }
}

// ── Grid Search 파라미터 조합 생성 ───────────────────────────

export function generateGridSearchCombinations(
  parameterSpace: Array<{ key: string; values: number[] }>
): Array<Record<string, number>> {
  if (parameterSpace.length === 0) return [{}]

  const [first, ...rest] = parameterSpace
  const restCombinations = generateGridSearchCombinations(rest)

  const combinations: Array<Record<string, number>> = []
  for (const value of first.values) {
    for (const combo of restCombinations) {
      combinations.push({ ...combo, [first.key]: value })
    }
  }

  return combinations
}

// ── 장르 프리셋 일괄 적용 (자동 가중치) ─────────────────────

/**
 * 현재 프로필의 모든 장르 가중치를 KNOWN_GENRES 프리셋으로 초기화.
 * 관리자가 수동 조정 후 원래 추천값으로 돌아가고 싶을 때 사용.
 */
export function applyPresetWeights(profile: TuningProfile): TuningProfile {
  const genreWeights = profile.genreWeights.map((entry) => {
    const known = KNOWN_GENRES.find((g) => g.id === entry.genre)
    if (!known) return entry
    return { ...entry, weights: { ...known.preset } }
  })
  return { ...profile, genreWeights, updatedAt: Date.now() }
}

// ── 장르 가중치 자동 검증/보정 ──────────────────────────────

export type GenreIssueType = "range" | "imbalance" | "drift"

export interface GenreWeightIssue {
  genre: string
  type: GenreIssueType
  message: string
  dimension?: SocialDimension
  value?: number
  corrected?: number
}

const WEIGHT_MIN = 0.5
const WEIGHT_MAX = 2.0
const MEAN_LOW = 0.8
const MEAN_HIGH = 1.2
const DRIFT_THRESHOLD = 0.5

const ALL_DIMS: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]

/**
 * 장르 가중치 검증: 3가지 이상을 탐지
 * 1. range: 0.5~2.0 범위 이탈
 * 2. imbalance: 7차원 평균이 0.8~1.2 범위 이탈 (모두 높거나 모두 낮음)
 * 3. drift: KNOWN_GENRES 프리셋 대비 단일 차원이 ±0.5 이상 이탈
 */
export function validateGenreWeights(table: GenreWeightTable): GenreWeightIssue[] {
  const issues: GenreWeightIssue[] = []

  for (const entry of table) {
    const values = ALL_DIMS.map((d) => entry.weights[d])

    // 1) Range check
    for (const dim of ALL_DIMS) {
      const v = entry.weights[dim]
      if (v < WEIGHT_MIN || v > WEIGHT_MAX) {
        issues.push({
          genre: entry.genre,
          type: "range",
          dimension: dim,
          value: v,
          corrected: Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, v)),
          message: `${entry.genre}.${dim} = ${v} (범위 ${WEIGHT_MIN}~${WEIGHT_MAX} 이탈)`,
        })
      }
    }

    // 2) Imbalance check
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    if (mean < MEAN_LOW || mean > MEAN_HIGH) {
      issues.push({
        genre: entry.genre,
        type: "imbalance",
        value: Math.round(mean * 100) / 100,
        message: `${entry.genre} 평균 가중치 ${mean.toFixed(2)} (${MEAN_LOW}~${MEAN_HIGH} 범위 이탈 — 전체적으로 ${mean > MEAN_HIGH ? "과대" : "과소"} 평가)`,
      })
    }

    // 3) Drift check (프리셋 대비)
    const known = KNOWN_GENRES.find((g) => g.id === entry.genre)
    if (known) {
      for (const dim of ALL_DIMS) {
        const diff = Math.abs(entry.weights[dim] - known.preset[dim])
        if (diff > DRIFT_THRESHOLD) {
          issues.push({
            genre: entry.genre,
            type: "drift",
            dimension: dim,
            value: entry.weights[dim],
            corrected: known.preset[dim],
            message: `${entry.genre}.${dim} = ${entry.weights[dim]} (프리셋 ${known.preset[dim]}에서 ±${diff.toFixed(1)} 이탈)`,
          })
        }
      }
    }
  }

  return issues
}

/**
 * 장르 가중치 자동 보정: 감지된 이상을 수정
 * - range: 범위 내로 클램핑
 * - imbalance: 평균이 1.0이 되도록 정규화
 * - drift: 프리셋 쪽으로 50% 당기기 (완전 리셋 아닌 부분 보정)
 *
 * @returns { profile, corrections } - 보정된 프로필 + 수정 내역
 */
export function autoCorrectGenreWeights(profile: TuningProfile): {
  profile: TuningProfile
  corrections: GenreWeightIssue[]
} {
  const issues = validateGenreWeights(profile.genreWeights)
  if (issues.length === 0) return { profile, corrections: [] }

  const corrections: GenreWeightIssue[] = []

  const genreWeights = profile.genreWeights.map((entry) => {
    const newWeights = { ...entry.weights }
    let corrected = false

    // 1) Range fix: 클램핑
    for (const dim of ALL_DIMS) {
      const v = newWeights[dim]
      if (v < WEIGHT_MIN || v > WEIGHT_MAX) {
        newWeights[dim] = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, v))
        corrected = true
      }
    }

    // 2) Imbalance fix: 평균 1.0으로 정규화
    const values = ALL_DIMS.map((d) => newWeights[d])
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    if (mean < MEAN_LOW || mean > MEAN_HIGH) {
      const scale = 1.0 / mean
      for (const dim of ALL_DIMS) {
        newWeights[dim] = Math.max(
          WEIGHT_MIN,
          Math.min(WEIGHT_MAX, Math.round(newWeights[dim] * scale * 100) / 100)
        )
      }
      corrected = true
    }

    // 3) Drift fix: 프리셋 쪽으로 50% 보간 (과도 이탈 차원만)
    const known = KNOWN_GENRES.find((g) => g.id === entry.genre)
    if (known) {
      for (const dim of ALL_DIMS) {
        const diff = Math.abs(newWeights[dim] - known.preset[dim])
        if (diff > DRIFT_THRESHOLD) {
          // 현재값과 프리셋의 50% 지점으로 보정
          newWeights[dim] = Math.round(((newWeights[dim] + known.preset[dim]) / 2) * 100) / 100
          corrected = true
        }
      }
    }

    if (corrected) {
      corrections.push({
        genre: entry.genre,
        type: "range",
        message: `${entry.genre} 가중치 자동 보정됨`,
      })
    }

    return { ...entry, weights: newWeights }
  })

  return {
    profile: { ...profile, genreWeights, updatedAt: Date.now() },
    corrections,
  }
}

// ── 가중 벡터 적용 ───────────────────────────────────────────

export function applyGenreWeights(
  vector: number[],
  genre: string,
  genreWeights: GenreWeightTable
): number[] {
  const entry = genreWeights.find((g) => g.genre === genre)
  if (!entry) return vector

  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  // T219: 중심 기준(0.5) 스케일링 — 고차원/저차원 비대칭 편향 방지
  return vector.map((v, i) => {
    const dim = dims[i]
    if (!dim) return v
    const weight = entry.weights[dim] ?? 1.0
    return Math.max(0, Math.min(1, 0.5 + (v - 0.5) * weight))
  })
}

// ═══════════════════════════════════════════════════════════════
// 자동 튜닝 엔진 — 시뮬레이션 기반 최적 하이퍼파라미터 탐색
// ═══════════════════════════════════════════════════════════════

export interface AutoTuningConfig {
  /** 시뮬레이션에 사용할 가상 유저 수 */
  virtualUserCount: number
  /** 탐색 방법 */
  method: "grid_search" | "bayesian"
  /** 최적화 목표 */
  targetMetric: "quality" | "diversity" | "balanced"
}

export interface AutoTuningResult {
  /** 최적 파라미터 조합 */
  bestParameters: Record<string, number>
  /** 최적 점수 (0~1) */
  bestScore: number
  /** 총 실험 반복 수 */
  iterations: number
  /** 모든 조합별 결과 (상위 10개) */
  topResults: Array<{ params: Record<string, number>; score: number }>
  /** 최적 파라미터가 프로필에 적용되었는지 */
  applied: boolean
  /** 탐색 소요 시간 (ms) */
  durationMs: number
}

/** 자동 튜닝 시 사용할 가상 벡터 쌍 */
interface SimulationPair {
  userL1: number[]
  personaL1: number[]
  userL2: number[]
  personaL2: number[]
}

/**
 * 자동 튜닝 실행: 시뮬레이션으로 최적 하이퍼파라미터를 탐색.
 *
 * 1. 가상 유저/페르소나 벡터 쌍 생성
 * 2. 각 파라미터 조합으로 매칭 점수 계산
 * 3. 품질 메트릭(평균 점수, 실패율, 다양성) 평가
 * 4. 최적 조합 반환
 *
 * @param profile - 현재 튜닝 프로필
 * @param config - 자동 튜닝 설정
 * @returns { result, profile } - 탐색 결과 + 최적 파라미터 적용된 프로필
 */
export function runAutoTuning(
  profile: TuningProfile,
  config: AutoTuningConfig = {
    virtualUserCount: 50,
    method: "grid_search",
    targetMetric: "balanced",
  }
): { result: AutoTuningResult; profile: TuningProfile } {
  const startTime = Date.now()

  // 1. 가상 유저/페르소나 벡터 쌍 생성
  const pairs: SimulationPair[] = Array.from({ length: config.virtualUserCount }, () => ({
    userL1: randomVector(7),
    personaL1: randomVector(7),
    userL2: randomVector(5),
    personaL2: randomVector(5),
  }))

  // 2. 파라미터 탐색 공간 정의
  const paramSpace = [
    {
      key: "similarity_threshold",
      values: [10, 20, 30, 40, 50, 60, 70],
    },
    {
      key: "diversity_factor",
      values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    },
  ]

  // 3. Grid Search: 모든 조합 평가
  const combinations = generateGridSearchCombinations(paramSpace)
  const results: Array<{ params: Record<string, number>; score: number }> = []

  for (const combo of combinations) {
    const threshold = (combo.similarity_threshold ?? 50) / 100
    const diversityFactor = combo.diversity_factor ?? 0.3

    // 각 조합으로 시뮬레이션 실행
    const metrics = evaluateParameterCombo(pairs, threshold, diversityFactor, profile.genreWeights)
    const score = computeCompositeScore(metrics, config.targetMetric)

    results.push({ params: combo, score })
  }

  // 4. 최적 조합 선택
  results.sort((a, b) => b.score - a.score)
  const best = results[0]

  // 5. 최적 파라미터를 프로필에 적용
  let updatedProfile = profile
  if (best) {
    for (const [key, value] of Object.entries(best.params)) {
      const param = updatedProfile.parameters.find((p) => p.key === key)
      if (param) {
        updatedProfile = updateParameter(updatedProfile, key, value)
      }
    }
  }

  return {
    result: {
      bestParameters: best?.params ?? {},
      bestScore: Math.round((best?.score ?? 0) * 100) / 100,
      iterations: combinations.length,
      topResults: results.slice(0, 10),
      applied: true,
      durationMs: Date.now() - startTime,
    },
    profile: updatedProfile,
  }
}

// ── 시뮬레이션 내부 함수 ─────────────────────────────────────

interface SimulationMetrics {
  avgMatchScore: number
  failureRate: number
  diversity: number
}

function evaluateParameterCombo(
  pairs: SimulationPair[],
  threshold: number,
  diversityFactor: number,
  genreWeights: GenreWeightTable
): SimulationMetrics {
  const scores: number[] = []
  const explorationScores: number[] = []

  for (const pair of pairs) {
    // L1 코사인 유사도 (Basic 매칭)
    const l1Sim = Math.max(0, cosineSimilarity(pair.userL1, pair.personaL1))
    // L2 코사인 유사도
    const l2Sim = Math.max(0, cosineSimilarity(pair.userL2, pair.personaL2))

    const basicScore = 0.7 * l1Sim + 0.3 * l2Sim
    scores.push(basicScore)

    // 탐색 점수: 발산도 × diversity boost
    const l1Div = 1 - l1Sim
    const l2Div = 1 - l2Sim
    const rawExploration = 0.4 * l1Div + 0.4 * l2Div + 0.2 * 0.8
    explorationScores.push(rawExploration * (1 + diversityFactor))
  }

  // 메트릭 계산
  const passed = scores.filter((s) => s >= threshold)
  const avgMatchScore = passed.length > 0 ? passed.reduce((a, b) => a + b, 0) / passed.length : 0
  const failureRate = 1 - passed.length / scores.length

  // 다양성: 탐색 점수 분산 (높을수록 다양)
  const avgExploration = explorationScores.reduce((a, b) => a + b, 0) / explorationScores.length
  const variance =
    explorationScores.reduce((s, v) => s + (v - avgExploration) ** 2, 0) / explorationScores.length
  const diversity = Math.min(1, avgExploration * (1 + Math.sqrt(variance)))

  return { avgMatchScore, failureRate, diversity }
}

function computeCompositeScore(
  metrics: SimulationMetrics,
  target: AutoTuningConfig["targetMetric"]
): number {
  switch (target) {
    case "quality":
      // 품질 중심: 높은 평균 점수 + 낮은 실패율
      return 0.7 * metrics.avgMatchScore + 0.3 * (1 - metrics.failureRate)
    case "diversity":
      // 다양성 중심: 높은 다양성 + 적당한 품질
      return 0.3 * metrics.avgMatchScore + 0.2 * (1 - metrics.failureRate) + 0.5 * metrics.diversity
    case "balanced":
    default:
      // 균형: 품질 40% + 실패율 30% + 다양성 30%
      return 0.4 * metrics.avgMatchScore + 0.3 * (1 - metrics.failureRate) + 0.3 * metrics.diversity
  }
}

function randomVector(dims: number): number[] {
  return Array.from({ length: dims }, () => Math.round(Math.random() * 100) / 100)
}
