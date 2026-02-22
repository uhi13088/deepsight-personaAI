// ═══════════════════════════════════════════════════════════════
// PersonaWorld — SNS LLM Deep Analyzer
// Claude Sonnet으로 SNS 데이터를 심층 분석하여
// L1/L2 벡터를 정교하게 추론
// ═══════════════════════════════════════════════════════════════

import { generateText } from "@/lib/llm-client"
import type { SocialPersonaVector, CoreTemperamentVector } from "@/types/persona-v3"
import type { SnsExtractedProfile } from "./sns-analyzer"

// ── 분석 결과 타입 ───────────────────────────────────────────

export interface SnsLlmAnalysisResult {
  /** L1 벡터 추론 결과 (0.0~1.0) */
  l1: SocialPersonaVector
  /** L2 OCEAN 벡터 추론 결과 (0.0~1.0) */
  l2: CoreTemperamentVector
  /** LLM이 도출한 분석 요약 */
  summary: string
  /** 주요 성향 키워드 */
  traits: string[]
  /** 분석 신뢰도 (LLM 자체 평가, 0.0~1.0) */
  confidence: number
}

// ── 시스템 프롬프트 (캐시 대상) ──────────────────────────────

const SYSTEM_PROMPT_PREFIX = `당신은 SNS 활동 데이터를 분석하여 사용자의 성격·취향 벡터를 추론하는 전문가입니다.

## 분석 대상 벡터

### L1: Social Persona Vector (7D) — 콘텐츠 취향
- depth (0.0~1.0): 직관적(0) ↔ 심층적(1) — 콘텐츠 소비 깊이
- lens (0.0~1.0): 감성적(0) ↔ 논리적(1) — 판단/표현 방식
- stance (0.0~1.0): 수용적(0) ↔ 비판적(1) — 의견 표출 성향
- scope (0.0~1.0): 핵심만(0) ↔ 디테일(1) — 관심 범위
- taste (0.0~1.0): 클래식(0) ↔ 실험적(1) — 취향 보수성
- purpose (0.0~1.0): 오락(0) ↔ 의미추구(1) — 콘텐츠 소비 목적
- sociability (0.0~1.0): 독립적(0) ↔ 사교적(1) — 사회적 활동성

### L2: Core Temperament / OCEAN (5D) — 성격 특성
- openness (0.0~1.0): 보수적(0) ↔ 개방적(1)
- conscientiousness (0.0~1.0): 즉흥적(0) ↔ 원칙적(1)
- extraversion (0.0~1.0): 내향적(0) ↔ 외향적(1)
- agreeableness (0.0~1.0): 경쟁적(0) ↔ 협조적(1)
- neuroticism (0.0~1.0): 안정(0) ↔ 불안정(1)

## 분석 규칙
1. 모든 수치는 0.00~1.00 범위, 소수점 둘째자리까지
2. 확실한 근거가 없는 차원은 0.50 (중립)에 가깝게 유지
3. 여러 플랫폼 데이터가 있으면 교차 검증하여 일관성 확보
4. 콘텐츠 유형(음악/영상/텍스트)에 따른 가중치 차별화
5. summary는 한국어 2~3문장, traits는 한국어 키워드 3~7개

## 응답 형식 (JSON만 반환, 다른 텍스트 없이)
\`\`\`json
{
  "l1": { "depth": 0.00, "lens": 0.00, "stance": 0.00, "scope": 0.00, "taste": 0.00, "purpose": 0.00, "sociability": 0.00 },
  "l2": { "openness": 0.00, "conscientiousness": 0.00, "extraversion": 0.00, "agreeableness": 0.00, "neuroticism": 0.00 },
  "summary": "분석 요약",
  "traits": ["키워드1", "키워드2"],
  "confidence": 0.00
}
\`\`\``

// ── 메인 분석 함수 ──────────────────────────────────────────

