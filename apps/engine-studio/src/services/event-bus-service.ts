/**
 * Event Bus Service - 이벤트 버스 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type EventStatus = "success" | "failed" | "pending" | "processing"
export type EventPriority = "low" | "normal" | "high" | "critical"
export type ChannelStatus = "active" | "paused" | "error"

export interface Event {
  id: string
  type: string
  source: string
  target: string
  payload: Record<string, unknown>
  status: EventStatus
  priority: EventPriority
  timestamp: string
  processingTime?: number
  error?: string
  retryCount: number
}

export interface EventChannel {
  id: string
  name: string
  description: string
  source: string
  target: string
  eventTypes: string[]
  status: ChannelStatus
  messagesPerSecond: number
  totalMessages: number
  errorRate: number
}

export interface DeadLetterEvent {
  id: string
  originalEventId: string
  eventType: string
  error: string
  failedAt: string
  retries: number
  payload: Record<string, unknown>
}

export interface EventBusData {
  events: Event[]
  channels: EventChannel[]
  deadLetters: DeadLetterEvent[]
  stats: {
    total: number
    success: number
    failed: number
    processing: number
    avgProcessingTime: number
  }
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class EventBusService {
  async getEventBusData(): Promise<EventBusData> {
    const response = await apiClient.get<EventBusData>("/api/event-bus")

    if (!response.success || !response.data) {
      return {
        events: [],
        channels: [],
        deadLetters: [],
        stats: {
          total: 0,
          success: 0,
          failed: 0,
          processing: 0,
          avgProcessingTime: 0,
        },
      }
    }

    return response.data
  }

  async getEvents(filters?: {
    status?: EventStatus
    type?: string
    limit?: number
  }): Promise<Event[]> {
    const response = await apiClient.get<{ events: Event[] }>("/api/event-bus/events", filters)

    if (!response.success || !response.data) {
      return []
    }

    return response.data.events
  }

  async getChannels(): Promise<EventChannel[]> {
    const response = await apiClient.get<{ channels: EventChannel[] }>("/api/event-bus/channels")

    if (!response.success || !response.data) {
      return []
    }

    return response.data.channels
  }

  async pauseChannel(channelId: string): Promise<void> {
    const response = await apiClient.post(`/api/event-bus/channels/${channelId}/pause`)

    if (!response.success) {
      throw new ApiError({
        code: "CHANNEL_PAUSE_FAILED",
        message: "채널 일시중지에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async resumeChannel(channelId: string): Promise<void> {
    const response = await apiClient.post(`/api/event-bus/channels/${channelId}/resume`)

    if (!response.success) {
      throw new ApiError({
        code: "CHANNEL_RESUME_FAILED",
        message: "채널 재개에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async getDeadLetters(): Promise<DeadLetterEvent[]> {
    const response = await apiClient.get<{ deadLetters: DeadLetterEvent[] }>(
      "/api/event-bus/dead-letters"
    )

    if (!response.success || !response.data) {
      return []
    }

    return response.data.deadLetters
  }

  async retryDeadLetter(deadLetterId: string): Promise<void> {
    const response = await apiClient.post(`/api/event-bus/dead-letters/${deadLetterId}/retry`)

    if (!response.success) {
      throw new ApiError({
        code: "DEAD_LETTER_RETRY_FAILED",
        message: "이벤트 재시도에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async retryAllDeadLetters(): Promise<{ retried: number; failed: number }> {
    const response = await apiClient.post<{ retried: number; failed: number }>(
      "/api/event-bus/dead-letters/retry-all"
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DEAD_LETTER_RETRY_ALL_FAILED",
        message: "모든 이벤트 재시도에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async deleteDeadLetter(deadLetterId: string): Promise<void> {
    const response = await apiClient.delete(`/api/event-bus/dead-letters/${deadLetterId}`)

    if (!response.success) {
      throw new ApiError({
        code: "DEAD_LETTER_DELETE_FAILED",
        message: "이벤트 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async deleteAllDeadLetters(): Promise<void> {
    const response = await apiClient.delete("/api/event-bus/dead-letters")

    if (!response.success) {
      throw new ApiError({
        code: "DEAD_LETTER_DELETE_ALL_FAILED",
        message: "모든 이벤트 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async retryEvent(eventId: string): Promise<void> {
    const response = await apiClient.post(`/api/event-bus/events/${eventId}/retry`)

    if (!response.success) {
      throw new ApiError({
        code: "EVENT_RETRY_FAILED",
        message: "이벤트 재시도에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const eventBusService = new EventBusService()
export default eventBusService
