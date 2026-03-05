// ═══════════════════════════════════════════════════════════════
// auto-curation.ts — ConsumptionLog → PersonaCuratedContent
// T394: rating >= 0.7 소비 기록을 PENDING 큐레이션으로 자동 변환
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"

// ── 상수 ─────────────────────────────────────────────────────

const MIN_RATING_FOR_CURATION = 0.7

// ── 타입 ─────────────────────────────────────────────────────

export interface AutoCurationResult {
  personaId: string
  created: number
  skipped: number
}

export interface AutoCurationAllResult {
  totalPersonas: number
  created: number
  skipped: number
  errors: number
}

// ── 단일 페르소나 큐레이션 ────────────────────────────────────

/**
 * 페르소나의 ConsumptionLog(rating >= 0.7)를
 * PersonaCuratedContent(PENDING)로 자동 생성.
 *
 * - contentId가 있고 ContentItem이 존재하는 경우만 처리
 * - 이미 큐레이션 존재 시 스킵 (업데이트 없음)
 */
export async function runAutoCuration(personaId: string): Promise<AutoCurationResult> {
  // rating >= 0.7 + contentId 있는 로그 조회
  const logs = await prisma.consumptionLog.findMany({
    where: {
      personaId,
      rating: { gte: MIN_RATING_FOR_CURATION },
      contentId: { not: null },
    },
    select: {
      contentId: true,
      rating: true,
      impression: true,
    },
  })

  let created = 0
  let skipped = 0

  for (const log of logs) {
    if (!log.contentId) continue

    // ContentItem 존재 여부 확인
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: log.contentId },
      select: { id: true },
    })
    if (!contentItem) {
      skipped++
      continue
    }

    // 이미 큐레이션 존재 확인
    const existing = await prisma.personaCuratedContent.findUnique({
      where: { personaId_contentItemId: { personaId, contentItemId: log.contentId } },
      select: { id: true },
    })
    if (existing) {
      skipped++
      continue
    }

    // 신규 생성 (PENDING)
    await prisma.personaCuratedContent.create({
      data: {
        personaId,
        contentItemId: log.contentId,
        curationScore: log.rating ?? MIN_RATING_FOR_CURATION,
        curationReason: log.impression,
        status: "PENDING",
      },
    })
    created++
  }

  return { personaId, created, skipped }
}

// ── 전체 페르소나 순회 ────────────────────────────────────────

/**
 * ACTIVE 상태인 모든 페르소나에 대해 runAutoCuration 실행.
 * cron job에서 호출.
 */
export async function runAutoCurationAll(): Promise<AutoCurationAllResult> {
  const personas = await prisma.persona.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  })

  let totalCreated = 0
  let totalSkipped = 0
  let errors = 0

  for (const { id } of personas) {
    try {
      const { created, skipped } = await runAutoCuration(id)
      totalCreated += created
      totalSkipped += skipped
    } catch {
      errors++
    }
  }

  return {
    totalPersonas: personas.length,
    created: totalCreated,
    skipped: totalSkipped,
    errors,
  }
}
