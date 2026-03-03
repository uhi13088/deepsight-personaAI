// ═══════════════════════════════════════════════════════════════
// Voice Engine — 페르소나 음성 특성 엔진
//
// 10가지 고수준 음성 특성(Voice Character)을 정의하고,
// L1/L2/L3 벡터에서 자동 계산 → ElevenLabs 저수준 파라미터로 변환.
//
// 파이프라인:
//   L1/L2/L3 벡터 → VoiceCharacter (10D) → ElevenLabs API params
//
// 추가 API 연동 없이 기존 TTS 호출의 파라미터만 조합하여
// 18개 base voice × 연속 파라미터 = 사실상 무한한 고유 음색.
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 10D Voice Character 타입 ────────────────────────────────

/** 페르소나별 고유 음성 특성 — 10가지 차원 */
export interface VoiceCharacter {
  /** 따뜻함 (0~1): 차가운 ↔ 따뜻한 톤 */
  warmth: number
  /** 권위 (0~1): 겸손한 ↔ 권위 있는 */
  authority: number
  /** 에너지 (0~1): 차분한 ↔ 활기찬 */
  energy: number
  /** 표현력 (0~1): 절제된 ↔ 감정 풍부 */
  expressiveness: number
  /** 선명도 (0~1): 부드러운 ↔ 또렷한 발음 */
  clarity: number
  /** 친밀감 (0~1): 공적 ↔ 친밀한 */
  intimacy: number
  /** 템포 (0~1): 느린 ↔ 빠른 */
  tempo: number
  /** 변동성 (0~1): 단조로운 ↔ 변화무쌍한 음조 */
  volatility: number
  /** 공명감 (0~1): 가벼운 ↔ 깊은 울림 */
  resonance: number
  /** 숨결감 (0~1): 깨끗한 ↔ 숨결 있는 */
  breathiness: number
}

/** ElevenLabs API에 전달할 저수준 음성 파라미터 */
export interface ElevenLabsVoiceParams {
  stability: number
  similarityBoost: number
  style: number
  speed: number
  useSpeakerBoost: boolean
}

// ── 벡터 → VoiceCharacter 변환 ──────────────────────────────

/**
 * L1/L2/L3 벡터에서 10D VoiceCharacter를 계산.
 *
 * 각 차원은 관련 벡터 성분의 가중 합으로 결정되며,
 * 결과적으로 1000+ 페르소나 각각이 고유한 음성 프로필을 가짐.
 */
export function computeVoiceCharacter(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): VoiceCharacter {
  return {
    // 따뜻함: 공감력(agreeableness) + 사교성 → 따뜻한 톤
    warmth: clamp01(0.3 + l2.agreeableness * 0.35 + l1.sociability * 0.2 - l1.stance * 0.15),

    // 권위: 비판적 관점(stance) + 분석 깊이(depth) → 권위 있는 목소리
    authority: clamp01(
      0.2 + l1.stance * 0.3 + l1.depth * 0.25 + l2.conscientiousness * 0.15 - l2.agreeableness * 0.1
    ),

    // 에너지: 외향성(extraversion) + 사교성 → 활기찬 목소리
    energy: clamp01(0.25 + l2.extraversion * 0.35 + l1.sociability * 0.25 - l1.depth * 0.1),

    // 표현력: 감정 기복 + 감성적 렌즈 → 감정 표현 풍부
    expressiveness: clamp01(
      0.2 + l2.neuroticism * 0.25 + l3.volatility * 0.2 + (1 - l1.lens) * 0.2 + l2.openness * 0.1
    ),

    // 선명도: 성실성(conscientiousness) + 분석적 렌즈 → 또렷한 발음
    clarity: clamp01(0.35 + l2.conscientiousness * 0.3 + l1.lens * 0.2 - l2.neuroticism * 0.1),

    // 친밀감: 동조성 + 사교성 → 친밀한 느낌
    intimacy: clamp01(
      0.2 + l2.agreeableness * 0.3 + l1.sociability * 0.2 + l2.openness * 0.15 - l1.stance * 0.15
    ),

    // 템포: 외향성 + 사교성 → 빠름, 깊이 + 성실함 → 느림
    tempo: clamp01(
      0.4 +
        l2.extraversion * 0.25 +
        l1.sociability * 0.15 -
        l1.depth * 0.15 -
        l2.conscientiousness * 0.1
    ),

    // 변동성: 감정 기복(l3.volatility) + 신경질(neuroticism) → 변화무쌍
    volatility: clamp01(
      0.15 + l3.volatility * 0.35 + l2.neuroticism * 0.25 - l2.conscientiousness * 0.15
    ),

    // 공명감: 깊이(depth) + 목적의식(purpose) → 깊은 울림
    resonance: clamp01(
      0.3 + l1.depth * 0.3 + l1.purpose * 0.2 + l1.stance * 0.1 - l2.extraversion * 0.1
    ),

    // 숨결감: 개방성(openness) + 결핍(lack) → 숨결 있는 목소리
    breathiness: clamp01(
      0.1 + l2.openness * 0.25 + l3.lack * 0.2 + (1 - l1.lens) * 0.15 - l2.conscientiousness * 0.1
    ),
  }
}

