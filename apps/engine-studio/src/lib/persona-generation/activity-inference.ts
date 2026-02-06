/**
 * 활동성 속성 자동 추론 (규칙 기반)
 *
 * 6D 벡터에서 PersonaWorld 활동성 속성을 자동으로 추론합니다.
 */

import type { Vector6D } from "./vector-diversity"
import type { PostFrequency } from "@prisma/client"

export interface ActivityTraits {
  sociability: number // 사교성: 0.0~1.0
  initiative: number // 주도성: 0.0~1.0
  expressiveness: number // 표현력: 0.0~1.0
  interactivity: number // 친화력: 0.0~1.0
}

export interface ActivitySchedule {
  postFrequency: PostFrequency
  timezone: string
  activeHours: number[] // 활동 시간대 [9, 12, 18, 22]
  peakHours: number[] // 피크 시간대 [21, 22]
}

/**
 * 6D 벡터에서 활동성 속성 추론
 */
export function deriveActivityTraits(vector: Vector6D): ActivityTraits {
  return {
    // 사교성: 감성적일수록 + 수용적일수록 = 더 활발
    sociability: calculateSociability(vector),

    // 주도성: 비판적일수록 = 먼저 의견 제시
    initiative: calculateInitiative(vector),

    // 표현력: 감성적일수록 + 디테일할수록 = 더 길게 작성
    expressiveness: calculateExpressiveness(vector),

    // 친화력: 수용적일수록 = 다른 페르소나와 더 잘 어울림
    interactivity: calculateInteractivity(vector),
  }
}

/**
 * 활동 스케줄 추론
 */
export function deriveActivitySchedule(
  traits: ActivityTraits,
  options: {
    timezone?: string
    preferredHours?: number[]
  } = {}
): ActivitySchedule {
  const timezone = options.timezone || "Asia/Seoul"
  const postFrequency = derivePostFrequency(traits.sociability)
  const { activeHours, peakHours } = deriveActivityHours(traits, options.preferredHours)

  return {
    postFrequency,
    timezone,
    activeHours,
    peakHours,
  }
}

// ============================================
// Activity Trait Calculations
// ============================================

/**
 * 사교성 계산
 * 감성적(lens 낮음) + 수용적(stance 낮음) + 실험적(taste 높음)
 */
function calculateSociability(vector: Vector6D): number {
  const emotionalFactor = 1 - vector.lens // 감성적일수록 사교적
  const receptiveFactor = 1 - vector.stance // 수용적일수록 사교적
  const explorerFactor = vector.taste // 실험적일수록 다양한 교류

  const raw = emotionalFactor * 0.3 + receptiveFactor * 0.4 + explorerFactor * 0.3

  // 범위 조정 (0.2 ~ 0.9)
  return Math.round((0.2 + raw * 0.7) * 100) / 100
}

/**
 * 주도성 계산
 * 비판적(stance 높음) + 심층적(depth 높음) = 먼저 의견 제시
 */
function calculateInitiative(vector: Vector6D): number {
  const criticalFactor = vector.stance // 비판적일수록 주도적
  const depthFactor = vector.depth // 심층적일수록 분석 공유 욕구
  const purposeFactor = vector.purpose // 의미 추구할수록 메시지 전달 욕구

  const raw = criticalFactor * 0.5 + depthFactor * 0.3 + purposeFactor * 0.2

  return Math.round((0.2 + raw * 0.7) * 100) / 100
}

/**
 * 표현력 계산
 * 감성적(lens 낮음) + 디테일(scope 높음) = 더 풍부하게 표현
 */
function calculateExpressiveness(vector: Vector6D): number {
  const emotionalFactor = 1 - vector.lens // 감성적일수록 표현 풍부
  const detailFactor = vector.scope // 디테일할수록 상세히 작성
  const depthFactor = vector.depth // 심층적일수록 분석 내용 많음

  const raw = emotionalFactor * 0.4 + detailFactor * 0.35 + depthFactor * 0.25

  return Math.round((0.2 + raw * 0.7) * 100) / 100
}

/**
 * 친화력 계산
 * 수용적(stance 낮음) + 따뜻함(warmth 관련) = 다른 사람과 잘 어울림
 */
function calculateInteractivity(vector: Vector6D): number {
  const receptiveFactor = 1 - vector.stance // 수용적일수록 친화적
  const emotionalFactor = 1 - vector.lens // 감성적일수록 공감 능력
  const casualFactor = 1 - vector.depth // 가벼울수록 쉽게 어울림

  const raw = receptiveFactor * 0.5 + emotionalFactor * 0.3 + casualFactor * 0.2

  return Math.round((0.2 + raw * 0.7) * 100) / 100
}

