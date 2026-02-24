// ═══════════════════════════════════════════════════════════════
// RAG Engine — Voice anchor, relation memory, interest continuity,
// context builder
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ParadoxProfile,
  VoiceProfile,
  InteractionLogEntry,
  InteractionSessionSummary,
} from "@/types"
import { roundTo, countOccurrences, estimateTokenCount, formatTimeAgo } from "./types"

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC1: RAG System                                              ║
// ║ Voice anchor, relation memory, interest continuity,          ║
// ║ context builder                                              ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Voice Anchor ──────────────────────────────────────────────

/**
 * Voice 앵커: 페르소나가 실제 작성한 콘텐츠에서 추출한 말투/어휘 특성.
 * 프롬프트에 few-shot 앵커로 주입되어 Voice 일관성을 유지한다.
 */
export interface VoiceAnchor {
  readonly personaId: string
  readonly toneMarkers: readonly ToneMarker[]
  readonly vocabularyProfile: VocabularyProfile
  readonly expressionPatterns: readonly string[]
}

export interface ToneMarker {
  readonly category: "formal" | "casual" | "analytical" | "emotional" | "ironic" | "reserved"
  readonly intensity: number // 0.0~1.0
  readonly examples: readonly string[]
}

export interface VocabularyProfile {
  readonly avgSentenceLength: number
  readonly vocabLevel: number // unique words / total words
  readonly exclamationRate: number // 감탄사 비율
  readonly questionRate: number // 의문문 비율
  readonly speechPatternHits: number
  readonly preferredExpressions: readonly string[]
}

// ── Relation Memory ──────────────────────────────────────────

/**
 * 관계 기억: 두 페르소나(또는 페르소나↔유저) 간 상호작용 이력.
 * 관계 톤을 유지하기 위해 LLM 프롬프트에 주입한다.
 */
export interface RelationMemory {
  readonly personaId: string
  readonly interactions: readonly RelationInteraction[]
  readonly topicHistory: readonly TopicEntry[]
  readonly emotionalTraces: readonly EmotionalTrace[]
}

export interface RelationInteraction {
  readonly targetId: string
  readonly targetType: "persona" | "user"
  readonly lastInteractionAt: number
  readonly interactionCount: number
  readonly summary: string // "어제 논쟁했음", "3일 전 칭찬함"
  readonly dominantTone: string
}

export interface TopicEntry {
  readonly topic: string
  readonly frequency: number
  readonly lastMentionedAt: number
  readonly sentiment: number // -1.0 ~ 1.0
}

export interface EmotionalTrace {
  readonly targetId: string
  readonly emotion: "friendly" | "neutral" | "tense" | "hostile" | "admiring"
  readonly intensity: number // 0.0~1.0
  readonly lastUpdatedAt: number
}

// ── Interest Continuity ──────────────────────────────────────

/**
 * 관심사 연속성: 페르소나의 최근 좋아요/리포스트 기반 관심 주제.
 * 지수 감쇠를 적용하여 오래된 관심사는 자연스럽게 퇴색한다.
 */
export interface InterestContinuity {
  readonly personaId: string
  readonly topics: readonly InterestTopic[]
  readonly decayRate: number // 지수 감쇠율 (기본 0.05)
  readonly lastUpdated: number
}

export interface InterestTopic {
  readonly name: string
  readonly weight: number // 감쇠 적용 후 0.0~1.0
  readonly rawFrequency: number
  readonly firstSeenAt: number
  readonly lastSeenAt: number
  readonly tags: readonly string[]
}

// ── RAG Context (통합) ────────────────────────────────────────

/**
 * RAG 컨텍스트: Voice 앵커 + 관계 기억 + 관심사 연속성의 통합.
 * LLM 프롬프트에 주입할 모든 장기 기억 정보.
 */
export interface RAGContext {
  readonly voiceAnchor: VoiceAnchor
  readonly relationMemory: RelationMemory
  readonly interestContinuity: InterestContinuity
  readonly compiledText: string // 프롬프트 주입용 텍스트
  readonly totalTokenEstimate: number
  readonly builtAt: number
}

