/**
 * DeepSight SDK for JavaScript/TypeScript
 * @module @deepsight/sdk
 */

import type { PersonaVector } from "@deepsight/shared-types"

// ============================================
// Types
// ============================================

export interface DeepSightConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
}

export interface MatchOptions {
  limit?: number
  threshold?: number
  includeScores?: boolean
}

export interface MatchDimensions {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

export interface MatchItem {
  personaId: string
  name: string
  category: string
  score: number
  dimensions?: MatchDimensions
}

export interface MatchResponse {
  success: boolean
  requestId: string
  data: {
    matches: MatchItem[]
    contentVector?: PersonaVector
  }
  meta: {
    contentLength: number
    matchesFound: number
    thresholdApplied: number
    processingTimeMs: number
  }
}

export interface BatchMatchOptions {
  limit?: number
  threshold?: number
}

export interface BatchMatchItem {
  content: string
  matches: MatchItem[]
}

export interface BatchMatchResponse {
  success: boolean
  requestId: string
  data: {
    results: BatchMatchItem[]
  }
  meta: {
    totalContents: number
    processingTimeMs: number
  }
}

export interface PersonaListOptions {
  page?: number
  limit?: number
  category?: string
  active?: boolean
}

export interface PersonaItem {
  id: string
  name: string
  category: string
  description?: string
  active: boolean
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

export interface PersonaListResponse {
  success: boolean
  data: {
    personas: PersonaItem[]
  }
  meta: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

export interface PersonaGetResponse {
  success: boolean
  data: {
    persona: PersonaItem
  }
}

export interface FeedbackData {
  matchId?: string
  requestId?: string
  personaId: string
  feedback: "positive" | "negative" | "neutral"
  comment?: string
}

export interface FeedbackResponse {
  success: boolean
  feedbackId: string
  message: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
  requestId?: string
}

// ============================================
// SDK Error Class
// ============================================

export class DeepSightError extends Error {
  public readonly code: string
  public readonly requestId?: string

  constructor(code: string, message: string, requestId?: string) {
    super(message)
    this.name = "DeepSightError"
    this.code = code
    this.requestId = requestId
  }
}

// ============================================
// Main SDK Class
// ============================================

export class DeepSight {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number

  public readonly personas: PersonasClient
  public readonly feedback: FeedbackClient

  constructor(apiKey: string, config?: Partial<DeepSightConfig>) {
    if (!apiKey) {
      throw new DeepSightError("INVALID_CONFIG", "API key is required")
    }

    this.apiKey = apiKey
    this.baseUrl = config?.baseUrl || "https://api.deepsight.ai"
    this.timeout = config?.timeout || 30000

    // Initialize sub-clients
    this.personas = new PersonasClient(this)
    this.feedback = new FeedbackClient(this)
  }

  /**
   * Internal method to make API requests
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok || data.success === false) {
        throw new DeepSightError(
          data.error?.code || "REQUEST_FAILED",
          data.error?.message || `Request failed with status ${response.status}`,
          data.requestId
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof DeepSightError) {
        throw error
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new DeepSightError("TIMEOUT", "Request timed out")
      }
      throw new DeepSightError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network request failed"
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Match content to personas
   *
   * @example
   * ```typescript
   * const result = await client.match({
   *   content: "Your content here",
   *   options: { limit: 5, threshold: 0.7 }
   * });
   * console.log(result.matches);
   * ```
   */
  async match(params: { content: string; options?: MatchOptions }): Promise<MatchResponse> {
    return this.request<MatchResponse>("POST", "/v1/match", params)
  }

  /**
   * Batch match multiple contents
   *
   * @example
   * ```typescript
   * const result = await client.batchMatch({
   *   contents: ["Content 1", "Content 2"],
   *   options: { limit: 3 }
   * });
   * ```
   */
  async batchMatch(params: {
    contents: string[]
    options?: BatchMatchOptions
  }): Promise<BatchMatchResponse> {
    return this.request<BatchMatchResponse>("POST", "/v1/batch-match", params)
  }
}

// ============================================
// Personas Sub-Client
// ============================================

class PersonasClient {
  constructor(private readonly client: DeepSight) {}

  /**
   * List all personas
   *
   * @example
   * ```typescript
   * const result = await client.personas.list({ limit: 10 });
   * console.log(result.data.personas);
   * ```
   */
  async list(options?: PersonaListOptions): Promise<PersonaListResponse> {
    const params = new URLSearchParams()
    if (options?.page) params.set("page", String(options.page))
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.category) params.set("category", options.category)
    if (options?.active !== undefined) params.set("active", String(options.active))

    const query = params.toString()
    return this.client.request<PersonaListResponse>(
      "GET",
      `/v1/personas${query ? `?${query}` : ""}`
    )
  }

  /**
   * Get a single persona by ID
   *
   * @example
   * ```typescript
   * const result = await client.personas.get("persona_123");
   * console.log(result.data.persona);
   * ```
   */
  async get(id: string): Promise<PersonaGetResponse> {
    return this.client.request<PersonaGetResponse>("GET", `/v1/personas/${id}`)
  }
}

// ============================================
// Feedback Sub-Client
// ============================================

class FeedbackClient {
  constructor(private readonly client: DeepSight) {}

  /**
   * Submit feedback for a match result
   *
   * @example
   * ```typescript
   * const result = await client.feedback.submit({
   *   requestId: "req_abc123",
   *   personaId: "persona_xyz",
   *   feedback: "positive",
   *   comment: "Great match!"
   * });
   * ```
   */
  async submit(data: FeedbackData): Promise<FeedbackResponse> {
    return this.client.request<FeedbackResponse>("POST", "/v1/feedback", data)
  }
}

// ============================================
// Default Export
// ============================================

export default DeepSight
