// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — SNS Data Processor
// 구현계획서 §8, 설계서 §9.3
// SNS 데이터 → Init 알고리즘 → L1/L2 벡터 생성
// LLM 분석 옵션: Claude Sonnet으로 심층 분석 가능
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector } from "@/types/persona-v3"
import type { SNSExtendedData, OnboardingResult } from "../types"
import { calculateInitDelta } from "@/lib/interaction/init-algorithm"
import { analyzeSnsWithLlm, type SnsLlmAnalysisResult } from "./sns-llm-analyzer"
import type { SnsExtractedProfile } from "./sns-analyzer"
import { isLLMConfigured } from "@/lib/llm-client"

/**
 * SNS 데이터 프로바이더 (DI).
 */
export interface SnsDataProvider {
  /**
   * 유저의 SNS 연결 정보 조회.
   */
  getSnsConnections(userId: string): Promise<SNSExtendedData[]>

  /**
   * SNS 처리 결과 저장.
   */
  saveSnsResult(userId: string, result: OnboardingResult): Promise<void>
}

// ── L1/L2 기본값 (중립) ──────────────────────────────────────

const L1_BASE: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

const L2_BASE: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

/**
 * L2 차원별 키워드 → delta 매핑.
 * SNS 텍스트에서 추출된 키워드 카테고리를 L2 OCEAN 차원에 매핑.
 *
 * 설계서 §9.3: SNS 활동 패턴 → OCEAN 추론
 */
const L2_CATEGORY_DELTAS: Record<string, Partial<CoreTemperamentVector>> = {
  analytical: { conscientiousness: 0.06, openness: 0.03 },
  emotional: { neuroticism: 0.05, agreeableness: 0.03 },
  critical: { agreeableness: -0.05, conscientiousness: 0.03 },
  social: { extraversion: 0.08, agreeableness: 0.03 },
  creative: { openness: 0.08 },
  serious: { conscientiousness: 0.05, openness: 0.03 },
  casual: { conscientiousness: -0.05, extraversion: 0.03 },
  detailed: { conscientiousness: 0.06, openness: 0.03 },
}

const L2_KEYS: (keyof CoreTemperamentVector)[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
]

/**
 * SNS 데이터 → Init 알고리즘으로 벡터 생성.
 *
 * 설계서 §9.3:
 * 1. SNS 프로필 데이터에서 텍스트 추출
 * 2. Init 알고리즘 (키워드 추출 → 카테고리 → delta) 적용
 * 3. 기존 벡터가 있으면 보정, 없으면 신규 생성
 * 4. 플랫폼 수에 따라 프로필 레벨 결정
 */
export async function processSnsData(
  snsData: SNSExtendedData[],
  existingVector?: { l1: SocialPersonaVector; l2?: CoreTemperamentVector }
): Promise<OnboardingResult> {
  if (snsData.length === 0) {
    return {
      l1Vector: existingVector?.l1 ?? { ...L1_BASE },
      l2Vector: existingVector?.l2 ?? { ...L2_BASE },
      profileLevel: existingVector ? "STANDARD" : "BASIC",
      confidence: existingVector ? 0.7 : 0.5,
    }
  }

  // 1. 모든 SNS 데이터에서 텍스트 추출
  const combinedText = extractCombinedText(snsData)

  // 2. Init 알고리즘으로 L1 벡터 조정
  const baseL1 = existingVector?.l1 ?? { ...L1_BASE }
  const initResult = calculateInitDelta(baseL1, combinedText)
  const l1Vector = initResult.adjustedVector

  // 3. 동일 카테고리 결과로 L2 벡터 추론
  const baseL2 = existingVector?.l2 ?? { ...L2_BASE }
  const l2Vector = computeL2FromCategories(baseL2, initResult.detectedCategories)

  // 4. 프로필 레벨 결정 (플랫폼 수 기반)
  const platformCount = snsData.length
  const profileLevel = determineProfileLevel(platformCount, !!existingVector)

  // 5. 신뢰도 계산 (카테고리 다양성 + 플랫폼 수)
  const confidence = computeSnsConfidence(
    initResult.detectedCategories.length,
    platformCount,
    !!existingVector
  )

  return { l1Vector, l2Vector, profileLevel, confidence }
}

// ── LLM 분석 결과 타입 (외부 노출용) ────────────────────────

export interface SnsProcessResultWithLlm extends OnboardingResult {
  /** LLM 분석 요약 (한국어) */
  llmSummary?: string
  /** LLM이 추출한 성향 키워드 */
  llmTraits?: string[]
}

/**
 * SNS 데이터를 Claude Sonnet으로 심층 분석하여 벡터 생성.
 *
 * 규칙 기반 결과(30%)와 LLM 결과(70%)를 블렌딩하여
 * 더 정확한 벡터를 산출함.
 *
 * LLM 호출 실패 시 규칙 기반 결과로 fallback.
 */
