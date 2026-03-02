// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Consumption Manager
// 구현계획서 §5.5, 설계서 §7.6
// 비공개 소비 기록 저장 + RAG 컨텍스트 조회 + 통계
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import type { ConsumptionContentType, ConsumptionRecord, ConsumptionSource } from "./types"

/**
 * LLM provider 인터페이스 (impression 생성용).
 */
export interface ConsumptionLLMProvider {
  generateImpression(params: {
    contentType: ConsumptionContentType
    title: string
    personaContext: string
  }): Promise<string>
}

/**
 * 비공개 소비 기록 저장.
 *
 * 설계서 §7.6.3 기록 트리거:
 * 1. LLM으로 impression 생성 (~50자 한줄 감상)
 * 2. 자동 태깅 (contentType + 제목 기반)
 * 3. emotionalImpact 계산
 * 4. ConsumptionLog DB 저장
 */
export async function recordConsumption(
  personaId: string,
  record: ConsumptionRecord
): Promise<{ id: string; impression: string; tags: string[] }> {
  const log = await prisma.consumptionLog.create({
    data: {
      personaId,
      contentType: record.contentType,
      contentId: record.contentId ?? null,
      title: record.title,
      impression: record.impression,
      rating: record.rating ?? null,
      emotionalImpact: record.emotionalImpact,
      tags: record.tags,
      source: record.source,
    },
  })

  return {
    id: log.id,
    impression: log.impression,
    tags: log.tags,
  }
}

/**
 * RAG 컨텍스트용 소비 기억 조회.
 *
 * 설계서 §7.6.4 검색 전략:
 * 1. 현재 주제/태그와 매칭되는 소비 기록 검색
 * 2. 90일 이내 + 상위 5건
 * 3. "~를 봤는데 인상적이었다" 형태로 요약 (~200 tok)
 */
export async function getConsumptionContext(
  personaId: string,
  currentTags?: string[],
  currentTopic?: string
): Promise<string> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // 태그 매칭 쿼리: 태그가 있으면 태그 기반 검색, 없으면 최신순
  const logs = await prisma.consumptionLog.findMany({
    where: {
      personaId,
      consumedAt: { gte: ninetyDaysAgo },
      ...(currentTags && currentTags.length > 0 ? { tags: { hasSome: currentTags } } : {}),
    },
    orderBy: { consumedAt: "desc" },
    take: 5,
  })

  if (logs.length === 0) {
    return ""
  }

  // 포맷: 설계서 §7.6.4
  const lines = logs.map((log) => {
    const daysAgo = Math.floor((Date.now() - log.consumedAt.getTime()) / (1000 * 60 * 60 * 24))
    const timeLabel =
      daysAgo === 0 ? "오늘" : daysAgo <= 7 ? `${daysAgo}일 전` : `${Math.floor(daysAgo / 7)}주 전`
    const rating = log.rating ? ` (${Number(log.rating).toFixed(2)})` : ""
    return `- [${timeLabel}] ${log.title} — "${log.impression}"${rating}`
  })

  return [
    "[소비 기억 — 이 페르소나가 경험했지만 리뷰를 쓰지 않은 컨텐츠]",
    ...lines,
    "→ 이 기억을 자연스럽게 대화에 녹일 수 있지만, 전문 리뷰를 쓴 적은 없음.",
  ].join("\n")
}

/**
 * 페르소나의 최근 소비 통계 조회 (주제 선택 참고용).
 */
export async function getConsumptionStats(
  personaId: string,
  days: number
): Promise<{
  totalCount: number
  byType: Record<string, number>
  topTags: Array<{ tag: string; count: number }>
  avgRating: number
}> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const logs = await prisma.consumptionLog.findMany({
    where: {
      personaId,
      consumedAt: { gte: since },
    },
    select: {
      contentType: true,
      tags: true,
      rating: true,
    },
  })

  // type별 카운트
  const byType: Record<string, number> = {}
  for (const log of logs) {
    byType[log.contentType] = (byType[log.contentType] ?? 0) + 1
  }

  // 태그 카운트
  const tagCount: Record<string, number> = {}
  for (const log of logs) {
    for (const tag of log.tags) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1
    }
  }

  const topTags = Object.entries(tagCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  // 평균 rating
  const rated = logs.filter((l) => l.rating !== null)
  const avgRating =
    rated.length > 0 ? rated.reduce((sum, l) => sum + Number(l.rating), 0) / rated.length : 0

  return {
    totalCount: logs.length,
    byType,
    topTags,
    avgRating,
  }
}

/**
 * impression 자동 생성 (LLM 사용 가능 시).
 *
 * LLM provider 없으면 기본 템플릿 사용.
 */
export async function generateImpression(
  contentType: ConsumptionContentType,
  title: string,
  llmProvider?: ConsumptionLLMProvider,
  personaContext?: string
): Promise<string> {
  if (llmProvider && personaContext) {
    return llmProvider.generateImpression({
      contentType,
      title,
      personaContext,
    })
  }

  // 기본 템플릿
  const templates: Partial<Record<ConsumptionContentType, string>> = {
    MOVIE: `${title} 봤다. 인상적이었다.`,
    DRAMA: `${title} 정주행 완료.`,
    MUSIC: `${title} 들었다. 계속 듣게 된다.`,
    BOOK: `${title} 읽었다. 여운이 남는다.`,
    ARTICLE: `${title} 읽었다. 흥미로운 관점이다.`,
    GAME: `${title} 플레이했다. 재밌었다.`,
    OTHER: `${title} 경험했다.`,
  }

  return templates[contentType] ?? `${title} 소비 완료.`
}

