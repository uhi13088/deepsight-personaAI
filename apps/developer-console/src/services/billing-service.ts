/**
 * Billing Service - 결제/구독 관리 서비스
 * v3.1 6-Tier 플랜 체계 (스펙 §8.1.1)
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type PlanId = "starter" | "pro" | "max" | "ent_starter" | "ent_growth" | "ent_scale"

export type InvoiceStatus = "pending" | "paid" | "failed" | "refunded"
export type BillingCycle = "monthly" | "annual"

export interface PlanLimits {
  activePersonas: number // -1 = unlimited
  matchingApiCalls: number // monthly, -1 = unlimited
  rateLimit: number // per minute, -1 = negotiable
  apiKeys: number // -1 = unlimited
  teamMembers: number // -1 = unlimited
  sla: string
}

export interface PlanOverage {
  matchApiPerCall: number // $ per call
  personaPerUnit: number // $ per persona per month
}

export interface Plan {
  id: PlanId
  name: string
  description: string
  price: number // monthly USD
  annualPrice: number // annual monthly USD (20% off)
  limits: PlanLimits
  overage: PlanOverage
  support: string
  features: string[]
  isEnterprise: boolean
  recommended: boolean
  current: boolean
}

export interface CurrentUsage {
  used: number
  limit: number
  percentUsed: number
  estimatedCost: number
  billingCycle: string
  daysRemaining: number
  activePersonas: number
  activePersonasLimit: number
}

export interface Invoice {
  id: string
  date: string
  amount: number
  status: InvoiceStatus
  description: string
  pdfUrl?: string
}

export interface PaymentMethod {
  id: string
  type: string
  brand: string
  last4: string
  expiry: string
  isDefault: boolean
}

export interface BillingData {
  currentPlan: Plan
  billingCycle: BillingCycle
  usage: CurrentUsage
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
}

export interface CreatePaymentMethodInput {
  type: "card"
  token: string
}

export interface TossPaymentInfo {
  clientKey: string
  orderId: string
  orderName: string
  amount: number
  customerName: string
  successUrl: string
  failUrl: string
}

// ============================================================================
// 6-Tier 플랜 상수 (스펙 §8.1.1~§8.1.5 정확히 반영)
// ============================================================================

export const PLAN_DATA: Record<PlanId, Omit<Plan, "current">> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "스타트업과 소규모 팀용",
    price: 199,
    annualPrice: 159,
    limits: {
      activePersonas: 50,
      matchingApiCalls: 500_000,
      rateLimit: 100,
      apiKeys: 5,
      teamMembers: 3,
      sla: "99.5%",
    },
    overage: { matchApiPerCall: 0.001, personaPerUnit: 2.5 },
    support: "셀프서비스",
    features: [
      "활성 PW 페르소나 50개",
      "매칭 API 50만/월",
      "Rate Limit 100/분",
      "API Keys 5개",
      "팀원 3명",
      "Webhook 연동",
      "셀프서비스 지원",
    ],
    isEnterprise: false,
    recommended: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "성장하는 비즈니스용",
    price: 499,
    annualPrice: 399,
    limits: {
      activePersonas: 100,
      matchingApiCalls: 1_000_000,
      rateLimit: 500,
      apiKeys: 10,
      teamMembers: 5,
      sla: "99.5%",
    },
    overage: { matchApiPerCall: 0.001, personaPerUnit: 2.5 },
    support: "셀프서비스",
    features: [
      "활성 PW 페르소나 100개",
      "매칭 API 100만/월",
      "Rate Limit 500/분",
      "API Keys 10개",
      "팀원 5명",
      "Webhook 연동",
      "셀프서비스 지원",
    ],
    isEnterprise: false,
    recommended: false,
  },
  max: {
    id: "max",
    name: "Max",
    description: "대규모 프로젝트용",
    price: 1499,
    annualPrice: 1199,
    limits: {
      activePersonas: 350,
      matchingApiCalls: 3_000_000,
      rateLimit: 1000,
      apiKeys: 20,
      teamMembers: 10,
      sla: "99.9%",
    },
    overage: { matchApiPerCall: 0.0008, personaPerUnit: 2.0 },
    support: "우선 이메일",
    features: [
      "활성 PW 페르소나 350개",
      "매칭 API 300만/월",
      "Rate Limit 1,000/분",
      "API Keys 20개",
      "팀원 10명",
      "Webhook 연동",
      "우선 이메일 지원",
      "SLA 99.9%",
    ],
    isEnterprise: false,
    recommended: false,
  },
  ent_starter: {
    id: "ent_starter",
    name: "Enterprise Starter",
    description: "Enterprise 진입용",
    price: 3500,
    annualPrice: 3500,
    limits: {
      activePersonas: 800,
      matchingApiCalls: 5_000_000,
      rateLimit: 1000,
      apiKeys: 50,
      teamMembers: 30,
      sla: "99.9%",
    },
    overage: { matchApiPerCall: 0.0006, personaPerUnit: 2.0 },
    support: "프리미엄 이메일 + 온보딩",
    features: [
      "활성 PW 페르소나 800개",
      "매칭 API 500만/월",
      "Rate Limit 1,000/분",
      "API Keys 50개",
      "팀원 30명",
      "SSO (SAML 2.0, OIDC)",
      "IP 화이트리스트",
      "페르소나 필터 API",
      "프리미엄 이메일 + 온보딩",
      "SLA 99.9%",
    ],
    isEnterprise: true,
    recommended: false,
  },
  ent_growth: {
    id: "ent_growth",
    name: "Enterprise Growth",
    description: "Enterprise 성장기",
    price: 5000,
    annualPrice: 5000,
    limits: {
      activePersonas: 1500,
      matchingApiCalls: 10_000_000,
      rateLimit: 5000,
      apiKeys: -1,
      teamMembers: -1,
      sla: "99.95%",
    },
    overage: { matchApiPerCall: 0.0004, personaPerUnit: 1.5 },
    support: "전담 매니저 (1:5)",
    features: [
      "활성 PW 페르소나 1,500개",
      "매칭 API 1,000만/월",
      "Rate Limit 5,000/분",
      "API Keys 무제한",
      "팀원 무제한",
      "SSO (SAML 2.0, OIDC)",
      "IP 화이트리스트",
      "페르소나 필터 API",
      "전담 매니저 (1:5)",
      "SLA 99.95%",
    ],
    isEnterprise: true,
    recommended: false,
  },
  ent_scale: {
    id: "ent_scale",
    name: "Enterprise Scale",
    description: "최대 규모 Enterprise",
    price: 15000,
    annualPrice: 15000,
    limits: {
      activePersonas: 5000,
      matchingApiCalls: 15_000_000,
      rateLimit: -1,
      apiKeys: -1,
      teamMembers: -1,
      sla: "99.99%",
    },
    overage: { matchApiPerCall: 0, personaPerUnit: 1.5 },
    support: "전담 매니저 (1:2)",
    features: [
      "활성 PW 페르소나 5,000개 + 추가과금",
      "매칭 API 1,500만/월",
      "Rate Limit 협의",
      "API Keys 무제한",
      "팀원 무제한",
      "SSO (SAML 2.0, OIDC)",
      "IP 화이트리스트",
      "페르소나 필터 API",
      "전담 매니저 (1:2)",
      "SLA 99.99%",
      "온프레미스 협의",
    ],
    isEnterprise: true,
    recommended: false,
  },
}

export const GENERAL_PLANS: PlanId[] = ["starter", "pro", "max"]
export const ENTERPRISE_PLANS: PlanId[] = ["ent_starter", "ent_growth", "ent_scale"]

// ============================================================================
// 서비스 클래스
// ============================================================================

class BillingService {
  async getBillingInfo(): Promise<BillingData> {
    const response = await apiClient.get<BillingData>("/billing")

    if (!response.success || !response.data) {
      return {
        currentPlan: { ...PLAN_DATA.starter, current: true },
        billingCycle: "monthly",
        usage: {
          used: 0,
          limit: 500_000,
          percentUsed: 0,
          estimatedCost: 0,
          billingCycle: "",
          daysRemaining: 0,
          activePersonas: 0,
          activePersonasLimit: 50,
        },
        invoices: [],
        paymentMethods: [],
      }
    }

    return response.data
  }

  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<{ plans: Plan[] }>("/billing/plans")

    if (!response.success || !response.data) {
      return []
    }

    return response.data.plans
  }

  async upgradePlan(planId: PlanId): Promise<TossPaymentInfo | null> {
    const response = await apiClient.post<{ paymentInfo?: TossPaymentInfo; planId: string }>(
      "/billing/upgrade",
      { planId }
    )

    if (!response.success) {
      throw new ApiError({
        code: "PLAN_UPGRADE_FAILED",
        message: "플랜 업그레이드에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.data?.paymentInfo) {
      return null
    }

    return response.data.paymentInfo
  }

  async downgradePlan(planId: PlanId): Promise<void> {
    const response = await apiClient.post("/billing/downgrade", { planId })

    if (!response.success) {
      throw new ApiError({
        code: "PLAN_DOWNGRADE_FAILED",
        message: "플랜 다운그레이드에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async cancelSubscription(): Promise<void> {
    const response = await apiClient.post("/billing/cancel")

    if (!response.success) {
      throw new ApiError({
        code: "SUBSCRIPTION_CANCEL_FAILED",
        message: "구독 취소에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async getInvoices(): Promise<Invoice[]> {
    const response = await apiClient.get<{ invoices: Invoice[] }>("/billing/invoices")

    if (!response.success || !response.data) {
      return []
    }

    return response.data.invoices
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await fetch(`/api/billing/invoices/${invoiceId}/download`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new ApiError({
        code: "INVOICE_DOWNLOAD_FAILED",
        message: "청구서 다운로드에 실패했습니다.",
        status: response.status,
        timestamp: new Date().toISOString(),
      })
    }

    return response.blob()
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<{ paymentMethods: PaymentMethod[] }>(
      "/billing/payment-methods"
    )

    if (!response.success || !response.data) {
      return []
    }

    return response.data.paymentMethods
  }

  async addPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const response = await apiClient.post<{ paymentMethod: PaymentMethod }>(
      "/billing/payment-methods",
      input
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PAYMENT_METHOD_ADD_FAILED",
        message: "결제 수단 추가에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.paymentMethod
  }

  async setDefaultPaymentMethod(methodId: string): Promise<void> {
    const response = await apiClient.patch(`/billing/payment-methods/${methodId}/default`)

    if (!response.success) {
      throw new ApiError({
        code: "DEFAULT_PAYMENT_SET_FAILED",
        message: "기본 결제 수단 설정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async removePaymentMethod(methodId: string): Promise<void> {
    const response = await apiClient.delete(`/billing/payment-methods/${methodId}`)

    if (!response.success) {
      throw new ApiError({
        code: "PAYMENT_METHOD_REMOVE_FAILED",
        message: "결제 수단 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const billingService = new BillingService()
export default billingService
