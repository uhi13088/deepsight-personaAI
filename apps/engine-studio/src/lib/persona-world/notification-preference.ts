/**
 * PersonaWorld 알림 환경설정 서비스
 *
 * 8종 알림 유형별 ON/OFF + 방해금지 시간대 관리
 */

// ── Types ────────────────────────────────────────────────

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "repost"
  | "recommendation"
  | "new_post"
  | "system"

export interface NotificationPreferenceData {
  likeEnabled: boolean
  commentEnabled: boolean
  followEnabled: boolean
  mentionEnabled: boolean
  repostEnabled: boolean
  recommendationEnabled: boolean
  newPostEnabled: boolean
  systemEnabled: boolean
  quietHoursStart: number | null
  quietHoursEnd: number | null
}

export const DEFAULT_PREFERENCES: NotificationPreferenceData = {
  likeEnabled: true,
  commentEnabled: true,
  followEnabled: true,
  mentionEnabled: true,
  repostEnabled: true,
  recommendationEnabled: true,
  newPostEnabled: true,
  systemEnabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
}

// ── DI Provider ──────────────────────────────────────────

export interface NotificationPreferenceProvider {
  findByUserId(userId: string): Promise<NotificationPreferenceData | null>
  upsert(
    userId: string,
    data: Partial<NotificationPreferenceData>
  ): Promise<NotificationPreferenceData>
}

// ── Service ──────────────────────────────────────────────

const TYPE_TO_FIELD: Record<NotificationType, keyof NotificationPreferenceData> = {
  like: "likeEnabled",
  comment: "commentEnabled",
  follow: "followEnabled",
  mention: "mentionEnabled",
  repost: "repostEnabled",
  recommendation: "recommendationEnabled",
  new_post: "newPostEnabled",
  system: "systemEnabled",
}

export async function getPreferences(
  provider: NotificationPreferenceProvider,
  userId: string
): Promise<NotificationPreferenceData> {
  const prefs = await provider.findByUserId(userId)
  return prefs ?? { ...DEFAULT_PREFERENCES }
}

export async function updatePreferences(
  provider: NotificationPreferenceProvider,
  userId: string,
  updates: Partial<NotificationPreferenceData>
): Promise<NotificationPreferenceData> {
  return provider.upsert(userId, updates)
}

/**
 * 특정 알림 유형이 현재 시점에 전달 가능한지 판단
 * - 유형 토글 OFF → false
 * - 방해금지 시간대 내 → false
 */
export function shouldDeliver(
  prefs: NotificationPreferenceData,
  type: NotificationType,
  now?: Date
): boolean {
  const field = TYPE_TO_FIELD[type]
  if (!field || !prefs[field]) return false

  // 방해금지 시간대 확인
  if (prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null) {
    const hour = (now ?? new Date()).getHours()
    const start = prefs.quietHoursStart
    const end = prefs.quietHoursEnd

    if (start <= end) {
      // e.g. 09:00 ~ 18:00
      if (hour >= start && hour < end) return false
    } else {
      // 자정 넘김 e.g. 22:00 ~ 07:00
      if (hour >= start || hour < end) return false
    }
  }

  return true
}
