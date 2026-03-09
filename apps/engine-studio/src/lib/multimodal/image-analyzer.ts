// ═══════════════════════════════════════════════════════════════
// v4.2.0: Image Analyzer — Claude Vision 기반 이미지 이해
// 이미지를 분석하여 구조화된 메타데이터를 추출.
// 페르소나 반응 생성, 콘텐츠 벡터 추출의 기반.
// ═══════════════════════════════════════════════════════════════

import { generateText, type LLMImageInput } from "@/lib/llm-client"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ImageAnalysis {
  /** 이미지 내용에 대한 자연어 설명 (2~3문장) */
  description: string
  /** 이미지의 전체적인 분위기/감정 (예: "따뜻한", "어두운", "활기찬") */
  mood: string
  /** 이미지에서 추출된 주제 태그 (3~8개) */
  tags: string[]
  /** 지배적인 색감 (2~4개, 예: "파스텔 핑크", "네이비 블루") */
  dominantColors: string[]
  /** 감정 수치 (-1.0 부정 ~ 1.0 긍정) */
  sentiment: number
  /** 이미지 카테고리 (예: "풍경", "음식", "인물", "예술", "일상") */
  category: string
}

interface AnalyzeCacheEntry {
  analysis: ImageAnalysis
  cachedAt: number
}

// ── 분석 결과 캐시 (동일 URL 재분석 방지) ───────────────────

const analysisCache = new Map<string, AnalyzeCacheEntry>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30분
const MAX_CACHE_SIZE = 200

function getCacheKey(imageSource: LLMImageInput): string {
  if (imageSource.type === "url") {
    return `url:${imageSource.data}`
  }
  // base64: 앞 100자 + 길이로 키 생성 (전체 해싱은 비용이 큼)
  return `b64:${imageSource.data.slice(0, 100)}:${imageSource.data.length}`
}

function getFromCache(key: string): ImageAnalysis | null {
  const entry = analysisCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    analysisCache.delete(key)
    return null
  }
  return entry.analysis
}

function setCache(key: string, analysis: ImageAnalysis): void {
  // LRU: 최대 크기 초과 시 가장 오래된 항목 제거
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    const firstKey = analysisCache.keys().next().value
    if (firstKey !== undefined) {
      analysisCache.delete(firstKey)
    }
  }
  analysisCache.set(key, { analysis, cachedAt: Date.now() })
}

// ── 분석 프롬프트 ─────────────────────────────────────────────

const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an image analysis expert. Analyze the provided image and return a structured JSON response.

IMPORTANT RULES:
- Respond ONLY with valid JSON, no other text
- Description should be 2-3 natural Korean sentences describing what's in the image
- Mood should be a single Korean adjective/phrase (e.g., "따뜻한", "쓸쓸한", "활기찬")
- Tags should be 3-8 Korean keywords relevant to the image content
- DominantColors should be 2-4 Korean color descriptions (e.g., "파스텔 핑크", "진한 초록")
- Sentiment: -1.0 (very negative) to 1.0 (very positive), use 0.0 for neutral
- Category: one of "풍경", "음식", "인물", "예술", "일상", "동물", "건축", "패션", "스포츠", "기타"`

const IMAGE_ANALYSIS_USER_PROMPT = `이 이미지를 분석하고 다음 JSON 형식으로 응답해주세요:

{
  "description": "이미지 설명 (한국어, 2-3문장)",
  "mood": "분위기 (한국어 형용사)",
  "tags": ["태그1", "태그2", ...],
  "dominantColors": ["색상1", "색상2", ...],
  "sentiment": 0.0,
  "category": "카테고리"
}`

// ── 메인 분석 함수 ────────────────────────────────────────────

/**
 * 이미지를 Claude Vision으로 분석하여 구조화된 메타데이터를 반환.
 * 동일 이미지는 캐시하여 재분석을 방지.
 */
export async function analyzeImage(imageSource: LLMImageInput): Promise<ImageAnalysis> {
  // 캐시 확인
  const cacheKey = getCacheKey(imageSource)
  const cached = getFromCache(cacheKey)
  if (cached) return cached

  const result = await generateText({
    systemPrompt: IMAGE_ANALYSIS_SYSTEM_PROMPT,
    userMessage: IMAGE_ANALYSIS_USER_PROMPT,
    images: [imageSource],
    maxTokens: 500,
    temperature: 0.3,
    callType: "mm:image_analysis",
  })

  const analysis = parseAnalysisResponse(result.text)

  // 캐시 저장
  setCache(cacheKey, analysis)

  return analysis
}

/**
 * 여러 이미지를 병렬로 분석 (최대 concurrency 제한).
 */
export async function analyzeImages(
  imageSources: LLMImageInput[],
  concurrency = 3
): Promise<ImageAnalysis[]> {
  const results: ImageAnalysis[] = []

  for (let i = 0; i < imageSources.length; i += concurrency) {
    const batch = imageSources.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((img) => analyzeImage(img)))
    results.push(...batchResults)
  }

  return results
}

// ── JSON 파싱 + 폴백 ──────────────────────────────────────────

function parseAnalysisResponse(text: string): ImageAnalysis {
  // JSON 블록 추출 (```json ... ``` 또는 { ... })
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)

  if (!jsonMatch) {
    return createFallbackAnalysis(text)
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>
    return {
      description: typeof parsed.description === "string" ? parsed.description : "이미지 분석 결과",
      mood: typeof parsed.mood === "string" ? parsed.mood : "중립적인",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === "string").slice(0, 8)
        : [],
      dominantColors: Array.isArray(parsed.dominantColors)
        ? parsed.dominantColors.filter((c): c is string => typeof c === "string").slice(0, 4)
        : [],
      sentiment:
        typeof parsed.sentiment === "number" ? Math.max(-1, Math.min(1, parsed.sentiment)) : 0,
      category: typeof parsed.category === "string" ? parsed.category : "기타",
    }
  } catch {
    return createFallbackAnalysis(text)
  }
}

function createFallbackAnalysis(rawText: string): ImageAnalysis {
  return {
    description: rawText.slice(0, 200) || "이미지 분석에 실패했습니다.",
    mood: "중립적인",
    tags: [],
    dominantColors: [],
    sentiment: 0,
    category: "기타",
  }
}

// ── 캐시 관리 (테스트/운영용) ─────────────────────────────────

export function clearImageAnalysisCache(): void {
  analysisCache.clear()
}

export function getImageAnalysisCacheSize(): number {
  return analysisCache.size
}