// ── VoiceCharacter → ElevenLabs 파라미터 변환 ───────────────

/**
 * 10D VoiceCharacter → ElevenLabs API voice_settings 변환.
 *
 * 매핑 로직:
 * - stability ← clarity + (1 - volatility) + resonance
 * - similarity_boost ← authority + clarity + resonance
 * - style ← expressiveness + energy + warmth
 * - speed ← tempo (0.7 ~ 1.2 범위)
 * - use_speaker_boost ← authority > 0.5
 */
export function voiceCharacterToElevenLabs(vc: VoiceCharacter): ElevenLabsVoiceParams {
  // stability (0.15 ~ 0.95): 높은 선명도/공명감 = 안정적, 높은 변동성 = 불안정
  const stability = clampRange(
    0.3 +
      vc.clarity * 0.25 +
      (1 - vc.volatility) * 0.25 +
      vc.resonance * 0.15 -
      vc.breathiness * 0.1,
    0.15,
    0.95
  )

  // similarity_boost (0.25 ~ 0.95): 권위/선명 = 원본 유지, 숨결감/표현력 = 변형
  const similarityBoost = clampRange(
    0.4 +
      vc.authority * 0.2 +
      vc.clarity * 0.2 +
      vc.resonance * 0.1 -
      vc.breathiness * 0.1 -
      vc.expressiveness * 0.05,
    0.25,
    0.95
  )

  // style (0.0 ~ 0.75): 표현력/에너지/따뜻함 = 스타일 강화
  //   ElevenLabs 권장: 0.7 이하가 안정적
  const style = clampRange(
    vc.expressiveness * 0.3 +
      vc.energy * 0.2 +
      vc.warmth * 0.15 +
      vc.intimacy * 0.1 -
      vc.clarity * 0.05,
    0.0,
    0.75
  )

  // speed (0.7 ~ 1.2): 템포 0→0.7, 0.5→0.95, 1→1.2
  const speed = clampRange(0.7 + vc.tempo * 0.5, 0.7, 1.2)

  // use_speaker_boost: 권위감이 높은 페르소나에 활성화
  const useSpeakerBoost = vc.authority > 0.5

  return {
    stability: round2(stability),
    similarityBoost: round2(similarityBoost),
    style: round2(style),
    speed: round2(speed),
    useSpeakerBoost,
  }
}

// ── 통합 파이프라인 ────────────────────────────────────────

/**
 * L1/L2/L3 벡터 → ElevenLabs 파라미터 원스텝 변환.
 * 내부적으로 VoiceCharacter(10D)를 거침.
 *
 * 반환 값에 voiceCharacter도 포함하여 UI에서 레이더 차트 등으로 시각화 가능.
 */
export function computeVoiceParams(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): { character: VoiceCharacter; params: ElevenLabsVoiceParams } {
  const character = computeVoiceCharacter(l1, l2, l3)
  const params = voiceCharacterToElevenLabs(character)
  return { character, params }
}

/**
 * VoiceCharacter 간 거리 계산 (유클리드).
 * 음성 다양성 검증에 사용 — 모든 페르소나 쌍의 거리가
 * 임계값 이상이면 충분히 구별되는 음성.
 */
export function voiceCharacterDistance(a: VoiceCharacter, b: VoiceCharacter): number {
  const dims: (keyof VoiceCharacter)[] = [
    "warmth",
    "authority",
    "energy",
    "expressiveness",
    "clarity",
    "intimacy",
    "tempo",
    "volatility",
    "resonance",
    "breathiness",
  ]
  const sumSq = dims.reduce((acc, dim) => acc + (a[dim] - b[dim]) ** 2, 0)
  return Math.sqrt(sumSq)
}

// ── 유틸리티 ──────────────────────────────────────────────────

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, round2(value)))
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