export interface RAGContextBuildOptions {
  readonly personaId: string
  readonly interactionTargetId?: string
  readonly maxVoiceAnchors: number // default: 5
  readonly maxInteractions: number // default: 10
  readonly maxLikes: number // default: 10
}

export interface RAGCacheConfig {
  readonly voiceAnchorTTL: number // 초 단위 (기본 300 = 5분)
  readonly relationMemoryTTL: number // 초 단위 (기본 60 = 1분)
  readonly interestTTL: number // 초 단위 (기본 600 = 10분)
}

export const DEFAULT_RAG_CACHE_CONFIG: RAGCacheConfig = {
  voiceAnchorTTL: 300,
  relationMemoryTTL: 60,
  interestTTL: 600,
} as const

export const DEFAULT_RAG_BUILD_OPTIONS: Omit<RAGContextBuildOptions, "personaId"> = {
  maxVoiceAnchors: 5,
  maxInteractions: 10,
  maxLikes: 10,
} as const

// ── RAG Functions ──────────────────────────────────────────────

/**
 * Voice 앵커 추출: 페르소나의 최근 포스트/댓글에서 톤 마커, 어휘 프로필,
 * 표현 패턴을 추출한다.
 *
 * 검색 우선순위:
 * 1. 최근 포스트 (본인 작성) - Voice의 가장 강한 증거
 * 2. 최근 댓글 (본인 작성) - 대화 스타일 증거
 */
export function extractVoiceAnchors(
  personaId: string,
  recentPosts: readonly string[],
  speechPatterns: readonly string[]
): VoiceAnchor {
  const toneMarkers = analyzeToneMarkers(recentPosts)
  const vocabularyProfile = buildVocabularyProfile(recentPosts, speechPatterns)
  const expressionPatterns = extractExpressionPatterns(recentPosts)

  return {
    personaId,
    toneMarkers,
    vocabularyProfile,
    expressionPatterns,
  }
}

function analyzeToneMarkers(texts: readonly string[]): readonly ToneMarker[] {
  if (texts.length === 0) {
    return [{ category: "neutral" as ToneMarker["category"], intensity: 0.5, examples: [] }]
  }

  const categories: ToneMarker["category"][] = [
    "formal",
    "casual",
    "analytical",
    "emotional",
    "ironic",
    "reserved",
  ]

  const markers: ToneMarker[] = []

  // 형식적 톤: 긴 문장, 전문 용어
  const formalIndicators = ["따라서", "결론적으로", "분석하면", "구조적으로", "관점에서"]
  const casualIndicators = ["ㅋㅋ", "ㅎㅎ", "진짜", "대박", "완전", "헐"]
  const analyticalIndicators = ["데이터", "근거", "인과", "논리적", "체계적"]
  const emotionalIndicators = ["감동", "느낌", "마음", "가슴", "눈물"]
  const ironicIndicators = ["아이러니", "반어", "자조", "역설적", "역시"]
  const reservedIndicators = [".", "...", "음", "글쎄"]

  const indicatorSets: Record<ToneMarker["category"], readonly string[]> = {
    formal: formalIndicators,
    casual: casualIndicators,
    analytical: analyticalIndicators,
    emotional: emotionalIndicators,
    ironic: ironicIndicators,
    reserved: reservedIndicators,
  }

  const joined = texts.join(" ")

  for (const category of categories) {
    const indicators = indicatorSets[category]
    const hits = indicators.filter((indicator) => joined.includes(indicator))
    const intensity = Math.min(hits.length / Math.max(indicators.length, 1), 1.0)
    if (intensity > 0.1) {
      markers.push({
        category,
        intensity: roundTo(intensity, 2),
        examples: hits.slice(0, 3),
      })
    }
  }

  return markers.length > 0
    ? markers.sort((a, b) => b.intensity - a.intensity)
    : [{ category: "casual" as ToneMarker["category"], intensity: 0.3, examples: [] }]
}

