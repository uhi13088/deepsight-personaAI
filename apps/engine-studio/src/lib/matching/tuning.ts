// ═══════════════════════════════════════════════════════════════
// 알고리즘 튜닝
// T57-AC3: 하이퍼파라미터, 장르별 가중치, 자동 튜닝
// ═══════════════════════════════════════════════════════════════

import type { SocialDimension } from "@/types"

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
    description: "이 점수 미만의 매칭은 결과에서 제외됩니다",
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
  {
    key: "feedback_learning_rate",
    label: "피드백 반영 속도",
    value: 0.1,
    min: 0.01,
    max: 0.5,
    step: 0.01,
    description: "유저 피드백이 매칭에 반영되는 속도",
  },
  {
    key: "latent_trait_weight",
    label: "잠재 성향 가중치",
    value: 0.2,
    min: 0,
    max: 1,
    step: 0.05,
    description: "암묵적 행동 데이터의 매칭 반영 비율",
  },
  {
    key: "context_sensitivity",
    label: "컨텍스트 민감도",
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    description: "시간/상황 컨텍스트가 매칭에 미치는 영향",
  },
]

// ── 기본 장르별 가중치 ───────────────────────────────────────

export const DEFAULT_GENRE_WEIGHTS: GenreWeightTable = [
  {
    genre: "thriller",
    weights: {
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
    genre: "romance",
    weights: {
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
    genre: "documentary",
    weights: {
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
    genre: "comedy",
    weights: {
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
    genre: "drama",
    weights: {
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
    genre: "scifi",
    weights: {
      depth: 1.2,
      lens: 1.1,
      stance: 1.0,
      scope: 1.1,
      taste: 1.2,
      purpose: 1.0,
      sociability: 0.8,
    },
  },
]

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

  const defaultWeights: Record<SocialDimension, number> = {
    depth: 1.0,
    lens: 1.0,
    stance: 1.0,
    scope: 1.0,
    taste: 1.0,
    purpose: 1.0,
    sociability: 1.0,
  }

  return {
    ...profile,
    genreWeights: [...profile.genreWeights, { genre, weights: defaultWeights }],
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
  return vector.map((v, i) => {
    const dim = dims[i]
    if (!dim) return v
    const weight = entry.weights[dim] ?? 1.0
    return Math.max(0, Math.min(1, v * weight))
  })
}
