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

// 스토어 상태
interface UserState {
  // 프로필
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
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

  // 데일리 질문
  dailyQuestion: DailyQuestionState
  answerDailyQuestion: (coins: number) => void

  // SNS 연동
  snsConnections: SnsConnection[]
  connectSns: (provider: SnsProvider, username: string) => void
  disconnectSns: (provider: SnsProvider) => void
  setSnsAnalyzing: (provider: SnsProvider, analyzing: boolean) => void

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

// 초기 상태
const initialState = {
  profile: null,
  onboarding: initialOnboarding,
  dailyQuestion: initialDailyQuestion,
  snsConnections: [] as SnsConnection[],
  followedPersonas: [] as FollowedPersona[],
  likedPosts: [] as string[],
  bookmarkedPosts: [] as string[],
  notifications: [] as Notification[],
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

      // 북마크 관리 (로컬 전용 — 서버 API 미존재)
      toggleBookmark: (postId) =>
        set((state) => ({
          bookmarkedPosts: state.bookmarkedPosts.includes(postId)
            ? state.bookmarkedPosts.filter((id) => id !== postId)
            : [...state.bookmarkedPosts, postId],
        })),

      isBookmarked: (postId) => get().bookmarkedPosts.includes(postId),

      // 알림 관리 (로컬 전용)
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

      // 초기화
      reset: () => set(initialState),
    }),
    {
      name: "persona-world-user",
    }
  )
)
