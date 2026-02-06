/**
 * 성격 기반 활동 시간 결정 모듈
 *
 * 페르소나의 활동성 속성(sociability, initiative, interactivity, expressiveness)과
 * 활동 시간대 설정(activeHours, peakHours)을 기반으로 활동 확률을 계산합니다.
 */

/**
 * 활동성 속성 인터페이스
 */
export interface ActivityTraits {
  sociability: number // 0.0 ~ 1.0 사교성
  initiative: number // 0.0 ~ 1.0 주도성
  expressiveness: number // 0.0 ~ 1.0 표현력
  interactivity: number // 0.0 ~ 1.0 친화력
}

/**
 * 활동 스케줄 인터페이스
 */
export interface ActivitySchedule {
  timezone: string // e.g., "Asia/Seoul"
  activeHours: number[] // e.g., [9, 12, 18, 22]
  peakHours: number[] // e.g., [21, 22]
  postFrequency: PostFrequency
}

/**
 * 포스팅 빈도
 */
export type PostFrequency =
  | "RARE" // 주 1회 미만
  | "OCCASIONAL" // 주 1-2회
  | "MODERATE" // 주 3-4회
  | "ACTIVE" // 주 5-6회
  | "HYPERACTIVE" // 매일+

/**
 * 포스팅 빈도별 일일 포스팅 확률
 */
const FREQUENCY_BASE_PROBABILITY: Record<PostFrequency, number> = {
  RARE: 0.1, // 10% per day = ~0.7/week
  OCCASIONAL: 0.2, // 20% per day = ~1.4/week
  MODERATE: 0.5, // 50% per day = ~3.5/week
  ACTIVE: 0.75, // 75% per day = ~5.25/week
  HYPERACTIVE: 1.0, // 100% per day = 7/week
}

/**
 * 현재 시간이 페르소나의 활동 시간인지 확인
 */
export function isActiveTimeForPersona(
  schedule: ActivitySchedule,
  currentDate: Date = new Date()
): boolean {
  const hourInTimezone = getHourInTimezone(currentDate, schedule.timezone)

  if (schedule.activeHours.length === 0) {
    // activeHours가 설정되지 않은 경우 기본값 사용
    return true
  }

  return schedule.activeHours.includes(hourInTimezone)
}

/**
 * 현재 시간이 페르소나의 피크 시간인지 확인
 */
export function isPeakTimeForPersona(
  schedule: ActivitySchedule,
  currentDate: Date = new Date()
): boolean {
  const hourInTimezone = getHourInTimezone(currentDate, schedule.timezone)

  if (schedule.peakHours.length === 0) {
    // peakHours가 설정되지 않은 경우 activeHours 마지막 시간을 피크로 간주
    if (schedule.activeHours.length > 0) {
      const lastActiveHour = schedule.activeHours[schedule.activeHours.length - 1]
      return hourInTimezone === lastActiveHour
    }
    return false
  }

  return schedule.peakHours.includes(hourInTimezone)
}

/**
 * 포스팅 확률 계산
 *
 * 기본 확률 = postFrequency 기반
 * 보정 = sociability * initiative
 * 피크 시간 = 확률 1.5배
 */
export function calculatePostProbability(
  traits: ActivityTraits,
  schedule: ActivitySchedule,
  currentDate: Date = new Date()
): number {
  // 활동 시간이 아니면 0
  if (!isActiveTimeForPersona(schedule, currentDate)) {
    return 0
  }

  // 기본 확률 (일일 포스팅 확률을 시간당으로 분배)
  const baseProbability = FREQUENCY_BASE_PROBABILITY[schedule.postFrequency]
  const hoursActive = schedule.activeHours.length || 8 // 기본 8시간 활동

  // 시간당 확률 = 일일 확률 / 활동 시간 수
  let probability = baseProbability / hoursActive

  // 성격 보정 (sociability * initiative)
  const personalityMultiplier = traits.sociability * traits.initiative
  probability *= 0.5 + personalityMultiplier // 0.5 ~ 1.5 범위

  // 피크 시간 보정
  if (isPeakTimeForPersona(schedule, currentDate)) {
    probability *= 1.5
  }

  // 확률 제한 (0 ~ 0.5)
  return Math.min(0.5, Math.max(0, probability))
}

/**
 * 인터랙션 확률 계산
 *
 * 기본 = sociability * interactivity
 */
