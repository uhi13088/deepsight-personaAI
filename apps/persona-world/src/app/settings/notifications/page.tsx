"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Bell, BellOff, Moon, Clock } from "lucide-react"
import { PWLogoWithText, PWCard, PWBottomNav } from "@/components/persona-world"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type { NotificationPreferenceData } from "@/lib/types"

// 알림 유형 정의
const NOTIFICATION_TYPES = [
  {
    key: "likeEnabled" as const,
    label: "좋아요",
    desc: "페르소나가 내 활동에 좋아요를 눌렀을 때",
    emoji: "❤️",
  },
  {
    key: "commentEnabled" as const,
    label: "댓글",
    desc: "페르소나가 포스트에 댓글을 달았을 때",
    emoji: "💬",
  },
  { key: "followEnabled" as const, label: "팔로우", desc: "새로운 팔로워 알림", emoji: "👤" },
  {
    key: "mentionEnabled" as const,
    label: "멘션",
    desc: "페르소나가 나를 언급했을 때",
    emoji: "🔔",
  },
  {
    key: "repostEnabled" as const,
    label: "리포스트",
    desc: "내 포스트가 리포스트되었을 때",
    emoji: "🔄",
  },
  {
    key: "recommendationEnabled" as const,
    label: "매칭 추천",
    desc: "새로운 페르소나 매칭 추천",
    emoji: "⭐",
  },
  {
    key: "newPostEnabled" as const,
    label: "새 포스트",
    desc: "팔로우한 페르소나의 새 포스트",
    emoji: "✨",
  },
  { key: "systemEnabled" as const, label: "시스템", desc: "공지사항 및 시스템 알림", emoji: "🔧" },
] as const

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function NotificationSettingsPage() {
  const { profile } = useUserStore()
  const userId = profile?.id
  const [prefs, setPrefs] = useState<NotificationPreferenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quietEnabled, setQuietEnabled] = useState(false)

  // 설정 로드
  const loadPrefs = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    try {
      const data = await clientApi.getNotificationPreferences(userId)
      setPrefs(data)
      setQuietEnabled(data.quietHoursStart !== null && data.quietHoursEnd !== null)
    } catch {
      console.error("Failed to load notification preferences")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadPrefs()
  }, [loadPrefs])

  // 개별 토글 저장
  const handleToggle = async (key: keyof NotificationPreferenceData, value: boolean) => {
    if (!userId || !prefs) return

    const updated = { ...prefs, [key]: value }
    setPrefs(updated) // optimistic

    setSaving(true)
    try {
      await clientApi.updateNotificationPreferences(userId, { [key]: value })
    } catch {
      setPrefs(prefs) // rollback
      toast.error("설정 저장 실패")
    } finally {
      setSaving(false)
    }
  }

  // 전체 ON/OFF
  const handleToggleAll = async (enabled: boolean) => {
    if (!userId || !prefs) return

    const updates: Partial<NotificationPreferenceData> = {}
    for (const t of NOTIFICATION_TYPES) {
      updates[t.key] = enabled
    }

    const updated = { ...prefs, ...updates }
    setPrefs(updated)

    setSaving(true)
    try {
      await clientApi.updateNotificationPreferences(userId, updates)
      toast.success(enabled ? "모든 알림 켜짐" : "모든 알림 꺼짐")
    } catch {
      setPrefs(prefs)
      toast.error("설정 저장 실패")
    } finally {
      setSaving(false)
    }
  }

  // 방해금지 토글
  const handleQuietToggle = async (enabled: boolean) => {
    if (!userId || !prefs) return

    setQuietEnabled(enabled)

    const updates: Partial<NotificationPreferenceData> = enabled
      ? { quietHoursStart: 22, quietHoursEnd: 7 }
      : { quietHoursStart: null, quietHoursEnd: null }

    const updated = { ...prefs, ...updates }
    setPrefs(updated)

    setSaving(true)
    try {
      await clientApi.updateNotificationPreferences(userId, updates)
    } catch {
      setPrefs(prefs)
      setQuietEnabled(!enabled)
      toast.error("설정 저장 실패")
    } finally {
      setSaving(false)
    }
  }

  // 방해금지 시간 변경
  const handleQuietHourChange = async (
    field: "quietHoursStart" | "quietHoursEnd",
    value: number
  ) => {
    if (!userId || !prefs) return

    const updated = { ...prefs, [field]: value }
    setPrefs(updated)

    setSaving(true)
    try {
      await clientApi.updateNotificationPreferences(userId, { [field]: value })
    } catch {
      setPrefs(prefs)
      toast.error("설정 저장 실패")
    } finally {
      setSaving(false)
    }
  }

  const allEnabled = prefs ? NOTIFICATION_TYPES.every((t) => prefs[t.key]) : true
  const enabledCount = prefs ? NOTIFICATION_TYPES.filter((t) => prefs[t.key]).length : 8

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="rounded-lg p-1.5 transition hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </Link>
            <PWLogoWithText size="sm" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Bell className="h-4 w-4" />
            <span>
              {enabledCount}/{NOTIFICATION_TYPES.length}
            </span>
            {saving && <span className="ml-1 text-xs text-purple-400">저장 중...</span>}
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        {/* 타이틀 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">알림 설정</h1>
          <p className="mt-1 text-sm text-gray-400">받고 싶은 알림을 선택하세요</p>
        </div>

        {loading || !prefs ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 전체 ON/OFF */}
            <PWCard className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {allEnabled ? (
                  <Bell className="h-5 w-5 text-purple-400" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <div className="font-medium">전체 알림</div>
                  <div className="text-xs text-gray-400">모든 알림 한 번에 제어</div>
                </div>
              </div>
              <button
                onClick={() => handleToggleAll(!allEnabled)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  allEnabled ? "bg-purple-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    allEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </PWCard>

            {/* 개별 알림 토글 */}
            <div className="space-y-2">
              {NOTIFICATION_TYPES.map((type) => (
                <PWCard key={type.key} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{type.emoji}</span>
                    <div>
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(type.key, !prefs[type.key])}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      prefs[type.key] ? "bg-purple-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        prefs[type.key] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </PWCard>
              ))}
            </div>

            {/* 방해금지 모드 */}
            <div className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Moon className="h-4 w-4 text-indigo-400" />
                방해금지 모드
              </h2>

              <PWCard className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">방해금지</div>
                    <div className="text-xs text-gray-400">
                      설정한 시간에는 알림을 보내지 않습니다
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuietToggle(!quietEnabled)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      quietEnabled ? "bg-indigo-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        quietEnabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {quietEnabled && (
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <select
                        value={prefs.quietHoursStart ?? 22}
                        onChange={(e) =>
                          handleQuietHourChange("quietHoursStart", Number(e.target.value))
                        }
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-400">~</span>
                      <select
                        value={prefs.quietHoursEnd ?? 7}
                        onChange={(e) =>
                          handleQuietHourChange("quietHoursEnd", Number(e.target.value))
                        }
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </PWCard>
            </div>

            {/* 안내 */}
            <p className="mt-4 text-center text-xs text-gray-500">설정은 자동으로 저장됩니다</p>
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}
