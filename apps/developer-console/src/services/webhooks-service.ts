/**
 * Webhooks Service - 웹훅 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type WebhookStatus = "active" | "disabled"

export interface WebhookStats {
  totalDeliveries: number
  successRate: number
  avgLatency: number
}

export interface WebhookLastDelivery {
  timestamp: string
  status: string
  statusCode: number
  latency: number
}

export interface Webhook {
  id: string
  url: string
  description: string
  status: WebhookStatus
  events: string[]
  secret: string
  createdAt: string
  lastDelivery: WebhookLastDelivery
  stats: WebhookStats
}

export interface DeliveryLog {
  id: string
  webhookId: string
  event: string
  status: string
  statusCode: number
  latency: number
  timestamp: string
  requestId: string
}

export interface CreateWebhookInput {
  url: string
  description?: string
  events: string[]
}

export interface UpdateWebhookInput {
  url?: string
  description?: string
  events?: string[]
  status?: WebhookStatus
}

export interface WebhooksData {
  webhooks: Webhook[]
  deliveryLogs: DeliveryLog[]
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class WebhooksService {
  async getWebhooks(): Promise<WebhooksData> {
    const response = await apiClient.get<WebhooksData>("/webhooks")

    if (!response.success || !response.data) {
      // Return empty data if API not implemented
      return {
        webhooks: [],
        deliveryLogs: [],
      }
    }

    return response.data
  }

  async getWebhook(id: string): Promise<Webhook> {
    const response = await apiClient.get<{ webhook: Webhook }>(`/webhooks/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "WEBHOOK_NOT_FOUND",
        message: "웹훅을 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.webhook
  }

  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    const response = await apiClient.post<{ webhook: Webhook }>("/webhooks", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "WEBHOOK_CREATE_FAILED",
        message: "웹훅 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.webhook
  }

  async updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    const response = await apiClient.patch<{ webhook: Webhook }>(`/webhooks/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "WEBHOOK_UPDATE_FAILED",
        message: "웹훅 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.webhook
  }

  async deleteWebhook(id: string): Promise<void> {
    const response = await apiClient.delete(`/webhooks/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "WEBHOOK_DELETE_FAILED",
        message: "웹훅 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async testWebhook(
    id: string
  ): Promise<{ success: boolean; statusCode: number; latency: number; response?: string }> {
    const apiResponse = await apiClient.post<{
      success: boolean
      statusCode: number
      latency: number
      response?: string
    }>(`/webhooks/${id}/test`)

    if (!apiResponse.success || !apiResponse.data) {
      throw new ApiError({
        code: "WEBHOOK_TEST_FAILED",
        message: "웹훅 테스트에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return apiResponse.data
  }

  async getDeliveryLogs(webhookId?: string): Promise<DeliveryLog[]> {
    const params = webhookId ? { webhookId } : undefined
    const response = await apiClient.get<{ logs: DeliveryLog[] }>("/webhooks/deliveries", params)

    if (!response.success || !response.data) {
      return []
    }

    return response.data.logs
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const webhooksService = new WebhooksService()
export default webhooksService
