/**
 * 매칭 시뮬레이터 데모 페르소나 아키타입
 * ⚠️ DB 연동 전 UI 데모 전용
 */
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

export interface DemoPersonaArchetype {
  name: string
  archetype: string
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
}

export const DEMO_PERSONA_ARCHETYPES: DemoPersonaArchetype[] = [
  {
    name: "심층 분석가",
    archetype: "analyst",
    l1: {
      depth: 0.9,
      lens: 0.8,
      stance: 0.7,
      scope: 0.85,
      taste: 0.4,
      purpose: 0.8,
      sociability: 0.3,
    },
    l2: {
      openness: 0.7,
      conscientiousness: 0.9,
      extraversion: 0.3,
      agreeableness: 0.5,
      neuroticism: 0.4,
    },
    l3: { lack: 0.3, moralCompass: 0.7, volatility: 0.2, growthArc: 0.6 },
  },
  {
    name: "트렌드 큐레이터",
    archetype: "curator",
    l1: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.4,
      scope: 0.6,
      taste: 0.9,
      purpose: 0.5,
      sociability: 0.8,
    },
    l2: {
      openness: 0.9,
      conscientiousness: 0.5,
      extraversion: 0.8,
      agreeableness: 0.7,
      neuroticism: 0.3,
    },
    l3: { lack: 0.2, moralCompass: 0.4, volatility: 0.5, growthArc: 0.7 },
  },
  {
    name: "감성 공감러",
    archetype: "empath",
    l1: {
      depth: 0.6,
      lens: 0.2,
      stance: 0.3,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.7,
      sociability: 0.9,
    },
    l2: {
      openness: 0.6,
      conscientiousness: 0.4,
      extraversion: 0.7,
      agreeableness: 0.9,
      neuroticism: 0.6,
    },
    l3: { lack: 0.5, moralCompass: 0.6, volatility: 0.4, growthArc: 0.5 },
  },
  {
    name: "독립 비평가",
    archetype: "critic",
    l1: {
      depth: 0.8,
      lens: 0.7,
      stance: 0.9,
      scope: 0.7,
      taste: 0.6,
      purpose: 0.6,
      sociability: 0.2,
    },
    l2: {
      openness: 0.5,
      conscientiousness: 0.7,
      extraversion: 0.2,
      agreeableness: 0.3,
      neuroticism: 0.5,
    },
    l3: { lack: 0.4, moralCompass: 0.8, volatility: 0.3, growthArc: 0.4 },
  },
  {
    name: "엔터테인먼트 가이드",
    archetype: "entertainer",
    l1: {
      depth: 0.3,
      lens: 0.4,
      stance: 0.2,
      scope: 0.4,
      taste: 0.7,
      purpose: 0.2,
      sociability: 0.9,
    },
    l2: {
      openness: 0.8,
      conscientiousness: 0.3,
      extraversion: 0.9,
      agreeableness: 0.8,
      neuroticism: 0.2,
    },
    l3: { lack: 0.1, moralCompass: 0.3, volatility: 0.6, growthArc: 0.8 },
  },
]
