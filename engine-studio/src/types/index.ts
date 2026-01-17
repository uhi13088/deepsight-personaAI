// ============================================
// 공통 타입
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    requestId: string
    timestamp: string
    pagination?: PaginationMeta
  }
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalCount: number
  perPage: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// ============================================
// 6D Vector 시스템
// ============================================

export interface Vector6D {
  depth: number    // 0.0~1.0: 직관적 ↔ 심층적
  lens: number     // 0.0~1.0: 감성적 ↔ 논리적
  stance: number   // 0.0~1.0: 수용적 ↔ 비판적
  scope: number    // 0.0~1.0: 핵심만 ↔ 디테일
  taste: number    // 0.0~1.0: 클래식 ↔ 실험적
  purpose: number  // 0.0~1.0: 오락 ↔ 의미추구
}

export interface VectorWithConfidence extends Vector6D {
  confidenceScores: Vector6D
}

export type VectorDimension = keyof Vector6D

// ============================================
// 사용자 관련
// ============================================

export type UserRole = "ADMIN" | "AI_ENGINEER" | "CONTENT_MANAGER" | "ANALYST"

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UserSession {
  user: User
  expires: string
}

// ============================================
// 페르소나 관련
// ============================================

export type PersonaVisibility = "GLOBAL" | "PRIVATE" | "SHARED"
export type PersonaRole = "REVIEWER" | "CURATOR" | "EDUCATOR" | "COMPANION" | "ANALYST"
export type PersonaStatus =
  | "DRAFT"
  | "REVIEW"
  | "ACTIVE"
  | "STANDARD"
  | "LEGACY"
  | "DEPRECATED"
  | "PAUSED"
  | "ARCHIVED"
export type PersonaSource = "MANUAL" | "INCUBATOR" | "MUTATION"

export interface Persona {
  id: string
  organizationId: string | null
  visibility: PersonaVisibility
  sharedWithOrgs: string[]

  name: string
  role: PersonaRole
  expertise: string[]
  description: string | null
  profileImageUrl: string | null

  promptTemplate: string
  promptVersion: string

  status: PersonaStatus
  qualityScore: number | null
  validationScore: number | null
  validationVersion: number | null
  lastValidationDate: Date | null

  source: PersonaSource
  parentPersonaId: string | null

  createdById: string
  createdAt: Date
  updatedAt: Date
  activatedAt: Date | null
  archivedAt: Date | null

  // Relations (optional)
  vectors?: PersonaVector[]
  createdBy?: User
}

export interface PersonaVector {
  id: string
  personaId: string
  version: number
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
  createdAt: Date
}

export interface PersonaCreateInput {
  name: string
  role: PersonaRole
  expertise?: string[]
  description?: string
  profileImageUrl?: string
  vector: Vector6D
  promptTemplate: string
}

export interface PersonaUpdateInput extends Partial<PersonaCreateInput> {
  status?: PersonaStatus
}

export interface PersonaFilters {
  status?: PersonaStatus | PersonaStatus[]
  role?: PersonaRole | PersonaRole[]
  search?: string
  source?: PersonaSource
  sortBy?: "name" | "createdAt" | "qualityScore" | "status"
  sortOrder?: "asc" | "desc"
}

// ============================================
// 매칭 관련
// ============================================

export type AlgorithmType = "COSINE" | "WEIGHTED" | "CONTEXT" | "HYBRID"
export type AlgorithmStatus = "DRAFT" | "TESTING" | "ACTIVE" | "DEPRECATED"

export interface MatchingAlgorithm {
  id: string
  name: string
  version: string
  algorithmType: AlgorithmType
  parameters: AlgorithmParameters | null
  weights: Vector6D | null
  contextRules: ContextRule[] | null
  status: AlgorithmStatus
  deployedEnv: string[]
  performanceMetrics: PerformanceMetrics | null
  createdAt: Date
  updatedAt: Date
}

export interface AlgorithmParameters {
  similarityThreshold: number  // 최소 매칭 점수 (0~100)
  topN: number                 // 추천 페르소나 수 (1~20)
  diversityFactor: number      // 추천 다양성 (0~1)
  feedbackLearningRate: number // 피드백 반영 속도 (0.01~0.5)
  latentTraitWeight: number    // 잠재 성향 가중치 (0~1)
  contextSensitivity: number   // 컨텍스트 민감도 (0~1)
}

