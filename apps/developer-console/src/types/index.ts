// ============================================
// v3 Shared Types (re-export from @deepsight/shared-types)
// ============================================

export type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ThreeLayerVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
  ParadoxProfile,
  CrossAxisType,
  CrossAxisRelationship,
  DynamicsConfig,
} from "@deepsight/shared-types"

// ============================================
// Organization Types
// ============================================

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

export type Plan =
  | "FREE"
  | "STARTER"
  | "PRO"
  | "MAX"
  | "ENTERPRISE"
  | "ENT_STARTER"
  | "ENT_GROWTH"
  | "ENT_SCALE"

export interface PlanDetails {
  name: Plan
  displayName: string
  price: number // monthly USD, -1 = custom
  annualPrice?: number // annual USD (20% discount)
  apiCallLimit: number // monthly API calls, -1 = unlimited
  activePersonas: number // active PW personas, -1 = unlimited
  rateLimit: number // requests per minute
  apiKeysLimit: number
  teamMembersLimit: number
  sla?: string
  features: string[]
  matchingFeatures: string[]
  overage?: {
    matchApiPerCall: number
    personaPerUnit: number
  }
}

// ============================================
// User Types
// ============================================

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

// ============================================
// API Key Types
// ============================================

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
    filter?: boolean
    onboarding?: boolean
    consent?: boolean
  }
}

// ============================================
// Usage Types
// ============================================

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

// ============================================
// API Log Types
// ============================================

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

// ============================================
// Billing Types
// ============================================

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

// ============================================
// Webhook Types
// ============================================

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

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string
  type: "usage" | "error" | "security" | "billing" | "system"
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt: string
}

// ============================================
// Alert Settings
// ============================================

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

// ============================================
// Dashboard Metrics
// ============================================

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

// ============================================
// Persona Types (v3 3-Layer)
// ============================================

export type PersonaStatus =
  | "DRAFT"
  | "REVIEW"
  | "ACTIVE"
  | "STANDARD"
  | "LEGACY"
  | "DEPRECATED"
  | "PAUSED"
  | "ARCHIVED"

export type MatchingTier = "BASIC" | "ADVANCED" | "EXPLORATION"

export interface PersonaVectors {
  social: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
    sociability: number
  }
  temperament?: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
  narrative?: {
    lack: number
    moralCompass: number
    volatility: number
    growthArc: number
  }
}

export interface PersonaParadox {
  extendedScore: number
  l1l2Score: number
  l1l3Score: number
  l2l3Score: number
  archetype?: string
  description?: string
}

export interface Persona {
  id: string
  name: string
  role: string
  expertise: string[]
  tagline?: string
  description?: string
  avatarUrl?: string
  status: PersonaStatus
  category?: string
  vectors: PersonaVectors
  paradox?: PersonaParadox
  createdAt: string
  updatedAt: string
}

// ============================================
// Match Result Types (v3)
// ============================================

export interface MatchScores {
  similarity: number
  paradoxCompatibility?: number
  contextRelevance?: number
}

export interface MatchResult {
  personaId: string
  personaName: string
  overallScore: number
  matchingTier: MatchingTier
  scores: MatchScores
  persona?: Persona
}

// ============================================
// User Profile & Consent Types (v3)
// ============================================

export type OnboardingLevel = "QUICK" | "STANDARD" | "DEEP"
export type ProfileQualityLevel = "BASIC" | "STANDARD" | "ADVANCED" | "PREMIUM"
export type ConsentType = "DATA_COLLECTION" | "SNS_ANALYSIS" | "THIRD_PARTY_SHARING" | "MARKETING"

export interface UserProfile {
  userId: string
  vectors: PersonaVectors
  crossAxes?: CrossAxisInfo[]
  consent: UserConsentStatus
  profileQuality: {
    level: ProfileQualityLevel
    completeness: number
    lastUpdated: string
  }
}

export interface CrossAxisInfo {
  axisId: string
  type: "L1xL2" | "L1xL3" | "L2xL3" | "L1xL2xL3"
  relationship: "paradox" | "reinforcing" | "modulating" | "neutral"
  score: number
}

export interface UserConsentItem {
  type: ConsentType
  granted: boolean
  grantedAt?: string
  revokedAt?: string
  version: string
}

export interface UserConsentStatus {
  consents: UserConsentItem[]
  allRequired: boolean
  lastUpdated: string
}

// ============================================
// Legacy 6D Vector (backward compat — shared-types re-export)
// ============================================

export type { PersonaVector } from "@deepsight/shared-types"