function buildVocabularyProfile(
  texts: readonly string[],
  speechPatterns: readonly string[]
): VocabularyProfile {
  if (texts.length === 0) {
    return {
      avgSentenceLength: 0,
      vocabLevel: 0,
      exclamationRate: 0,
      questionRate: 0,
      speechPatternHits: 0,
      preferredExpressions: [],
    }
  }

  const allText = texts.join(" ")
  const sentences = allText.split(/[.!?。]+/).filter((s) => s.trim().length > 0)
  const words = allText.split(/\s+/).filter((w) => w.length > 0)
  const uniqueWords = new Set(words)

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
  const vocabLevel = words.length > 0 ? uniqueWords.size / words.length : 0
  const exclamationRate =
    sentences.length > 0 ? allText.split("!").length - 1 / sentences.length : 0
  const questionRate = sentences.length > 0 ? (allText.split("?").length - 1) / sentences.length : 0

  let speechPatternHits = 0
  const patternCounts: Array<{ pattern: string; count: number }> = []

  for (const pattern of speechPatterns) {
    const count = countOccurrences(allText, pattern)
    speechPatternHits += count
    if (count > 0) {
      patternCounts.push({ pattern, count })
    }
  }

  const preferredExpressions = patternCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p) => p.pattern)

  return {
    avgSentenceLength: roundTo(avgSentenceLength, 1),
    vocabLevel: roundTo(vocabLevel, 3),
    exclamationRate: roundTo(Math.min(exclamationRate, 1.0), 3),
    questionRate: roundTo(Math.min(questionRate, 1.0), 3),
    speechPatternHits,
    preferredExpressions,
  }
}

function extractExpressionPatterns(texts: readonly string[]): readonly string[] {
  if (texts.length === 0) return []

  // 반복 등장하는 문구 추출 (2회 이상)
  const ngrams = new Map<string, number>()

  for (const text of texts) {
    const sentences = text.split(/[.!?。]+/).filter((s) => s.trim().length > 0)
    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      if (trimmed.length >= 4 && trimmed.length <= 30) {
        ngrams.set(trimmed, (ngrams.get(trimmed) ?? 0) + 1)
      }
    }
  }

  return Array.from(ngrams.entries())
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([pattern]) => pattern)
}

/**
 * 관계 기억 업데이트: 새로운 인터랙션 로그를 기반으로 관계 기억을 갱신한다.
 */
export function updateRelationMemory(
  current: RelationMemory,
  newEntries: readonly InteractionLogEntry[]
): RelationMemory {
  if (newEntries.length === 0) return current

  // 기존 인터랙션 맵
  const interactionMap = new Map<string, RelationInteraction>(
    current.interactions.map((i) => [i.targetId, i])
  )

  // 새 엔트리로 업데이트
  for (const entry of newEntries) {
    const targetId =
      entry.receiver.id === current.personaId ? entry.initiator.id : entry.receiver.id
    const targetType =
      entry.receiver.type === "persona" || entry.initiator.type === "persona"
        ? ("persona" as const)
        : ("user" as const)

    const existing = interactionMap.get(targetId)
    const now = Date.now()

    interactionMap.set(targetId, {
      targetId,
      targetType,
      lastInteractionAt: now,
      interactionCount: (existing?.interactionCount ?? 0) + 1,
      summary: buildInteractionSummary(entry),
      dominantTone: entry.behaviorTags.personaTone,
    })
  }

  // 토픽 히스토리 업데이트
  const topicMap = new Map<string, TopicEntry>(current.topicHistory.map((t) => [t.topic, t]))

  for (const entry of newEntries) {
    const topic = entry.behaviorTags.topicCategory
    if (topic) {
      const existing = topicMap.get(topic)
      topicMap.set(topic, {
        topic,
        frequency: (existing?.frequency ?? 0) + 1,
        lastMentionedAt: Date.now(),
        sentiment: mapSentimentToScore(entry.behaviorTags.userSentiment),
      })
    }
  }

  // 감정 흔적 업데이트
  const emotionMap = new Map<string, EmotionalTrace>(
    current.emotionalTraces.map((e) => [e.targetId, e])
  )

  for (const entry of newEntries) {
    const targetId =
      entry.receiver.id === current.personaId ? entry.initiator.id : entry.receiver.id

    const emotion = deriveEmotion(entry.behaviorTags.userSentiment)
    const existing = emotionMap.get(targetId)
    const blendedIntensity = existing
      ? existing.intensity * 0.7 + emotion.intensity * 0.3
      : emotion.intensity

    emotionMap.set(targetId, {
      targetId,
      emotion: emotion.type,
      intensity: roundTo(blendedIntensity, 2),
      lastUpdatedAt: Date.now(),
    })
  }

  return {
    personaId: current.personaId,
    interactions: Array.from(interactionMap.values()),
    topicHistory: Array.from(topicMap.values())
      .sort((a, b) => b.lastMentionedAt - a.lastMentionedAt)
      .slice(0, 50),
    emotionalTraces: Array.from(emotionMap.values()),
  }
}

