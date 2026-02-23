// ═══════════════════════════════════════════════════════════════
// Phase NB — News Fetcher
// RSS 피드 수집 + Claude 기사 분석 (요약 + 태그 추출)
// ═══════════════════════════════════════════════════════════════

// ── 타입 ────────────────────────────────────────────────────────

export interface RawArticle {
  title: string
  url: string
  publishedAt: Date
  rawContent: string // 원문 발췌 (최대 2000자)
}

export interface ArticleAnalysis {
  summary: string // 300자 이내 요약
  topicTags: string[] // 주제 태그 (최대 5개)
}

export interface LLMProvider {
  generateText(params: {
    systemPrompt: string
    userPrompt: string
    maxTokens: number
  }): Promise<{ text: string; tokensUsed: number }>
}

// ── RSS 파싱 ─────────────────────────────────────────────────────

/**
 * RSS XML 문자열에서 기사 목록 추출.
 *
 * 외부 라이브러리 없이 순수 문자열 파싱.
 * RSS 2.0 / Atom 기본 구조 지원.
 */
export function parseRssXml(xml: string): RawArticle[] {
  const articles: RawArticle[] = []

  // <item> 또는 <entry> 블록 추출
  const itemPattern = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi
  let match: RegExpExecArray | null

  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1] ?? match[2] ?? ""

    const title = extractTag(block, "title")
    const link = extractTag(block, "link") ?? extractAttr(block, "link", "href")
    const pubDate =
      extractTag(block, "pubDate") ??
      extractTag(block, "published") ??
      extractTag(block, "updated") ??
      new Date().toISOString()
    const description =
      extractTag(block, "description") ??
      extractTag(block, "summary") ??
      extractTag(block, "content") ??
      ""

    if (!title || !link) continue

    const parsedDate = new Date(pubDate)
    if (isNaN(parsedDate.getTime())) continue

    articles.push({
      title: stripHtml(title).trim(),
      url: link.trim(),
      publishedAt: parsedDate,
      rawContent: stripHtml(description).slice(0, 2000),
    })
  }

  return articles
}

/** XML 태그 내용 추출 (CDATA 포함) */
function extractTag(xml: string, tag: string): string | null {
  const pattern = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
    "i"
  )
  const m = pattern.exec(xml)
  if (!m) return null
  return (m[1] ?? m[2] ?? "").trim() || null
}

/** 속성값 추출 (예: <link href="..."/>) */
function extractAttr(xml: string, tag: string, attr: string): string | null {
  const pattern = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, "i")
  const m = pattern.exec(xml)
  return m ? m[1] : null
}

/** HTML 태그 제거 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// ── RSS 수집 ─────────────────────────────────────────────────────

/**
 * RSS URL에서 기사 목록 수집.
 *
 * 네트워크 환경이 없으면 빈 배열 반환 (fire-and-forget 안전).
 */
export async function fetchArticlesFromRss(rssUrl: string): Promise<RawArticle[]> {
  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "DeepSight-PersonaWorld/1.0 (RSS Reader)" },
      signal: AbortSignal.timeout(10_000), // 10초 타임아웃
    })

    if (!res.ok) {
      console.warn(`[news-fetcher] RSS fetch failed: ${rssUrl} → ${res.status}`)
      return []
    }

    const xml = await res.text()
    const articles = parseRssXml(xml)

    console.log(`[news-fetcher] ${rssUrl} → ${articles.length}개 기사 파싱`)
    return articles
  } catch (err) {
    console.warn(`[news-fetcher] RSS fetch error: ${rssUrl}`, err)
    return []
  }
}

// ── Claude 분석 ──────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `당신은 뉴스 기사를 분석하는 전문가입니다.
주어진 기사 제목과 내용을 바탕으로 다음 두 가지를 JSON 형식으로 출력하세요:
1. summary: 300자 이내의 핵심 요약 (한국어)
2. topicTags: 주제 태그 배열 (최대 5개, 짧은 키워드, 예: ["AI", "규제", "기술정책"])

반드시 아래 JSON만 출력하세요:
{"summary":"...","topicTags":["...",...]}
`

/**
 * Claude로 기사 요약 + 주제 태그 추출.
 *
 * LLM 없으면 제목 기반 fallback 반환.
 */
export async function analyzeArticleWithClaude(
  title: string,
  rawContent: string,
  llm?: LLMProvider
): Promise<ArticleAnalysis> {
  if (!llm) {
    return fallbackAnalysis(title)
  }

  const userPrompt = `[제목] ${title}\n\n[내용]\n${rawContent.slice(0, 1000)}`

  try {
    const { text } = await llm.generateText({
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 300,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return fallbackAnalysis(title)

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string
      topicTags?: unknown
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 300) : title
    const topicTags = Array.isArray(parsed.topicTags)
      ? (parsed.topicTags as unknown[])
          .filter((t): t is string => typeof t === "string")
          .slice(0, 5)
      : extractTagsFromTitle(title)

    return { summary, topicTags }
  } catch (err) {
    console.warn("[news-fetcher] Claude analysis failed:", err)
    return fallbackAnalysis(title)
  }
}

function fallbackAnalysis(title: string): ArticleAnalysis {
  return {
    summary: title,
    topicTags: extractTagsFromTitle(title),
  }
}

/** 제목에서 키워드 추출 (LLM 없이 fallback) */
function extractTagsFromTitle(title: string): string[] {
  const stopWords = new Set([
    "이",
    "가",
    "을",
    "를",
    "의",
    "에",
    "서",
    "로",
    "와",
    "과",
    "도",
    "은",
    "는",
    "하다",
    "있다",
    "위해",
    "대한",
    "통해",
    "및",
    "등",
    "년",
    "월",
    "일",
  ])
  return title
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .slice(0, 5)
}