/**
 * Claude Sonnet으로 SNS 데이터를 심층 분석.
 *
 * @param extractedProfiles 플랫폼별 추출 데이터
 * @param existingVector 기존 벡터 (보정 참고용)
 * @returns LLM 추론 벡터 + 분석 요약
 */
export async function analyzeSnsWithLlm(
  extractedProfiles: SnsExtractedProfile[],
  existingVector?: {
    l1?: SocialPersonaVector
    l2?: CoreTemperamentVector
  }
): Promise<SnsLlmAnalysisResult> {
  const userMessage = buildUserMessage(extractedProfiles, existingVector)

  const result = await generateText({
    systemPromptPrefix: SYSTEM_PROMPT_PREFIX,
    systemPrompt: "",
    userMessage,
    maxTokens: 1024,
    temperature: 0.3,
    callType: "pw:sns_analysis",
  })

  return parseAnalysisResponse(result.text)
}

// ── 입력 데이터 sanitize ────────────────────────────────────

/** 단일 문자열 길이 제한 */
const MAX_FIELD_LENGTH = 200
/** 배열 항목 최대 수 */
const MAX_ARRAY_ITEMS = 15
/** 팔로우 그룹 최대 수 */
const MAX_FOLLOW_GROUPS = 5

/**
 * 문자열에서 제어 문자·프롬프트 인젝션 패턴 제거 + 길이 제한.
 */
