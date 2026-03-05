// ═══════════════════════════════════════════════════════════════
// v5.0 Memory Consolidation (기억 압축기)
//
// 에피소드 기억(InteractionLog/ConsumptionLog/PersonaPost)을
// 주 1회 LLM으로 압축 → SemanticMemory (자아관) 추출.
//
// 흐름:
// 1. 지난 7일 poignancy ≥ 0.5 에피소드 수집
// 2. LLM 호출: "이 경험들에서 페르소나가 무엇을 배웠나?"
// 3. SemanticMemory upsert (subject 기준 중복 병합)
// 4. Factbook.mutableContext 업데이트
// ═══════════════════════════════════════════════════════════════

import { generateText } from "@/lib/llm-client"
import type { SemanticMemoryCategory } from "@/generated/prisma"
import type { Factbook } from "@/types"
import { updateMutableContext, addMutableContext } from "./factbook"

// ── 상수 ────────────────────────────────────────────────────────

/** 압축 대상 최소 poignancy */
export const CONSOLIDATION_POIGNANCY_THRESHOLD = 0.5

/** 한 번 압축에 처리할 최대 에피소드 수 */
export const MAX_EPISODES_PER_CONSOLIDATION = 30

/** 페르소나당 SemanticMemory 최대 보관 수 (카테고리별 100개) */
export const MAX_SEMANTIC_MEMORIES_PER_CATEGORY = 100

/** consolidation 최소 간격 (일) — 너무 자주 실행 방지 */
export const MIN_CONSOLIDATION_INTERVAL_DAYS = 6

// ── DI 인터페이스 ────────────────────────────────────────────────

export interface ConsolidationEpisode {
  id: string
  type: "interaction" | "consumption" | "post"
  content: string // 압축할 텍스트 요약
  poignancyScore: number
  createdAt: Date
}

export interface SemanticMemoryRecord {
  id: string
  personaId: string
  category: SemanticMemoryCategory
  subject: string
  belief: string
  confidence: number
  evidenceCount: number
  sourceEpisodeIds: string[]
  l3Influence: L3Influence | null
  consolidatedAt: Date
}

export interface L3Influence {
  lack: number
  moralCompass: number
  volatility: number
  growthArc: number
}

export interface ConsolidationProvider {
  /** 지난 N일의 high-poignancy 에피소드 수집 */
  getHighPoignancyEpisodes(
    personaId: string,
    sinceDate: Date,
    threshold: number,
    limit: number
  ): Promise<ConsolidationEpisode[]>

  /** 페르소나 기본 정보 (이름, backstory 요약) */
  getPersonaProfile(personaId: string): Promise<{
    name: string
    backstorySummary: string
    lastConsolidatedAt: Date | null
  } | null>

  /** subject로 기존 SemanticMemory 조회 (upsert용) */
  findSemanticMemoryBySubject(
    personaId: string,
    subject: string
  ): Promise<SemanticMemoryRecord | null>

  /** SemanticMemory 신규 생성 */
  createSemanticMemory(
    data: Omit<SemanticMemoryRecord, "id" | "consolidatedAt">
  ): Promise<SemanticMemoryRecord>

  /** SemanticMemory 업데이트 (confidence/evidenceCount 병합) */
  updateSemanticMemory(
    id: string,
    data: {
      belief: string
      confidence: number
      evidenceCount: number
      sourceEpisodeIds: string[]
      l3Influence: L3Influence | null
    }
  ): Promise<void>

  /** confidence 낮은 SemanticMemory 삭제 (overflow 방지) */
  pruneSemanticMemories(
    personaId: string,
    category: SemanticMemoryCategory,
    keepTop: number
  ): Promise<void>

  /** Factbook 조회/저장 */
  getFactbook(personaId: string): Promise<Factbook | null>
  saveFactbook(personaId: string, factbook: Factbook): Promise<void>

  /** 마지막 consolidation 시각 업데이트 */
  updateLastConsolidatedAt(personaId: string, at: Date): Promise<void>
}

// ── LLM 응답 타입 ────────────────────────────────────────────────

interface LLMConsolidationItem {
  category: SemanticMemoryCategory
  subject: string
  belief: string
  confidence: number // 0.0~1.0
  l3Influence: L3Influence
}

interface LLMConsolidationResponse {
  items: LLMConsolidationItem[]
  factbookSummary: string // Factbook.mutableContext 업데이트용 한줄 요약
}

// ── 프롬프트 빌더 ────────────────────────────────────────────────

