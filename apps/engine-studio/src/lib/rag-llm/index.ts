// ═══════════════════════════════════════════════════════════════
// PersonaWorld RAG + LLM Strategy + Quality Feedback Loop
// T71: 구현계획서 Phase 9 — RAG 컨텍스트, 2-Tier LLM 라우터,
//      품질 피드백 루프, Few-shot 수집, 통합 파이프라인
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

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC2: LLM Strategy                                            ║
// ║ 2-Tier model config, dynamic router, provider adapter,       ║
// ║ Prompt Caching                                                ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Model Tier ─────────────────────────────────────────────────

/**
 * 2-Tier 모델 분류.
 * - tier1_heavy: 생성/복잡한 작업 (Anthropic Sonnet 급)
 * - tier2_light: 매칭/검증/단순 작업 (OpenAI mini 또는 규칙 기반)
 */
export type ModelTier = "tier1_heavy" | "tier2_light"

export type LLMProvider = "anthropic" | "openai" | "rule-based"

export interface ModelConfig {
  readonly tier: ModelTier
  readonly provider: LLMProvider
  readonly model: string | null // rule-based는 null
  readonly maxTokens: number
  readonly costPerInputMToken: number // $/M input tokens
  readonly costPerOutputMToken: number // $/M output tokens
  readonly temperature: number
}

export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  tier1_heavy: {
    tier: "tier1_heavy",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    maxTokens: 4096,
    costPerInputMToken: 3.0,
    costPerOutputMToken: 15.0,
    temperature: 0.7,
  },
  tier2_light: {
    tier: "tier2_light",
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 4096,
    costPerInputMToken: 0.15,
    costPerOutputMToken: 0.6,
    temperature: 0.5,
  },
} as const

// ── Tier Routing ──────────────────────────────────────────────

export type TaskType =
  | "persona-generation"
  | "review"
  | "post"
  | "comment"
  | "chat"
  | "reaction"
  | "matching"
  | "validation"

export interface TierRoutingInput {
  readonly personaId: string
  readonly paradoxScore: number
  readonly task: TaskType
  readonly pressure?: number
  readonly triggerDetected?: boolean
  readonly conflictScore?: number
  readonly expectedResponseLength?: number
}

export interface TierRoutingRule {
  readonly name: string
  readonly condition: (input: TierRoutingInput) => boolean
  readonly tier: ModelTier
  readonly priority: number // 낮을수록 우선
}

export interface TierRoutingConfig {
  readonly rules: readonly TierRoutingRule[]
  readonly defaultTier: ModelTier
  readonly tokenBudgetPerRequest: number
  readonly dailyTokenBudget: number
}

/**
 * 기본 Tier 라우팅 규칙.
 *
 * Heavy (Tier1):
 *   - paradoxScore > 0.5 (역설 표현 필요)
 *   - pressure > 0.4 (내면 드러남)
 *   - triggerDetected (상황 트리거)
 *   - conflictScore > 0.7 (갈등 상황)
 *   - task == 'persona-generation' | 'review'
 *
 * Light (Tier2): 나머지 전부
 */
export const DEFAULT_ROUTING_RULES: readonly TierRoutingRule[] = [
  {
    name: "persona-generation-heavy",
    condition: (input) => input.task === "persona-generation",
    tier: "tier1_heavy",
    priority: 1,
  },
  {
    name: "review-heavy",
    condition: (input) => input.task === "review",
    tier: "tier1_heavy",
    priority: 2,
  },
  {
    name: "high-paradox-heavy",
    condition: (input) => input.paradoxScore > 0.5,
    tier: "tier1_heavy",
    priority: 3,
  },
  {
    name: "high-pressure-heavy",
    condition: (input) => (input.pressure ?? 0) > 0.4,
    tier: "tier1_heavy",
    priority: 4,
  },
  {
    name: "trigger-detected-heavy",
    condition: (input) => input.triggerDetected === true,
    tier: "tier1_heavy",
    priority: 5,
  },
  {
    name: "conflict-heavy",
    condition: (input) => (input.conflictScore ?? 0) > 0.7,
    tier: "tier1_heavy",
    priority: 6,
  },
  {
    name: "short-response-light",
    condition: (input) => (input.expectedResponseLength ?? 200) < 50,
    tier: "tier2_light",
    priority: 7,
  },
  {
    name: "reaction-light",
    condition: (input) => input.task === "reaction",
    tier: "tier2_light",
    priority: 8,
  },
  {
    name: "matching-light",
    condition: (input) => input.task === "matching",
    tier: "tier2_light",
    priority: 9,
  },
  {
    name: "validation-light",
    condition: (input) => input.task === "validation",
    tier: "tier2_light",
    priority: 10,
  },
] as const

export const DEFAULT_ROUTING_CONFIG: TierRoutingConfig = {
  rules: DEFAULT_ROUTING_RULES,
  defaultTier: "tier2_light",
  tokenBudgetPerRequest: 8192,
  dailyTokenBudget: 5_000_000,
} as const

/**
 * 입력 조건에 따라 적절한 모델 Tier를 결정한다.
 * 우선순위가 높은(숫자가 낮은) 규칙이 먼저 매칭된다.
 */
export function routeToTier(
  input: TierRoutingInput,
  config: TierRoutingConfig = DEFAULT_ROUTING_CONFIG
): ModelTier {
  const sortedRules = [...config.rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sortedRules) {
    if (rule.condition(input)) {
      return rule.tier
    }
  }

  return config.defaultTier
}

/**
 * 라우팅 결정에 대한 설명을 반환한다 (디버깅/로깅용).
 */
export function explainRouting(
  input: TierRoutingInput,
  config: TierRoutingConfig = DEFAULT_ROUTING_CONFIG
): TierRoutingExplanation {
  const sortedRules = [...config.rules].sort((a, b) => a.priority - b.priority)
  const matchedRules: string[] = []
  let selectedTier: ModelTier = config.defaultTier
  let selectedRuleName = "default"

  for (const rule of sortedRules) {
    if (rule.condition(input)) {
      matchedRules.push(rule.name)
      if (matchedRules.length === 1) {
        selectedTier = rule.tier
        selectedRuleName = rule.name
      }
    }
  }

  return {
    input,
    selectedTier,
    selectedRuleName,
    matchedRules,
    modelConfig: MODEL_CONFIGS[selectedTier],
  }
}

export interface TierRoutingExplanation {
  readonly input: TierRoutingInput
  readonly selectedTier: ModelTier
  readonly selectedRuleName: string
  readonly matchedRules: readonly string[]
  readonly modelConfig: ModelConfig
}

// ── Provider Adapter ──────────────────────────────────────────

/**
 * LLM 프로바이더 어댑터 인터페이스.
 * 다양한 LLM 제공자를 통일된 인터페이스로 호출한다.
 */
export interface ProviderAdapter {
  readonly provider: LLMProvider
  sendRequest(request: LLMRequest): Promise<LLMResponse>
  estimateCost(inputTokens: number, outputTokens: number): CostEstimate
}

export interface LLMRequest {
  readonly systemPrompt: string
  readonly ragContext?: string
  readonly messages: readonly LLMMessage[]
  readonly tier: ModelTier
  readonly enableCaching?: boolean
  readonly maxTokens?: number
  readonly temperature?: number
}

export interface LLMMessage {
  readonly role: "user" | "assistant"
  readonly content: string
}

export interface LLMResponse {
  readonly content: string
  readonly tier: ModelTier
  readonly provider: LLMProvider
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cached: boolean
  readonly latencyMs: number
}