export interface ContextRule {
  condition: {
    field: string
    operator: "eq" | "neq" | "gt" | "lt" | "in" | "contains"
    value: unknown
  }
  action: {
    type: "weight" | "boost" | "filter"
    dimension?: VectorDimension
    value: number
  }
}

export interface PerformanceMetrics {
  matchingAccuracy: number
  ctr: number
  nps: number
  avgScore: number
  responseTimeP95: number
}

export interface MatchingResult {
  personaId: string
  personaName: string
  score: number
  rank: number
  explanation?: MatchExplanation
}

export interface MatchExplanation {
  dimensionScores: Record<VectorDimension, number>
  contextBonus: number
  totalScore: number
  reasoning: string
}

export interface SimulationInput {
  userVector: Vector6D
  personaPool?: string[]
  algorithm: AlgorithmType
  context?: MatchingContext
}

export interface MatchingContext {
  timeOfDay?: "morning" | "afternoon" | "evening" | "night"
  device?: "pc" | "mobile" | "tablet"
  category?: string
  custom?: Record<string, unknown>
}

// ============================================
// A/B 테스트 관련
// ============================================

export type ABTestType = "ALGORITHM" | "PERSONA" | "PARAMETER" | "WEIGHT" | "DIMENSION"
export type ABTestStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED"

