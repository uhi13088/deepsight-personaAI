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