export interface CostEstimate {
  readonly provider: LLMProvider
  readonly inputCostUSD: number
  readonly outputCostUSD: number
  readonly totalCostUSD: number
  readonly cached: boolean
  readonly savingsUSD: number // 캐시 적중 시 절감액
}

/**
 * 비용 추정: 주어진 토큰 수와 모델 설정으로 비용을 계산한다.
 */
export function estimateRequestCost(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number,
  cached: boolean = false
): CostEstimate {
  const config = MODEL_CONFIGS[tier]
  const inputCostUSD = (inputTokens / 1_000_000) * config.costPerInputMToken
  const outputCostUSD = (outputTokens / 1_000_000) * config.costPerOutputMToken

  // Anthropic 캐시 적중 시 input 82% 절감
  const cachedInputCost =
    cached && config.provider === "anthropic" ? inputCostUSD * 0.18 : inputCostUSD
  const savings = cached ? inputCostUSD - cachedInputCost : 0

  return {
    provider: config.provider,
    inputCostUSD: roundTo(cached ? cachedInputCost : inputCostUSD, 6),
    outputCostUSD: roundTo(outputCostUSD, 6),
    totalCostUSD: roundTo((cached ? cachedInputCost : inputCostUSD) + outputCostUSD, 6),
    cached,
    savingsUSD: roundTo(savings, 6),
  }
}

// ── Prompt Cache ──────────────────────────────────────────────

/**
 * 프롬프트 캐시: 컴파일된 프롬프트를 재사용하여 비용/시간 절감.
 *
 * Anthropic cache_control 구조:
 * - 시스템 프롬프트 + 벡터/역설 정의 → 캐시 블록 (5분 TTL)
 * - RAG 컨텍스트 → 변동이므로 별도 블록
 */
export interface PromptCache {
  readonly key: string
  readonly compiledPrompt: string
  readonly createdAt: number
  readonly ttlMs: number
  readonly hitCount: number
}

export interface PromptCacheStore {
  readonly entries: ReadonlyMap<string, PromptCache>
  readonly maxEntries: number
  readonly totalHits: number
  readonly totalMisses: number
}

/**
 * 새 프롬프트 캐시를 생성한다.
 */
export function createPromptCache(
  key: string,
  compiledPrompt: string,
  ttlMs: number = 300_000 // 기본 5분
): PromptCache {
  return {
    key,
    compiledPrompt,
    createdAt: Date.now(),
    ttlMs,
    hitCount: 0,
  }
}

/**
 * 캐시된 프롬프트를 조회한다. 만료되었으면 null을 반환한다.
 */
export function getCachedPrompt(
  store: PromptCacheStore,
  key: string
): { prompt: PromptCache | null; store: PromptCacheStore } {
  const entry = store.entries.get(key)

  if (!entry) {
    return {
      prompt: null,
      store: {
        ...store,
        totalMisses: store.totalMisses + 1,
      },
    }
  }

  const now = Date.now()
  if (now - entry.createdAt > entry.ttlMs) {
    // 만료 → 삭제
    const newEntries = new Map(store.entries)
    newEntries.delete(key)
    return {
      prompt: null,
      store: {
        ...store,
        entries: newEntries,
        totalMisses: store.totalMisses + 1,
      },
    }
  }

  // 히트 카운트 업데이트
  const updatedEntry: PromptCache = {
    ...entry,
    hitCount: entry.hitCount + 1,
  }
  const newEntries = new Map(store.entries)
  newEntries.set(key, updatedEntry)

  return {
    prompt: updatedEntry,
    store: {
      ...store,
      entries: newEntries,
      totalHits: store.totalHits + 1,
    },
  }
}

/**
 * 특정 키의 캐시를 무효화한다.
 */
export function invalidateCache(store: PromptCacheStore, key: string): PromptCacheStore {
  const newEntries = new Map(store.entries)
  newEntries.delete(key)
  return {
    ...store,
    entries: newEntries,
  }
}

/**
 * 페르소나 ID 기반으로 관련 캐시를 모두 무효화한다.
 */
export function invalidateCacheByPersona(
  store: PromptCacheStore,
  personaId: string
): PromptCacheStore {
  const newEntries = new Map(store.entries)
  for (const [key] of newEntries) {
    if (key.includes(personaId)) {
      newEntries.delete(key)
    }
  }
  return {
    ...store,
    entries: newEntries,
  }
}

/**
 * 만료된 캐시 엔트리를 모두 정리한다.
 */
export function purgeExpiredCache(store: PromptCacheStore): PromptCacheStore {
  const now = Date.now()
  const newEntries = new Map<string, PromptCache>()

  for (const [key, entry] of store.entries) {
    if (now - entry.createdAt <= entry.ttlMs) {
      newEntries.set(key, entry)
    }
  }

  return {
    ...store,
    entries: newEntries,
  }
}

/**
 * 빈 프롬프트 캐시 스토어를 생성한다.
 */
export function createPromptCacheStore(maxEntries: number = 1000): PromptCacheStore {
  return {
    entries: new Map<string, PromptCache>(),
    maxEntries,
    totalHits: 0,
    totalMisses: 0,
  }
}

/**
 * 프롬프트 캐시에 새 엔트리를 추가한다.
 * 최대 엔트리 수를 초과하면 가장 오래된 것을 제거한다.
 */
export function addToPromptCache(store: PromptCacheStore, cache: PromptCache): PromptCacheStore {
  const newEntries = new Map(store.entries)

  // LRU: 초과 시 가장 오래된 엔트리 제거
  if (newEntries.size >= store.maxEntries && !newEntries.has(cache.key)) {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of newEntries) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = key
      }
    }

    if (oldestKey !== null) {
      newEntries.delete(oldestKey)
    }
  }

  newEntries.set(cache.key, cache)

  return {
    ...store,
    entries: newEntries,
  }
}

// ── LLM Pipeline Config ───────────────────────────────────────

/**
 * LLM 파이프라인 설정: 모델 + 라우팅 + 캐싱 통합 설정.
 */
export interface LLMPipelineConfig {
  readonly models: Record<ModelTier, ModelConfig>
  readonly routing: TierRoutingConfig
  readonly caching: {
    readonly enabled: boolean
    readonly maxEntries: number
    readonly defaultTTLMs: number
  }
  readonly rateLimiting: {
    readonly maxRequestsPerMinute: number
    readonly maxTokensPerMinute: number
  }
  readonly fallback: {
    readonly enabled: boolean
    readonly fallbackTier: ModelTier
    readonly retryCount: number
    readonly retryDelayMs: number
  }
}

export const DEFAULT_LLM_PIPELINE_CONFIG: LLMPipelineConfig = {
  models: MODEL_CONFIGS,
  routing: DEFAULT_ROUTING_CONFIG,
  caching: {
    enabled: true,
    maxEntries: 1000,
    defaultTTLMs: 300_000, // 5분
  },
  rateLimiting: {
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 100_000,
  },
  fallback: {
    enabled: true,
    fallbackTier: "tier2_light",
    retryCount: 2,
    retryDelayMs: 1000,
  },
} as const

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC3: Quality Feedback                                         ║
// ║ Paradox expression score, Voice consistency,                  ║
// ║ Pressure reaction test                                        ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Paradox Expression Score ──────────────────────────────────

/**
 * 역설 표현 점수: 생성된 텍스트에서 페르소나의 역설(L1↔L2 긴장)이
 * 얼마나 자연스럽게 표현되었는지를 측정한다.
 */
