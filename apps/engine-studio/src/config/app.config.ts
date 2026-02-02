/**
 * DeepSight Engine Studio - Application Configuration
 * 모든 환경별 설정값을 중앙에서 관리합니다.
 * 하드코딩된 값들을 환경변수로 대체합니다.
 */

// =============================================================================
// Application URLs
// =============================================================================

export const APP_CONFIG = {
  /** 애플리케이션 기본 URL */
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  /** API 기본 URL */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
} as const

// =============================================================================
// External Service URLs
// =============================================================================

export const EXTERNAL_URLS = {
  /** OpenAI API URL */
  openai: process.env.OPENAI_API_URL || "https://api.openai.com",

  /** Anthropic API URL */
  anthropic: process.env.ANTHROPIC_API_URL || "https://api.anthropic.com",

  /** Content Platform API URL */
  contentPlatform: process.env.CONTENT_PLATFORM_API_URL || "https://api.content-platform.com/v2",

  /** DeepSight Console API URL */
  deepsightConsole: process.env.DEEPSIGHT_CONSOLE_API_URL || "https://console.deepsight.ai/api",

  /** Elasticsearch URL */
  elasticsearch: process.env.ELASTICSEARCH_URL || "http://localhost:9200",

  /** Redis URL */
  redis: process.env.REDIS_URL || "redis://localhost:6379",
} as const

// =============================================================================
// API Endpoints (Internal)
// =============================================================================

export const API_ENDPOINTS = {
  // 페르소나 관련
  personas: {
    list: "/api/personas",
    detail: (id: string) => `/api/personas/${id}`,
    create: "/api/personas",
    update: (id: string) => `/api/personas/${id}`,
    delete: (id: string) => `/api/personas/${id}`,
    test: (id: string) => `/api/personas/${id}/test`,
    export: (id: string) => `/api/personas/${id}/export`,
    duplicate: (id: string) => `/api/personas/${id}/duplicate`,
    versions: (id: string) => `/api/personas/${id}/versions`,
    incubator: "/api/personas/incubator",
    incubatorApprove: (id: string) => `/api/personas/incubator/${id}/approve`,
    incubatorReject: (id: string) => `/api/personas/incubator/${id}/reject`,
  },

  // 유저 인사이트 관련
  userInsight: {
    overview: "/api/user-insight/overview",
    clusters: "/api/user-insight/clusters",
    journeys: "/api/user-insight/journeys",
    trends: "/api/user-insight/trends",
    search: "/api/user-insight/search",
  },

  // 매칭 랩 관련
  matchingLab: {
    simulate: "/api/matching/simulate",
    performance: "/api/matching/performance",
    abTest: "/api/matching/ab-test",
    optimize: "/api/matching/optimize",
  },

  // 시스템 통합 관련
  systemIntegration: {
    sync: "/api/system/sync",
    deploy: "/api/system/deploy",
    webhook: "/api/system/webhook",
    test: "/api/system/test",
  },

  // 운영 관련
  operations: {
    metrics: "/api/operations/metrics",
    incidents: "/api/operations/incidents",
    backups: "/api/operations/backups",
    logs: "/api/operations/logs",
  },

  // 전역 설정 관련
  globalConfig: {
    model: "/api/config/model",
    security: "/api/config/security",
    feature: "/api/config/feature",
    export: "/api/config/export",
  },

  // 팀 관리 관련
  team: {
    members: "/api/team/members",
    invite: "/api/team/invite",
    roles: "/api/team/roles",
    activity: "/api/team/activity",
  },

  // 인증 관련
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    session: "/api/auth/session",
    refresh: "/api/auth/refresh",
  },
} as const

// =============================================================================
// Rate Limiting Configuration
// =============================================================================

export const RATE_LIMIT_CONFIG = {
  /** 요청 윈도우 시간 (ms) */
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),

  /** 윈도우당 최대 요청 수 */
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),

  /** DDoS 탐지 임계값 */
  ddosThreshold: parseInt(process.env.RATE_LIMIT_DDOS_THRESHOLD || "1000", 10),
} as const

// =============================================================================
// Session Configuration
// =============================================================================

export const SESSION_CONFIG = {
  /** 세션 최대 유지 시간 (초) */
  maxAge: parseInt(process.env.SESSION_MAX_AGE || "28800", 10), // 8시간

  /** 세션 갱신 간격 (초) */
  updateAge: parseInt(process.env.SESSION_UPDATE_AGE || "3600", 10), // 1시간
} as const

// =============================================================================
// Security Configuration
// =============================================================================

