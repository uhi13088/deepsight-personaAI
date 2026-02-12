// ═══════════════════════════════════════════════════════════════
// 정성적 차원 모듈 — Barrel Export
// T72: Backstory + Voice + Pressure + Zeitgeist
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  BackstoryDimension,
  VoiceProfile,
  PressureContext,
  ZeitgeistProfile,
  PersonaArchetype,
} from "@/types"
import { generateBackstory } from "./backstory-generator"
import { generateVoiceProfile } from "./voice-generator"
import { generatePressureContext } from "./pressure-generator"
import { generateZeitgeistProfile } from "./zeitgeist-generator"

// ── 통합 정성적 차원 ─────────────────────────────────────────

export interface QualitativeDimensions {
  backstory: BackstoryDimension
  voice: VoiceProfile
  pressure: PressureContext
  zeitgeist: ZeitgeistProfile
}

/**
 * 벡터 기반으로 모든 정성적 차원을 한 번에 생성
 */
export function generateAllQualitativeDimensions(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): QualitativeDimensions {
  return {
    backstory: generateBackstory(l1, l2, l3, archetype),
    voice: generateVoiceProfile(l1, l2, l3, archetype),
    pressure: generatePressureContext(l1, l2, l3, archetype),
    zeitgeist: generateZeitgeistProfile(l1, l2, l3, archetype),
  }
}

// ── Re-exports ────────────────────────────────────────────────

export { generateBackstory } from "./backstory-generator"
export { generateVoiceProfile } from "./voice-generator"
export { generatePressureContext } from "./pressure-generator"
export { generateZeitgeistProfile } from "./zeitgeist-generator"
