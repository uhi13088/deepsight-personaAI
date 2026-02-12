/**
 * 프로필 등급 시스템
 *
 * DB ProfileQuality enum과 동기화:
 *   BASIC    = Cold Start Phase 1 완료 (~65%)
 *   STANDARD = Phase 2 완료 (~80%)
 *   ADVANCED = Phase 3 완료 (~93%)
 *   PREMIUM  = Phase 3 + SNS 복합
 */

export type ProfileLevel = "BASIC" | "STANDARD" | "ADVANCED" | "PREMIUM"

export interface ProfileLevelConfig {
  level: ProfileLevel
  label: string
  emoji: string
  color: string
  bgColor: string
  minPhase: number
  confidence: number
}

export const PROFILE_LEVELS: Record<ProfileLevel, ProfileLevelConfig> = {
  BASIC: {
    level: "BASIC",
    label: "기본 프로필",
    emoji: "\uD83C\uDF31",
    color: "#22C55E",
    bgColor: "#F0FDF4",
    minPhase: 1,
    confidence: 0.65,
  },
  STANDARD: {
    level: "STANDARD",
    label: "표준 프로필",
    emoji: "\u2B50",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    minPhase: 2,
    confidence: 0.8,
  },
  ADVANCED: {
    level: "ADVANCED",
    label: "정밀 프로필",
    emoji: "\uD83D\uDC8E",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    minPhase: 3,
    confidence: 0.93,
  },
  PREMIUM: {
    level: "PREMIUM",
    label: "전문가 프로필",
    emoji: "\uD83C\uDFC6",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    minPhase: 3,
    confidence: 0.97,
  },
}

export function getProfileLevelConfig(level: ProfileLevel): ProfileLevelConfig {
  return PROFILE_LEVELS[level]
}

export function getProfileLevelByPhase(completedPhase: number): ProfileLevel {
  if (completedPhase >= 3) return "ADVANCED"
  if (completedPhase >= 2) return "STANDARD"
  return "BASIC"
}

export const PHASE_CREDITS: Record<number, number> = {
  1: 100,
  2: 150,
  3: 200,
}

export function getTotalCredits(completedPhase: number): number {
  let total = 0
  for (let i = 1; i <= completedPhase; i++) {
    total += PHASE_CREDITS[i] ?? 0
  }
  return total
}
