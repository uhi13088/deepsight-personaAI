// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Reaction Trigger (T353)
// 미디어 아이템 → 관심 페르소나 선정 → REVIEW/CURATION 포스트 생성 예약
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"
import {
  selectPersonasForMediaItem,
  allocateDailyMediaReactions,
  getImportanceGrade,
  getGradeConfig,
} from "./media-interest-matcher"
import type {
  MediaItemForMatching,
  MediaType,
  PersonaForMediaMatching,
  AllocateDailyMediaOptions,
} from "./media-interest-matcher"
import { checkDailyBudget } from "../cost/budget-alert"

// ── 타입 ────────────────────────────────────────────────────────

export interface MediaItemForTrigger {
  id: string // DB id (MediaItem.id)
  mediaType: MediaType
  title: string
  description?: string | null
  creator?: string | null // 감독 / 저자 / 아티스트
  venue?: string | null // 공연장 / 전시관
  genres: string[]
  tags: string[]
  region: string
  importanceScore: number
}

export interface PersonaForMediaTrigger {
  id: string
  expertise: string[]
  role?: string | null
  country: string
  languages: string[]
  temperament: CoreTemperamentVector
}

export interface ScheduledMediaReaction {
  personaId: string
  mediaItemId: string
  interestScore: number
  scheduledAt: Date
}

export interface MediaReactionDataProvider {
  /** 활성 페르소나 목록 */
  getActivePersonas(): Promise<PersonaForMediaTrigger[]>

  /** 페르소나가 이미 이 미디어 아이템에 반응했는지 확인 */
  hasReactedToMediaItem(personaId: string, mediaItemId: string): Promise<boolean>

  /** 미디어 반응 포스트 예약 (REVIEW 또는 CURATION) */
  scheduleMediaReactionPost(params: {
    personaId: string
    mediaItemId: string
    topic: string // formatMediaItemTopic() 결과
    interestScore: number
  }): Promise<void>
}

export interface DailyMediaDataProvider extends MediaReactionDataProvider {
  /** 최근 N시간 이내 수집된 미디어 아이템 목록 */
  getRecentMediaItems(withinHours: number): Promise<MediaItemForTrigger[]>

  /** 페르소나가 오늘 미디어 반응 포스트를 올린 횟수 */
  getPersonaMediaReactionCountToday(personaId: string): Promise<number>
}

export interface CostCheckProvider {
  getTodaySpending(): Promise<number>
  getDailyBudgetUsd(): Promise<number>
}

// ── 콘텐츠 타입별 토픽 포맷 ─────────────────────────────────────

/**
 * 미디어 아이템 → 포스트 생성 topic 문자열 변환.
 *
 * content-generator의 topic 파라미터로 전달됨.
 * 예: "영화 [범죄도시4] 관람 후기" / "전시 [이우환: 침묵의 소리] 관람"
 */
export function formatMediaItemTopic(item: MediaItemForTrigger): string {
  const creatorPart = item.creator ? ` (${item.creator})` : ""
  const venuePart = item.venue ? ` @ ${item.venue}` : ""

  switch (item.mediaType) {
    case "MOVIE":
      return `영화 [${item.title}]${creatorPart} 관람 후기`
    case "TV":
      return `드라마/시리즈 [${item.title}]${creatorPart} 감상`
    case "PERFORMANCE":
      return `공연 [${item.title}]${venuePart} 관람`
    case "EXHIBITION":
      return `전시 [${item.title}]${creatorPart}${venuePart} 관람`
    case "BOOK":
      return `도서 [${item.title}]${creatorPart} 독서`
    case "MUSIC":
      return `음악 [${item.title}]${creatorPart} 감상`
  }
}

// ── 단일 아이템 트리거 ───────────────────────────────────────────

/**
 * 단일 미디어 아이템에 대한 페르소나 반응 트리거 (수동 또는 신규 수집 시).
 */
