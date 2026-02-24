/**
 * 공유 벡터 픽스처 — 테스트 파일 간 중복 제거용
 *
 * 패턴별 벡터 정의. 각 패턴은 특정 성향의 페르소나를 대표합니다.
 * 새로운 테스트 작성 시 여기서 import하여 사용하세요.
 */
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ─── IRONIC PATTERN ─────────────────────────────────────────
// 분석적, 비판적, 내향적 페르소나 (depth↑ lens↑ stance↑ sociability↓)
// 사용: persona-generation, llm-character, qualitative, llm-qualitative, llm-express-quirks

export const IRONIC_L1: SocialPersonaVector = {
  depth: 0.85,
  lens: 0.9,
  stance: 0.75,
  scope: 0.8,
  taste: 0.35,
  purpose: 0.7,
  sociability: 0.3,
}

export const IRONIC_L2: CoreTemperamentVector = {
  openness: 0.75,
  conscientiousness: 0.6,
  extraversion: 0.35,
  agreeableness: 0.45,
  neuroticism: 0.7,
}

export const IRONIC_L3: NarrativeDriveVector = {
  lack: 0.65,
  moralCompass: 0.55,
  volatility: 0.5,
  growthArc: 0.6,
}

// ─── NEUTRAL PATTERN ────────────────────────────────────────
// 모든 축 0.5 — 기준선, 대조군, 중립 행동 테스트
// 사용: prompt-builder, interaction, cross-axis, paradox

export const NEUTRAL_L1: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

export const NEUTRAL_L2: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

export const NEUTRAL_L3: NarrativeDriveVector = {
  lack: 0.5,
  moralCompass: 0.5,
  volatility: 0.5,
  growthArc: 0.5,
}

// ─── MATURE PATTERN ─────────────────────────────────────────
// 성숙한, 분석적, 신중한 페르소나 (추론 연령: 32~52세)
// 사용: structured-fields (연령 추론 테스트)

export const MATURE_L1: SocialPersonaVector = {
  depth: 0.85,
  lens: 0.8,
  stance: 0.7,
  scope: 0.75,
  taste: 0.2,
  purpose: 0.85,
  sociability: 0.3,
}

export const MATURE_L2: CoreTemperamentVector = {
  openness: 0.4,
  conscientiousness: 0.85,
  extraversion: 0.3,
  agreeableness: 0.5,
  neuroticism: 0.4,
}

// ─── YOUNG PATTERN ──────────────────────────────────────────
// 젊은, 캐주얼, 자발적, 사교적 페르소나 (추론 연령: 18~33세)
// 사용: structured-fields (연령 추론 테스트)

export const YOUNG_L1: SocialPersonaVector = {
  depth: 0.3,
  lens: 0.3,
  stance: 0.3,
  scope: 0.4,
  taste: 0.9,
  purpose: 0.2,
  sociability: 0.85,
}

export const YOUNG_L2: CoreTemperamentVector = {
  openness: 0.85,
  conscientiousness: 0.2,
  extraversion: 0.8,
  agreeableness: 0.7,
  neuroticism: 0.3,
}

// ─── FORMAL PATTERN ─────────────────────────────────────────
// 공식적, 분석적, 내향적, 안정적 페르소나
// 사용: voice-spec

export const FORMAL_L1: SocialPersonaVector = {
  stance: 0.5,
  depth: 0.8,
  lens: 0.8,
  scope: 0.5,
  taste: 0.5,
  sociability: 0.3,
  purpose: 0.7,
}

export const INTROVERT_L2: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.6,
  extraversion: 0.2,
  agreeableness: 0.7,
  neuroticism: 0.3,
}

export const STABLE_L3: NarrativeDriveVector = {
  lack: 0.3,
  volatility: 0.2,
  moralCompass: 0.8,
  growthArc: 0.6,
}

// ─── CASUAL PATTERN ─────────────────────────────────────────
// 캐주얼, 사교적, 자발적, 불안정 페르소나
// 사용: voice-spec

export const CASUAL_L1: SocialPersonaVector = {
  stance: 0.3,
  depth: 0.4,
  lens: 0.3,
  scope: 0.5,
  taste: 0.6,
  sociability: 0.7,
  purpose: 0.4,
}

export const EXTROVERT_L2: CoreTemperamentVector = {
  openness: 0.6,
  conscientiousness: 0.4,
  extraversion: 0.8,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

export const VOLATILE_L3: NarrativeDriveVector = {
  lack: 0.4,
  volatility: 0.7,
  moralCompass: 0.5,
  growthArc: 0.5,
}

// ─── QUALITY TEST PATTERN ───────────────────────────────────
// 균형 잡힌, 안정적 품질 테스트 대상
// 사용: quality

export const QUALITY_L1: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.7,
  stance: 0.6,
  scope: 0.7,
  taste: 0.5,
  purpose: 0.8,
  sociability: 0.3,
}

export const QUALITY_L2: CoreTemperamentVector = {
  openness: 0.7,
  conscientiousness: 0.8,
  extraversion: 0.3,
  agreeableness: 0.4,
  neuroticism: 0.3,
}

export const QUALITY_L3: NarrativeDriveVector = {
  lack: 0.4,
  moralCompass: 0.7,
  volatility: 0.2,
  growthArc: 0.8,
}

// ─── HIGH ASSERTIVE PATTERN ─────────────────────────────────
// 높은 stance, 강한 주장성 — 파생 상태 테스트용
// 사용: interaction

export const HIGH_L1: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.7,
  stance: 0.85,
  scope: 0.6,
  taste: 0.4,
  purpose: 0.75,
  sociability: 0.3,
}

// ─── EXTREME PATTERNS ───────────────────────────────────────
// 경계값 테스트용

export const LOW_L1: SocialPersonaVector = {
  depth: 0.1,
  lens: 0.1,
  stance: 0.1,
  scope: 0.1,
  taste: 0.9,
  purpose: 0.1,
  sociability: 0.9,
}

export const HIGH_ALL_L1: SocialPersonaVector = {
  depth: 0.9,
  lens: 0.9,
  stance: 0.9,
  scope: 0.9,
  taste: 0.1,
  purpose: 0.9,
  sociability: 0.1,
}

export const LOW_L3: NarrativeDriveVector = {
  lack: 0.1,
  moralCompass: 0.1,
  volatility: 0.1,
  growthArc: 0.1,
}

export const HIGH_L3: NarrativeDriveVector = {
  lack: 0.9,
  moralCompass: 0.9,
  volatility: 0.9,
  growthArc: 0.9,
}