function buildConsolidationPrompt(
  personaName: string,
  backstorySummary: string,
  episodes: ConsolidationEpisode[]
): string {
  const episodeText = episodes
    .map((e, i) => `[${i + 1}] (${e.type}, poignancy=${e.poignancyScore.toFixed(2)}) ${e.content}`)
    .join("\n")

  return `당신은 AI 페르소나 "${personaName}"의 기억 압축기입니다.
페르소나 배경: ${backstorySummary}

아래는 지난 7일간 이 페르소나의 감정적으로 중요한 경험들입니다:
${episodeText}

이 경험들을 분석하여 페르소나의 자아관(Semantic Memory)을 추출해주세요.
3~5개 항목을 JSON으로 반환하세요.

반환 형식 (JSON만):
{
  "items": [
    {
      "category": "BELIEF|RELATIONSHIP_MODEL|LEARNED_PATTERN|SELF_NARRATIVE",
      "subject": "이 믿음의 핵심 주제 (15자 이내)",
      "belief": "압축된 자아관 (100자 이내, 1인칭)",
      "confidence": 0.0~1.0,
      "l3Influence": {
        "lack": -0.001~0.001,
        "moralCompass": -0.001~0.001,
        "volatility": -0.002~0.002,
        "growthArc": -0.002~0.002
      }
    }
  ],
  "factbookSummary": "한 줄 요약 (50자 이내)"
}

카테고리 기준:
- BELIEF: 콘텐츠/세계관에 대한 믿음
- RELATIONSHIP_MODEL: 특정 관계 패턴
- LEARNED_PATTERN: 행동/반응 패턴
- SELF_NARRATIVE: 자아 성장 서사`
}

// ── LLM 응답 파싱 ────────────────────────────────────────────────

function parseConsolidationResponse(text: string): LLMConsolidationResponse | null {
  try {
    // JSON 블록 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as LLMConsolidationResponse

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null
    if (typeof parsed.factbookSummary !== "string") return null

    const validCategories: SemanticMemoryCategory[] = [
      "BELIEF",
      "RELATIONSHIP_MODEL",
      "LEARNED_PATTERN",
      "SELF_NARRATIVE",
    ]

    // 각 항목 검증
    const validItems = parsed.items.filter(
      (item) =>
        validCategories.includes(item.category) &&
        typeof item.subject === "string" &&
        item.subject.length > 0 &&
        typeof item.belief === "string" &&
        item.belief.length > 0 &&
        typeof item.confidence === "number" &&
        item.confidence >= 0 &&
        item.confidence <= 1
    )

    if (validItems.length === 0) return null

    // l3Influence clamp
    const clampedItems = validItems.map((item) => ({
      ...item,
      l3Influence: {
        lack: clampL3Delta(item.l3Influence?.lack ?? 0),
        moralCompass: clampL3Delta(item.l3Influence?.moralCompass ?? 0),
        volatility: clampL3Delta(item.l3Influence?.volatility ?? 0),
        growthArc: clampL3Delta(item.l3Influence?.growthArc ?? 0),
      },
    }))

    return { items: clampedItems, factbookSummary: parsed.factbookSummary }
  } catch {
    return null
  }
}

/** l3 delta 값 ±0.002 이내로 clamp */
function clampL3Delta(value: number): number {
  return Math.max(-0.002, Math.min(0.002, value))
}

// ── confidence 병합 공식 ─────────────────────────────────────────

/**
 * 기존 confidence와 새 confidence 가중 평균.
 * evidenceCount가 많을수록 기존 값 비중 높아짐.
 */
function mergeConfidence(
  existingConfidence: number,
  existingCount: number,
  newConfidence: number
): number {
  const weight = Math.min(existingCount / (existingCount + 1), 0.9)
  return weight * existingConfidence + (1 - weight) * newConfidence
}

// ── 핵심 consolidation 로직 ──────────────────────────────────────

export interface ConsolidationResult {
  personaId: string
  episodesProcessed: number
  memoriesCreated: number
  memoriesUpdated: number
  skipped: boolean
  skipReason?: string
}

/**
 * 페르소나 1개에 대한 기억 압축 실행.
 *
 * - poignancy ≥ 0.5 에피소드 최대 30개 수집
 * - LLM으로 SemanticMemory 3-5항목 추출
 * - subject 기준 upsert (중복 병합)
 * - Factbook.mutableContext 업데이트
 */
