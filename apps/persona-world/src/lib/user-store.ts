"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ThreeLayerVector, OnboardingAnswer, SnsProvider, SnsConnection } from "./types"
import type { ProfileLevel } from "./profile-level"
import { clientApi } from "./api"

// 사용자 프로필 타입
export interface UserProfile {
  id: string
  nickname: string
  email?: string
  profileImageUrl?: string
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
  type:
    | "like"
    | "comment"
    | "follow"
    | "mention"
    | "repost"
    | "recommendation"
    | "new_post"
    | "system"
  message: string
  personaId?: string
  personaName?: string
  postId?: string
  commentId?: string
  read: boolean
  createdAt: string
}

// 데일리 질문 상태
export interface DailyQuestionState {
  lastAnsweredDate: string | null
  streak: number
  totalAnswered: number
}

// 온보딩 상태
export interface OnboardingState {
  currentPhase: 0 | 1 | 2 | 3
  phaseAnswers: Record<number, OnboardingAnswer[]>
  completedPhases: number[]
  profileLevel: ProfileLevel
  creditsBalance: number
}

// NextAuth 세션 유저 타입 (next-auth/react)
interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

// 스토어 상태
interface UserState {
  // 프로필
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  setProfileFromSession: (sessionUser: SessionUser) => void
  updateVector: (vector: ThreeLayerVector, confidence: number) => void
  completeOnboarding: () => void

  // 온보딩
  onboarding: OnboardingState
  startPhase: (phase: 1 | 2 | 3) => void
  savePhaseAnswers: (phase: number, answers: OnboardingAnswer[]) => void
  completePhase: (phase: number, credits: number, level: ProfileLevel) => void
  resetCurrentPhase: () => void

  // 팔로우
  followedPersonas: FollowedPersona[]
  followPersona: (personaId: string, personaName: string) => void
  unfollowPersona: (personaId: string) => void
  isFollowing: (personaId: string) => boolean
  restoreFollows: () => Promise<void>

  // 좋아요
  likedPosts: string[]
  toggleLike: (postId: string) => void
  isLiked: (postId: string) => boolean

  // 리포스트
  repostedPosts: string[]
  toggleRepost: (postId: string) => void
  isReposted: (postId: string) => boolean

  // 북마크
  bookmarkedPosts: string[]
  toggleBookmark: (postId: string) => void
  isBookmarked: (postId: string) => boolean

  // 서버에서 활동 복원
  restoreActivity: () => Promise<void>

  // 알림
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  unreadCount: () => number

  // 데일리 질문
  dailyQuestion: DailyQuestionState
  answerDailyQuestion: (coins: number) => void

  // SNS 연동
  snsConnections: SnsConnection[]
  connectSns: (provider: SnsProvider, username: string) => void
  disconnectSns: (provider: SnsProvider) => void
  setSnsAnalyzing: (provider: SnsProvider, analyzing: boolean) => void

  // 잔액 동기화 — 서버 잔액으로 로컬 잔액을 갱신
  syncCreditsBalance: (serverBalance: number) => void

  // 상점 — 구매한 아이템 ID 목록
  purchasedItems: string[]
  purchaseItem: (itemId: string, price: number) => boolean
  hasPurchased: (itemId: string) => boolean
  getPurchaseCount: (itemId: string) => number

  // 페르소나 생성 요청
  personaRequests: PersonaRequest[]
  requestPersona: (topSimilarity: number, useCredits?: boolean) => Promise<PersonaRequest | null>
  fetchPersonaRequests: () => Promise<void>
  hasActiveRequest: () => boolean

  // 초기화
  reset: () => void
}

// 온보딩 초기 상태
const initialOnboarding: OnboardingState = {
  currentPhase: 0,
  phaseAnswers: {},
  completedPhases: [],
  profileLevel: "BASIC",
  creditsBalance: 0,
}

// 데일리 질문 초기 상태
const initialDailyQuestion: DailyQuestionState = {
  lastAnsweredDate: null,
  streak: 0,
  totalAnswered: 0,
}

// 페르소나 요청 상태
export interface PersonaRequest {
  id: string
  status: "pending" | "generating" | "completed"
  requestedAt: string
  scheduledDate: string // 생성 예정일
  topSimilarity: number // 요청 시점 최고 유사도
  completedPersonaId?: string
}

// 초기 상태
const initialState = {
  profile: null,
  onboarding: initialOnboarding,
  dailyQuestion: initialDailyQuestion,
  snsConnections: [] as SnsConnection[],
  followedPersonas: [] as FollowedPersona[],
  likedPosts: [] as string[],
  repostedPosts: [] as string[],
  bookmarkedPosts: [] as string[],
  notifications: [] as Notification[],
  purchasedItems: [] as string[],
  personaRequests: [] as PersonaRequest[],
}

// Fire-and-forget 서버 동기화 (실패 시 로컬 상태 유지)
function syncToServer(fn: () => Promise<unknown>): void {
  fn().catch((err) => {
    console.warn("[user-store] Server sync failed:", err)
  })
}

