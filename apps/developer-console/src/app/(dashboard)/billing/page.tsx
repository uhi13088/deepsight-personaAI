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

// Plan data based on documentation
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
    current: true,
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

const currentUsage = {
  used: 32500,
  limit: 50000,
  percentUsed: 65,
  estimatedCost: 31.85,
  billingCycle: "2025-01-01 ~ 2025-01-31",
  daysRemaining: 15,
}

const invoices = [
  {
    id: "INV-2025-001",
    date: "2025-01-01",
    amount: 49.0,
    status: "paid",
    description: "Starter Plan - January 2025",
  },
  {
    id: "INV-2024-012",
    date: "2024-12-01",
    amount: 49.0,
    status: "paid",
    description: "Starter Plan - December 2024",
  },
  {
    id: "INV-2024-011",
    date: "2024-11-01",
    amount: 49.0,
    status: "paid",
    description: "Starter Plan - November 2024",
  },
  {
    id: "INV-2024-010",
    date: "2024-10-01",
    amount: 49.0,
    status: "paid",
    description: "Starter Plan - October 2024",
  },
]

const paymentMethods = [
  { id: "card_1", type: "card", brand: "Visa", last4: "4242", expiry: "12/26", isDefault: true },
]

export default function BillingPage() {
  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<(typeof plans)[0] | null>(null)

  const handleUpgrade = (plan: (typeof plans)[0]) => {
    setSelectedPlan(plan)
    setUpgradeDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground">구독 플랜과 결제 정보를 관리하세요</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/billing/invoices">
            <FileText className="mr-2 h-4 w-4" />
            View All Invoices
          </Link>
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
                Starter
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">월 요금</p>
                <p className="text-2xl font-bold">{formatCurrency(49)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">API 호출 한도</p>
                <p className="text-2xl font-bold">{formatNumber(50000)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Rate Limit</p>
                <p className="text-2xl font-bold">100/min</p>
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
                {formatNumber(currentUsage.limit - currentUsage.used)} calls 남음 ·{" "}
                {currentUsage.daysRemaining}일 후 갱신
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
              <p className="text-muted-foreground text-sm">다음 결제일</p>
              <p className="font-medium">2025년 2월 1일</p>
            </div>
            <Button onClick={() => handleUpgrade(plans[2])}>
              Upgrade to Pro
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
            {paymentMethods.map((method) => (
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
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/billing/payment-methods">Manage Payment Methods</Link>
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
            {plans.map((plan) => (
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
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/invoices" className="gap-1">
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
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
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setUpgradeDialogOpen(false)}>Confirm Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