export interface ParadoxExpressionScore {
  readonly personaId: string
  readonly score: number // 0.0~1.0
  readonly contradictionCount: number
  readonly examples: readonly ParadoxExpressionExample[]
  readonly evaluatedAt: number
}

export interface ParadoxExpressionExample {
  readonly paradoxPair: string // "stance_agreeableness"
  readonly naturalLanguage: string // "비판적이면서 공감적인"
  readonly expressionFound: boolean
  readonly confidence: number // 0.0~1.0
  readonly excerpt: string // 해당 부분 발췌
}

export interface ParadoxPairDefinition {
  readonly l1Dimension: keyof SocialPersonaVector
  readonly l2Dimension: keyof CoreTemperamentVector
  readonly l1Value: number
  readonly l2Value: number
  readonly tensionScore: number
}

/**
 * 역설 표현 평가: 텍스트에서 상위 역설 쌍의 표현 여부를 분석한다.
 *
 * 측정 파이프라인:
 * 1. 페르소나의 L1↔L2 역설 쌍 중 상위 3개 추출
 * 2. 각 역설을 자연어로 변환
 * 3. 텍스트에서 역설 표현 패턴 검색 (규칙 기반)
 * 4. 상위 3개 역설의 스코어 평균
 */
export function evaluateParadoxExpression(
  personaId: string,
  generatedText: string,
  paradoxPairs: readonly ParadoxPairDefinition[]
): ParadoxExpressionScore {
  if (paradoxPairs.length === 0) {
    return {
      personaId,
      score: 0,
      contradictionCount: 0,
      examples: [],
      evaluatedAt: Date.now(),
    }
  }

  // 상위 3개 역설 쌍
  const topPairs = [...paradoxPairs].sort((a, b) => b.tensionScore - a.tensionScore).slice(0, 3)

  const examples: ParadoxExpressionExample[] = []

  for (const pair of topPairs) {
    const naturalLanguage = describeParadoxPair(pair)
    const analysis = findParadoxExpression(generatedText, pair)

    examples.push({
      paradoxPair: `${pair.l1Dimension}_${pair.l2Dimension}`,
      naturalLanguage,
      expressionFound: analysis.found,
      confidence: analysis.confidence,
      excerpt: analysis.excerpt,
    })
  }

  const totalScore =
    examples.length > 0 ? examples.reduce((sum, ex) => sum + ex.confidence, 0) / examples.length : 0

  const contradictionCount = examples.filter((ex) => ex.expressionFound).length

  return {
    personaId,
    score: roundTo(totalScore, 3),
    contradictionCount,
    examples,
    evaluatedAt: Date.now(),
  }
}

function describeParadoxPair(pair: ParadoxPairDefinition): string {
  const l1Descriptions: Record<string, [string, string]> = {
    depth: ["직관적인", "심층적인"],
    lens: ["감성적인", "논리적인"],
    stance: ["수용적인", "비판적인"],
    scope: ["간결한", "상세한"],
    taste: ["클래식한", "실험적인"],
    purpose: ["오락적인", "의미추구적인"],
    sociability: ["독립적인", "사교적인"],
  }

  const l2Descriptions: Record<string, [string, string]> = {
    openness: ["보수적인", "개방적인"],
    conscientiousness: ["즉흥적인", "원칙적인"],
    extraversion: ["내향적인", "외향적인"],
    agreeableness: ["경쟁적인", "협조적인"],
    neuroticism: ["안정적인", "예민한"],
  }

  const l1Desc = l1Descriptions[pair.l1Dimension]
  const l2Desc = l2Descriptions[pair.l2Dimension]

  if (!l1Desc || !l2Desc) return "알 수 없는 역설"

  const l1Text = pair.l1Value < 0.5 ? l1Desc[0] : l1Desc[1]
  const l2Text = pair.l2Value < 0.5 ? l2Desc[0] : l2Desc[1]

  return `${l1Text}이면서 ${l2Text}`
}

function findParadoxExpression(
  text: string,
  pair: ParadoxPairDefinition
): { found: boolean; confidence: number; excerpt: string } {
  // 역설 표현의 언어적 패턴
  const contrastMarkers = [
    "하지만",
    "그러나",
    "반면",
    "동시에",
    "한편으로는",
    "이면서",
    "에도 불구하고",
    "그럼에도",
    "역설적으로",
    "모순되지만",
    "양면성",
    "이중적",
    "복합적",
  ]

  const dimensionKeywords: Record<string, readonly string[]> = {
    depth: ["깊이", "분석", "직관", "표면", "심층"],
    lens: ["감성", "논리", "감정", "이성", "합리"],
    stance: ["수용", "비판", "비평", "긍정", "부정"],
    scope: ["간결", "상세", "디테일", "핵심"],
    taste: ["클래식", "실험", "전통", "새로운"],
    purpose: ["재미", "의미", "오락", "가치"],
    sociability: ["혼자", "함께", "독립", "사교"],
    openness: ["보수", "개방", "새로운", "전통"],
    conscientiousness: ["즉흥", "원칙", "계획", "자유"],
    extraversion: ["내향", "외향", "조용", "활발"],
    agreeableness: ["경쟁", "협조", "양보", "대립"],
    neuroticism: ["안정", "불안", "예민", "평온"],
  }

  const l1Keywords = dimensionKeywords[pair.l1Dimension] ?? []
  const l2Keywords = dimensionKeywords[pair.l2Dimension] ?? []

  let hasContrast = false
  let hasL1Keyword = false
  let hasL2Keyword = false

  for (const marker of contrastMarkers) {
    if (text.includes(marker)) {
      hasContrast = true
      break
    }
  }

  for (const keyword of l1Keywords) {
    if (text.includes(keyword)) {
      hasL1Keyword = true
      break
    }
  }

  for (const keyword of l2Keywords) {
    if (text.includes(keyword)) {
      hasL2Keyword = true
      break
    }
  }

  const found = hasContrast && (hasL1Keyword || hasL2Keyword)

  let confidence = 0
  if (hasContrast) confidence += 0.3
  if (hasL1Keyword) confidence += 0.3
  if (hasL2Keyword) confidence += 0.3
  if (hasL1Keyword && hasL2Keyword && hasContrast) confidence += 0.1

  // 발췌 추출
  let excerpt = ""
  if (found) {
    for (const marker of contrastMarkers) {
      const idx = text.indexOf(marker)
      if (idx >= 0) {
        const start = Math.max(0, idx - 30)
        const end = Math.min(text.length, idx + marker.length + 50)
        excerpt = text.slice(start, end).trim()
        break
      }
    }
  }

  return {
    found,
    confidence: roundTo(Math.min(confidence, 1.0), 2),
    excerpt,
  }
}

// ── Voice Consistency Metric ──────────────────────────────────

/**
 * Voice 일관성 지표: 페르소나의 과거 글과 새 글 사이의 말투 일관성.
 * LLM 없이 규칙 기반으로 측정 (비용 0원).
 */
export interface VoiceConsistencyMetric {
  readonly personaId: string
  readonly score: number // 0.0~1.0
  readonly deviations: readonly VoiceDeviation[]
  readonly sampleCount: number
  readonly evaluatedAt: number
}

export interface VoiceDeviation {
  readonly feature: string
  readonly baseline: number
  readonly current: number
  readonly deviation: number // |baseline - current|
  readonly severity: "low" | "medium" | "high"
}

