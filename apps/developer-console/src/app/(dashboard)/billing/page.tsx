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
  Clock,
  FileText,
  Building2,
  Star,
  ChevronRight,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Zap,
  Shield,
  Users,
  Key,
  Activity,
  Gauge,
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
  PLAN_DATA,
  GENERAL_PLANS,
  ENTERPRISE_PLANS,
  type BillingData,
  type Plan,
  type PlanId,
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

// Helper: format large numbers
function formatLargeNumber(n: number): string {
  if (n === -1) return "무제한"
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(0)}천만`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}백만`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return formatNumber(n)
}

// Plan comparison rows for the table
const COMPARISON_ROWS = [
  {
    label: "활성 PW 페르소나",
    icon: Users,
    getValue: (p: Plan) => {
      if (p.id === "ent_scale") return `${formatNumber(p.limits.activePersonas)}개 + 추가`
      return p.limits.activePersonas === -1
        ? "무제한"
        : `${formatNumber(p.limits.activePersonas)}개`
    },
  },
  {
    label: "매칭 API 호출",
    icon: Activity,
    getValue: (p: Plan) =>
      p.limits.matchingApiCalls === -1
        ? "무제한"
        : `${formatLargeNumber(p.limits.matchingApiCalls)}/월`,
  },
  {
    label: "Rate Limit",
    icon: Gauge,
    getValue: (p: Plan) =>
      p.limits.rateLimit === -1 ? "협의" : `${formatNumber(p.limits.rateLimit)}/분`,
  },
  {
    label: "API Keys",
    icon: Key,
    getValue: (p: Plan) => (p.limits.apiKeys === -1 ? "무제한" : `${p.limits.apiKeys}개`),
  },
  {
    label: "팀원",
    icon: Users,
    getValue: (p: Plan) => (p.limits.teamMembers === -1 ? "무제한" : `${p.limits.teamMembers}명`),
  },
  { label: "SLA", icon: Shield, getValue: (p: Plan) => p.limits.sla },
  { label: "지원", icon: Zap, getValue: (p: Plan) => p.support },
]

