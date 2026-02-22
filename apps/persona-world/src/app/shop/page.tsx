"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Script from "next/script"
import { toast } from "sonner"
import { ArrowLeft, Coins, Check, Lock, Zap } from "lucide-react"
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
  const { profile, onboarding, purchaseItem, hasPurchased, getPurchaseCount } = useUserStore()
  const [activeTab, setActiveTab] = useState<ShopCategory>("persona")
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [coinLoading, setCoinLoading] = useState<string | null>(null)

  const [serverBalance, setServerBalance] = useState<number | null>(null)
  const balance = serverBalance ?? onboarding.creditsBalance
  const items = getShopItemsByCategory(activeTab)

  // 서버에서 실제 잔액 fetch (Zustand 초기값 0 문제 해결)
  useEffect(() => {
    const userId = profile?.id
    if (!userId) return
    clientApi
      .getCredits(userId, { limit: 1 })
      .then((data) => setServerBalance(data.balance))
      .catch(() => {})
  }, [profile?.id])
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
      if (!tossPayments) {
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
    setConfirm({ item })
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

  const getItemStatus = (item: ShopItem): "available" | "owned" | "insufficient" | "soon" => {
    if (item.tag === "SOON") return "soon"
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
            <span className="text-sm font-bold text-amber-700">{balance}</span>
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
            <span className="text-3xl font-bold">{balance}</span>
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
              <PWCard key={item.id} hover={status === "available"} className="relative !p-4">
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
                    {item.tag}
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

      <PWBottomNav />
    </div>
  )
}
