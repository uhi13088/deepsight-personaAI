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
  MessageCircle,
  Link2,
  Unlink,
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

type KakaoLinkState = {
  linked: boolean
  personaId: string | null
  personaName: string | null
  personaImageUrl: string | null
  kakaoUserKey: string | null
}

type ActiveTab = "account" | "notifications" | "payment" | "kakao"

const TAB_CONFIG = [
  { key: "account" as const, label: "계정", icon: User },
  { key: "notifications" as const, label: "알림", icon: Bell },
  { key: "payment" as const, label: "결제", icon: CreditCard },
  { key: "kakao" as const, label: "카카오", icon: MessageCircle },
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

  // 카카오 연동
  const [kakaoLink, setKakaoLink] = useState<KakaoLinkState>({
    linked: false,
    personaId: null,
    personaName: null,
    personaImageUrl: null,
    kakaoUserKey: null,
  })
  const [kakaoLoading, setKakaoLoading] = useState(false)
  const [kakaoActionLoading, setKakaoActionLoading] = useState(false)
  const [chattedPersonas, setChattedPersonas] = useState<
    Array<{ id: string; personaId: string; personaName: string; personaImageUrl: string | null }>
  >([])
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("")

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

  // 카카오 연동 상태 로드
  const loadKakaoLink = useCallback(async () => {
    if (!userId) return
    setKakaoLoading(true)
    try {
      const data = await clientApi.getKakaoLink(userId)
      if (data) {
        setKakaoLink({
          linked: data.linked,
          personaId: data.link?.personaId ?? null,
          personaName: data.link?.personaName ?? null,
          personaImageUrl: data.link?.personaImageUrl ?? null,
          kakaoUserKey: data.link?.kakaoUserKey ?? null,
        })
      }
    } catch {
      console.error("Failed to load kakao link")
    } finally {
      setKakaoLoading(false)
    }
  }, [userId])

  // 채팅한 페르소나 목록 로드
  const loadChattedPersonas = useCallback(async () => {
    if (!userId) return
    try {
      const threads = await clientApi.getChatThreads(userId)
      const unique = new Map<
        string,
        { id: string; personaId: string; personaName: string; personaImageUrl: string | null }
      >()
      for (const t of threads) {
        if (!unique.has(t.personaId)) {
          unique.set(t.personaId, {
            id: t.id,
            personaId: t.personaId,
            personaName: t.personaName,
            personaImageUrl: t.personaImageUrl,
          })
        }
      }
      setChattedPersonas(Array.from(unique.values()))
    } catch {
      console.error("Failed to load chatted personas")
    }
  }, [userId])

  useEffect(() => {
    if (activeTab === "payment") {
      loadTransactions()
    }
    if (activeTab === "kakao") {
      loadKakaoLink()
      loadChattedPersonas()
    }
  }, [activeTab, loadTransactions, loadKakaoLink, loadChattedPersonas])

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

  const handleKakaoLink = async () => {
    if (!userId || !selectedPersonaId) {
      toast.error("연동할 페르소나를 선택해주세요")
      return
    }
    setKakaoActionLoading(true)
    try {
      // kakaoUserKey는 카카오톡에서 첫 메시지 시 자동 매핑되므로,
      // 유저가 직접 입력하지 않고 placeholder로 설정
      // 실제 매핑은 카카오톡에서 첫 메시지를 보낼 때 업데이트됨
      const kakaoUserKey = `pending_${userId}`

      await clientApi.createKakaoLink({
        userId,
        personaId: selectedPersonaId,
        kakaoUserKey,
      })

      await loadKakaoLink()
      setSelectedPersonaId("")
      toast.success("카카오톡 연동이 완료되었습니다!")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "연동에 실패했습니다"
      toast.error(msg)
    } finally {
      setKakaoActionLoading(false)
    }
  }

  const handleKakaoUnlink = async () => {
    if (!userId) return
    if (!window.confirm("카카오톡 연동을 해제하시겠습니까?")) return

    setKakaoActionLoading(true)
    try {
      await clientApi.deleteKakaoLink(userId)
      setKakaoLink({
        linked: false,
        personaId: null,
        personaName: null,
        personaImageUrl: null,
        kakaoUserKey: null,
      })
      toast.success("카카오톡 연동이 해제되었습니다")
    } catch {
      toast.error("연동 해제에 실패했습니다")
    } finally {
      setKakaoActionLoading(false)
    }
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/profile" className="rounded-lg p-1.5 transition hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <PWLogoWithText size="sm" />
        </div>
      </header>

      {/* 탭 바 */}
      <div className="border-b border-gray-100 bg-white px-4">
        <div className="mx-auto flex max-w-lg">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700"
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
                  <div className="font-semibold text-gray-900">{profile?.nickname || "관찰자"}</div>
                  {profile?.email && <div className="text-sm text-gray-400">{profile.email}</div>}
                  <div className="mt-1 text-xs text-gray-500">
                    {profile?.completedOnboarding ? "온보딩 완료" : "온보딩 미완료"}
                  </div>
                </div>
              </div>
            </PWCard>

            {/* 취향 분석 */}
            <Link href="/onboarding">
              <PWCard className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50">
                <div>
                  <div className="text-sm font-medium">취향 분석</div>
                  <div className="text-xs text-gray-500">
                    {profile?.vector ? "다시 분석하기" : "나의 취향 프로필 만들기"}
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
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <LogOut className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">로그아웃</div>
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
              <PWCard className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50">
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
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeInfo.color} bg-gray-100`}
                            >
                              {typeInfo.label}
                            </span>
                            <span className="text-sm text-gray-700">
                              {tx.reason || "코인 거래"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
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
                          <div className="text-xs text-gray-500">잔액 {tx.balanceAfter}</div>
                        </div>
                      </PWCard>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── 카카오 탭 ── */}
        {activeTab === "kakao" && (
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold">카카오톡 연동</h1>
              <p className="mt-1 text-sm text-gray-400">카카오톡에서 페르소나와 대화하세요</p>
            </div>

            {kakaoLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : kakaoLink.linked ? (
              /* 연동 완료 상태 */
              <div className="space-y-4">
                <PWCard className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-400">
                      {kakaoLink.personaImageUrl ? (
                        <img
                          src={kakaoLink.personaImageUrl}
                          alt={kakaoLink.personaName ?? ""}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <MessageCircle className="h-7 w-7 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">연동 중</span>
                      </div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {kakaoLink.personaName}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        카카오톡에서 이 페르소나와 대화할 수 있습니다
                      </div>
                    </div>
                  </div>
                </PWCard>

                <PWCard className="p-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-700">사용 방법</h3>
                  <ol className="space-y-2 text-sm text-gray-500">
                    <li className="flex gap-2">
                      <span className="font-medium text-purple-400">1.</span>
                      카카오톡에서 &quot;DeepSight&quot; 채널을 검색하고 친구 추가
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-purple-400">2.</span>
                      채팅방에서 메시지를 보내면 연동된 페르소나가 답변
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-purple-400">3.</span>
                      대화 내용은 PersonaWorld 채팅과 기억을 공유합니다
                    </li>
                  </ol>
                </PWCard>

                <button
                  onClick={handleKakaoUnlink}
                  disabled={kakaoActionLoading}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-left transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  {kakaoActionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-red-400" />
                  ) : (
                    <Unlink className="h-5 w-5 text-red-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-red-400">연동 해제</div>
                    <div className="text-xs text-gray-500">카카오톡 대화 연동을 해제합니다</div>
                  </div>
                </button>
              </div>
            ) : (
              /* 미연동 상태 */
              <div className="space-y-4">
                <PWCard className="p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                      <MessageCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        카카오톡에서 페르소나와 대화
                      </div>
                      <div className="text-xs text-gray-500">
                        채팅했던 페르소나 1명을 연동할 수 있습니다
                      </div>
                    </div>
                  </div>

                  {chattedPersonas.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 p-4 text-center">
                      <p className="text-sm text-gray-500">아직 대화한 페르소나가 없습니다.</p>
                      <p className="mt-1 text-xs text-gray-400">
                        먼저 페르소나와 채팅을 시작해주세요.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        연동할 페르소나 선택
                      </label>
                      <div className="space-y-2">
                        {chattedPersonas.map((p) => (
                          <button
                            key={p.personaId}
                            onClick={() => setSelectedPersonaId(p.personaId)}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                              selectedPersonaId === p.personaId
                                ? "border-purple-400 bg-purple-50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                              {p.personaImageUrl ? (
                                <img
                                  src={p.personaImageUrl}
                                  alt={p.personaName}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {p.personaName}
                            </span>
                            {selectedPersonaId === p.personaId && (
                              <div className="ml-auto h-2 w-2 rounded-full bg-purple-500" />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleKakaoLink}
                        disabled={kakaoActionLoading || !selectedPersonaId}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {kakaoActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                        카카오톡 연동하기
                      </button>
                    </>
                  )}
                </PWCard>
              </div>
            )}
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}