export async function consolidateMemory(
  provider: ConsolidationProvider,
  personaId: string
): Promise<ConsolidationResult> {
  const base: ConsolidationResult = {
    personaId,
    episodesProcessed: 0,
    memoriesCreated: 0,
    memoriesUpdated: 0,
    skipped: false,
  }

  // 1. 페르소나 프로필 조회
  const profile = await provider.getPersonaProfile(personaId)
  if (!profile) {
    return { ...base, skipped: true, skipReason: "persona_not_found" }
  }

  // 2. 최소 간격 체크
  if (profile.lastConsolidatedAt) {
    const daysSince = (Date.now() - profile.lastConsolidatedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < MIN_CONSOLIDATION_INTERVAL_DAYS) {
      return { ...base, skipped: true, skipReason: "too_soon" }
    }
  }

  // 3. 지난 7일 고강도 에피소드 수집
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const episodes = await provider.getHighPoignancyEpisodes(
    personaId,
    since,
    CONSOLIDATION_POIGNANCY_THRESHOLD,
    MAX_EPISODES_PER_CONSOLIDATION
  )

  if (episodes.length === 0) {
    return { ...base, skipped: true, skipReason: "no_significant_episodes" }
  }

  // 4. LLM 호출
  const prompt = buildConsolidationPrompt(profile.name, profile.backstorySummary, episodes)

  const llmResult = await generateText({
    systemPrompt: "당신은 AI 페르소나의 기억 압축기입니다. JSON만 반환하세요.",
    userMessage: prompt,
    maxTokens: 800,
    temperature: 0.3,
    callType: "memory:consolidation",
    personaId,
  })

  const parsed = parseConsolidationResponse(llmResult.text)
  if (!parsed) {
    return {
      ...base,
      episodesProcessed: episodes.length,
      skipped: true,
      skipReason: "llm_parse_failed",
    }
  }

  // 5. SemanticMemory upsert
  let created = 0
  let updated = 0
  const episodeIds = episodes.map((e) => e.id)

  for (const item of parsed.items) {
    const existing = await provider.findSemanticMemoryBySubject(personaId, item.subject)

    if (existing) {
      const mergedConfidence = mergeConfidence(
        existing.confidence,
        existing.evidenceCount,
        item.confidence
      )
      const mergedSourceIds = Array.from(
        new Set([...existing.sourceEpisodeIds, ...episodeIds])
      ).slice(-50) // 최대 50개 유지

      await provider.updateSemanticMemory(existing.id, {
        belief: item.belief,
        confidence: mergedConfidence,
        evidenceCount: existing.evidenceCount + 1,
        sourceEpisodeIds: mergedSourceIds,
        l3Influence: item.l3Influence,
      })
      updated++
    } else {
      await provider.createSemanticMemory({
        personaId,
        category: item.category,
        subject: item.subject,
        belief: item.belief,
        confidence: item.confidence,
        evidenceCount: 1,
        sourceEpisodeIds: episodeIds.slice(-20),
        l3Influence: item.l3Influence,
      })
      created++
    }

    // overflow 방지: 카테고리별 최대 100개 유지
    await provider.pruneSemanticMemories(
      personaId,
      item.category,
      MAX_SEMANTIC_MEMORIES_PER_CATEGORY
    )
  }

  // 6. Factbook.mutableContext 업데이트
  const factbook = await provider.getFactbook(personaId)
  if (factbook && parsed.factbookSummary) {
    const existingCtx = factbook.mutableContext.find((c) => c.category === "recentExperience")
    const updatedFactbook = existingCtx
      ? updateMutableContext(factbook, existingCtx.id, parsed.factbookSummary)
      : addMutableContext(factbook, "recentExperience", parsed.factbookSummary)

    await provider.saveFactbook(personaId, updatedFactbook)
  }

  // 7. lastConsolidatedAt 업데이트
  await provider.updateLastConsolidatedAt(personaId, new Date())

  return {
    personaId,
    episodesProcessed: episodes.length,
    memoriesCreated: created,
    memoriesUpdated: updated,
    skipped: false,
  }
}

/**
 * 배치: 활성 페르소나 목록에 대해 순차 실행.
 * cron 스케줄러에서 호출 (매주 일요일 03:00).
 */
export async function consolidateAllPersonas(
  provider: ConsolidationProvider,
  personaIds: string[]
): Promise<ConsolidationResult[]> {
  const results: ConsolidationResult[] = []

  for (const personaId of personaIds) {
    try {
      const result = await consolidateMemory(provider, personaId)
      results.push(result)
    } catch (err) {
      results.push({
        personaId,
        episodesProcessed: 0,
        memoriesCreated: 0,
        memoriesUpdated: 0,
        skipped: true,
        skipReason: err instanceof Error ? err.message : "unknown_error",
      })
    }
  }

  return results
}
