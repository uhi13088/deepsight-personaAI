// ═══════════════════════════════════════════════════════════════
// content-vectorizer.ts — Claude API 기반 콘텐츠 벡터화
// T393: ContentItem → L1 7D + L3 4D 벡터 추출
// ═══════════════════════════════════════════════════════════════

import { generateText } from "@/lib/llm-client"
import { clamp } from "@deepsight/vector-core"
import type { SocialPersonaVector, NarrativeDriveVector } from "@deepsight/shared-types"

// ── 타입 ─────────────────────────────────────────────────────

export interface ContentVectorInput {
  title: string
  description?: string | null
  genres: string[]
  tags: string[]
}

export interface ContentVectorResult {
  contentVector: SocialPersonaVector // L1 7D
  narrativeTheme: NarrativeDriveVector // L3 4D
}

// ── 시스템 프롬프트 ──────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 콘텐츠 분석 전문가입니다.
주어진 콘텐츠 정보를 보고, "이 콘텐츠에 끌릴 사람의 취향/성향 프로필"을 벡터로 추론합니다.

반드시 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력하세요.

{
  "contentVector": {
    "depth": 0.0~1.0,       // 직관적(0) ↔ 심층적(1): 콘텐츠 분석 깊이를 즐기는 사람
    "lens": 0.0~1.0,        // 감성적(0) ↔ 논리적(1): 감성적 vs 논리적 소비 성향
    "stance": 0.0~1.0,      // 수용적(0) ↔ 비판적(1): 비판적 시각 vs 수용적 시각
    "scope": 0.0~1.0,       // 핵심만(0) ↔ 디테일(1): 핵심 흐름 vs 세부 디테일 선호
    "taste": 0.0~1.0,       // 클래식(0) ↔ 실험적(1): 검증된 것 vs 새로운 것 선호
    "purpose": 0.0~1.0,     // 오락(0) ↔ 의미추구(1): 재미 vs 의미/가치 소비 목적
    "sociability": 0.0~1.0  // 독립적(0) ↔ 사교적(1): 혼자 vs 공유하고 싶은 콘텐츠
  },
  "narrativeTheme": {
    "lack": 0.0~1.0,        // 충족(0) ↔ 결핍(1): 결핍/갈망을 다루는 콘텐츠인가
    "moralCompass": 0.0~1.0, // 유연(0) ↔ 엄격(1): 도덕적 판단이 강한 콘텐츠인가
    "volatility": 0.0~1.0,  // 안정(0) ↔ 폭발적(1): 감정적 격변/긴장감이 높은가
    "growthArc": 0.0~1.0    // 정체(0) ↔ 성장(1): 성장/변화 서사가 강한가
  }
}

모든 값은 0.00~1.00 사이 소수점 2자리로 표현하세요.`

// ── 응답 파싱 ────────────────────────────────────────────────

function parseVectorResponse(text: string): ContentVectorResult {
  // JSON 코드 블록 제거
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`content-vectorizer: JSON 파싱 실패\n${text.slice(0, 200)}`)
  }

  const p = parsed as Record<string, unknown>
  const cv = (p.contentVector ?? {}) as Record<string, unknown>
  const nt = (p.narrativeTheme ?? {}) as Record<string, unknown>

  const contentVector: SocialPersonaVector = {
    depth: clamp(Number(cv.depth ?? 0.5)),
    lens: clamp(Number(cv.lens ?? 0.5)),
    stance: clamp(Number(cv.stance ?? 0.5)),
    scope: clamp(Number(cv.scope ?? 0.5)),
    taste: clamp(Number(cv.taste ?? 0.5)),
    purpose: clamp(Number(cv.purpose ?? 0.5)),
    sociability: clamp(Number(cv.sociability ?? 0.5)),
  }

  const narrativeTheme: NarrativeDriveVector = {
    lack: clamp(Number(nt.lack ?? 0.5)),
    moralCompass: clamp(Number(nt.moralCompass ?? 0.5)),
    volatility: clamp(Number(nt.volatility ?? 0.5)),
    growthArc: clamp(Number(nt.growthArc ?? 0.5)),
  }

  return { contentVector, narrativeTheme }
}

// ── 단건 벡터화 ──────────────────────────────────────────────

export async function vectorizeContent(item: ContentVectorInput): Promise<ContentVectorResult> {
  const genreText = item.genres.length > 0 ? `장르: ${item.genres.join(", ")}` : ""
  const tagText = item.tags.length > 0 ? `태그: ${item.tags.join(", ")}` : ""
  const descText = item.description ? `설명: ${item.description.slice(0, 500)}` : ""

  const userMessage = [`제목: ${item.title}`, descText, genreText, tagText]
    .filter(Boolean)
    .join("\n")

  const result = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 256,
    temperature: 0.2, // 일관된 벡터 출력을 위해 낮은 temperature
    callType: "content_vectorize",
  })

  return parseVectorResponse(result.text)
}

// ── 배치 벡터화 (concurrency 제한) ──────────────────────────

export async function vectorizeBatch(
  items: ContentVectorInput[],
  concurrency = 5
): Promise<ContentVectorResult[]> {
  const results: ContentVectorResult[] = new Array(items.length)
  let index = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = index++
      if (i >= items.length) break
      results[i] = await vectorizeContent(items[i])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker)
  await Promise.all(workers)

  return results
}
