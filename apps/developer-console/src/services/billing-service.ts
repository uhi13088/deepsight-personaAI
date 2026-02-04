/**
 * Billing Service - 결제/구독 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type PlanId = "free" | "starter" | "pro" | "enterprise"
export type InvoiceStatus = "pending" | "paid" | "failed" | "refunded"

export interface Plan {
  id: PlanId
  name: string
  description: string
  price: number | null
  pricePerCall: number | null
  calls: number | null
  rateLimit: number | null
  features: { name: string; included: boolean }[]
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
// 서비스 클래스
// ============================================================================

class BillingService {
  async getBillingInfo(): Promise<BillingData> {
    const response = await apiClient.get<BillingData>("/billing")

    if (!response.success || !response.data) {
      // Return default data if API not implemented
      return {
        currentPlan: {
          id: "free",
          name: "Free",
          description: "개인 프로젝트와 테스트용",
          price: 0,
          pricePerCall: null,
          calls: 3000,
          rateLimit: 10,
          features: [],
          recommended: false,
          current: true,
        },
        usage: {
          used: 0,
          limit: 3000,
          percentUsed: 0,
          estimatedCost: 0,
          billingCycle: "",
          daysRemaining: 0,
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

    // Free 플랜은 결제 정보 없이 바로 변경
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