export interface VoiceFeatureVector {
  readonly avgSentenceLength: number
  readonly exclamationRate: number
  readonly questionRate: number
  readonly vocabLevel: number
  readonly speechPatternHits: number
}

/**
 * Voice 일관성 측정: 과거 글의 특성과 새 글의 특성을 비교한다.
 *
 * 측정 방법:
 * 1. 페르소나의 최근 글 10개에서 Voice 특성 추출
 * 2. 새로 생성된 글에서 동일 특성 추출
 * 3. 코사인 유사도 계산
 *    - 유사도 < 0.6 → Voice drift 경고
 *    - 유사도 < 0.4 → Voice 심각 이탈
 */
export function measureVoiceConsistency(
  personaId: string,
  baselineTexts: readonly string[],
  newText: string,
  speechPatterns: readonly string[]
): VoiceConsistencyMetric {
  if (baselineTexts.length === 0) {
    return {
      personaId,
      score: 1.0,
      deviations: [],
      sampleCount: 0,
      evaluatedAt: Date.now(),
    }
  }

  const baselineFeatures = extractFeatureVectors(baselineTexts, speechPatterns)
  const newFeatures = extractSingleFeatureVector(newText, speechPatterns)

  const similarity = computeFeatureCosineSimilarity(baselineFeatures, newFeatures)

  const deviations = computeDeviations(baselineFeatures, newFeatures)

  return {
    personaId,
    score: roundTo(similarity, 3),
    deviations,
    sampleCount: baselineTexts.length,
    evaluatedAt: Date.now(),
  }
}

function extractFeatureVectors(
  texts: readonly string[],
  speechPatterns: readonly string[]
): VoiceFeatureVector {
  const features = texts.map((text) => extractSingleFeatureVector(text, speechPatterns))

  const avg = (arr: readonly number[]): number =>
    arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0

  return {
    avgSentenceLength: avg(features.map((f) => f.avgSentenceLength)),
    exclamationRate: avg(features.map((f) => f.exclamationRate)),
    questionRate: avg(features.map((f) => f.questionRate)),
    vocabLevel: avg(features.map((f) => f.vocabLevel)),
    speechPatternHits: avg(features.map((f) => f.speechPatternHits)),
  }
}

