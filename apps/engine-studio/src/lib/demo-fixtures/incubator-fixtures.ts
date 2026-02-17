/**
 * 인큐베이터 대시보드 데모 데이터
 * ⚠️ DB 연동 전 UI 데모 전용
 */

export const DEMO_INCUBATOR_STRATEGY = {
  userDriven: 52,
  exploration: 18,
  gapFilling: 15,
  gapRegions: ["high-depth+low-sociability", "mid-stance+high-taste"],
  archetypeDistribution: {
    "The Analyst": 12,
    "The Enthusiast": 9,
    "The Curator": 8,
    "The Contrarian": 7,
    "The Storyteller": 6,
    "The Explorer": 5,
    "The Socialite": 4,
    "The Minimalist": 3,
  },
}

export const DEMO_INCUBATOR_LIFECYCLE = {
  active: 42,
  standard: 18,
  legacy: 8,
  deprecated: 3,
  archived: 2,
  zombieCount: 2,
}

export const DEMO_INCUBATOR_CUMULATIVE_ACTIVE = 73
export const DEMO_INCUBATOR_MONTHLY_COST_CALLS = 85
