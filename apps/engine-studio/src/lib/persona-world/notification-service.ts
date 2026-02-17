// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Notification Service
// 이벤트 발생 시 알림을 생성하는 헬퍼 함수 모음
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"

type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "recommendation"
  | "new_post"
  | "system"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  message: string
  personaId?: string
  personaName?: string
  postId?: string
  commentId?: string
}

/**
 * 알림 생성 (fire-and-forget 패턴으로 호출 가능).
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.pWNotification.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message,
        personaId: params.personaId ?? null,
        personaName: params.personaName ?? null,
        postId: params.postId ?? null,
        commentId: params.commentId ?? null,
      },
    })
  } catch {
    // fire-and-forget: 알림 실패가 메인 플로우를 막지 않음
    console.warn("[notification-service] Failed to create notification:", params.type)
  }
}

/**
 * 포스트 좋아요 알림.
 * 포스트 작성 페르소나의 팔로워 유저들에게 알림.
 */
export async function notifyPostLiked(params: {
  postId: string
  likerName: string
  postAuthorPersonaId: string
}): Promise<void> {
  const followers = await prisma.personaFollow.findMany({
    where: { followingPersonaId: params.postAuthorPersonaId, followerUserId: { not: null } },
    select: { followerUserId: true },
    take: 100,
  })

  const persona = await prisma.persona.findUnique({
    where: { id: params.postAuthorPersonaId },
    select: { name: true },
  })

  for (const f of followers) {
    if (f.followerUserId) {
      await createNotification({
        userId: f.followerUserId,
        type: "like",
        message: `${params.likerName}님이 ${persona?.name ?? "페르소나"}의 포스트를 좋아합니다`,
        personaId: params.postAuthorPersonaId,
        personaName: persona?.name ?? undefined,
        postId: params.postId,
      })
    }
  }
}

/**
 * 새 댓글 알림.
 * 포스트 작성 페르소나의 팔로워 유저들에게 알림.
 */
export async function notifyNewComment(params: {
  postId: string
  commentId: string
  commenterName: string
  postAuthorPersonaId: string
}): Promise<void> {
  const followers = await prisma.personaFollow.findMany({
    where: { followingPersonaId: params.postAuthorPersonaId, followerUserId: { not: null } },
    select: { followerUserId: true },
    take: 100,
  })

  const persona = await prisma.persona.findUnique({
    where: { id: params.postAuthorPersonaId },
    select: { name: true },
  })

  for (const f of followers) {
    if (f.followerUserId) {
      await createNotification({
        userId: f.followerUserId,
        type: "comment",
        message: `${params.commenterName}님이 ${persona?.name ?? "페르소나"}의 포스트에 댓글을 남겼습니다`,
        personaId: params.postAuthorPersonaId,
        personaName: persona?.name ?? undefined,
        postId: params.postId,
        commentId: params.commentId,
      })
    }
  }
}

/**
 * 팔로우 알림 (유저에게 직접).
 */
export async function notifyFollowed(params: {
  followerUserId: string
  followedPersonaId: string
  followedPersonaName: string
}): Promise<void> {
  await createNotification({
    userId: params.followerUserId,
    type: "follow",
    message: `${params.followedPersonaName}을(를) 팔로우했습니다`,
    personaId: params.followedPersonaId,
    personaName: params.followedPersonaName,
  })
}

/**
 * 새 포스트 알림.
 * 페르소나 팔로워들에게 알림.
 */
export async function notifyNewPost(params: {
  postId: string
  personaId: string
  personaName: string
}): Promise<void> {
  const followers = await prisma.personaFollow.findMany({
    where: { followingPersonaId: params.personaId, followerUserId: { not: null } },
    select: { followerUserId: true },
    take: 100,
  })

  for (const f of followers) {
    if (f.followerUserId) {
      await createNotification({
        userId: f.followerUserId,
        type: "new_post",
        message: `${params.personaName}님이 새 포스트를 작성했습니다`,
        personaId: params.personaId,
        personaName: params.personaName,
        postId: params.postId,
      })
    }
  }
}
