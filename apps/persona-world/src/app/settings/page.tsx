"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import {
  ArrowLeft,
  User,
  Bell,
  Coins,
  ChevronRight,
  Trash2,
  LogOut,
  Loader2,
  CreditCard,
} from "lucide-react"
import { PWLogoWithText, PWCard, PWBottomNav } from "@/components/persona-world"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"

type Transaction = {
  id: string
  type: "EARN" | "PURCHASE" | "SPEND"
  amount: number
  balanceAfter: number
  reason: string | null
  status: string
  createdAt: string
}

type ActiveTab = "account" | "notifications" | "payment"

const TAB_CONFIG = [
  { key: "account" as const, label: "계정", icon: User },
  { key: "notifications" as const, label: "알림", icon: Bell },
  { key: "payment" as const, label: "결제", icon: CreditCard },
] as const

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  EARN: { label: "획득", color: "text-green-400" },
  PURCHASE: { label: "충전", color: "text-blue-400" },
  SPEND: { label: "사용", color: "text-red-400" },
}

export default function SettingsPage() {
  const { profile, onboarding, reset } = useUserStore()
  const userId = profile?.id
  const balance = onboarding.creditsBalance

  const [activeTab, setActiveTab] = useState<ActiveTab>("account")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [serverBalance, setServerBalance] = useState<number | null>(null)

  // 거래 내역 로드
  const loadTransactions = useCallback(async () => {
    if (!userId) return
    setTxLoading(true)
    try {
      const data = await clientApi.getCredits(userId, { limit: 20 })
      setTransactions(data.transactions)
      setServerBalance(data.balance)
    } catch {
      console.error("Failed to load transactions")
    } finally {
      setTxLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (activeTab === "payment") {
      loadTransactions()
    }
  }, [activeTab, loadTransactions])

  const handleLogout = async () => {
    reset()
    if ("caches" in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
    localStorage.clear()
    sessionStorage.clear()
    await signOut({ callbackUrl: "/" })
  }

  const handleReset = () => {
    if (window.confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      reset()
      toast.success("데이터가 초기화되었습니다")
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-gray-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/profile" className="rounded-lg p-1.5 transition hover:bg-white/10">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <PWLogoWithText size="sm" />
        </div>
      </header>

      {/* 탭 바 */}
      <div className="border-b border-white/10 bg-gray-950/60 px-4">
        <div className="mx-auto flex max-w-lg">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-6">
        {/* ── 계정 탭 ── */}
        {activeTab === "account" && (
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold">계정 설정</h1>
              <p className="mt-1 text-sm text-gray-400">프로필 및 계정 정보를 관리하세요</p>
            </div>

            {/* 프로필 카드 */}
            <PWCard className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-100">{profile?.nickname || "관찰자"}</div>
                  {profile?.email && <div className="text-sm text-gray-400">{profile.email}</div>}
                  <div className="mt-1 text-xs text-gray-500">
                    {profile?.completedOnboarding ? "온보딩 완료" : "온보딩 미완료"}
                  </div>
                </div>
              </div>
            </PWCard>

            {/* 취향 분석 */}
            <Link href="/onboarding">
              <PWCard className="flex items-center justify-between p-4 transition-colors hover:bg-white/5">
                <div>
                  <div className="text-sm font-medium">취향 분석</div>
                  <div className="text-xs text-gray-500">
                    {profile?.vector ? "다시 분석하기" : "나의 3-Layer 벡터 프로필 생성"}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </PWCard>
            </Link>

            {/* 위험 구역 */}
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-medium text-gray-500">계정 관리</h2>
              <div className="space-y-2">
                <button
                  onClick={handleReset}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-left transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-5 w-5 text-red-400" />
                  <div>
                    <div className="text-sm font-medium text-red-400">데이터 초기화</div>
                    <div className="text-xs text-gray-500">모든 데이터를 삭제합니다</div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
                >
                  <LogOut className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-300">로그아웃</div>
                    <div className="text-xs text-gray-500">계정에서 로그아웃합니다</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 알림 탭 ── */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold">알림 설정</h1>
              <p className="mt-1 text-sm text-gray-400">알림 환경을 설정하세요</p>
            </div>

            <Link href="/settings/notifications">
              <PWCard className="flex items-center justify-between p-4 transition-colors hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="text-sm font-medium">알림 유형 설정</div>
                    <div className="text-xs text-gray-500">
                      받고 싶은 알림 유형과 방해금지 모드 관리
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </PWCard>
            </Link>
          </div>
        )}

        {/* ── 결제 탭 ── */}
        {activeTab === "payment" && (
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold">결제 관리</h1>
              <p className="mt-1 text-sm text-gray-400">코인 잔액과 거래 내역을 확인하세요</p>
            </div>

            {/* 잔액 카드 */}
            <PWCard className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">보유 코인</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Coins className="h-6 w-6 text-amber-400" />
                    <span className="text-3xl font-bold text-amber-300">
                      {serverBalance ?? balance}
                    </span>
                  </div>
                </div>
                <Link
                  href="/shop"
                  className="rounded-full bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  충전하기
                </Link>
              </div>
            </PWCard>

            {/* 거래 내역 */}
            <div>
              <h2 className="mb-3 text-sm font-medium text-gray-400">거래 내역</h2>

              {txLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : transactions.length === 0 ? (
                <PWCard className="py-8 text-center">
                  <Coins className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                  <p className="text-sm text-gray-500">아직 거래 내역이 없습니다</p>
                  <Link
                    href="/shop"
                    className="mt-3 inline-block text-sm text-purple-400 hover:underline"
                  >
                    코인 충전하러 가기
                  </Link>
                </PWCard>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => {
                    const typeInfo = TX_TYPE_LABELS[tx.type] ?? {
                      label: tx.type,
                      color: "text-gray-400",
                    }
                    const sign = tx.type === "SPEND" ? "-" : "+"

                    return (
                      <PWCard key={tx.id} className="flex items-center justify-between p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeInfo.color} bg-white/10`}
                            >
                              {typeInfo.label}
                            </span>
                            <span className="text-sm text-gray-300">
                              {tx.reason || "코인 거래"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {formatDate(tx.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-bold ${tx.type === "SPEND" ? "text-red-400" : "text-green-400"}`}
                          >
                            {sign}
                            {tx.amount}
                          </div>
                          <div className="text-xs text-gray-600">잔액 {tx.balanceAfter}</div>
                        </div>
                      </PWCard>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}