// ============================================
// Schedule Calculations
// ============================================

/**
 * 포스팅 빈도 결정
 */
function derivePostFrequency(sociability: number): PostFrequency {
  if (sociability > 0.8) return "HYPERACTIVE" // 매일+
  if (sociability > 0.65) return "ACTIVE" // 주 5-6회
  if (sociability > 0.45) return "MODERATE" // 주 3-4회
  if (sociability > 0.3) return "OCCASIONAL" // 주 1-2회
  return "RARE" // 주 1회 미만
}

/**
 * 활동 시간대 결정
 */
function deriveActivityHours(
  traits: ActivityTraits,
  preferredHours?: number[]
): { activeHours: number[]; peakHours: number[] } {
  // 기본 활동 시간대 패턴
  const patterns = {
    // 사교성 높음: 하루 종일 활동
    highSociability: {
      active: [9, 12, 15, 18, 20, 22],
      peak: [20, 21, 22],
    },
    // 사교성 중간: 저녁 집중
    mediumSociability: {
      active: [12, 18, 21, 22],
      peak: [21, 22],
    },
    // 사교성 낮음: 밤 시간 위주
    lowSociability: {
      active: [21, 22, 23],
      peak: [22],
    },
    // 주도성 높음: 오전부터 활동 시작
    highInitiative: {
      active: [8, 10, 13, 19, 21],
      peak: [10, 21],
    },
  }

  // 선호 시간이 있으면 우선
  if (preferredHours && preferredHours.length > 0) {
    return {
      activeHours: preferredHours,
      peakHours: preferredHours.slice(-2),
    }
  }

  // 특성에 따른 패턴 선택
  let selectedPattern: { active: number[]; peak: number[] }

  if (traits.sociability > 0.7) {
    selectedPattern = patterns.highSociability
  } else if (traits.initiative > 0.7) {
    selectedPattern = patterns.highInitiative
  } else if (traits.sociability > 0.4) {
    selectedPattern = patterns.mediumSociability
  } else {
    selectedPattern = patterns.lowSociability
  }

  // 약간의 변형 추가
  const activeHours = [...selectedPattern.active]
  const peakHours = [...selectedPattern.peak]

  // 무작위로 1-2개 시간대 조정
  if (Math.random() > 0.5 && activeHours.length > 2) {
    const randomIndex = Math.floor(Math.random() * activeHours.length)
    activeHours[randomIndex] = (activeHours[randomIndex] + (Math.random() > 0.5 ? 1 : -1) + 24) % 24
  }

  return {
    activeHours: [...new Set(activeHours)].sort((a, b) => a - b),
    peakHours,
  }
}

/**
 * 포스팅 빈도를 일간 기대 포스트 수로 변환
 */
export function getExpectedPostsPerDay(frequency: PostFrequency): number {
  switch (frequency) {
    case "HYPERACTIVE":
      return 2.0 // 하루 2개
    case "ACTIVE":
      return 0.85 // 주 5-6개
    case "MODERATE":
      return 0.5 // 주 3-4개
    case "OCCASIONAL":
      return 0.2 // 주 1-2개
    case "RARE":
      return 0.07 // 주 0.5개
    default:
      return 0.5
  }
}

/**
 * 활동성 점수 계산 (0-100)
 */
export function calculateActivityScore(traits: ActivityTraits): number {
  const weightedSum =
    traits.sociability * 0.35 +
    traits.initiative * 0.25 +
    traits.expressiveness * 0.2 +
    traits.interactivity * 0.2

  return Math.round(weightedSum * 100)
}

/**
 * 활동성 문자열 설명 생성
 */
export function describeActivityTraits(traits: ActivityTraits): string {
  const descriptions: string[] = []

  if (traits.sociability > 0.7) {
    descriptions.push("매우 사교적")
  } else if (traits.sociability < 0.4) {
    descriptions.push("조용한 편")
  }

  if (traits.initiative > 0.7) {
    descriptions.push("의견 주도적")
  } else if (traits.initiative < 0.4) {
    descriptions.push("관망하는 편")
  }

  if (traits.expressiveness > 0.7) {
    descriptions.push("표현력 풍부")
  } else if (traits.expressiveness < 0.4) {
    descriptions.push("간결한 표현")
  }

  if (traits.interactivity > 0.7) {
    descriptions.push("친화력 높음")
  } else if (traits.interactivity < 0.4) {
    descriptions.push("독립적")
  }

  return descriptions.join(", ") || "균형 잡힌 활동 패턴"
}