export function calculateInteractionProbability(
  traits: ActivityTraits,
  schedule: ActivitySchedule,
  currentDate: Date = new Date()
): number {
  // 활동 시간이 아니면 0
  if (!isActiveTimeForPersona(schedule, currentDate)) {
    return 0
  }

  // 기본 확률 = sociability * interactivity
  let probability = traits.sociability * traits.interactivity

  // 피크 시간 보정
  if (isPeakTimeForPersona(schedule, currentDate)) {
    probability *= 1.3
  }

  // 확률 제한 (0 ~ 0.8)
  return Math.min(0.8, Math.max(0, probability))
}

/**
 * 성격 기반 기본 활동 시간대 계산
 */
export function getDefaultActiveHours(traits: ActivityTraits): number[] {
  if (traits.sociability > 0.7) {
    // 외향적: 낮 시간대 활발
    return [9, 10, 12, 14, 16, 18, 20, 21, 22]
  } else if (traits.sociability < 0.3) {
    // 내성적: 늦은 밤 활동
    return [22, 23, 0, 1]
  } else {
    // 보통: 저녁 시간대
    return [18, 19, 20, 21, 22]
  }
}

/**
 * 성격 기반 기본 피크 시간대 계산
 */
export function getDefaultPeakHours(traits: ActivityTraits): number[] {
  if (traits.sociability > 0.7) {
    // 외향적: 점심/저녁 피크
    return [12, 21]
  } else if (traits.sociability < 0.3) {
    // 내성적: 심야 피크
    return [23, 0]
  } else {
    // 보통: 저녁 피크
    return [21, 22]
  }
}

/**
 * 6D 벡터에서 활동성 속성 추정
 */
export function deriveActivityTraitsFromVector(vector: {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}): ActivityTraits {
  return {
    // lens (감성↔논리) → 표현력 (감성적일수록 표현 많음)
    expressiveness: 1 - vector.lens,

    // stance (수용↔비판) → 주도성 (비판적일수록 먼저 의견 제시)
    initiative: vector.stance,

    // taste (클래식↔실험) → 사교성 (실험적일수록 새로운 것 공유)
    sociability: vector.taste * 0.7 + 0.3,

    // 친화력은 복합 계산
    interactivity: (1 - vector.stance) * 0.5 + (1 - vector.lens) * 0.3 + 0.2,
  }
}

/**
 * 특정 타임존에서의 현재 시간(시) 반환
 */
function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    })
    const hourStr = formatter.format(date)
    return parseInt(hourStr, 10)
  } catch {
    // 잘못된 타임존인 경우 UTC 사용
    return date.getUTCHours()
  }
}

/**
 * 다음 활동 시간까지의 딜레이 계산 (밀리초)
 */
export function calculateDelayUntilNextActiveTime(
  schedule: ActivitySchedule,
  currentDate: Date = new Date()
): number {
  const currentHour = getHourInTimezone(currentDate, schedule.timezone)

  if (schedule.activeHours.length === 0) {
    return 0 // 항상 활성
  }

  // 다음 활동 시간 찾기
  const sortedHours = [...schedule.activeHours].sort((a, b) => a - b)

  // 현재 시간 이후의 활동 시간 찾기
  let nextActiveHour = sortedHours.find((h) => h > currentHour)

  // 오늘 남은 활동 시간이 없으면 내일 첫 활동 시간
  if (nextActiveHour === undefined) {
    nextActiveHour = sortedHours[0]
    // 다음 날로 계산
    const hoursUntilNextDay = 24 - currentHour + nextActiveHour
    return hoursUntilNextDay * 60 * 60 * 1000
  }

  // 시간 차이 계산
  const hoursUntilActive = nextActiveHour - currentHour
  return hoursUntilActive * 60 * 60 * 1000
}

/**
 * 성격 기반 콘텐츠 출시 반응 딜레이 계산
 *
 * 내성적 페르소나는 나중에 반응, 외향적 페르소나는 빨리 반응
 */
export function calculateContentReactionDelay(traits: ActivityTraits): number {
  // 기본 딜레이: 1시간 ~ 24시간
  const baseDelayHours = 1

  // 외향적일수록 빨리 반응 (1-23시간 추가)
  const personalityDelay = (1 - traits.sociability) * 23

  // 주도적일수록 빨리 반응 (-6 ~ 0시간)
  const initiativeBonus = traits.initiative * 6

  const totalDelayHours = Math.max(0.5, baseDelayHours + personalityDelay - initiativeBonus)

  return totalDelayHours * 60 * 60 * 1000 // 밀리초로 변환
}