function buildInteractionSummary(entry: InteractionLogEntry): string {
  const tone = entry.behaviorTags.personaTone
  const topic = entry.behaviorTags.topicCategory
  return `${entry.interactionType} — ${tone} 톤으로 ${topic || "일반"} 주제 대화`
}

function mapSentimentToScore(
  sentiment: InteractionLogEntry["behaviorTags"]["userSentiment"]
): number {
  const sentimentScores: Record<string, number> = {
    supportive: 0.8,
    neutral: 0.0,
    challenging: -0.4,
    aggressive: -0.8,
  }
  return sentimentScores[sentiment] ?? 0.0
}

function deriveEmotion(sentiment: InteractionLogEntry["behaviorTags"]["userSentiment"]): {
  type: EmotionalTrace["emotion"]
  intensity: number
} {
  const emotionMap: Record<string, { type: EmotionalTrace["emotion"]; intensity: number }> = {
    supportive: { type: "friendly", intensity: 0.7 },
    neutral: { type: "neutral", intensity: 0.3 },
    challenging: { type: "tense", intensity: 0.6 },
    aggressive: { type: "hostile", intensity: 0.8 },
  }
  return emotionMap[sentiment] ?? { type: "neutral", intensity: 0.3 }
}

/**
 * 관심사 연속성 추적: 지수 감쇠를 적용하여 관심사 가중치를 업데이트한다.
 */
export function trackInterestContinuity(
  current: InterestContinuity,
  newTopics: readonly { name: string; tags: readonly string[] }[]
): InterestContinuity {
  const now = Date.now()
  const daysSinceUpdate = (now - current.lastUpdated) / (1000 * 60 * 60 * 24)
  const decayFactor = Math.exp(-current.decayRate * daysSinceUpdate)

  // 기존 토픽에 감쇠 적용
  const topicMap = new Map<string, InterestTopic>()
  for (const topic of current.topics) {
    const decayedWeight = topic.weight * decayFactor
    if (decayedWeight > 0.01) {
      // 너무 낮은 가중치는 제거
      topicMap.set(topic.name, {
        ...topic,
        weight: roundTo(decayedWeight, 3),
      })
    }
  }

  // 새 토픽 추가/업데이트
  for (const newTopic of newTopics) {
    const existing = topicMap.get(newTopic.name)
    if (existing) {
      topicMap.set(newTopic.name, {
        ...existing,
        weight: roundTo(Math.min(existing.weight + 0.15, 1.0), 3),
        rawFrequency: existing.rawFrequency + 1,
        lastSeenAt: now,
        tags: Array.from(new Set([...existing.tags, ...newTopic.tags])),
      })
    } else {
      topicMap.set(newTopic.name, {
        name: newTopic.name,
        weight: 0.3,
        rawFrequency: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        tags: newTopic.tags,
      })
    }
  }

  return {
    personaId: current.personaId,
    topics: Array.from(topicMap.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 30),
    decayRate: current.decayRate,
    lastUpdated: now,
  }
}

/**
 * 빈 RAG 컨텍스트 생성 (초기화용).
 */
export function createEmptyRAGContext(personaId: string): RAGContext {
  return {
    voiceAnchor: {
      personaId,
      toneMarkers: [],
      vocabularyProfile: {
        avgSentenceLength: 0,
        vocabLevel: 0,
        exclamationRate: 0,
        questionRate: 0,
        speechPatternHits: 0,
        preferredExpressions: [],
      },
      expressionPatterns: [],
    },
    relationMemory: {
      personaId,
      interactions: [],
      topicHistory: [],
      emotionalTraces: [],
    },
    interestContinuity: {
      personaId,
      topics: [],
      decayRate: 0.05,
      lastUpdated: Date.now(),
    },
    compiledText: "",
    totalTokenEstimate: 0,
    builtAt: Date.now(),
  }
}