export const SECURITY_CONFIG = {
  /** 계정 잠금 전 최대 실패 횟수 */
  lockoutAttempts: parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || "5", 10),

  /** 계정 잠금 기간 (ms) */
  lockoutDurationMs: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS || "1800000", 10), // 30분

  /** 비밀번호 최소 길이 */
  passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10),

  /** 비밀번호 최대 길이 */
  passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || "128", 10),

  /** 타이밍 공격 방지 지연 (ms) */
  timingAttackDelayMs: 100,
} as const

// =============================================================================
// Feature Flags
// =============================================================================

export const FEATURE_FLAGS = {
  /** MFA 활성화 여부 */
  mfaEnabled: process.env.FEATURE_MFA_ENABLED === "true",

  /** OAuth 활성화 여부 */
  oauthEnabled: process.env.FEATURE_OAUTH_ENABLED !== "false",

  /** Demo 모드 활성화 여부 */
  demoMode: process.env.FEATURE_DEMO_MODE !== "false",
} as const

// =============================================================================
// Timeout Configuration
// =============================================================================

export const TIMEOUT_CONFIG = {
  /** API 요청 타임아웃 (ms) */
  apiRequest: 30000,

  /** 파일 업로드 타임아웃 (ms) */
  fileUpload: 120000,

  /** WebSocket 연결 타임아웃 (ms) */
  websocket: 10000,

  /** 데이터베이스 쿼리 타임아웃 (ms) */
  dbQuery: 15000,

  /** 외부 API 호출 타임아웃 (ms) */
  externalApi: 60000,
} as const

// =============================================================================
// Retry Configuration
// =============================================================================

export const RETRY_CONFIG = {
  /** 최대 재시도 횟수 */
  maxRetries: 3,

  /** 재시도 간격 (ms) */
  retryDelay: 1000,

  /** 지수 백오프 활성화 */
  exponentialBackoff: true,

  /** 최대 재시도 간격 (ms) */
  maxRetryDelay: 10000,
} as const

// =============================================================================
// Pagination Configuration
// =============================================================================

export const PAGINATION_CONFIG = {
  /** 기본 페이지 크기 */
  defaultPageSize: 20,

  /** 최대 페이지 크기 */
  maxPageSize: 100,

  /** 무한 스크롤 배치 크기 */
  infiniteScrollBatchSize: 20,
} as const

// =============================================================================
// Cache Configuration
// =============================================================================

export const CACHE_CONFIG = {
  /** 사용자 데이터 캐시 TTL (초) */
  userDataTtl: 300, // 5분

  /** 페르소나 목록 캐시 TTL (초) */
  personaListTtl: 60, // 1분

  /** 설정 데이터 캐시 TTL (초) */
  configDataTtl: 3600, // 1시간

  /** 정적 데이터 캐시 TTL (초) */
  staticDataTtl: 86400, // 24시간
} as const

// =============================================================================
// Date/Time Configuration
// =============================================================================

export const DATETIME_CONFIG = {
  /** 기본 타임존 */
  defaultTimezone: "Asia/Seoul",

  /** 날짜 형식 */
  dateFormat: "YYYY-MM-DD",

  /** 시간 형식 */
  timeFormat: "HH:mm:ss",

  /** 날짜시간 형식 */
  datetimeFormat: "YYYY-MM-DD HH:mm:ss",

  /** 표시용 날짜 형식 */
  displayDateFormat: "YYYY년 MM월 DD일",

  /** 표시용 날짜시간 형식 */
  displayDatetimeFormat: "YYYY년 MM월 DD일 HH:mm",
} as const

// =============================================================================
// File Upload Configuration
// =============================================================================

export const FILE_UPLOAD_CONFIG = {
  /** 최대 파일 크기 (bytes) */
  maxFileSize: 10 * 1024 * 1024, // 10MB

  /** 허용 이미지 타입 */
  allowedImageTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],

  /** 허용 문서 타입 */
  allowedDocumentTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/json",
  ],

  /** 최대 업로드 파일 수 */
  maxFiles: 10,
} as const

// =============================================================================
// Notification Configuration
// =============================================================================

export const NOTIFICATION_CONFIG = {
  /** 토스트 지속 시간 (ms) */
  toastDuration: {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000,
  },

  /** 알림 폴링 간격 (ms) */
  pollingInterval: 30000,

  /** 알림 최대 표시 개수 */
  maxDisplayCount: 5,
} as const

// =============================================================================
// Analytics Configuration
// =============================================================================

export const ANALYTICS_CONFIG = {
  /** 이벤트 배치 크기 */
  eventBatchSize: 10,

  /** 이벤트 전송 간격 (ms) */
  flushInterval: 5000,

  /** 세션 타임아웃 (분) */
  sessionTimeoutMinutes: 30,
} as const