export async function processSnsDataWithLlm(
  snsData: SNSExtendedData[],
  existingVector?: { l1: SocialPersonaVector; l2?: CoreTemperamentVector }
): Promise<SnsProcessResultWithLlm> {
  // 규칙 기반 결과 먼저 계산 (fallback용)
  const ruleResult = await processSnsData(snsData, existingVector)

  // LLM 미설정 시 규칙 기반만 반환
  if (!isLLMConfigured()) {
    console.warn("[sns-processor] ANTHROPIC_API_KEY 미설정 — 규칙 기반 분석만 사용")
    return ruleResult
  }

  // extractedData를 SnsExtractedProfile로 변환
  const extractedProfiles: SnsExtractedProfile[] = snsData
    .map((d) => d.extractedData as unknown as SnsExtractedProfile)
    .filter((p) => p?.platform)

  if (extractedProfiles.length === 0) {
    return ruleResult
  }

  let llmResult: SnsLlmAnalysisResult
  try {
    llmResult = await analyzeSnsWithLlm(extractedProfiles, {
      l1: existingVector?.l1,
      l2: existingVector?.l2,
    })
  } catch (error) {
    console.error("[sns-processor] LLM 분석 실패, 규칙 기반 fallback:", error)
    return ruleResult
  }

  // 블렌딩: 규칙 기반 30% + LLM 70%
  const RULE_WEIGHT = 0.3
  const LLM_WEIGHT = 0.7

  const l1Vector = blendL1(ruleResult.l1Vector, llmResult.l1, RULE_WEIGHT, LLM_WEIGHT)
  const l2Vector = blendL2(ruleResult.l2Vector ?? L2_BASE, llmResult.l2, RULE_WEIGHT, LLM_WEIGHT)

  // LLM 신뢰도가 높으면 confidence 부스트
  const confidence = Math.min(
    0.98,
    ruleResult.confidence * RULE_WEIGHT + llmResult.confidence * LLM_WEIGHT + 0.05
  )

  return {
    l1Vector,
    l2Vector,
    profileLevel: ruleResult.profileLevel,
    confidence,
    llmSummary: llmResult.summary,
    llmTraits: llmResult.traits,
  }
}

/** L1 벡터 블렌딩 */
function blendL1(
  rule: SocialPersonaVector,
  llm: SocialPersonaVector,
  rw: number,
  lw: number
): SocialPersonaVector {
  return {
    depth: clamp(rule.depth * rw + llm.depth * lw),
    lens: clamp(rule.lens * rw + llm.lens * lw),
    stance: clamp(rule.stance * rw + llm.stance * lw),
    scope: clamp(rule.scope * rw + llm.scope * lw),
    taste: clamp(rule.taste * rw + llm.taste * lw),
    purpose: clamp(rule.purpose * rw + llm.purpose * lw),
    sociability: clamp(rule.sociability * rw + llm.sociability * lw),
  }
}

/** L2 벡터 블렌딩 */
function blendL2(
  rule: CoreTemperamentVector,
  llm: CoreTemperamentVector,
  rw: number,
  lw: number
): CoreTemperamentVector {
  return {
    openness: clamp(rule.openness * rw + llm.openness * lw),
    conscientiousness: clamp(rule.conscientiousness * rw + llm.conscientiousness * lw),
    extraversion: clamp(rule.extraversion * rw + llm.extraversion * lw),
    agreeableness: clamp(rule.agreeableness * rw + llm.agreeableness * lw),
    neuroticism: clamp(rule.neuroticism * rw + llm.neuroticism * lw),
  }
}

/**
 * SNS 프로필에서 텍스트 추출.
 * profileData + extractedData에서 문자열 값을 합침.
 */
export function extractCombinedText(snsData: SNSExtendedData[]): string {
  const texts: string[] = []

  for (const data of snsData) {
    texts.push(...extractTextValues(data.profileData))
    texts.push(...extractTextValues(data.extractedData))
  }

  return texts.join(" ")
}

/**
 * 객체에서 문자열 값만 재귀 추출.
 */
function extractTextValues(obj: Record<string, unknown>): string[] {
  const results: string[] = []
  for (const value of Object.values(obj)) {
    if (typeof value === "string") {
      results.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") results.push(item)
      }
    } else if (value && typeof value === "object") {
      results.push(...extractTextValues(value as Record<string, unknown>))
    }
  }
  return results
}

/**
 * Init 알고리즘의 카테고리 결과로 L2 OCEAN 벡터 추론.
 */
function computeL2FromCategories(
  base: CoreTemperamentVector,
  categories: string[]
): CoreTemperamentVector {
  const result = { ...base }

  for (const cat of categories) {
    const delta = L2_CATEGORY_DELTAS[cat]
    if (!delta) continue
    for (const key of L2_KEYS) {
      if (delta[key] != null) {
        result[key] = clamp(result[key] + delta[key])
      }
    }
  }

  return result
}

/**
 * 프로필 레벨 결정.
 *
 * 설계서 §9.3:
 * - 1 SNS → STANDARD
 * - 2+ SNS → ADVANCED
 * - 온보딩 + SNS 조합 → PREMIUM
 */
function determineProfileLevel(
  platformCount: number,
  hasExistingVector: boolean
): OnboardingResult["profileLevel"] {
  if (hasExistingVector && platformCount >= 1) return "PREMIUM"
  if (platformCount >= 2) return "ADVANCED"
  return "STANDARD"
}

/**
 * SNS 기반 신뢰도 산출.
 *
 * categoryCount: 감지된 카테고리 수 (다양성 지표)
 * platformCount: 연결된 SNS 플랫폼 수
 * hasExistingVector: 이미 온보딩 벡터가 있는지
 */
function computeSnsConfidence(
  categoryCount: number,
  platformCount: number,
  hasExistingVector: boolean
): number {
  // 기본: 0.6
  // 카테고리 다양성: +0.02 per category (max 0.16)
  // 플랫폼 수: +0.03 per platform (max 0.15)
  // 기존 벡터 존재: +0.05
  const categoryBonus = Math.min(0.16, categoryCount * 0.02)
  const platformBonus = Math.min(0.15, platformCount * 0.03)
  const existingBonus = hasExistingVector ? 0.05 : 0
  return Math.min(0.98, 0.6 + categoryBonus + platformBonus + existingBonus)
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}