export default function BillingPage() {
  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false)
  const [billingData, setBillingData] = React.useState<BillingData | null>(null)
  const [tossReady, setTossReady] = React.useState(false)
  const [isAnnual, setIsAnnual] = React.useState(false)

  // URL 쿼리 파라미터로 결제 결과 처리
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const plan = urlParams.get("plan")
    const error = urlParams.get("error")

    if (success === "true" && plan) {
      toast.success(`${plan} 플랜으로 업그레이드되었습니다!`)
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
    limit: 500_000,
    percentUsed: 0,
    estimatedCost: 0,
    billingCycle: "",
    daysRemaining: 0,
    activePersonas: 0,
    activePersonasLimit: 50,
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

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan)
    setUpgradeDialogOpen(true)
  }

  const confirmUpgrade = async () => {
    if (!selectedPlan) return

    setIsProcessingPayment(true)
    try {
      const paymentInfo = await billingService.upgradePlan(selectedPlan.id)

      if (!paymentInfo) {
        toast.success("플랜이 변경되었습니다.")
        const data = await billingService.getBillingInfo()
        setBillingData(data)
        setUpgradeDialogOpen(false)
        return
      }

      if (!window.TossPayments) {
        toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.")
        return
      }

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
      if (error instanceof Error && error.message.includes("PAY_PROCESS_CANCELED")) {
        toast.info("결제가 취소되었습니다.")
      } else {
        toast.error("플랜 업그레이드에 실패했습니다.")
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const getDisplayPrice = (plan: Plan) => {
    if (isAnnual && !plan.isEnterprise) return plan.annualPrice
    return plan.price
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  const generalPlans = GENERAL_PLANS.map((id) => ({
    ...PLAN_DATA[id],
    current: currentPlan?.id === id,
  }))

  const enterprisePlans = ENTERPRISE_PLANS.map((id) => ({
    ...PLAN_DATA[id],
    current: currentPlan?.id === id,
  }))

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
                {currentPlan?.name ?? "Starter"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">월 요금</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPlan?.price ?? 199)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">매칭 API 한도</p>
                <p className="text-2xl font-bold">
                  {formatLargeNumber(currentPlan?.limits.matchingApiCalls ?? 500_000)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Rate Limit</p>
                <p className="text-2xl font-bold">
                  {currentPlan?.limits.rateLimit === -1
                    ? "협의"
                    : `${currentPlan?.limits.rateLimit ?? 100}/분`}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">활성 페르소나</p>
                <p className="text-2xl font-bold">
                  {currentUsage.activePersonas} / {formatNumber(currentUsage.activePersonasLimit)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>이번 달 API 사용량</span>
                <span className="font-medium">
                  {formatNumber(currentUsage.used)} / {formatLargeNumber(currentUsage.limit)} calls
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

      {/* Plans Section */}
      <Tabs defaultValue="general">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="general">일반 플랜</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
            <TabsTrigger value="compare">상세 비교</TabsTrigger>
          </TabsList>

          {/* Annual Toggle */}
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="flex items-center gap-2 text-sm"
          >
            {isAnnual ? (
              <ToggleRight className="text-primary h-5 w-5" />
            ) : (
              <ToggleLeft className="text-muted-foreground h-5 w-5" />
            )}
            <span className={cn(isAnnual ? "text-primary font-medium" : "text-muted-foreground")}>
              연간 결제
            </span>
            {isAnnual && (
              <Badge variant="secondary" className="text-xs">
                20% 할인
              </Badge>
            )}
          </button>
        </div>

        {/* General Plans Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                프로젝트에 맞는 플랜을 선택하세요
                {isAnnual && " — 연간 결제 시 20% 할인"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {generalPlans.map((plan) => (
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
                      <span className="text-3xl font-bold">${getDisplayPrice(plan as Plan)}</span>
                      <span className="text-muted-foreground">/month</span>
                      {isAnnual && (
                        <p className="text-muted-foreground mt-1 text-xs line-through">
                          ${plan.price}/month
                        </p>
                      )}
                    </div>

                    <ul className="mb-6 space-y-2">
                      {plan.features.slice(0, 7).map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {plan.current ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.recommended ? "default" : "outline"}
                        onClick={() => handleUpgrade(plan as Plan)}
                      >
                        Upgrade
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Enterprise CTA */}
              <div className="mt-6 rounded-lg border border-dashed p-6 text-center">
                <Building2 className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <h4 className="mb-1 font-medium">더 큰 규모가 필요하신가요?</h4>
                <p className="text-muted-foreground mb-4 text-sm">
                  Enterprise 플랜으로 800~5,000+ 페르소나, SSO, 전담 매니저를 이용하세요.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/support">
                    <Building2 className="mr-2 h-4 w-4" />
                    Enterprise 문의
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enterprise Plans Tab */}
        <TabsContent value="enterprise">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Plans</CardTitle>
              <CardDescription>대규모 기업을 위한 맞춤형 플랜 — 별도 계약 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {enterprisePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative rounded-lg border-2 p-6 transition-all",
                      plan.current
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    )}
                  >
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
                      <span className="text-3xl font-bold">${formatNumber(plan.price)}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>

                    <ul className="mb-6 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/support">문의하기</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Comparison Tab */}
        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>플랜 상세 비교</CardTitle>
              <CardDescription>모든 플랜의 한도 및 기능을 비교하세요</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">항목</TableHead>
                    {GENERAL_PLANS.map((id) => (
                      <TableHead key={id} className="text-center">
                        {PLAN_DATA[id].name}
                        <div className="text-muted-foreground text-xs font-normal">
                          ${isAnnual ? PLAN_DATA[id].annualPrice : PLAN_DATA[id].price}/월
                        </div>
                      </TableHead>
                    ))}
                    {ENTERPRISE_PLANS.map((id) => (
                      <TableHead key={id} className="text-center">
                        {PLAN_DATA[id].name.replace("Enterprise ", "Ent. ")}
                        <div className="text-muted-foreground text-xs font-normal">
                          ${formatNumber(PLAN_DATA[id].price)}/월
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON_ROWS.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      {[...GENERAL_PLANS, ...ENTERPRISE_PLANS].map((id) => (
                        <TableCell key={id} className="text-center">
                          {row.getValue({ ...PLAN_DATA[id], current: false })}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                  {/* Enterprise-only features */}
                  <TableRow>
                    <TableCell className="font-medium">SSO</TableCell>
                    {GENERAL_PLANS.map((id) => (
                      <TableCell key={id} className="text-center">
                        <X className="text-muted-foreground mx-auto h-4 w-4" />
                      </TableCell>
                    ))}
                    {ENTERPRISE_PLANS.map((id) => (
                      <TableCell key={id} className="text-center">
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">IP 화이트리스트</TableCell>
                    {GENERAL_PLANS.map((id) => (
                      <TableCell key={id} className="text-center">
                        <X className="text-muted-foreground mx-auto h-4 w-4" />
                      </TableCell>
                    ))}
                    {ENTERPRISE_PLANS.map((id) => (
                      <TableCell key={id} className="text-center">
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">페르소나 필터 API</TableCell>
                    {GENERAL_PLANS.map((id) => (
                      <TableCell key={id} className="text-center">
                        <X className="text-muted-foreground mx-auto h-4 w-4" />
                      </TableCell>
                    ))}
                    {ENTERPRISE_PLANS.map((id) => (
                      <TableCell key={id} className="text-center">
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Overage Pricing */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>초과 요금 (Overage)</CardTitle>
              <CardDescription>한도 초과 시 적용되는 요금</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 font-medium">매칭 API 초과 요금</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>플랜</TableHead>
                        <TableHead className="text-right">초과 요금</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...GENERAL_PLANS, ...ENTERPRISE_PLANS].map((id) => (
                        <TableRow key={id}>
                          <TableCell>{PLAN_DATA[id].name}</TableCell>
                          <TableCell className="text-right">
                            {PLAN_DATA[id].overage.matchApiPerCall === 0
                              ? "포함량 내 운영"
                              : `$${PLAN_DATA[id].overage.matchApiPerCall} / call`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="mb-3 font-medium">PW 페르소나 추가 요금</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>플랜</TableHead>
                        <TableHead className="text-right">추가 요금</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...GENERAL_PLANS, ...ENTERPRISE_PLANS].map((id) => (
                        <TableRow key={id}>
                          <TableCell>{PLAN_DATA[id].name}</TableCell>
                          <TableCell className="text-right">
                            ${PLAN_DATA[id].overage.personaPerUnit} / 개 / 월
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matching Features */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>매칭 기능 비교</CardTitle>
              <CardDescription>모든 플랜에서 동일한 106D+ 매칭 품질을 제공합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매칭 기능</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-center">모든 플랜</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Tier 1: Basic</TableCell>
                    <TableCell>106D+ 벡터 공간 유사도 기반 매칭</TableCell>
                    <TableCell className="text-center">
                      <Check className="mx-auto h-4 w-4 text-green-500" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Tier 2: Advanced</TableCell>
                    <TableCell>106D+ 벡터 + Extended Paradox Score 호환성 매칭</TableCell>
                    <TableCell className="text-center">
                      <Check className="mx-auto h-4 w-4 text-green-500" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Tier 3: Exploration</TableCell>
                    <TableCell>
                      106D+ 다양성 극대화 + Init/Override/Adapt/Express + Voice 보정
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">기본값</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">스마트 캐싱</TableCell>
                    <TableCell>동일 콘텐츠 매칭 결과 7일간 캐싱 (히트율 70%+)</TableCell>
                    <TableCell className="text-center">
                      <Check className="mx-auto h-4 w-4 text-green-500" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Prompt Caching</TableCell>
                    <TableCell>페르소나 시스템 프롬프트 캐싱 (LLM 호출 비용 90% 절감)</TableCell>
                    <TableCell className="text-center">
                      <Check className="mx-auto h-4 w-4 text-green-500" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                    {formatCurrency(getDisplayPrice(selectedPlan))}/month
                  </span>
                </div>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>
                    • {formatLargeNumber(selectedPlan.limits.matchingApiCalls)} API calls/month
                  </li>
                  <li>
                    •{" "}
                    {selectedPlan.limits.rateLimit === -1
                      ? "협의"
                      : `${selectedPlan.limits.rateLimit} req/min`}{" "}
                    rate limit
                  </li>
                  <li>
                    • 활성 PW 페르소나{" "}
                    {selectedPlan.limits.activePersonas === -1
                      ? "무제한"
                      : `${formatNumber(selectedPlan.limits.activePersonas)}개`}
                  </li>
                </ul>
              </div>

              {isAnnual && !selectedPlan.isEnterprise && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>연간 결제 할인 적용</AlertTitle>
                  <AlertDescription>
                    연간 결제 시 월 ${selectedPlan.annualPrice} (20% 할인, 연 $
                    {formatNumber(selectedPlan.annualPrice * 12)})
                  </AlertDescription>
                </Alert>
              )}

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