function extractSingleFeatureVector(
  text: string,
  speechPatterns: readonly string[]
): VoiceFeatureVector {
  const sentences = text.split(/[.!?。]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const uniqueWords = new Set(words)

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
  const vocabLevel = words.length > 0 ? uniqueWords.size / words.length : 0
  const exclamationRate = sentences.length > 0 ? (text.split("!").length - 1) / sentences.length : 0
  const questionRate = sentences.length > 0 ? (text.split("?").length - 1) / sentences.length : 0

  let speechPatternHits = 0
  for (const pattern of speechPatterns) {
    speechPatternHits += countOccurrences(text, pattern)
  }

  return {
    avgSentenceLength,
    exclamationRate: Math.min(exclamationRate, 1.0),
    questionRate: Math.min(questionRate, 1.0),
    vocabLevel,
    speechPatternHits,
  }
}

function computeFeatureCosineSimilarity(a: VoiceFeatureVector, b: VoiceFeatureVector): number {
  const vecA = [
    a.avgSentenceLength,
    a.exclamationRate,
    a.questionRate,
    a.vocabLevel,
    a.speechPatternHits,
  ]
  const vecB = [
    b.avgSentenceLength,
    b.exclamationRate,
    b.questionRate,
    b.vocabLevel,
    b.speechPatternHits,
  ]

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 1.0

  return dotProduct / denominator
}

function computeDeviations(
  baseline: VoiceFeatureVector,
  current: VoiceFeatureVector
): readonly VoiceDeviation[] {
  const features: Array<{ feature: string; baseline: number; current: number }> = [
    {
      feature: "avgSentenceLength",
      baseline: baseline.avgSentenceLength,
      current: current.avgSentenceLength,
    },
    {
      feature: "exclamationRate",
      baseline: baseline.exclamationRate,
      current: current.exclamationRate,
    },
    { feature: "questionRate", baseline: baseline.questionRate, current: current.questionRate },
    { feature: "vocabLevel", baseline: baseline.vocabLevel, current: current.vocabLevel },
    {
      feature: "speechPatternHits",
      baseline: baseline.speechPatternHits,
      current: current.speechPatternHits,
    },
  ]

  return features.map(({ feature, baseline: b, current: c }) => {
    const deviation = Math.abs(b - c)
    const normalizedDeviation = b > 0 ? deviation / b : deviation
    const severity: VoiceDeviation["severity"] =
      normalizedDeviation > 0.5 ? "high" : normalizedDeviation > 0.25 ? "medium" : "low"

    return {
      feature,
      baseline: roundTo(b, 3),
      current: roundTo(c, 3),
      deviation: roundTo(deviation, 3),
      severity,
    }
  })
}

// ── Pressure Reaction Test ────────────────────────────────────

/**
 * 압력 반응 테스트: 다양한 pressure 수준에서 페르소나의 반응이
 * 자연스럽게 변화하는지를 검증한다.
 *
 * 테스트 방법:
 * 1. 동일 질문을 P=0.1, 0.4, 0.7, 1.0으로 실행
 * 2. 각 응답의 감정 톤/강도를 분석
 * 3. P↑ → intensity↑가 단조 증가하는지 검증
 */
export interface PressureReactionTest {
  readonly personaId: string
  readonly pressureLevel: number
  readonly expectedBehavior: string
  readonly actualBehavior: string
  readonly passed: boolean
  readonly sentimentScore: number // -1.0 ~ 1.0
  readonly intensityScore: number // 0.0 ~ 1.0
}

export interface PressureTestSuite {
  readonly personaId: string
  readonly tests: readonly PressureReactionTest[]
  readonly monotonicityScore: number // 단조 증가 정도 (0.0~1.0)
  readonly overallPassed: boolean
  readonly testedAt: number
}

export type PressureLevel = 0.1 | 0.4 | 0.7 | 1.0

export const STANDARD_PRESSURE_LEVELS: readonly PressureLevel[] = [0.1, 0.4, 0.7, 1.0] as const

/**
 * Pressure 반응 테스트 실행.
 * 각 pressure 수준에서의 응답을 분석하여 자연스러움을 판단한다.
 */
export function runPressureReactionTest(
  personaId: string,
  responses: readonly { pressure: number; response: string }[]
): PressureTestSuite {
  if (responses.length === 0) {
    return {
      personaId,
      tests: [],
      monotonicityScore: 0,
      overallPassed: false,
      testedAt: Date.now(),
    }
  }

  const sortedResponses = [...responses].sort((a, b) => a.pressure - b.pressure)
  const tests: PressureReactionTest[] = []

  for (const response of sortedResponses) {
    const sentiment = analyzeSentiment(response.response)
    const intensity = analyzeIntensity(response.response)
    const expected = describePressureExpectation(response.pressure)

    tests.push({
      personaId,
      pressureLevel: response.pressure,
      expectedBehavior: expected,
      actualBehavior: `sentiment=${sentiment.toFixed(2)}, intensity=${intensity.toFixed(2)}`,
      passed: true, // 개별 통과 여부는 전체 단조성 분석 후 결정
      sentimentScore: roundTo(sentiment, 2),
      intensityScore: roundTo(intensity, 2),
    })
  }

  // 단조 증가 검증
  const monotonicityScore = computeMonotonicity(tests.map((t) => t.intensityScore))

  // 단조성 ≥ 0.6이면 전체 통과
  const overallPassed = monotonicityScore >= 0.6

  // 개별 테스트 통과 여부 업데이트
  const updatedTests = tests.map((test, i) => {
    if (i === 0) return { ...test, passed: true }

    const prevIntensity = tests[i - 1].intensityScore
    const isIncreasing = test.intensityScore >= prevIntensity - 0.1 // 약간의 허용 범위
    return { ...test, passed: isIncreasing }
  })

  return {
    personaId,
    tests: updatedTests,
    monotonicityScore: roundTo(monotonicityScore, 3),
    overallPassed,
    testedAt: Date.now(),
  }
}

function describePressureExpectation(pressure: number): string {
  if (pressure <= 0.2) return "차분하고 일관적인 톤 (L1 주도)"
  if (pressure <= 0.5) return "약간의 내면 드러남 (L2 영향 시작)"
  if (pressure <= 0.8) return "내면 갈등 표현 증가 (L2 강하게 영향)"
  return "격렬하고 본능적 반응 (L2/L3 주도)"
}

/**
 * 텍스트의 감정 톤을 규칙 기반으로 분석한다.
 * -1.0 (극부정) ~ 1.0 (극긍정)
 */
function analyzeSentiment(text: string): number {
  const positiveWords = [
    "좋은",
    "훌륭한",
    "감동",
    "아름다운",
    "즐거운",
    "행복",
    "뛰어난",
    "완벽",
    "추천",
    "만족",
    "대박",
  ]
  const negativeWords = [
    "나쁜",
    "실망",
    "별로",
    "부족",
    "아쉬운",
    "불만",
    "최악",
    "거부",
    "싫은",
    "지루한",
    "짜증",
  ]

  let positiveCount = 0
  let negativeCount = 0

  for (const word of positiveWords) {
    positiveCount += countOccurrences(text, word)
  }
  for (const word of negativeWords) {
    negativeCount += countOccurrences(text, word)
  }

  const total = positiveCount + negativeCount
  if (total === 0) return 0.0

  return roundTo((positiveCount - negativeCount) / total, 2)
}

/**
 * 텍스트의 감정 강도를 규칙 기반으로 분석한다.
 * 0.0 (차분) ~ 1.0 (격렬)
 */
function analyzeIntensity(text: string): number {
  let intensity = 0.3 // 기본 강도

  // 느낌표 수
  const exclamationCount = (text.match(/!/g) ?? []).length
  intensity += Math.min(exclamationCount * 0.08, 0.3)

  // 물음표 수 (특히 연속)
  const multiQuestionMarks = (text.match(/\?{2,}/g) ?? []).length
  intensity += multiQuestionMarks * 0.1

  // 강조 표현
  const intensifiers = ["정말", "진짜", "매우", "너무", "극도로", "완전히", "절대"]
  for (const word of intensifiers) {
    intensity += countOccurrences(text, word) * 0.05
  }

  // 대문자/특수 표현
  const capsCount = (text.match(/[A-Z]{2,}/g) ?? []).length
  intensity += capsCount * 0.05

  // 반복 문자 (ㅋㅋㅋ, ㅎㅎㅎ, ...)
  const repeats = (text.match(/(.)\1{2,}/g) ?? []).length
  intensity += repeats * 0.05

  return roundTo(Math.min(intensity, 1.0), 2)
}

/**
 * 수열의 단조 증가 정도를 측정한다.
 * 1.0 = 완전 단조 증가, 0.0 = 완전 단조 감소
 */
function computeMonotonicity(values: readonly number[]): number {
  if (values.length < 2) return 1.0

  let increases = 0
  let total = 0

  for (let i = 1; i < values.length; i++) {
    total++
    if (values[i] >= values[i - 1] - 0.05) {
      // 약간의 허용 범위
      increases++
    }
  }

  return total > 0 ? increases / total : 1.0
}

// ── Quality Metrics (통합) ────────────────────────────────────

/**
 * 품질 지표 통합: 3대 지표를 하나로 종합한다.
 */
export interface QualityMetrics {
  readonly paradoxExpression: ParadoxExpressionScore
  readonly voiceConsistency: VoiceConsistencyMetric
  readonly pressureReaction: PressureTestSuite
  readonly overallScore: number // 0.0~1.0 가중 평균
  readonly grade: QualityGrade
  readonly evaluatedAt: number
}

export type QualityGrade = "A" | "B" | "C" | "D" | "F"

export interface QualityWeights {
  readonly paradoxExpression: number // 기본 0.35
  readonly voiceConsistency: number // 기본 0.40
  readonly pressureReaction: number // 기본 0.25
}

export const DEFAULT_QUALITY_WEIGHTS: QualityWeights = {
  paradoxExpression: 0.35,
  voiceConsistency: 0.4,
  pressureReaction: 0.25,
} as const

/**
 * 종합 품질 점수를 계산한다.
 */
export function computeOverallQuality(
  paradoxScore: ParadoxExpressionScore,
  voiceMetric: VoiceConsistencyMetric,
  pressureSuite: PressureTestSuite,
  weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS
): QualityMetrics {
  const paradoxVal = paradoxScore.score
  const voiceVal = voiceMetric.score
  const pressureVal = pressureSuite.monotonicityScore

  const overallScore = roundTo(
    paradoxVal * weights.paradoxExpression +
      voiceVal * weights.voiceConsistency +
      pressureVal * weights.pressureReaction,
    3
  )

  const grade = scoreToGrade(overallScore)

  return {
    paradoxExpression: paradoxScore,
    voiceConsistency: voiceMetric,
    pressureReaction: pressureSuite,
    overallScore,
    grade,
    evaluatedAt: Date.now(),
  }
}

function scoreToGrade(score: number): QualityGrade {
  if (score >= 0.9) return "A"
  if (score >= 0.75) return "B"
  if (score >= 0.6) return "C"
  if (score >= 0.4) return "D"
  return "F"
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC4: Few-shot Collector + Quality Dashboard                   ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Few-shot Types ────────────────────────────────────────────

/**
 * Few-shot 예시: 품질이 높은 생성 결과를 저장하여 프롬프트에 재활용.
 */
export interface FewShotExample {
  readonly id: string
  readonly personaId: string
  readonly input: string // 생성 시 입력 (프롬프트/질문)
  readonly output: string // 생성 결과 텍스트
  readonly quality: FewShotQuality
  readonly tags: readonly string[]
  readonly paradoxType: string // "stance_agreeableness"
  readonly collectedAt: number
}

export interface FewShotQuality {
  readonly paradoxExpressionScore: number
  readonly voiceConsistencyScore: number
  readonly userFeedback: "like" | "dislike" | "none"
  readonly overallScore: number // 종합 품질 (0.0~1.0)
}

export interface FewShotCollection {
  readonly examples: readonly FewShotExample[]
  readonly filters: FewShotFilters
}

export interface FewShotFilters {
  readonly minQuality: number // 최소 품질 점수 (기본 0.7)
  readonly paradoxType?: string
  readonly tags?: readonly string[]
  readonly maxAge?: number // ms 단위 최대 수집 기간
  readonly maxPerType: number // 유형당 최대 개수 (기본 10)
}

export const DEFAULT_FEW_SHOT_FILTERS: FewShotFilters = {
  minQuality: 0.7,
  maxPerType: 10,
} as const

/**
 * Few-shot 예시 수집: 품질 기준을 충족하는 생성 결과를 수집한다.
 *
 * 수집 기준:
 * - paradoxExpression >= 0.8
 * - voiceConsistency >= 0.7
 * - 유저 LIKE 피드백
 */
export function collectFewShot(
  collection: FewShotCollection,
  newExample: Omit<FewShotExample, "id" | "collectedAt">
): FewShotCollection {
  const { filters } = collection

  // 품질 기준 미달이면 수집하지 않음
  if (newExample.quality.overallScore < filters.minQuality) {
    return collection
  }

  const id = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const example: FewShotExample = {
    ...newExample,
    id,
    collectedAt: Date.now(),
  }

  // 같은 paradoxType의 기존 예시
  const sameType = collection.examples.filter((ex) => ex.paradoxType === newExample.paradoxType)
  const otherTypes = collection.examples.filter((ex) => ex.paradoxType !== newExample.paradoxType)

  // 유형당 최대 개수 제한 (FIFO)
  const updatedSameType = [...sameType, example]
    .sort((a, b) => b.quality.overallScore - a.quality.overallScore)
    .slice(0, filters.maxPerType)

  return {
    examples: [...otherTypes, ...updatedSameType],
    filters,
  }
}

/**
 * Few-shot 예시 랭킹: 품질 순으로 정렬한다.
 */
export function rankFewShots(examples: readonly FewShotExample[]): readonly FewShotExample[] {
  return [...examples].sort((a, b) => {
    // 1차: 종합 품질
    const qualityDiff = b.quality.overallScore - a.quality.overallScore
    if (Math.abs(qualityDiff) > 0.01) return qualityDiff

    // 2차: 유저 피드백 (like > none > dislike)
    const feedbackOrder: Record<string, number> = { like: 2, none: 1, dislike: 0 }
    const feedbackDiff =
      (feedbackOrder[b.quality.userFeedback] ?? 0) - (feedbackOrder[a.quality.userFeedback] ?? 0)
    if (feedbackDiff !== 0) return feedbackDiff

    // 3차: 최신 수집 우선
    return b.collectedAt - a.collectedAt
  })
}

/**
 * 프롬프트 주입을 위한 최적 Few-shot 예시를 선택한다.
 *
 * 선택 기준:
 * - paradoxType 일치하는 것 우선
 * - 품질 순으로 상위 N개
 */
export function selectBestExamples(
  collection: FewShotCollection,
  paradoxType: string,
  count: number = 3
): readonly FewShotExample[] {
  // 같은 paradoxType 우선
  const sameTypeExamples = collection.examples.filter((ex) => ex.paradoxType === paradoxType)
  const otherExamples = collection.examples.filter((ex) => ex.paradoxType !== paradoxType)

  const ranked = [...rankFewShots(sameTypeExamples), ...rankFewShots(otherExamples)]

  return ranked.slice(0, count)
}

/**
 * Few-shot 예시를 프롬프트 텍스트로 포맷한다.
 */
export function formatFewShotsForPrompt(examples: readonly FewShotExample[]): string {
  if (examples.length === 0) return ""

  const lines: string[] = ["[Few-shot 참고 예시 — 이 페르소나의 우수 응답]"]

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i]
    lines.push(``)
    lines.push(`예시 ${i + 1}:`)
    lines.push(`입력: ${ex.input.slice(0, 100)}`)
    lines.push(`응답: ${ex.output.slice(0, 300)}`)
  }

  return lines.join("\n")
}

