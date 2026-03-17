"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { toast } from "sonner"
import { ArrowLeft, Coins, Check, Lock, Zap, Ticket } from "lucide-react"
import { PWLogoWithText, PWCard, PWButton, PWBottomNav } from "@/components/persona-world"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import {
  getShopItemsByCategory,
  SHOP_CATEGORY_LABELS,
  type ShopCategory,
  type ShopItem,
} from "@/lib/shop"

// 코인 충전 패키지 (서버의 coin-packages.ts와 동기화)
const COIN_PACKAGES = [
  { id: "coin_100", coins: 100, bonus: 0, price: 1100, label: "100 코인" },
  { id: "coin_500", coins: 500, bonus: 50, price: 4900, label: "500+50 코인", tag: "HOT" as const },
  {
    id: "coin_1000",
    coins: 1000,
    bonus: 150,
    price: 8900,
    label: "1,000+150 코인",
    tag: "BEST" as const,
  },
  { id: "coin_3000", coins: 3000, bonus: 600, price: 23900, label: "3,000+600 코인" },
] as const

type ConfirmState = { item: ShopItem } | null

export default function ShopPage() {
  const {
    profile,
    onboarding,
    purchaseItem,
    hasPurchased,
    getPurchaseCount,
    syncCreditsBalance,
    resetProfile,
  } = useUserStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ShopCategory>("persona")
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [coinLoading, setCoinLoading] = useState<string | null>(null)
  const [tossReady, setTossReady] = useState(false)

  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [serverBalance, setServerBalance] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  // 성향 초기화 다이얼로그
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetDeleteSns, setResetDeleteSns] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // hydration 완료 후에만 잔액 표시 (SSR default 0 vs localStorage 불일치 방지)
  useEffect(() => setMounted(true), [])

  // 서버 잔액이 로딩되면 서버를 SSoT로 사용, 아직 로딩 전이면 로컬 잔액 표시
  const balance = serverBalance ?? onboarding.creditsBalance
  const balanceReady = mounted && serverBalance !== null
  const items = getShopItemsByCategory(activeTab)

  // 서버에서 실제 잔액 fetch — 서버 잔액을 SSoT로 사용
  // 온보딩 크레딧이 서버에 없으면 서버에 동기화 (최초 1회)
  useEffect(() => {
    const userId = profile?.id
    if (!userId) return
    clientApi
      .getCredits(userId, { limit: 1 })
      .then(async (data) => {
        // 서버 잔액이 0이고 로컬에 온보딩 크레딧이 있으면 서버에 동기화
        if (data.balance === 0 && onboarding.creditsBalance > 0) {
          try {
            const synced = await clientApi.syncOnboardingCredits(userId, onboarding.creditsBalance)
            setServerBalance(synced.balance)
            syncCreditsBalance(synced.balance)
          } catch {
            // 동기화 실패 시 로컬 잔액 유지
            setServerBalance(onboarding.creditsBalance)
          }
        } else {
          setServerBalance(data.balance)
          syncCreditsBalance(data.balance)
        }
      })
      .catch(() => {})
  }, [profile?.id])
  const handleCouponRedeem = async () => {
    const userId = profile?.id
    if (!userId) {
      toast.error("로그인이 필요합니다")
      return
    }
    const code = couponCode.trim()
    if (!code) {
      toast.error("쿠폰 코드를 입력해주세요")
      return
    }

    setCouponLoading(true)
    try {
      const result = await clientApi.redeemCoupon(userId, code)
      setServerBalance(result.newBalance)
      syncCreditsBalance(result.newBalance)
      setCouponCode("")
      toast.success(`${result.coinAmount} 코인이 지급되었습니다!`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "쿠폰 적용 실패"
      toast.error(msg)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleCoinPurchase = async (packageId: string) => {
    const userId = profile?.id
    if (!userId) {
      toast.error("로그인이 필요합니다")
      return
    }

    setCoinLoading(packageId)
    try {
      const { paymentInfo } = await clientApi.requestCoinPurchase(userId, packageId)

      // Toss Payments 위젯 호출
      type TossWidget = (clientKey: string) => {
        requestPayment: (
          method: string,
          params: Record<string, unknown>
        ) => Promise<{ paymentKey: string }>
      }
      const tossPayments = (window as unknown as Record<string, unknown>).TossPayments as
        | TossWidget
        | undefined
      if (!tossReady || !tossPayments) {
        toast.error("결제 모듈을 로드하는 중입니다. 잠시 후 다시 시도해주세요.")
        return
      }

      const widget = tossPayments(paymentInfo.clientKey)
      const result = await widget.requestPayment("카드", {
        amount: paymentInfo.amount,
        orderId: paymentInfo.orderId,
        orderName: paymentInfo.orderName,
        successUrl: `${window.location.origin}/shop?payment=success`,
        failUrl: `${window.location.origin}/shop?payment=fail`,
      })

      // 결제 승인
      const confirmed = await clientApi.confirmCoinPayment(
        result.paymentKey,
        paymentInfo.orderId,
        paymentInfo.amount
      )
      setServerBalance(confirmed.balance)
      syncCreditsBalance(confirmed.balance)
      toast.success(`${confirmed.coins} 코인이 충전되었습니다!`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "결제 실패"
      if (!msg.includes("cancel") && !msg.includes("취소")) {
        toast.error(msg)
      }
    } finally {
      setCoinLoading(null)
    }
  }

  const handlePurchase = (item: ShopItem) => {
    if (item.tag === "SOON") {
      toast.info("곧 출시됩니다!")
      return
    }
    if (item.actionType === "reset") {
      setResetConfirm(true)
      return
    }
    setConfirm({ item })
  }

  const handleResetConfirm = async () => {
    const userId = profile?.id
    if (!userId) {
      toast.error("로그인이 필요합니다")
      return
    }
    setResetLoading(true)
    try {
      await clientApi.resetProfile(userId, { deleteSns: resetDeleteSns })
      resetProfile()
      // 서버 잔액 갱신
      const credits = await clientApi.getCredits(userId, { limit: 1 })
      setServerBalance(credits.balance)
      syncCreditsBalance(credits.balance)
      toast.success("성향이 초기화되었습니다! 온보딩을 다시 시작해주세요.")
      setResetConfirm(false)
      setResetDeleteSns(false)
      router.push("/onboarding")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "초기화 실패"
      toast.error(msg)
    } finally {
      setResetLoading(false)
    }
  }

  const confirmPurchase = () => {
    if (!confirm) return
    const { item } = confirm
    const success = purchaseItem(item.id, item.price)
    if (success) {
      toast.success(`${item.emoji} ${item.name} 구매 완료!`)
    } else {
      toast.error("코인이 부족합니다")
    }
    setConfirm(null)
  }

  const getItemStatus = (
    item: ShopItem
  ): "available" | "owned" | "insufficient" | "soon" | "navigate" | "reset" => {
    if (item.tag === "SOON") return "soon"
    if (item.actionType === "navigate") return "navigate"
    if (item.actionType === "reset") {
      if (balance < item.price) return "insufficient"
      return "reset"
    }
    if (!item.repeatable && hasPurchased(item.id)) return "owned"
    if (balance < item.price) return "insufficient"
    return "available"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toss Payments SDK */}
      <Script src="https://js.tosspayments.com/v1/payment" strategy="afterInteractive" />

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="rounded-full p-1.5 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <PWLogoWithText size="sm" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-700" suppressHydrationWarning>
              {balanceReady ? balance.toLocaleString() : "···"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* Hero Section */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-6 text-white">
          <h1 className="mb-1 text-2xl font-bold">코인 상점</h1>
          <p className="text-sm text-white/80">코인으로 특별한 아이템을 구매하세요</p>
          <div className="mt-4 flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-300" />
            <span className="text-3xl font-bold" suppressHydrationWarning>
              {balanceReady ? balance.toLocaleString() : "···"}
            </span>
            <span className="text-sm text-white/70">코인 보유</span>
          </div>
        </div>

        {/* 코인 충전 섹션 */}
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <Zap className="h-5 w-5 text-amber-500" />
            코인 충전
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {COIN_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handleCoinPurchase(pkg.id)}
                disabled={coinLoading !== null}
                className={`relative rounded-xl border-2 bg-white p-4 text-left transition-all hover:border-purple-300 hover:shadow-md ${
                  coinLoading === pkg.id ? "opacity-70" : ""
                } ${"tag" in pkg && pkg.tag === "BEST" ? "border-purple-400" : "border-gray-200"}`}
              >
                {"tag" in pkg && pkg.tag && (
                  <span
                    className={`absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                      pkg.tag === "BEST" ? "bg-purple-500" : "bg-orange-500"
                    }`}
                  >
                    {pkg.tag}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-gray-900">{pkg.coins.toLocaleString()}</span>
                  {pkg.bonus > 0 && (
                    <span className="text-xs font-medium text-green-600">+{pkg.bonus}</span>
                  )}
                </div>
                <div className="mt-1 text-sm font-semibold text-purple-600">
                  ₩{pkg.price.toLocaleString()}
                </div>
                {coinLoading === pkg.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 쿠폰 코드 입력 */}
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <Ticket className="h-5 w-5 text-purple-500" />
            쿠폰 코드
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCouponRedeem()
              }}
              placeholder="쿠폰 코드를 입력하세요"
              disabled={couponLoading}
              className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium uppercase placeholder:normal-case placeholder:text-gray-400 focus:border-purple-400 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => void handleCouponRedeem()}
              disabled={couponLoading || !couponCode.trim()}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {couponLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "적용"
              )}
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-5 flex gap-2">
          {(["persona", "profile"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeTab === cat
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {SHOP_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="space-y-3">
          {items.map((item) => {
            const status = getItemStatus(item)
            const count = getPurchaseCount(item.id)

            return (
              <PWCard
                key={item.id}
                hover={status === "available" || status === "navigate" || status === "reset"}
                className="relative !p-4"
              >
                {/* Tag Badge */}
                {item.tag && (
                  <span
                    className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.tag === "NEW"
                        ? "bg-green-100 text-green-700"
                        : item.tag === "HOT"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.tag === "SOON" ? "준비중" : item.tag}
                  </span>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 text-2xl">
                    {item.emoji}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {status === "owned" && (
                        <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          <Check className="h-3 w-3" />
                          보유 중
                        </span>
                      )}
                      {item.repeatable && count > 0 && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          {count}회 구매
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>

                    {/* Price + Button Row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-bold text-amber-700">
                          {item.priceLabel ?? `${item.price} 코인`}
                        </span>
                      </div>

                      {status === "soon" ? (
                        <button
                          onClick={() => handlePurchase(item)}
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-500"
                        >
                          <Lock className="h-3 w-3" />
                          준비 중
                        </button>
                      ) : status === "navigate" ? (
                        <Link href={item.navigateTo ?? "/"}>
                          <PWButton size="sm" variant="gradient">
                            이용하기
                          </PWButton>
                        </Link>
                      ) : status === "reset" ? (
                        <PWButton
                          size="sm"
                          variant="gradient"
                          onClick={() => handlePurchase(item)}
                          className="!from-red-500 !to-orange-500"
                        >
                          초기화
                        </PWButton>
                      ) : status === "owned" ? (
                        <span className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-400">
                          구매 완료
                        </span>
                      ) : (
                        <PWButton
                          size="sm"
                          variant={status === "available" ? "gradient" : "outline"}
                          onClick={() => handlePurchase(item)}
                          disabled={status === "insufficient"}
                          className={
                            status === "insufficient" ? "cursor-not-allowed !opacity-50" : ""
                          }
                        >
                          {status === "insufficient" ? "코인 부족" : "구매"}
                        </PWButton>
                      )}
                    </div>
                  </div>
                </div>
              </PWCard>
            )
          })}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p>이 카테고리에 아이템이 없습니다</p>
          </div>
        )}
      </main>

      {/* Purchase Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-50 to-pink-50 text-3xl">
                {confirm.item.emoji}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{confirm.item.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{confirm.item.description}</p>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">가격</span>
                <div className="flex items-center gap-1 font-bold text-amber-700">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {confirm.item.price} 코인
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">구매 후 잔액</span>
                <span
                  className={`font-bold ${
                    balance - confirm.item.price >= 0 ? "text-gray-900" : "text-red-500"
                  }`}
                >
                  {balance - confirm.item.price} 코인
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                구매하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Reset Confirmation Dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-50 to-orange-50 text-3xl">
                🔄
              </div>
              <h3 className="text-lg font-bold text-gray-900">성향 초기화</h3>
              <p className="mt-1 text-sm text-gray-500">
                취향 분석이 초기화되고 온보딩을 다시 진행합니다.
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>

            <div className="mb-4 rounded-lg bg-red-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">비용</span>
                <div className="flex items-center gap-1 font-bold text-amber-700">
                  <Coins className="h-4 w-4 text-amber-500" />
                  100 코인
                </div>
              </div>
              <p className="mt-2 text-xs text-red-600">
                벡터·설문 응답이 삭제되며, 재온보딩 시 크레딧은 지급되지 않습니다.
              </p>
            </div>

            <label className="mb-5 flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={resetDeleteSns}
                onChange={(e) => setResetDeleteSns(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-gray-600">SNS 연동도 함께 삭제</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResetConfirm(false)
                  setResetDeleteSns(false)
                }}
                disabled={resetLoading}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => void handleResetConfirm()}
                disabled={resetLoading}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {resetLoading ? (
                  <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "초기화하기"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PWBottomNav />

      {/* Toss Payments SDK */}
      <Script src="https://js.tosspayments.com/v1/payment" onLoad={() => setTossReady(true)} />
    </div>
  )
}