/**
 * 자동 태깅 (contentType + 제목 기반 단순 태깅).
 *
 * 실제 프로덕션에서는 LLM 기반 태깅 추가 가능.
 */
export function autoTag(contentType: ConsumptionContentType, title: string): string[] {
  const tags: string[] = [contentType.toLowerCase()]

  // 제목에서 키워드 추출 (간단한 규칙 기반)
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2)

  // 상위 3개 키워드
  for (const word of words.slice(0, 3)) {
    if (!tags.includes(word.toLowerCase())) {
      tags.push(word.toLowerCase())
    }
  }

  return tags
}

// ── 포스트 → 소비 기록 추출 (순수 함수) ─────────────────────

/**
 * 포스트 생성 후 소비 기록으로 추출할 아이템을 반환.
 *
 * - CURATION: metadata.items 배열 → 각 아이템 = 소비 기록
 * - REVIEW: 포스트 토픽/콘텐츠에서 단일 아이템 추출
 * - NEWS_REACTION: 뉴스 기사 1건 추출
 *
 * 반환값은 source 필드 미포함 (호출자가 결정).
 */
export function extractConsumptionFromPost(params: {
  postType: string
  content: string
  metadata: Record<string, unknown>
  topic?: string
  hashtags?: string[]
}): Array<Omit<ConsumptionRecord, "source">> {
  const { postType, content, metadata, topic, hashtags = [] } = params
  const contentType = inferContentType(hashtags, topic)

  switch (postType) {
    case "CURATION": {
      const items = metadata.items as
        | Array<{ rank?: number; title?: string; reason?: string }>
        | undefined
      if (!items || items.length === 0) return []

      return items
        .filter((item) => item.title && item.title.trim().length > 0)
        .map((item) => ({
          contentType,
          title: item.title!.trim(),
          impression: item.reason?.trim() || `${item.title!.trim()} — 큐레이션 목록에 포함`,
          emotionalImpact: 0.2,
          tags: autoTag(contentType, item.title!),
        }))
    }

    case "REVIEW": {
      // 리뷰 대상 추출: 토픽 또는 콘텐츠 첫 줄에서 제목 추출
      const title = extractReviewTitle(content, topic)
      if (!title) return []

      // rating: metadata.rating (1-5 → 0.0-1.0 변환)
      const rawRating = typeof metadata.rating === "number" ? metadata.rating : undefined
      const rating = rawRating ? Math.min(1, rawRating / 5) : undefined

      return [
        {
          contentType,
          title,
          impression: extractFirstSentence(content),
          rating,
          emotionalImpact: 0.3,
          tags: autoTag(contentType, title),
        },
      ]
    }

    case "NEWS_REACTION": {
      const title = topic || extractFirstLine(content)
      if (!title) return []

      return [
        {
          contentType: "ARTICLE" as ConsumptionContentType,
          title,
          impression: extractFirstSentence(content),
          emotionalImpact: 0.15,
          tags: autoTag("ARTICLE", title),
        },
      ]
    }

    default:
      return []
  }
}

/** 해시태그와 토픽에서 콘텐츠 타입 추론 */
export function inferContentType(hashtags: string[], topic?: string): ConsumptionContentType {
  const text = [...hashtags, topic ?? ""].join(" ").toLowerCase()

  const patterns: Array<{ type: ConsumptionContentType; keywords: string[] }> = [
    {
      type: "MOVIE",
      keywords: ["영화", "필름", "film", "movie", "시네마", "cinema", "감독", "개봉"],
    },
    {
      type: "DRAMA",
      keywords: ["드라마", "시리즈", "drama", "series", "시즌", "season", "웹드라마"],
    },
    { type: "MUSIC", keywords: ["음악", "앨범", "music", "album", "노래", "song", "아티스트"] },
    { type: "BOOK", keywords: ["책", "소설", "book", "novel", "에세이", "essay", "저자", "작가"] },
    { type: "ARTICLE", keywords: ["기사", "뉴스", "news", "article", "보도", "칼럼"] },
    { type: "GAME", keywords: ["게임", "game", "플레이", "play", "콘솔", "스팀"] },
  ]

  for (const { type, keywords } of patterns) {
    if (keywords.some((kw) => text.includes(kw))) return type
  }
  return "OTHER"
}

/** REVIEW 포스트에서 리뷰 대상 제목 추출 */
function extractReviewTitle(content: string, topic?: string): string | null {
  // 토픽이 있으면 우선 사용
  if (topic && topic.trim().length > 0) return topic.trim()

  // 콘텐츠에서 <제목> 또는 「제목」 또는 '제목' 패턴 추출
  const titleMatch = content.match(/[<＜《「『'"](.+?)[>＞》」』'"]/)
  if (titleMatch) return titleMatch[1].trim()

  // 첫 줄에서 추출 시도
  const firstLine = content.split("\n")[0]?.trim()
  if (firstLine && firstLine.length <= 50) return firstLine

  return null
}

/** 콘텐츠의 첫 번째 문장 추출 (impression용, 최대 50자) */
function extractFirstSentence(content: string): string {
  const cleaned = content.replace(/#\S+/g, "").trim()
  const match = cleaned.match(/^(.+?[.!?。！？])/)
  const sentence = match ? match[1] : (cleaned.split("\n")[0] ?? "")
  return sentence.length > 50 ? sentence.slice(0, 47) + "..." : sentence
}

/** 콘텐츠의 첫 줄 추출 */
function extractFirstLine(content: string): string {
  const line = content.split("\n")[0]?.trim() ?? ""
  return line.length > 50 ? line.slice(0, 47) + "..." : line
}