// ── Quality Dashboard ─────────────────────────────────────────

/**
 * 품질 대시보드 데이터: 운영자가 페르소나 품질을 모니터링하기 위한 집계 데이터.
 */
export interface QualityDashboardData {
  readonly overview: QualityOverview
  readonly archetypeMetrics: Readonly<Record<string, QualityMetricsSummary>>
  readonly paradoxTypeSuccess: Readonly<Record<string, number>> // paradoxType → 성공률
  readonly voiceDriftDistribution: readonly VoiceDriftEntry[]
  readonly pressureCurveByArchetype: Readonly<Record<string, readonly PressureCurvePoint[]>>
  readonly fewShotLibrarySize: Readonly<Record<string, number>>
  readonly trends: readonly QualityTrend[]
  readonly alerts: readonly QualityAlert[]
  readonly builtAt: number
}

export interface QualityOverview {
  readonly totalPersonas: number
  readonly avgParadoxExpression: number
  readonly avgVoiceConsistency: number
  readonly avgPressureResponse: number
  readonly avgOverallScore: number
  readonly gradeDistribution: Readonly<Record<QualityGrade, number>>
}

export interface QualityMetricsSummary {
  readonly archetypeId: string
  readonly personaCount: number
  readonly avgParadoxExpression: number
  readonly avgVoiceConsistency: number
  readonly avgPressureResponse: number
  readonly avgOverall: number
}

export interface VoiceDriftEntry {
  readonly turnCount: number
  readonly driftRate: number
}

export interface PressureCurvePoint {
  readonly pressure: number
  readonly avgIntensity: number
  readonly avgSentiment: number
}

export interface QualityTrend {
  readonly date: string // "2026-02-12"
  readonly avgScore: number
  readonly sampleCount: number
}

export type QualityAlertType =
  | "voice_drift"
  | "paradox_unexpressed"
  | "pressure_anomaly"
  | "quality_drop"

export type QualityAlertSeverity = "info" | "warning" | "critical"

export interface QualityAlert {
  readonly id: string
  readonly type: QualityAlertType
  readonly severity: QualityAlertSeverity
  readonly message: string
  readonly personaId?: string
  readonly archetypeId?: string
  readonly triggeredAt: number
  readonly acknowledged: boolean
}

/**
 * 품질 대시보드 데이터를 빌드한다.
 */
