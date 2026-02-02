// Organization Types
export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl?: string
  billingEmail?: string
  techContactEmail?: string
  timezone: string
  plan: Plan
  planStartedAt?: string
  stripeCustomerId?: string
  createdAt: string
  updatedAt: string
}

export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE"

export interface PlanDetails {
  name: Plan
  displayName: string
  price: number
  apiCallLimit: number
  rateLimit: number
  apiKeysLimit: number
  teamMembersLimit: number
  features: string[]
}

// User Types
export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  authProvider: "email" | "google" | "github"
  emailVerified: boolean
  twoFactorEnabled: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: MemberRole
  invitedBy?: string
  invitedAt?: string
  acceptedAt?: string
  status: "PENDING" | "ACTIVE" | "SUSPENDED"
  user?: User
}

export type MemberRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | "BILLING"

// API Key Types
export interface ApiKey {
  id: string
  organizationId: string
  name: string
  description?: string
  publicKey: string
  environment: "test" | "live"
  permissions: ApiKeyPermissions
  ipWhitelist?: string[]
  rateLimitOverride?: number
  lastUsedAt?: string
  expiresAt?: string
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  createdBy: string
  createdAt: string
  revokedAt?: string
  revokedBy?: string
}

export interface ApiKeyPermissions {
  fullAccess?: boolean
  endpoints?: {
    match?: boolean
    personas?: boolean
    feedback?: boolean
    users?: boolean
  }
}

// Usage Types
export interface UsageStats {
  totalCalls: number
  successCalls: number
  failedCalls: number
  successRate: number
  avgResponseTime: number
  tokenUsage: {
    input: number
    output: number
  }
  cost: number
}

export interface UsageByEndpoint {
  endpoint: string
  calls: number
  successRate: number
  avgResponseTime: number
  cost: number
}

export interface UsageTimeSeries {
  timestamp: string
  calls: number
  successCalls: number
  failedCalls: number
}

// API Log Types
export interface ApiLog {
  id: string
  organizationId: string
  apiKeyId: string
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  requestSizeBytes: number
  responseSizeBytes: number
  tokensInput: number
  tokensOutput: number
  cost: number
  ipAddress: string
  userAgent: string
  requestId: string
  createdAt: string
  requestBody?: object
  responseBody?: object
}

// Billing Types
export interface Invoice {
  id: string
  organizationId: string
  invoiceNumber: string
  billingPeriodStart: string
  billingPeriodEnd: string
  subtotal: number
  tax: number
  total: number
  currency: string
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  stripeInvoiceId?: string
  lineItems: InvoiceLineItem[]
  paidAt?: string
  createdAt: string
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface PaymentMethod {
  id: string
  type: "card" | "bank_transfer" | "paypal"
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

// Webhook Types
export interface Webhook {
  id: string
  organizationId: string
  url: string
  description?: string
  secret: string
  events: WebhookEventType[]
  status: "ACTIVE" | "PAUSED" | "DISABLED"
  failureCount: number
  lastTriggeredAt?: string
  lastSuccessAt?: string
  lastFailureAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type WebhookEventType =
  | "usage.threshold.reached"
  | "usage.quota.exceeded"
  | "billing.payment.succeeded"
  | "billing.payment.failed"
  | "billing.plan.changed"
  | "system.maintenance.scheduled"
  | "system.incident.created"
  | "api.key.created"
  | "api.key.revoked"
  | "persona.activated"
  | "persona.deprecated"
  | "persona.updated"
  | "job.completed"
  | "job.failed"

export interface WebhookDelivery {
  id: string
  webhookId: string
  eventId: string
  eventType: WebhookEventType
  payload: object
  responseStatus?: number
  responseBody?: string
  responseTimeMs?: number
  attemptCount: number
  status: "PENDING" | "SUCCESS" | "FAILED" | "RETRYING"
  nextRetryAt?: string
  createdAt: string
  completedAt?: string
}

// Notification Types
export interface Notification {
  id: string
  type: "usage" | "error" | "security" | "billing" | "system"
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt: string
}

// Alert Settings
export interface AlertSettings {
  usageThresholds: number[]
  errorRateThreshold: number
  emailEnabled: boolean
  slackEnabled: boolean
  slackWebhookUrl?: string
  webhookEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}

// Dashboard Metrics
export interface DashboardMetrics {
  apiCalls: {
    today: number
    change: number
  }
  successRate: {
    value: number
    change: number
  }
  latency: {
    p95: number
    change: number
  }
  cost: {
    thisMonth: number
    percentUsed: number
  }
}

// Persona Types (for API reference)
export interface Persona {
  id: string
  name: string
  role: string
  tagline?: string
  description?: string
  avatarUrl?: string
  status: "DRAFT" | "ACTIVE" | "LEGACY" | "DEPRECATED" | "ARCHIVED"
  visibility: "PUBLIC" | "PRIVATE"
  specialty: string[]
  tags: string[]
  vector: PersonaVector
}

export interface PersonaVector {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

// Match Result
export interface MatchResult {
  personaId: string
  personaName: string
  score: number
  explanation?: string
}
