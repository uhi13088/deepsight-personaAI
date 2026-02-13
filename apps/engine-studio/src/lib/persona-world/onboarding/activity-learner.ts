// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Activity Learner
// 구현계획서 §8, 설계서 §9.4
// 유저 활동 → UIV → Adapt → L1 벡터 보정 (±0.3 클램프)
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types/persona-v3"
import type { UserActivity } from "../types"
import {
  createAdaptState,
  adaptVector,
  sentimentToUIV,
  DEFAULT_ADAPT_CONFIG,
} from "@/lib/interaction/adapt-algorithm"
import type { AdaptConfig, UserInteractionVector } from "@/lib/interaction/adapt-algorithm"

/**
 * 활동 학습 데이터 프로바이더 (DI).
 */
export interface ActivityLearnerProvider {
  /**
   * 유저의 현재 L1 벡터 조회.
   */
  getUserL1Vector(userId: string): Promise<SocialPersonaVector | null>

  /**
   * 보정된 L1 벡터 저장.
   */
  saveUpdatedL1Vector(userId: string, vector: SocialPersonaVector): Promise<void>
}

/**
 * 활동 학습 결과.
 */
export interface ActivityLearnResult {
  vectorDelta: Partial<SocialPersonaVector>
  updatedVector: SocialPersonaVector
  activitiesProcessed: number
  confidence: number
}

// ── 활동 타입 → UIV 변환 ────────────────────────────────────

const ACTIVITY_UIV_MAP: Record<UserActivity["type"], UserInteractionVector> = {
  like: { engagement: 0.5, intensity: 0.3, valence: 0.6 },
  comment: { engagement: 0.7, intensity: 0.5, valence: 0.3 },
  follow: { engagement: 0.6, intensity: 0.4, valence: 0.7 },
  bookmark: { engagement: 0.4, intensity: 0.2, valence: 0.5 },
  view: { engagement: 0.2, intensity: 0.1, valence: 0.1 },
}

/**
 * 활동 기반 L1 벡터 학습.
 *
 * 설계서 §9.4:
 * 1. 유저 활동들을 UIV로 변환
 * 2. Adapt 알고리즘으로 점진적 벡터 보정
 * 3. ±0.3 클램프 적용
 */
export async function learnFromActivity(
  userId: string,
  activities: UserActivity[],
  provider: ActivityLearnerProvider,
  config: AdaptConfig = DEFAULT_ADAPT_CONFIG
): Promise<ActivityLearnResult> {
  const currentVector = await provider.getUserL1Vector(userId)
  if (!currentVector) {
    return {
      vectorDelta: {},
      updatedVector: defaultL1(),
      activitiesProcessed: 0,
      confidence: 0,
    }
  }

  if (activities.length === 0) {
    return {
      vectorDelta: {},
      updatedVector: currentVector,
      activitiesProcessed: 0,
      confidence: 0,
    }
  }

  // Adapt 상태 초기화
  let state = createAdaptState(currentVector)

  // 각 활동을 UIV로 변환 후 Adapt 적용
  for (const activity of activities) {
    const uiv = activityToUIV(activity)
    state = adaptVector(state, uiv, config)
  }

  // delta 계산
  const delta: Partial<SocialPersonaVector> = {}
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]

  for (const dim of dims) {
    const d = state.totalDelta[dim]
    if (Math.abs(d) > 0.001) {
      delta[dim] = d
    }
  }

  // 신뢰도: 활동 수 기반 (최소 3턴 필요, 최대 ~0.9)
  const confidence = Math.min(
    0.9,
    Math.max(0, (activities.length - config.minTurnsForAdapt) * 0.05)
  )

  return {
    vectorDelta: delta,
    updatedVector: state.currentL1,
    activitiesProcessed: activities.length,
    confidence,
  }
}

/**
 * 활동 타입 → UIV 변환.
 * metadata에 sentiment가 있으면 sentimentToUIV 사용, 없으면 기본 매핑.
 */
export function activityToUIV(activity: UserActivity): UserInteractionVector {
  const sentiment = activity.metadata?.sentiment as string | undefined
  if (
    sentiment === "supportive" ||
    sentiment === "neutral" ||
    sentiment === "challenging" ||
    sentiment === "aggressive"
  ) {
    return sentimentToUIV(sentiment)
  }
  return ACTIVITY_UIV_MAP[activity.type]
}

function defaultL1(): SocialPersonaVector {
  return {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
  }
}