export function buildQualityDashboard(
  metricsPerPersona: readonly { personaId: string; archetypeId: string; metrics: QualityMetrics }[],
  fewShotCollection: FewShotCollection,
  previousTrends: readonly QualityTrend[] = []
): QualityDashboardData {
  // Overview 계산
  const totalPersonas = metricsPerPersona.length
  const avgParadoxExpression = safeAvg(
    metricsPerPersona.map((m) => m.metrics.paradoxExpression.score)
  )
  const avgVoiceConsistency = safeAvg(
    metricsPerPersona.map((m) => m.metrics.voiceConsistency.score)
  )
  const avgPressureResponse = safeAvg(
    metricsPerPersona.map((m) => m.metrics.pressureReaction.monotonicityScore)
  )
  const avgOverallScore = safeAvg(metricsPerPersona.map((m) => m.metrics.overallScore))

  const gradeDistribution: Record<QualityGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const m of metricsPerPersona) {
    gradeDistribution[m.metrics.grade]++
  }

  const overview: QualityOverview = {
    totalPersonas,
    avgParadoxExpression: roundTo(avgParadoxExpression, 3),
    avgVoiceConsistency: roundTo(avgVoiceConsistency, 3),
    avgPressureResponse: roundTo(avgPressureResponse, 3),
    avgOverallScore: roundTo(avgOverallScore, 3),
    gradeDistribution,
  }

  // 아키타입별 지표
  type PersonaMetricEntry = { personaId: string; archetypeId: string; metrics: QualityMetrics }
  const archetypeGroups = new Map<string, PersonaMetricEntry[]>()
  for (const m of metricsPerPersona) {
    const existing = archetypeGroups.get(m.archetypeId)
    if (existing) {
      existing.push({ personaId: m.personaId, archetypeId: m.archetypeId, metrics: m.metrics })
    } else {
      archetypeGroups.set(m.archetypeId, [
        { personaId: m.personaId, archetypeId: m.archetypeId, metrics: m.metrics },
      ])
    }
  }

  const archetypeMetrics: Record<string, QualityMetricsSummary> = {}
  for (const [archetypeId, group] of archetypeGroups) {
    archetypeMetrics[archetypeId] = {
      archetypeId,
      personaCount: group.length,
      avgParadoxExpression: roundTo(
        safeAvg(group.map((m) => m.metrics.paradoxExpression.score)),
        3
      ),
      avgVoiceConsistency: roundTo(safeAvg(group.map((m) => m.metrics.voiceConsistency.score)), 3),
      avgPressureResponse: roundTo(
        safeAvg(group.map((m) => m.metrics.pressureReaction.monotonicityScore)),
        3
      ),
      avgOverall: roundTo(safeAvg(group.map((m) => m.metrics.overallScore)), 3),
    }
  }

  // Paradox 유형별 성공률
  const paradoxTypeSuccess: Record<string, number> = {}
  for (const m of metricsPerPersona) {
    for (const example of m.metrics.paradoxExpression.examples) {
      const type = example.paradoxPair
      if (!paradoxTypeSuccess[type]) {
        paradoxTypeSuccess[type] = 0
      }
      if (example.expressionFound) {
        paradoxTypeSuccess[type] = paradoxTypeSuccess[type] + 1
      }
    }
  }
  // 정규화 (총 페르소나 수 대비)
  for (const type of Object.keys(paradoxTypeSuccess)) {
    paradoxTypeSuccess[type] = roundTo(paradoxTypeSuccess[type] / Math.max(totalPersonas, 1), 3)
  }

  // Voice drift 분포
  const voiceDriftDistribution: VoiceDriftEntry[] = []
  const driftBuckets = [5, 10, 20, 50, 100]
  for (const turnCount of driftBuckets) {
    const driftRate = safeAvg(
      metricsPerPersona
        .filter((m) => m.metrics.voiceConsistency.sampleCount >= turnCount * 0.5)
        .map((m) => 1 - m.metrics.voiceConsistency.score)
    )
    voiceDriftDistribution.push({ turnCount, driftRate: roundTo(driftRate, 3) })
  }

  // Pressure 곡선 (아키타입별)
  const pressureCurveByArchetype: Record<string, PressureCurvePoint[]> = {}
  for (const [archetypeId, group] of archetypeGroups) {
    const allTests = group.flatMap((m) => m.metrics.pressureReaction.tests)
    const pressureLevels = [0.1, 0.4, 0.7, 1.0]
    pressureCurveByArchetype[archetypeId] = pressureLevels.map((p) => {
      const testsAtLevel = allTests.filter((t) => Math.abs(t.pressureLevel - p) < 0.05)
      return {
        pressure: p,
        avgIntensity: roundTo(safeAvg(testsAtLevel.map((t) => t.intensityScore)), 3),
        avgSentiment: roundTo(safeAvg(testsAtLevel.map((t) => t.sentimentScore)), 3),
      }
    })
  }

  // Few-shot 라이브러리 크기
  const fewShotLibrarySize: Record<string, number> = {}
  for (const example of fewShotCollection.examples) {
    fewShotLibrarySize[example.paradoxType] = (fewShotLibrarySize[example.paradoxType] ?? 0) + 1
  }

  // 트렌드 업데이트
  const today = new Date().toISOString().split("T")[0]
  const newTrend: QualityTrend = {
    date: today,
    avgScore: roundTo(avgOverallScore, 3),
    sampleCount: totalPersonas,
  }
  const updatedTrends = [...previousTrends.filter((t) => t.date !== today), newTrend]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // 최근 30일

  // 알림 생성
  const alerts = generateQualityAlerts(metricsPerPersona, archetypeMetrics)

  return {
    overview,
    archetypeMetrics,
    paradoxTypeSuccess,
    voiceDriftDistribution,
    pressureCurveByArchetype,
    fewShotLibrarySize,
    trends: updatedTrends,
    alerts,
    builtAt: Date.now(),
  }
}

