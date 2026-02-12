"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ThreeLayerVector } from "./types"

// 사용자 프로필 타입
export interface UserProfile {
  id: string
  nickname: string
  vector: ThreeLayerVector | null
  vectorConfidence: number | null
  completedOnboarding: boolean
  createdAt: string
}

// 팔로우 관계
export interface FollowedPersona {
  personaId: string
  personaName: string
  followedAt: string
}

// 알림 타입
export interface Notification {
  id: string
  type: "like" | "comment" | "follow" | "mention" | "recommendation" | "new_post" | "system"
  message: string
  personaId?: string
  personaName?: string
  read: boolean
  createdAt: string
}

// 스토어 상태
interface UserState {
  // 프로필
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  updateVector: (vector: ThreeLayerVector, confidence: number) => void
  completeOnboarding: () => void

  // 팔로우
  followedPersonas: FollowedPersona[]
  followPersona: (personaId: string, personaName: string) => void
  unfollowPersona: (personaId: string) => void
  isFollowing: (personaId: string) => boolean

  // 좋아요
  likedPosts: string[]
  toggleLike: (postId: string) => void
  isLiked: (postId: string) => boolean

  // 북마크
  bookmarkedPosts: string[]
  toggleBookmark: (postId: string) => void
  isBookmarked: (postId: string) => boolean

  // 알림
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  unreadCount: () => number

  // 초기화
  reset: () => void
}

// 초기 상태
const initialState = {
  profile: null,
  followedPersonas: [],
  likedPosts: [],
  bookmarkedPosts: [],
  notifications: [],
}

// Zustand 스토어 생성
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 프로필 관리
      setProfile: (profile) => set({ profile }),

      updateVector: (vector, confidence) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, vector, vectorConfidence: confidence }
            : null,
        })),

      completeOnboarding: () =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, completedOnboarding: true }
            : {
                id: crypto.randomUUID(),
                nickname: "관찰자",
                vector: null,
                vectorConfidence: null,
                completedOnboarding: true,
                createdAt: new Date().toISOString(),
              },
        })),

      // 팔로우 관리
      followPersona: (personaId, personaName) =>
        set((state) => ({
          followedPersonas: [
            ...state.followedPersonas,
            { personaId, personaName, followedAt: new Date().toISOString() },
          ],
        })),

      unfollowPersona: (personaId) =>
        set((state) => ({
          followedPersonas: state.followedPersonas.filter((f) => f.personaId !== personaId),
        })),

      isFollowing: (personaId) => get().followedPersonas.some((f) => f.personaId === personaId),

      // 좋아요 관리
      toggleLike: (postId) =>
        set((state) => ({
          likedPosts: state.likedPosts.includes(postId)
            ? state.likedPosts.filter((id) => id !== postId)
            : [...state.likedPosts, postId],
        })),

      isLiked: (postId) => get().likedPosts.includes(postId),

      // 북마크 관리
      toggleBookmark: (postId) =>
        set((state) => ({
          bookmarkedPosts: state.bookmarkedPosts.includes(postId)
            ? state.bookmarkedPosts.filter((id) => id !== postId)
            : [...state.bookmarkedPosts, postId],
        })),

      isBookmarked: (postId) => get().bookmarkedPosts.includes(postId),

      // 알림 관리
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: crypto.randomUUID(),
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ].slice(0, 50), // 최대 50개 유지
        })),

      markAsRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      // 초기화
      reset: () => set(initialState),
    }),
    {
      name: "persona-world-user",
    }
  )
)
