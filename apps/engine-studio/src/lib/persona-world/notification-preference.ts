/**
 * PersonaWorld - 알림 설정 서비스
 *
 * 유저별 알림 유형 ON/OFF + 방해금지 시간대 관리
 */

// ── 타입 ─────────────────────────────────────────────────────

/** 알림 유형 (PWNotification.type과 동일) */
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "repost"
  | "recommendation"
  | "new_post"
  | "system"

/** 알림 설정 데이터 */
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

/** 알림 유형 → 설정 필드 매핑 */
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

// ── 기본값 ───────────────────────────────────────────────────

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

// ── DI Provider ──────────────────────────────────────────────

export interface NotificationPreferenceProvider {
  getPreference(userId: string): Promise<NotificationPreferenceData | null>
  upsertPreference(
    userId: string,
    data: Partial<NotificationPreferenceData>
  ): Promise<NotificationPreferenceData>
}

// ── 핵심 로직 ────────────────────────────────────────────────

/**
 * 유저의 알림 설정 조회 (없으면 기본값 반환)
 */
export async function getPreferences(
  provider: NotificationPreferenceProvider,
  userId: string
): Promise<NotificationPreferenceData> {
  const pref = await provider.getPreference(userId)
  return pref ?? { ...DEFAULT_PREFERENCES }
}

/**
 * 유저의 알림 설정 업데이트 (upsert)
 */
export async function updatePreferences(
  provider: NotificationPreferenceProvider,
  userId: string,
  updates: Partial<NotificationPreferenceData>
): Promise<NotificationPreferenceData> {
  // quietHours 유효성 검증
  if (updates.quietHoursStart !== undefined || updates.quietHoursEnd !== undefined) {
    const start = updates.quietHoursStart ?? null
    const end = updates.quietHoursEnd ?? null

    if (start !== null && (start < 0 || start > 23)) {
      throw new Error("quietHoursStart must be 0-23")
    }
    if (end !== null && (end < 0 || end > 23)) {
      throw new Error("quietHoursEnd must be 0-23")
    }
  }

  return provider.upsertPreference(userId, updates)
}

/**
 * 특정 알림을 이 유저에게 전송해야 하는지 판정
 */
export async function shouldDeliver(
  provider: NotificationPreferenceProvider,
  userId: string,
  type: NotificationType,
  currentHour?: number
): Promise<boolean> {
  const pref = await getPreferences(provider, userId)

  // 1) 유형별 ON/OFF 체크
  const field = TYPE_TO_FIELD[type]
  if (field && !pref[field]) {
    return false
  }

  // 2) 방해금지 시간대 체크
  if (pref.quietHoursStart !== null && pref.quietHoursEnd !== null) {
    const hour = currentHour ?? new Date().getHours()

    if (pref.quietHoursStart <= pref.quietHoursEnd) {
      // 예: 22~06이 아닌, 09~18 같은 정상 범위
      if (hour >= pref.quietHoursStart && hour < pref.quietHoursEnd) {
        return false
      }
    } else {
      // 자정 넘김: 예: 22~06 → 22,23,0,1,2,3,4,5
      if (hour >= pref.quietHoursStart || hour < pref.quietHoursEnd) {
        return false
      }
    }
  }

  return true
}
