"use client"

import * as React from "react"
import Link from "next/link"
import {
  CreditCard,
  Download,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Zap,
  Shield,
  Infinity,
  Clock,
  DollarSign,
  FileText,
  Building2,
  Star,
  ChevronRight,
  Loader2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn, formatNumber, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import {
  billingService,
  type BillingData,
  type Plan,
  type Invoice as ServiceInvoice,
  type PaymentMethod as ServicePaymentMethod,
  type TossPaymentInfo,
} from "@/services/billing-service"
import Script from "next/script"

// Toss Payments SDK types
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: {
          amount: number
          orderId: string
          orderName: string
          customerName: string
          successUrl: string
          failUrl: string
        }
      ) => Promise<void>
    }
  }
}

// Plan data based on documentation (static content)
const plans = [
  {
    id: "free",
    name: "Free",
    description: "개인 프로젝트와 테스트용",
    price: 0,
    pricePerCall: null,
    calls: 3000,
    rateLimit: 10,
    features: [
      { name: "월 3,000 API 호출", included: true },
      { name: "기본 Match API 접근", included: true },
      { name: "테스트 환경 전용", included: true },
      { name: "커뮤니티 지원", included: true },
      { name: "이메일 지원", included: false },
      { name: "Webhook 연동", included: false },
      { name: "우선 처리", included: false },
    ],
    recommended: false,
    current: false,
  },
  {
    id: "starter",
    name: "Starter",
    description: "스타트업과 소규모 팀용",
    price: 49,
    pricePerCall: 0.00098,
    calls: 50000,
    rateLimit: 100,
    features: [
      { name: "월 50,000 API 호출", included: true },
      { name: "모든 API 접근", included: true },
      { name: "Live + Test 환경", included: true },
      { name: "이메일 지원", included: true },
      { name: "Webhook 연동", included: true },
      { name: "기본 분석 대시보드", included: true },
      { name: "우선 처리", included: false },
    ],
    recommended: true,
    current: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "성장하는 비즈니스용",
    price: 199,
    pricePerCall: 0.000398,
    calls: 500000,
    rateLimit: 500,
    features: [
      { name: "월 500,000 API 호출", included: true },
      { name: "모든 API 접근", included: true },
      { name: "Live + Test 환경", included: true },
      { name: "우선 이메일 지원", included: true },
      { name: "Webhook 연동", included: true },
      { name: "고급 분석 대시보드", included: true },
      { name: "우선 처리 큐", included: true },
    ],
    recommended: false,
    current: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "대규모 기업용 맞춤 솔루션",
    price: null,
    pricePerCall: null,
    calls: null,
    rateLimit: null,
    features: [
      { name: "무제한 API 호출", included: true },
      { name: "전용 인프라", included: true },
      { name: "SLA 보장 (99.9%)", included: true },
      { name: "전담 기술 지원", included: true },
      { name: "맞춤 통합 지원", included: true },
      { name: "온프레미스 옵션", included: true },
      { name: "커스텀 계약", included: true },
    ],
    recommended: false,
    current: false,
  },
]