function generateQualityAlerts(
  metricsPerPersona: readonly { personaId: string; archetypeId: string; metrics: QualityMetrics }[],
  archetypeMetrics: Record<string, QualityMetricsSummary>
): readonly QualityAlert[] {
  const alerts: QualityAlert[] = []
  const now = Date.now()

  // 개별 페르소나 알림
  for (const m of metricsPerPersona) {
    if (m.metrics.voiceConsistency.score < 0.4) {
      alerts.push({
        id: `alert_vd_${m.personaId}_${now}`,
        type: "voice_drift",
        severity: "critical",
        message: `페르소나 ${m.personaId}의 Voice 일관성이 심각하게 이탈했습니다 (${(m.metrics.voiceConsistency.score * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    } else if (m.metrics.voiceConsistency.score < 0.6) {
      alerts.push({
        id: `alert_vd_${m.personaId}_${now}`,
        type: "voice_drift",
        severity: "warning",
        message: `페르소나 ${m.personaId}의 Voice 일관성이 낮습니다 (${(m.metrics.voiceConsistency.score * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }

    if (
      m.metrics.paradoxExpression.score < 0.3 &&
      m.metrics.paradoxExpression.examples.length > 0
    ) {
      alerts.push({
        id: `alert_pe_${m.personaId}_${now}`,
        type: "paradox_unexpressed",
        severity: "warning",
        message: `페르소나 ${m.personaId}의 역설이 충분히 표현되지 않고 있습니다 (${(m.metrics.paradoxExpression.score * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }

    if (!m.metrics.pressureReaction.overallPassed && m.metrics.pressureReaction.tests.length > 0) {
      alerts.push({
        id: `alert_pa_${m.personaId}_${now}`,
        type: "pressure_anomaly",
        severity: "warning",
        message: `페르소나 ${m.personaId}의 Pressure 반응이 비정상적입니다 (단조성 ${(m.metrics.pressureReaction.monotonicityScore * 100).toFixed(0)}%)`,
        personaId: m.personaId,
        archetypeId: m.archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }
  }

  // 아키타입별 알림
  for (const [archetypeId, summary] of Object.entries(archetypeMetrics)) {
    if (summary.avgOverall < 0.5) {
      alerts.push({
        id: `alert_qd_${archetypeId}_${now}`,
        type: "quality_drop",
        severity: "critical",
        message: `아키타입 ${archetypeId}의 전체 품질이 낮습니다 (${(summary.avgOverall * 100).toFixed(0)}%)`,
        archetypeId,
        triggeredAt: now,
        acknowledged: false,
      })
    }
  }

  return alerts
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC5: Integration                                              ║
// ║ RAG → Prompt Builder, Tier Router → Generation Pipeline       ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── RAG → Prompt Builder Integration ──────────────────────────

/**
 * RAG 컨텍스트를 프롬프트 빌더와 통합하기 위한 설정.
 *
 * 프롬프트 구성 순서:
 * [A] 시스템 프롬프트 (고정, 캐시 대상) ~2,000 tok
 * [B] Voice 앵커 (RAG 검색) ~500 tok
 * [C] 관계 기억 (RAG 조건부 검색) ~800 tok
 * [D] 관심사 연속성 (RAG 검색) ~100 tok
 * [E] Few-shot 예시 ~300 tok
 * [F] 현재 컨텍스트 + 유저 입력 ~500 tok
 */
export interface RAGPromptIntegration {
  readonly ragContext: RAGContext
  readonly fewShotExamples: readonly FewShotExample[]
  readonly systemPromptBase: string
  readonly maxTotalTokens: number
  readonly cacheConfig: RAGCacheConfig
}

export interface IntegratedPrompt {
  readonly systemPrompt: string // [A] 시스템 프롬프트
  readonly ragSection: string // [B]+[C]+[D] RAG 컨텍스트
  readonly fewShotSection: string // [E] Few-shot 예시
  readonly totalTokenEstimate: number
  readonly cacheable: boolean // [A] 부분 캐시 가능 여부
  readonly cacheKey: string
}

/**
 * RAG 컨텍스트와 프롬프트 빌더를 통합하여 완성된 프롬프트를 생성한다.
 */
export function integrateRAGWithPromptBuilder(integration: RAGPromptIntegration): IntegratedPrompt {
  const { ragContext, fewShotExamples, systemPromptBase, maxTotalTokens } = integration

  // [B]+[C]+[D] RAG 섹션
  const ragSection = ragContext.compiledText

  // [E] Few-shot 섹션
  const fewShotSection = formatFewShotsForPrompt(fewShotExamples)

  // 토큰 예산 관리
  const systemTokens = estimateTokenCount(systemPromptBase)
  const ragTokens = estimateTokenCount(ragSection)
  const fewShotTokens = estimateTokenCount(fewShotSection)
  const totalTokenEstimate = systemTokens + ragTokens + fewShotTokens

  // 예산 초과 시 RAG 섹션 트리밍
  let finalRagSection = ragSection
  let finalFewShotSection = fewShotSection

  if (totalTokenEstimate > maxTotalTokens) {
    const available = maxTotalTokens - systemTokens
    const ragBudget = Math.floor(available * 0.7) // RAG 70%
    const fewShotBudget = available - ragBudget // Few-shot 30%

    finalRagSection = trimToTokenBudget(ragSection, ragBudget)
    finalFewShotSection = trimToTokenBudget(fewShotSection, fewShotBudget)
  }

  // 캐시 키: 시스템 프롬프트는 페르소나별로 고정 → 캐시 가능
  const cacheKey = `system:${hashString(systemPromptBase)}`

  return {
    systemPrompt: systemPromptBase,
    ragSection: finalRagSection,
    fewShotSection: finalFewShotSection,
    totalTokenEstimate: estimateTokenCount(
      systemPromptBase + finalRagSection + finalFewShotSection
    ),
    cacheable: systemTokens >= 1024, // Anthropic cache_control 최소 1,024 tok
    cacheKey,
  }
}

// ── Tier Router → Generation Pipeline Integration ─────────────

/**
 * Tier 라우터와 생성 파이프라인을 통합하기 위한 설정.
 */
export interface TierPipelineIntegration {
  readonly routingConfig: TierRoutingConfig
  readonly pipelineConfig: LLMPipelineConfig
  readonly promptCacheStore: PromptCacheStore
}

export interface PipelineExecutionPlan {
  readonly tier: ModelTier
  readonly modelConfig: ModelConfig
  readonly prompt: IntegratedPrompt
  readonly estimatedCost: CostEstimate
  readonly cacheHit: boolean
  readonly routingExplanation: TierRoutingExplanation
}

/**
 * Tier 라우터와 생성 파이프라인을 통합하여 실행 계획을 수립한다.
 */
export function integrateTierWithPipeline(
  integration: TierPipelineIntegration,
  routingInput: TierRoutingInput,
  prompt: IntegratedPrompt
): PipelineExecutionPlan {
  // 1. Tier 결정
  const routingExplanation = explainRouting(routingInput, integration.routingConfig)
  const tier = routingExplanation.selectedTier
  const modelConfig = integration.pipelineConfig.models[tier]

  // 2. 캐시 확인
  const { prompt: cachedPrompt } = getCachedPrompt(integration.promptCacheStore, prompt.cacheKey)
  const cacheHit = cachedPrompt !== null

  // 3. 비용 추정
  const estimatedInputTokens = prompt.totalTokenEstimate
  const estimatedOutputTokens = modelConfig.maxTokens // 최대치로 추정
  const estimatedCost = estimateRequestCost(
    tier,
    estimatedInputTokens,
    estimatedOutputTokens,
    cacheHit
  )

  return {
    tier,
    modelConfig,
    prompt,
    estimatedCost,
    cacheHit,
    routingExplanation,
  }
}

/**
 * 파이프라인 실행 결과를 품질 피드백 루프에 연결한다.
 */
export interface PipelineExecutionResult {
  readonly plan: PipelineExecutionPlan
  readonly response: LLMResponse
  readonly qualityMetrics: QualityMetrics | null // 샘플링 대상일 때만
}

/**
 * 실행 결과를 기반으로 Few-shot 수집 여부를 판단한다.
 */
export function shouldCollectFewShot(
  result: PipelineExecutionResult,
  thresholds: { minParadoxScore: number; minVoiceScore: number } = {
    minParadoxScore: 0.8,
    minVoiceScore: 0.7,
  }
): boolean {
  if (!result.qualityMetrics) return false

  return (
    result.qualityMetrics.paradoxExpression.score >= thresholds.minParadoxScore &&
    result.qualityMetrics.voiceConsistency.score >= thresholds.minVoiceScore
  )
}

/**
 * 실행 결과를 기반으로 품질 샘플링 대상인지 판단한다.
 *
 * 샘플링 전략:
 * - Heavy tier 호출 → 항상 품질 측정 (비용이 높으므로 품질 보장 필요)
 * - Light tier 호출 → 10% 확률로 품질 측정
 */
export function shouldSampleForQuality(tier: ModelTier, samplingRate: number = 0.1): boolean {
  if (tier === "tier1_heavy") return true
  return Math.random() < samplingRate
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ Utility Functions                                             ║
// ╚═══════════════════════════════════════════════════════════════╝

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function countOccurrences(text: string, search: string): number {
  if (search.length === 0) return 0
  let count = 0
  let pos = 0
  while (true) {
    pos = text.indexOf(search, pos)
    if (pos === -1) break
    count++
    pos += search.length
  }
  return count
}

function safeAvg(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * 토큰 수 추정 (한국어 기준: 1글자 ≈ 1.5 토큰, 영어 기준: 1단어 ≈ 1.3 토큰).
 * 정확하지 않지만 비용/예산 추정에 충분한 근사치.
 */
function estimateTokenCount(text: string): number {
  if (!text) return 0
  // 한국어/CJK 문자 개수
  const cjkCount = (text.match(/[\u3000-\u9fff\uac00-\ud7af]/g) ?? []).length
  // 영문 단어 개수
  const englishWords = text
    .replace(/[\u3000-\u9fff\uac00-\ud7af]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  return Math.ceil(cjkCount * 1.5 + englishWords * 1.3)
}

function trimToTokenBudget(text: string, maxTokens: number): string {
  const currentTokens = estimateTokenCount(text)
  if (currentTokens <= maxTokens) return text

  // 비율 기반 트리밍
  const ratio = maxTokens / currentTokens
  const targetLength = Math.floor(text.length * ratio * 0.9) // 10% 여유
  return text.slice(0, targetLength) + "\n[... 토큰 예산으로 인해 축약됨]"
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return "방금 전"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  return `${Math.floor(seconds / 86400)}일 전`
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
