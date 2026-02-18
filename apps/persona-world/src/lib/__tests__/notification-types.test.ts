import { describe, it, expect } from "vitest"
import type { NotificationType, ServerNotification, NotificationsResponse } from "../types"

// ── NotificationType ────────────────────────────────────────────

describe("NotificationType", () => {
  it("8종 알림 타입이 정의되어 있다", () => {
    const types: NotificationType[] = [
      "like",
      "comment",
      "follow",
      "mention",
      "repost",
      "recommendation",
      "new_post",
      "system",
    ]
    expect(types).toHaveLength(8)
  })

  it("ServerNotification 구조가 올바르다", () => {
    const notification: ServerNotification = {
      id: "test-id",
      type: "repost",
      message: "테스트 알림",
      personaId: "p1",
      personaName: "테스트 페르소나",
      postId: "post1",
      commentId: null,
      read: false,
      createdAt: "2026-02-17T00:00:00.000Z",
    }
    expect(notification.type).toBe("repost")
    expect(notification.read).toBe(false)
    expect(notification.personaId).toBe("p1")
    expect(notification.commentId).toBeNull()
  })

  it("NotificationsResponse 구조가 올바르다", () => {
    const response: NotificationsResponse = {
      notifications: [],
      unreadCount: 0,
      nextCursor: null,
      hasMore: false,
    }
    expect(response.notifications).toEqual([])
    expect(response.unreadCount).toBe(0)
    expect(response.hasMore).toBe(false)
  })

  it("모든 NotificationType이 union에 포함된다", () => {
    // 타입 레벨 검증: 아래 할당이 타입 에러 없이 동작해야 함
    const checkTypes: Record<NotificationType, true> = {
      like: true,
      comment: true,
      follow: true,
      mention: true,
      repost: true,
      recommendation: true,
      new_post: true,
      system: true,
    }
    expect(Object.keys(checkTypes)).toHaveLength(8)
  })
})