export interface ABTest {
  id: string
  name: string
  description: string | null
  testType: ABTestType
  status: ABTestStatus
  controlConfig: Record<string, unknown>
  controlAlgorithmId: string | null
  testConfig: Record<string, unknown>
  testAlgorithmId: string | null
  trafficSplit: number
  startDate: Date | null
  endDate: Date | null
  results: ABTestResults | null
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface ABTestResults {
  control: {
    sampleSize: number
    matchingAccuracy: number
    ctr: number
    satisfaction: number
  }
  test: {
    sampleSize: number
    matchingAccuracy: number
    ctr: number
    satisfaction: number
  }
  pValue: number
  confidence: number
  winner: "control" | "test" | "tie"
}

export interface ABTestCreateInput {
  name: string
  description?: string
  testType: ABTestType
  controlConfig: Record<string, unknown>
  controlAlgorithmId?: string
  testConfig: Record<string, unknown>
  testAlgorithmId?: string
  trafficSplit?: number
  startDate?: Date
  endDate?: Date
}

// ============================================
// User Insight 관련
// ============================================

export type OnboardingLevel = "LIGHT" | "MEDIUM" | "DEEP"
export type QuestionType = "SLIDER" | "MULTIPLE_CHOICE" | "RANKING" | "TEXT" | "IMAGE"

export interface PsychProfileTemplate {
  id: string
  name: string
  onboardingLevel: OnboardingLevel
  questionOrder: number
  questionText: string
  questionType: QuestionType
  options: QuestionOption[] | null
  targetDimensions: VectorDimension[]
  weightFormula: Record<string, unknown> | null
  isRequired: boolean
  createdAt: Date
  updatedAt: Date
}

export interface QuestionOption {
  id: string
  label: string
  value: string | number
  weights?: Partial<Vector6D>
}

export interface Archetype {
  id: string
  name: string
  description: string | null
  vectorRanges: {
    [K in VectorDimension]: { min: number; max: number }
  }
  recommendedPersonaIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface UserVector {
  id: string
  userId: string
  onboardingLevel: OnboardingLevel
  vector: Vector6D
  archetype: string | null
  confidenceScores: Vector6D | null
  updatedAt: Date
}

// ============================================
// 인큐베이터 관련
// ============================================

export type IncubatorStatus = "PENDING" | "PASSED" | "FAILED" | "APPROVED" | "REJECTED"

export interface IncubatorLog {
  id: string
  batchId: string
  batchDate: Date
  personaConfig: Record<string, unknown> | null
  generatedVector: Vector6D | null
  generatedPrompt: string | null
  testSampleIds: string[]
  testResults: IncubatorTestResult | null
  consistencyScore: number | null
  vectorAlignmentScore: number | null
  toneMatchScore: number | null
  reasoningQualityScore: number | null
  status: IncubatorStatus
  createdAt: Date
}

export interface IncubatorTestResult {
  sampleResults: {
    sampleId: string
    response: string
    scores: {
      consistency: number
      vectorAlignment: number
      toneMatch: number
      reasoningQuality: number
    }
  }[]
  averageScores: {
    consistency: number
    vectorAlignment: number
    toneMatch: number
    reasoningQuality: number
  }
  passed: boolean
}

export interface IncubatorSettings {
  enabled: boolean
  batchTime: string  // "03:00"
  generateCount: number
  autoApproveThreshold: number
}

// ============================================
// 골든 샘플 관련
// ============================================

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD"

export interface GoldenSample {
  id: string
  contentTitle: string
  contentType: string | null
  genre: string | null
  description: string | null
  testQuestion: string
  expectedReactions: ExpectedReaction[] | null
  difficultyLevel: DifficultyLevel
  validationDimensions: VectorDimension[]
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ExpectedReaction {
  vectorProfile: Partial<Vector6D>
  expectedResponse: string
  keywords: string[]
}

// ============================================
// 시스템 관련
// ============================================

export type DeploymentTarget = "PERSONA" | "ALGORITHM" | "CONFIG"
export type DeploymentEnv = "DEV" | "STG" | "PROD"
export type DeploymentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "ROLLED_BACK"

export interface Deployment {
  id: string
  targetType: DeploymentTarget
  targetId: string
  environment: DeploymentEnv
  status: DeploymentStatus
  version: string | null
  notes: string | null
  deployedById: string
  createdAt: Date
  completedAt: Date | null
}

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type IncidentStatus = "REPORTED" | "INVESTIGATING" | "IDENTIFIED" | "FIXING" | "RESOLVED" | "CLOSED"

export interface Incident {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  affectedSystems: string[]
  resolution: string | null
  reportedById: string
  createdAt: Date
  resolvedAt: Date | null
  updatedAt: Date
  timeline?: IncidentTimeline[]
}

export interface IncidentTimeline {
  id: string
  incidentId: string
  action: string
  description: string
  performedById: string
  createdAt: Date
}

export interface SystemConfig {
  id: string
  category: "MODEL" | "SAFETY" | "API"
  key: string
  value: Record<string, unknown>
  description: string | null
  updatedAt: Date
}

export type FilterType = "PROFANITY" | "HATE_SPEECH" | "POLITICAL" | "RELIGIOUS" | "CUSTOM"

export interface SafetyFilter {
  id: string
  name: string
  filterType: FilterType
  pattern: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user?: User
}

export interface SystemMetric {
  id: string
  metricType: string
  value: number
  unit: string
  tags: Record<string, string> | null
  recordedAt: Date
}

export type BackupType = "FULL" | "INCREMENTAL" | "DIFFERENTIAL"
export type BackupStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED"

export interface BackupRecord {
  id: string
  backupType: BackupType
  status: BackupStatus
  size: number | null
  location: string | null
  notes: string | null
  startedAt: Date
  completedAt: Date | null
}

// ============================================
// 리뷰 스타일 관련
// ============================================

export interface ReviewStyle {
  id: string
  name: string
  description: string | null
  depthLevel: string
  lensLevel: string
  stanceLevel: string
  scopeLevel: string
  tasteLevel: string
  systemPrompt: string
  createdAt: Date
}

export interface StyleContentReview {
  id: string
  styleId: string
  contentId: string
  contentType: string | null
  rating: number | null
  reviewText: string
  reviewSummary: string | null
  keywords: string[]
  generationTrigger: string | null
  generatedAt: Date
}

// ============================================
// 대시보드 관련
// ============================================

export interface DashboardStats {
  totalPersonas: number
  activePersonas: number
  totalMatches: number
  todayMatches: number
  matchingAccuracy: number
  avgMatchScore: number
  ctr: number
  nps: number
}

export interface TrendData {
  date: string
  value: number
  label?: string
}

export interface ActivityLog {
  id: string
  type: "PERSONA_CREATED" | "PERSONA_DEPLOYED" | "AB_TEST_STARTED" | "AB_TEST_COMPLETED" | "INCIDENT" | "SYSTEM"
  title: string
  description: string
  userId: string | null
  userName: string | null
  createdAt: Date
}