// Zustand 스토어 생성
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 프로필 관리
      setProfile: (profile) => set({ profile }),

      setProfileFromSession: (sessionUser) =>
        set((state) => {
          // 이미 같은 ID의 프로필이 있으면 닉네임만 동기화
          if (state.profile?.id === sessionUser.id) {
            return {
              profile: { ...state.profile, nickname: sessionUser.name ?? state.profile.nickname },
            }
          }
          // 신규 생성
          return {
            profile: {
              id: sessionUser.id,
              nickname: sessionUser.name ?? "사용자",
              vector: null,
              vectorConfidence: null,
              completedOnboarding: false,
              createdAt: new Date().toISOString(),
            },
          }
        }),

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

      // 온보딩 관리
      startPhase: (phase) =>
        set((state) => ({
          onboarding: { ...state.onboarding, currentPhase: phase },
        })),

      savePhaseAnswers: (phase, answers) =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            phaseAnswers: { ...state.onboarding.phaseAnswers, [phase]: answers },
          },
        })),

      completePhase: (phase, credits, level) =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            currentPhase: 0 as const,
            completedPhases: state.onboarding.completedPhases.includes(phase)
              ? state.onboarding.completedPhases
              : [...state.onboarding.completedPhases, phase],
            profileLevel: level,
            creditsBalance: state.onboarding.creditsBalance + credits,
          },
        })),

      resetCurrentPhase: () =>
        set((state) => {
          const phase = state.onboarding.currentPhase
          const newAnswers = { ...state.onboarding.phaseAnswers }
          delete newAnswers[phase]
          return {
            onboarding: {
              ...state.onboarding,
              currentPhase: 0 as const,
              phaseAnswers: newAnswers,
            },
          }
        }),

      // 팔로우 관리 — Optimistic + Server Sync
      followPersona: (personaId, personaName) => {
        set((state) => ({
          followedPersonas: [
            ...state.followedPersonas,
            { personaId, personaName, followedAt: new Date().toISOString() },
          ],
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.toggleFollow(personaId, userId))
        }
      },

      unfollowPersona: (personaId) => {
        set((state) => ({
          followedPersonas: state.followedPersonas.filter((f) => f.personaId !== personaId),
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.toggleFollow(personaId, userId))
        }
      },

      isFollowing: (personaId) => get().followedPersonas.some((f) => f.personaId === personaId),

      // 서버에서 팔로우 목록 복원 (로그인 후 호출)
      restoreFollows: async () => {
        const userId = get().profile?.id
        if (!userId) return
        try {
          const data = await clientApi.getFollows(userId)
          set({ followedPersonas: data.follows })
        } catch (err) {
          console.warn("[user-store] Failed to restore follows:", err)
        }
      },

      // 좋아요 관리 — Optimistic + Server Sync
      toggleLike: (postId) => {
        set((state) => ({
          likedPosts: state.likedPosts.includes(postId)
            ? state.likedPosts.filter((id) => id !== postId)
            : [...state.likedPosts, postId],
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.toggleLike(postId, userId))
        }
      },

      isLiked: (postId) => get().likedPosts.includes(postId),

      // 리포스트 관리 — Optimistic + Server Sync
      toggleRepost: (postId) => {
        set((state) => ({
          repostedPosts: state.repostedPosts.includes(postId)
            ? state.repostedPosts.filter((id) => id !== postId)
            : [...state.repostedPosts, postId],
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.toggleRepost(postId, userId))
        }
      },

      isReposted: (postId) => get().repostedPosts.includes(postId),

      // 북마크 관리 (Optimistic + 서버 동기화)
      toggleBookmark: (postId) => {
        set((state) => ({
          bookmarkedPosts: state.bookmarkedPosts.includes(postId)
            ? state.bookmarkedPosts.filter((id) => id !== postId)
            : [...state.bookmarkedPosts, postId],
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.toggleBookmark(postId, userId))
        }
      },

      isBookmarked: (postId) => get().bookmarkedPosts.includes(postId),

      // 서버에서 좋아요/북마크/리포스트 목록 복원 (로그인 후 호출)
      restoreActivity: async () => {
        const userId = get().profile?.id
        if (!userId) return
        try {
          const data = await clientApi.getUserStats(userId)
          set({
            likedPosts: data.likedPostIds,
            bookmarkedPosts: data.bookmarkedPostIds,
            repostedPosts: data.repostedPostIds,
          })
        } catch (err) {
          console.warn("[user-store] Failed to restore activity:", err)
        }
      },

      // 알림 관리 — Server Sync
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
          ].slice(0, 50),
        })),

      fetchNotifications: async () => {
        const userId = get().profile?.id
        if (!userId) return
        try {
          const data = await clientApi.getNotifications(userId, { limit: 50 })
          set({
            notifications: data.notifications.map((n) => ({
              id: n.id,
              type: n.type as Notification["type"],
              message: n.message,
              personaId: n.personaId ?? undefined,
              personaName: n.personaName ?? undefined,
              postId: n.postId ?? undefined,
              commentId: n.commentId ?? undefined,
              read: n.read,
              createdAt: n.createdAt,
            })),
          })
        } catch (err) {
          console.warn("[user-store] Failed to fetch notifications:", err)
        }
      },

      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.markNotificationRead(userId, notificationId))
        }
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() => clientApi.markAllNotificationsRead(userId))
        }
      },

      clearNotifications: () => set({ notifications: [] }),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      // 데일리 질문 관리 (로컬 전용)
      answerDailyQuestion: (coins) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10)
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          const isConsecutive = state.dailyQuestion.lastAnsweredDate === yesterday
          return {
            dailyQuestion: {
              lastAnsweredDate: today,
              streak: isConsecutive ? state.dailyQuestion.streak + 1 : 1,
              totalAnswered: state.dailyQuestion.totalAnswered + 1,
            },
            onboarding: {
              ...state.onboarding,
              creditsBalance: state.onboarding.creditsBalance + coins,
            },
          }
        }),

      // SNS 연동 관리 — Optimistic + Server Sync
      connectSns: (provider, username) => {
        set((state) => {
          const existing = state.snsConnections.filter((c) => c.provider !== provider)
          return {
            snsConnections: [
              ...existing,
              {
                provider,
                connected: true,
                connectedAt: new Date().toISOString(),
                username,
                analyzing: false,
              },
            ],
          }
        })
        // SNS 연동 시 서버에 데이터 전송 → Init 알고리즘으로 벡터 보정
        const userId = get().profile?.id
        if (userId) {
          syncToServer(() =>
            clientApi.connectSns(userId, [
              {
                platform: provider.toUpperCase(),
                profileData: { username },
                extractedData: {},
              },
            ])
          )
        }
      },

      disconnectSns: (provider) =>
        set((state) => ({
          snsConnections: state.snsConnections.filter((c) => c.provider !== provider),
        })),

      setSnsAnalyzing: (provider, analyzing) =>
        set((state) => ({
          snsConnections: state.snsConnections.map((c) =>
            c.provider === provider ? { ...c, analyzing } : c
          ),
        })),

      // 잔액 동기화 — 서버 잔액을 로컬에 반영
      syncCreditsBalance: (serverBalance: number) =>
        set((s) => ({
          onboarding: {
            ...s.onboarding,
            creditsBalance: serverBalance,
          },
        })),

      // 상점 — 구매
      purchasedItems: [],
      purchaseItem: (itemId, price) => {
        const state = get()
        if (state.onboarding.creditsBalance < price) return false
        set((s) => ({
          onboarding: {
            ...s.onboarding,
            creditsBalance: s.onboarding.creditsBalance - price,
          },
          purchasedItems: [...s.purchasedItems, itemId],
        }))
        return true
      },
      hasPurchased: (itemId) => get().purchasedItems.includes(itemId),
      getPurchaseCount: (itemId) => get().purchasedItems.filter((id) => id === itemId).length,

      // 페르소나 생성 요청
      personaRequests: [],
      requestPersona: async (topSimilarity, useCredits) => {
        const state = get()
        const userId = state.profile?.id
        const userVector = state.profile?.vector
        if (!userId || !userVector) return null

        try {
          const result = await clientApi.requestPersonaGeneration(
            userId,
            userVector as unknown as Record<string, unknown>,
            topSimilarity,
            useCredits
          )
          const newRequest: PersonaRequest = {
            id: result.id,
            status: result.status as PersonaRequest["status"],
            requestedAt: new Date().toISOString(),
            scheduledDate: result.scheduledDate,
            topSimilarity,
          }
          // 크레딧 차감 시 로컬 잔액 동기화
          if (result.creditSpent > 0) {
            set((s) => ({
              personaRequests: [newRequest, ...s.personaRequests],
              onboarding: {
                ...s.onboarding,
                creditsBalance: Math.max(0, s.onboarding.creditsBalance - result.creditSpent),
              },
            }))
          } else {
            set((s) => ({
              personaRequests: [newRequest, ...s.personaRequests],
            }))
          }
          return newRequest
        } catch (err) {
          console.warn("[user-store] Persona request failed:", err)
          throw err
        }
      },

      fetchPersonaRequests: async () => {
        const userId = get().profile?.id
        if (!userId) return
        try {
          const data = await clientApi.getPersonaRequests(userId)
          set({
            personaRequests: data.requests.map((r) => ({
              id: r.id,
              status: r.status as PersonaRequest["status"],
              requestedAt: r.createdAt,
              scheduledDate: r.scheduledDate,
              topSimilarity: r.topSimilarity,
              completedPersonaId: r.generatedPersona?.id,
            })),
          })
        } catch (err) {
          console.warn("[user-store] Failed to fetch persona requests:", err)
        }
      },

      hasActiveRequest: () =>
        get().personaRequests.some((r) => r.status === "pending" || r.status === "generating"),

      // 초기화
      reset: () => set(initialState),
    }),
    {
      name: "persona-world-user",
    }
  )
)