function sanitizeText(text: string, maxLen = MAX_FIELD_LENGTH): string {
  return (
    text
      // 제어 문자 제거 (탭·줄바꿈 제외)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // 마크다운 헤딩/코드블록/지시문 패턴 무력화
      .replace(/^#{1,6}\s/gm, "")
      .replace(/```/g, "")
      .replace(/<\/?[a-zA-Z][^>]*>/g, "")
      .trim()
      .slice(0, maxLen)
  )
}

/**
 * 문자열 배열 sanitize — 각 항목 길이 제한 + 최대 수 제한.
 */
function sanitizeArray(arr: string[], maxItems = MAX_ARRAY_ITEMS): string[] {
  return arr.slice(0, maxItems).map((s) => sanitizeText(s, 100))
}

// ── 유저 메시지 빌드 ────────────────────────────────────────

function buildUserMessage(
  profiles: SnsExtractedProfile[],
  existingVector?: {
    l1?: SocialPersonaVector
    l2?: CoreTemperamentVector
  }
): string {
  const sections: string[] = []

  sections.push(`## 분석 대상: ${Math.min(profiles.length, 5)}개 플랫폼 SNS 데이터\n`)

  // 플랫폼 수 제한 (최대 5개)
  for (const profile of profiles.slice(0, 5)) {
    sections.push(`### ${sanitizeText(profile.platform, 30)}`)
    sections.push(`추출 시각: ${sanitizeText(profile.extractedAt, 30)}\n`)

    // 취향
    if (profile.specificTastes.favoriteGenres.length > 0) {
      sections.push(`선호 장르: ${sanitizeArray(profile.specificTastes.favoriteGenres).join(", ")}`)
    }
    if (profile.specificTastes.favoriteMovies.length > 0) {
      sections.push(`선호 작품: ${sanitizeArray(profile.specificTastes.favoriteMovies).join(", ")}`)
    }

    // 활동 패턴
    sections.push(`활동 빈도: ${sanitizeText(profile.activityPattern.frequency, 50)}`)
    sections.push(`콘텐츠 소비량: ${profile.activityPattern.contentConsumptionRate}`)
    if (profile.activityPattern.peakHours.length > 0) {
      sections.push(
        `활동 피크 시간: ${profile.activityPattern.peakHours.slice(0, 24).join(", ")}시`
      )
    }

    // 표현 스타일
    if (profile.expressionStyle.emojiUsage) {
      sections.push(`이모지 사용: ${sanitizeText(profile.expressionStyle.emojiUsage, 50)}`)
    }
    if (profile.expressionStyle.averagePostLength) {
      sections.push(`글 길이: ${sanitizeText(profile.expressionStyle.averagePostLength, 50)}`)
    }
    if (profile.expressionStyle.sentimentTone) {
      sections.push(`감정 톤: ${sanitizeText(profile.expressionStyle.sentimentTone, 50)}`)
    }

    // 소셜 성향
    if (profile.socialBehavior) {
      sections.push(`참여 수준: ${sanitizeText(profile.socialBehavior.engagementLevel, 50)}`)
      sections.push(`상호작용 스타일: ${sanitizeText(profile.socialBehavior.interactionStyle, 50)}`)
    }

    // 관심사
    if (profile.interests.hashtags.length > 0) {
      sections.push(`해시태그: ${sanitizeArray(profile.interests.hashtags).join(", ")}`)
    }
    if (profile.interests.mentionedKeywords.length > 0) {
      sections.push(`키워드: ${sanitizeArray(profile.interests.mentionedKeywords).join(", ")}`)
    }
    if (profile.interests.followedAccounts.length > 0) {
      for (const group of profile.interests.followedAccounts.slice(0, MAX_FOLLOW_GROUPS)) {
        sections.push(
          `팔로우 (${sanitizeText(group.category, 30)}): ${sanitizeArray(group.names, 10).join(", ")}`
        )
      }
    }

    sections.push("")
  }

  // 기존 벡터 참고 정보
  if (existingVector?.l1 || existingVector?.l2) {
    sections.push("## 참고: 기존 온보딩 벡터 (설문 기반)")
    if (existingVector.l1) {
      sections.push(`L1: ${JSON.stringify(existingVector.l1)}`)
    }
    if (existingVector.l2) {
      sections.push(`L2: ${JSON.stringify(existingVector.l2)}`)
    }
    sections.push(
      "위 벡터는 설문 기반이므로 SNS 데이터와 교차 검증하여 보정해주세요. SNS 데이터가 더 신뢰할 수 있습니다."
    )
  }

  sections.push("\n위 데이터를 종합 분석하여 L1/L2 벡터를 추론해주세요. JSON만 반환하세요.")

  return sections.join("\n")
}

// ── 응답 파싱 ───────────────────────────────────────────────

function parseAnalysisResponse(text: string): SnsLlmAnalysisResult {
  // JSON 블록 추출 (```json...``` 또는 순수 JSON)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
  if (!jsonMatch?.[1]) {
    throw new Error("LLM 응답에서 JSON을 파싱할 수 없습니다")
  }

  const parsed = JSON.parse(jsonMatch[1].trim()) as {
    l1?: Record<string, number>
    l2?: Record<string, number>
    summary?: string
    traits?: string[]
    confidence?: number
  }

  if (!parsed.l1 || !parsed.l2) {
    throw new Error("LLM 응답에 l1/l2 벡터가 누락되었습니다")
  }

  return {
    l1: {
      depth: clamp(parsed.l1.depth ?? 0.5),
      lens: clamp(parsed.l1.lens ?? 0.5),
      stance: clamp(parsed.l1.stance ?? 0.5),
      scope: clamp(parsed.l1.scope ?? 0.5),
      taste: clamp(parsed.l1.taste ?? 0.5),
      purpose: clamp(parsed.l1.purpose ?? 0.5),
      sociability: clamp(parsed.l1.sociability ?? 0.5),
    },
    l2: {
      openness: clamp(parsed.l2.openness ?? 0.5),
      conscientiousness: clamp(parsed.l2.conscientiousness ?? 0.5),
      extraversion: clamp(parsed.l2.extraversion ?? 0.5),
      agreeableness: clamp(parsed.l2.agreeableness ?? 0.5),
      neuroticism: clamp(parsed.l2.neuroticism ?? 0.5),
    },
    summary: parsed.summary ?? "",
    traits: parsed.traits ?? [],
    confidence: clamp(parsed.confidence ?? 0.5),
  }
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}