export default function BillingPage() {
  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<(typeof plans)[0] | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false)
  const [billingData, setBillingData] = React.useState<BillingData | null>(null)
  const [tossReady, setTossReady] = React.useState(false)

  // URL 쿼리 파라미터로 결제 결과 처리
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const plan = urlParams.get("plan")
    const error = urlParams.get("error")

    if (success === "true" && plan) {
      toast.success(`${plan} 플랜으로 업그레이드되었습니다!`)
      // URL에서 쿼리 파라미터 제거
      window.history.replaceState({}, "", "/billing")
    } else if (error) {
      toast.error("결제 처리 중 오류가 발생했습니다.")
      window.history.replaceState({}, "", "/billing")
    }
  }, [])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await billingService.getBillingInfo()
        setBillingData(data)
      } catch (error) {
        console.error("Failed to fetch billing data:", error)
        toast.error("결제 정보를 불러오는데 실패했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const currentUsage = billingData?.usage ?? {
    used: 0,
    limit: 3000,
    percentUsed: 0,
    estimatedCost: 0,
    billingCycle: "",
    daysRemaining: 0,
  }
  const invoices = billingData?.invoices ?? []
  const paymentMethods = billingData?.paymentMethods ?? []
  const currentPlan = billingData?.currentPlan

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const blob = await billingService.downloadInvoice(invoiceId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${invoiceId}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("청구서가 다운로드되었습니다.")
    } catch (error) {
      console.error("Failed to download invoice:", error)
      toast.error("청구서 다운로드에 실패했습니다.")
    }
  }

  const displayPlans = plans.map((plan) => ({
    ...plan,
    current: currentPlan?.id === plan.id,
  }))

  const handleUpgrade = async (plan: (typeof plans)[0]) => {
    setSelectedPlan(plan)
    setUpgradeDialogOpen(true)
  }

  const confirmUpgrade = async () => {
    if (!selectedPlan) return

    setIsProcessingPayment(true)
    try {
      const paymentInfo = await billingService.upgradePlan(
        selectedPlan.id as "free" | "starter" | "pro" | "enterprise"
      )

      // Free 플랜은 결제 없이 바로 적용
      if (!paymentInfo) {
        toast.success("플랜이 변경되었습니다.")
        const data = await billingService.getBillingInfo()
        setBillingData(data)
        setUpgradeDialogOpen(false)
        return
      }

      // Toss Payments SDK 로드 확인
      if (!window.TossPayments) {
        toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.")
        return
      }

      // Toss Payments 결제 요청
      const tossPayments = window.TossPayments(paymentInfo.clientKey)
      await tossPayments.requestPayment("카드", {
        amount: paymentInfo.amount,
        orderId: paymentInfo.orderId,
        orderName: paymentInfo.orderName,
        customerName: paymentInfo.customerName,
        successUrl: paymentInfo.successUrl,
        failUrl: paymentInfo.failUrl,
      })
    } catch (error) {
      console.error("Failed to upgrade plan:", error)
      // Toss 결제창 취소 시에도 에러가 발생하므로 구분 처리
      if (error instanceof Error && error.message.includes("PAY_PROCESS_CANCELED")) {
        toast.info("결제가 취소되었습니다.")
      } else {
        toast.error("플랜 업그레이드에 실패했습니다.")
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground">구독 플랜과 결제 정보를 관리하세요</p>
        </div>
        <Button variant="outline" disabled>
          <FileText className="mr-2 h-4 w-4" />
          View All Invoices
        </Button>
      </div>

      {/* Current Plan Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>현재 구독 중인 플랜</CardDescription>
              </div>
              <Badge variant="default" className="px-3 py-1 text-lg">
                {currentPlan?.name ?? "Free"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">월 요금</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPlan?.price ?? 0)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">API 호출 한도</p>
                <p className="text-2xl font-bold">{formatNumber(currentPlan?.calls ?? 3000)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Rate Limit</p>
                <p className="text-2xl font-bold">{currentPlan?.rateLimit ?? 10}/min</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>이번 달 사용량</span>
                <span className="font-medium">
                  {formatNumber(currentUsage.used)} / {formatNumber(currentUsage.limit)} calls
                </span>
              </div>
              <Progress value={currentUsage.percentUsed} className="h-3" />
              <p className="text-muted-foreground text-xs">
                {formatNumber(currentUsage.limit - currentUsage.used)} calls 남음
              </p>
            </div>

            {currentUsage.percentUsed >= 80 && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>사용량 알림</AlertTitle>
                <AlertDescription>
                  이번 달 API 호출의 {currentUsage.percentUsed}%를 사용했습니다. 한도 초과를
                  방지하려면 플랜 업그레이드를 고려해 주세요.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div>
              <p className="text-muted-foreground text-sm">현재 플랜</p>
              <p className="font-medium">
                {currentPlan?.name ?? "Free"} (
                {currentPlan?.price === 0 ? "무료" : `$${currentPlan?.price}/월`})
              </p>
            </div>
            <Button onClick={() => handleUpgrade(plans[1])}>
              Upgrade to Starter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>결제 수단 관리</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded p-2">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {method.brand} •••• {method.last4}
                      </p>
                      <p className="text-muted-foreground text-sm">Expires {method.expiry}</p>
                    </div>
                  </div>
                  {method.isDefault && <Badge variant="secondary">Default</Badge>}
                </div>
              ))
            ) : (
              <div className="py-6 text-center">
                <CreditCard className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">등록된 결제 수단이 없습니다</p>
              </div>
            )}
            <Button variant="outline" className="w-full" disabled>
              Manage Payment Methods
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plans Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>프로젝트에 맞는 플랜을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {displayPlans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-lg border-2 p-6 transition-all",
                  plan.current
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30",
                  plan.recommended && !plan.current && "border-primary/50"
                )}
              >
                {plan.recommended && !plan.current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1">
                      <Star className="h-3 w-3" />
                      Recommended
                    </Badge>
                  </div>
                )}
                {plan.current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary">Current Plan</Badge>
                  </div>
                )}

                <div className="mb-4 text-center">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <div className="mb-6 text-center">
                  {plan.price !== null ? (
                    <>
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">Contact Us</span>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li
                      key={feature.name}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        !feature.included && "text-muted-foreground"
                      )}
                    >
                      {feature.included ? (
                        <Check className="h-4 w-4 shrink-0 text-green-500" />
                      ) : (
                        <X className="text-muted-foreground h-4 w-4 shrink-0" />
                      )}
                      {feature.name}
                    </li>
                  ))}
                </ul>

                {plan.current ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.id === "enterprise" ? (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/support">
                      <Building2 className="mr-2 h-4 w-4" />
                      Contact Sales
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {plan.price === 0 ? "Downgrade" : "Upgrade"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>최근 결제 내역</CardDescription>
          </div>
          <Button variant="ghost" size="sm" disabled className="gap-1">
            View All
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "paid" ? "success" : "secondary"}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <FileText className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
              <p className="text-muted-foreground">결제 내역이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan?.name}</DialogTitle>
            <DialogDescription>플랜을 변경하시겠습니까?</DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{selectedPlan.name} Plan</span>
                  <span className="text-xl font-bold">
                    {selectedPlan.price !== null ? formatCurrency(selectedPlan.price) : "Custom"}
                    /month
                  </span>
                </div>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>
                    • {selectedPlan.calls ? formatNumber(selectedPlan.calls) : "Unlimited"} API
                    calls/month
                  </li>
                  <li>
                    • {selectedPlan.rateLimit ? `${selectedPlan.rateLimit} req/min` : "Custom"} rate
                    limit
                  </li>
                </ul>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>플랜 변경 안내</AlertTitle>
                <AlertDescription>
                  플랜 변경은 즉시 적용됩니다. 업그레이드 시 일할 계산으로 차액이 청구됩니다.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeDialogOpen(false)}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button onClick={confirmUpgrade} disabled={isProcessingPayment}>
              {isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : selectedPlan?.price === 0 ? (
                "Confirm Downgrade"
              ) : (
                "결제하기"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toss Payments SDK */}
      <Script src="https://js.tosspayments.com/v1/payment" onLoad={() => setTossReady(true)} />
    </div>
  )
}