export async function triggerMediaReactionPosts(
  item: MediaItemForTrigger,
  dataProvider: MediaReactionDataProvider
): Promise<ScheduledMediaReaction[]> {
  const personas = await dataProvider.getActivePersonas()

  const personasForMatching: PersonaForMediaMatching[] = personas.map((p) => ({
    id: p.id,
    expertise: p.expertise,
    role: p.role,
    country: p.country,
    languages: p.languages,
    temperament: p.temperament,
  }))

  const itemForMatching: MediaItemForMatching = {
    mediaType: item.mediaType,
    genres: item.genres,
    tags: item.tags,
    region: item.region,
    importanceScore: item.importanceScore,
  }

  const grade = getImportanceGrade(item.importanceScore)
  const config = getGradeConfig(grade, personasForMatching.length)
  const selected = selectPersonasForMediaItem(
    itemForMatching,
    personasForMatching,
    config.threshold
  ).slice(0, config.maxReactors)

  if (selected.length === 0) {
    console.log(`[media-reaction] 아이템 ${item.id} (${item.title}): 반응할 페르소나 없음`)
    return []
  }

  const reactions: ScheduledMediaReaction[] = []
  const topic = formatMediaItemTopic(item)

  for (const result of selected) {
    const alreadyReacted = await dataProvider.hasReactedToMediaItem(result.personaId, item.id)
    if (alreadyReacted) continue

    await dataProvider.scheduleMediaReactionPost({
      personaId: result.personaId,
      mediaItemId: item.id,
      topic,
      interestScore: result.score,
    })

    reactions.push({
      personaId: result.personaId,
      mediaItemId: item.id,
      interestScore: result.score,
      scheduledAt: new Date(),
    })
  }

  if (reactions.length > 0) {
    console.log(
      `[media-reaction] "${item.title}" (${item.mediaType}) → ${reactions.length}명 반응 예약`
    )
  }

  return reactions
}

// ── Daily 자동 트리거 ────────────────────────────────────────────

const BATCH_SIZE = 20

/**
 * 일일 자동 미디어 반응 파이프라인.
 *
 * - 최근 24h 신규 MediaItem 배치 처리
 * - importance 등급별 동적 threshold/cap
 * - 배치 간 budget-alert 체크 (CRITICAL 시 중단)
 */
export async function runDailyMediaReactions(
  dataProvider: DailyMediaDataProvider,
  options: {
    withinHours?: number
    dailyBudget?: number
    maxPerPersona?: number
    costCheck?: CostCheckProvider
  } = {}
): Promise<ScheduledMediaReaction[]> {
  const withinHours = options.withinHours ?? 24
  const dailyBudget = options.dailyBudget ?? 15
  const maxPerPersona = options.maxPerPersona ?? 2

  const [items, personas] = await Promise.all([
    dataProvider.getRecentMediaItems(withinHours),
    dataProvider.getActivePersonas(),
  ])

  if (items.length === 0 || personas.length === 0) return []

  const personasForMatching: PersonaForMediaMatching[] = personas.map((p) => ({
    id: p.id,
    expertise: p.expertise,
    role: p.role,
    country: p.country,
    languages: p.languages,
    temperament: p.temperament,
  }))

  const allocOptions: AllocateDailyMediaOptions = { dailyBudget, maxPerPersona }

  const pairs = allocateDailyMediaReactions(
    items.map((item) => ({
      id: item.id,
      item: {
        mediaType: item.mediaType,
        genres: item.genres,
        tags: item.tags,
        region: item.region,
        importanceScore: item.importanceScore,
      },
    })),
    personasForMatching,
    allocOptions
  )

  const allReactions: ScheduledMediaReaction[] = []

  // 배치 처리
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    // 배치 시작 전 비용 체크
    if (options.costCheck) {
      const [spent, budget] = await Promise.all([
        options.costCheck.getTodaySpending(),
        options.costCheck.getDailyBudgetUsd(),
      ])
      const budgetAlert = checkDailyBudget(spent, budget)
      if (budgetAlert?.level === "CRITICAL" || budgetAlert?.level === "EMERGENCY") {
        console.warn("[media-reaction] 비용 CRITICAL — 일일 미디어 반응 중단")
        break
      }
    }

    const batch = pairs.slice(i, i + BATCH_SIZE)

    for (const pair of batch) {
      const alreadyReacted = await dataProvider.hasReactedToMediaItem(pair.personaId, pair.itemId)
      if (alreadyReacted) continue

      // 원본 아이템 정보 복원
      const originalItem = items.find((it) => it.id === pair.itemId)
      if (!originalItem) continue

      const topic = formatMediaItemTopic(originalItem)

      await dataProvider.scheduleMediaReactionPost({
        personaId: pair.personaId,
        mediaItemId: pair.itemId,
        topic,
        interestScore: pair.score,
      })

      allReactions.push({
        personaId: pair.personaId,
        mediaItemId: pair.itemId,
        interestScore: pair.score,
        scheduledAt: new Date(),
      })
    }
  }

  if (allReactions.length > 0) {
    console.log(`[media-reaction] 일일 배치 완료: ${allReactions.length}개 반응 예약`)
  }

  return allReactions
}