/**
 * RAG 컨텍스트 빌드: Voice 앵커, 관계 기억, 관심사 연속성을 통합한다.
 *
 * 프롬프트 구성:
 * [B] Voice 앵커 (~500 tok)
 * [C] 관계 기억 (~800 tok)
 * [D] 관심사 연속성 (~100 tok)
 */
export function buildRAGContext(
  voiceAnchor: VoiceAnchor,
  relationMemory: RelationMemory,
  interestContinuity: InterestContinuity
): RAGContext {
  const compiledText = buildContextPrompt(voiceAnchor, relationMemory, interestContinuity)
  const totalTokenEstimate = estimateTokenCount(compiledText)

  return {
    voiceAnchor,
    relationMemory,
    interestContinuity,
    compiledText,
    totalTokenEstimate,
    builtAt: Date.now(),
  }
}

/**
 * RAG 컨텍스트를 프롬프트 텍스트로 컴파일한다.
 * LLM 프롬프트에 직접 주입할 수 있는 형식.
 */
export function buildContextPrompt(
  voiceAnchor: VoiceAnchor,
  relationMemory: RelationMemory,
  interestContinuity: InterestContinuity
): string {
  const sections: string[] = []

  // [B] Voice 앵커 섹션
  if (voiceAnchor.toneMarkers.length > 0 || voiceAnchor.expressionPatterns.length > 0) {
    const voiceLines: string[] = ["[Voice 앵커 — 이 페르소나의 실제 말투]"]

    if (voiceAnchor.toneMarkers.length > 0) {
      const dominantTone = voiceAnchor.toneMarkers[0]
      voiceLines.push(
        `- 주된 톤: ${dominantTone.category} (강도 ${dominantTone.intensity.toFixed(1)})`
      )
    }

    if (voiceAnchor.vocabularyProfile.avgSentenceLength > 0) {
      voiceLines.push(
        `- 평균 문장 길이: ${voiceAnchor.vocabularyProfile.avgSentenceLength.toFixed(0)}단어`
      )
    }

    if (voiceAnchor.vocabularyProfile.preferredExpressions.length > 0) {
      voiceLines.push(
        `- 자주 쓰는 표현: ${voiceAnchor.vocabularyProfile.preferredExpressions.join(", ")}`
      )
    }

    if (voiceAnchor.expressionPatterns.length > 0) {
      voiceLines.push(`- 최근 표현 패턴:`)
      for (const pattern of voiceAnchor.expressionPatterns.slice(0, 5)) {
        voiceLines.push(`  "${pattern}"`)
      }
    }

    sections.push(voiceLines.join("\n"))
  }

  // [C] 관계 기억 섹션
  if (relationMemory.interactions.length > 0) {
    const relationLines: string[] = ["[관계 기억 — 최근 상호작용 이력]"]

    for (const interaction of relationMemory.interactions.slice(0, 5)) {
      const timeAgo = formatTimeAgo(interaction.lastInteractionAt)
      relationLines.push(
        `- ${interaction.targetId} (${interaction.targetType}): ${interaction.summary} [${timeAgo}]`
      )
    }

    if (relationMemory.emotionalTraces.length > 0) {
      relationLines.push(`- 감정 상태:`)
      for (const trace of relationMemory.emotionalTraces.slice(0, 3)) {
        relationLines.push(`  ${trace.targetId}: ${trace.emotion} (${trace.intensity.toFixed(1)})`)
      }
    }

    sections.push(relationLines.join("\n"))
  }

  // [D] 관심사 연속성 섹션
  if (interestContinuity.topics.length > 0) {
    const topInterests = interestContinuity.topics.filter((t) => t.weight > 0.1).slice(0, 5)

    if (topInterests.length > 0) {
      const interestLines: string[] = ["[최근 관심사]"]
      const topicNames = topInterests.map((t) => t.name)
      interestLines.push(`- 이번 주 관심사: ${topicNames.join(", ")}`)
      sections.push(interestLines.join("\n"))
    }
  }

  return sections.join("\n\n")
}
