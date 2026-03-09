// ═══════════════════════════════════════════════════════════════
// v4.2.0: Image Memory Service
// 페르소나가 본 이미지를 SemanticMemory에 저장하고 RAG 검색에 포함
// ═══════════════════════════════════════════════════════════════

import type { ImageAnalysis } from "./image-analyzer"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ImageMemoryInput {
  personaId: string
  imageUrl: string
  analysis: ImageAnalysis
  /** 이미지가 포함된 포스트 ID (에피소드 소스) */
  sourcePostId: string
}

export interface ImageMemoryRecord {
  id: string
  personaId: string
  imageUrl: string
  imageDescription: string
  subject: string
  belief: string
  category: "BELIEF"
  confidence: number
  createdAt: Date
}

export interface ImageMemoryProvider {
  /** 이미지 기억 저장 */
  saveImageMemory(params: {
    personaId: string
    subject: string
    belief: string
    imageUrl: string
    imageDescription: string
    sourceEpisodeIds: string[]
    confidence: number
  }): Promise<{ id: string }>

  /** 텍스트 기반 이미지 기억 검색 */
  searchImageMemories(params: {
    personaId: string
    query: string
    limit: number
  }): Promise<ImageMemoryRecord[]>
}

// ── 이미지 기억 생성 ──────────────────────────────────────────

/**
 * 이미지 분석 결과를 기억 텍스트로 변환.
 *
 * Vision 분석의 description + mood + tags를 결합하여
 * RAG 검색에 사용할 수 있는 자연어 텍스트를 생성.
 */
export function buildImageMemoryText(analysis: ImageAnalysis): string {
  const parts = [analysis.description]

  if (analysis.mood) {
    parts.push(`분위기: ${analysis.mood}`)
  }

  if (analysis.tags.length > 0) {
    parts.push(`키워드: ${analysis.tags.join(", ")}`)
  }

  if (analysis.dominantColors.length > 0) {
    parts.push(`색감: ${analysis.dominantColors.join(", ")}`)
  }

  return parts.join(". ")
}

/**
 * 이미지 기억의 subject 키 생성.
 *
 * 중복 감지에 사용 — 같은 이미지를 다시 보면 confidence만 업데이트.
 */
export function buildImageMemorySubject(imageUrl: string): string {
  return `image:${imageUrl}`
}

/**
 * 이미지 반응 시 기억을 저장.
 *
 * SemanticMemory에:
 * - subject: "image:<url>" (중복 감지 키)
 * - belief: Vision 분석 텍스트 (RAG 검색용)
 * - imageUrl: 원본 URL
 * - imageDescription: 분석 설명
 */
export async function saveImageMemory(
  input: ImageMemoryInput,
  provider: ImageMemoryProvider
): Promise<{ id: string }> {
  const memoryText = buildImageMemoryText(input.analysis)
  const subject = buildImageMemorySubject(input.imageUrl)

  const sentimentConfidence = Math.abs(input.analysis.sentiment) * 0.3 + 0.5

  return provider.saveImageMemory({
    personaId: input.personaId,
    subject,
    belief: memoryText,
    imageUrl: input.imageUrl,
    imageDescription: input.analysis.description,
    sourceEpisodeIds: [input.sourcePostId],
    confidence: Math.min(1, sentimentConfidence),
  })
}

/**
 * RAG 검색 시 이미지 기억도 포함하여 검색.
 *
 * 텍스트 설명 기반으로 검색하므로 기존 RAG 파이프라인과 호환.
 */
export async function searchImageMemories(
  personaId: string,
  query: string,
  provider: ImageMemoryProvider,
  limit = 3
): Promise<ImageMemoryRecord[]> {
  return provider.searchImageMemories({
    personaId,
    query,
    limit,
  })
}
