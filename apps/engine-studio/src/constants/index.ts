/**
 * DeepSight Engine Studio - Central Constants
 * 모든 상수값을 중앙에서 관리합니다.
 */

import type { VectorDimension, PersonaRole, PersonaStatus, UserRole } from "@/types"

// ============================================================================
// 6D 벡터 시스템 상수
// ============================================================================

/** 벡터 차원 키 목록 */
export const VECTOR_DIMENSIONS: VectorDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
] as const

/** 벡터 차원별 레이블 정보 */
export const VECTOR_DIMENSION_LABELS: Record<
  VectorDimension,
  {
    name: string
    label: string
    lowLabel: string
    highLabel: string
    description: string
  }
> = {
  depth: {
    name: "분석 깊이",
    label: "Depth",
    lowLabel: "직관적",
    highLabel: "심층적",
    description: "콘텐츠를 어느 깊이까지 분석하고 설명하는지 결정합니다.",
  },
  lens: {
    name: "판단 렌즈",
    label: "Lens",
    lowLabel: "감성적",
    highLabel: "논리적",
    description: "감성과 논리 중 어떤 관점으로 콘텐츠를 평가하는지 결정합니다.",
  },
  stance: {
    name: "평가 태도",
    label: "Stance",
    lowLabel: "수용적",
    highLabel: "비판적",
    description: "콘텐츠에 대해 수용적인지 비판적인지 결정합니다.",
  },
  scope: {
    name: "관심 범위",
    label: "Scope",
    lowLabel: "핵심만",
    highLabel: "디테일",
    description: "핵심 요약만 할지 세부 사항까지 다룰지 결정합니다.",
  },
  taste: {
    name: "취향 성향",
    label: "Taste",
    lowLabel: "클래식",
    highLabel: "실험적",
    description: "검증된 클래식 작품과 실험적인 작품 중 선호도를 결정합니다.",
  },
  purpose: {
    name: "소비 목적",
    label: "Purpose",
    lowLabel: "오락",
    highLabel: "의미추구",
    description: "오락과 재미 위주인지 의미와 메시지를 추구하는지 결정합니다.",
  },
} as const

/** 기본 벡터 값 */
export const DEFAULT_VECTOR = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
} as const

/** 벡터 값 범위 */
export const VECTOR_RANGE = {
  min: 0,
  max: 1,
  step: 0.01,
} as const

// ============================================================================
// 페르소나 관련 상수
// ============================================================================

/** 페르소나 역할 목록 */
export const PERSONA_ROLES: { value: PersonaRole; label: string; description: string }[] = [
  { value: "REVIEWER", label: "리뷰어", description: "콘텐츠를 평가하고 리뷰하는 역할" },
  { value: "CURATOR", label: "큐레이터", description: "콘텐츠를 선별하고 추천하는 역할" },
  { value: "EDUCATOR", label: "교육자", description: "콘텐츠를 설명하고 가르치는 역할" },
  { value: "COMPANION", label: "동반자", description: "사용자와 대화하며 추천하는 역할" },
  { value: "ANALYST", label: "분석가", description: "깊이 있는 분석을 제공하는 역할" },
] as const

/** 페르소나 상태 목록 */
export const PERSONA_STATUSES: { value: PersonaStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "임시저장", color: "gray" },
  { value: "REVIEW", label: "검토 중", color: "yellow" },
  { value: "ACTIVE", label: "활성", color: "green" },
  { value: "STANDARD", label: "보통", color: "blue" },
  { value: "LEGACY", label: "레거시", color: "orange" },
  { value: "DEPRECATED", label: "사용중지", color: "red" },
  { value: "PAUSED", label: "일시정지", color: "purple" },
  { value: "ARCHIVED", label: "보관", color: "slate" },
] as const

/** 품질 점수 등급 */
export const QUALITY_SCORE_GRADES = {
  EXCELLENT: { min: 90, max: 100, label: "S", color: "green" },
  GOOD: { min: 80, max: 89, label: "A", color: "blue" },
  FAIR: { min: 70, max: 79, label: "B", color: "yellow" },
  POOR: { min: 60, max: 69, label: "C", color: "orange" },
  FAIL: { min: 0, max: 59, label: "D", color: "red" },
} as const

// ============================================================================
// 사용자 역할 관련 상수
// ============================================================================

/** 사용자 역할 목록 */
export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "ADMIN", label: "관리자", description: "시스템 전체 관리 권한" },
  { value: "AI_ENGINEER", label: "AI 엔지니어", description: "페르소나 및 알고리즘 개발" },
  { value: "CONTENT_MANAGER", label: "콘텐츠 매니저", description: "페르소나 콘텐츠 관리" },
  { value: "ANALYST", label: "분석가", description: "데이터 분석 및 리포팅" },
] as const

/** 역할별 권한 매핑 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  AI_ENGINEER: [
    "persona:read",
    "persona:create",
    "persona:update",
    "persona:deploy",
    "persona:incubator",
    "insight:read",
    "insight:analyze",
    "matching:simulate",
    "matching:tune",
    "config:model",
  ],
  CONTENT_MANAGER: ["persona:read", "persona:create", "persona:update", "insight:read"],
  ANALYST: ["persona:read", "insight:read", "matching:performance", "ops:monitor"],
} as const

// ============================================================================
// 매칭 알고리즘 상수
// ============================================================================

/** 알고리즘 타입 목록 */
export const ALGORITHM_TYPES = [
  { value: "COSINE", label: "코사인 유사도", description: "벡터 방향 기반 유사도 측정" },
  { value: "WEIGHTED", label: "가중 유사도", description: "차원별 가중치 적용 유사도" },
  { value: "CONTEXT", label: "컨텍스트 기반", description: "상황 정보 반영 매칭" },
  { value: "HYBRID", label: "하이브리드", description: "복합 알고리즘 적용" },
] as const

/** 기본 알고리즘 파라미터 */
export const DEFAULT_ALGORITHM_PARAMS = {
  similarityThreshold: 70,
  topN: 5,
  diversityFactor: 0.3,
  feedbackLearningRate: 0.1,
  latentTraitWeight: 0.2,
  contextSensitivity: 0.5,
} as const

// ============================================================================
// 온보딩 관련 상수
// ============================================================================

/** 온보딩 모드 설정 */
export const ONBOARDING_MODES = {
  LIGHT: {
    label: "Quick",
    questionCount: 12,
    estimatedMinutes: 1.5,
    initialPrecision: "50-55%",
    description: "빠른 시작, 행동 데이터로 보완",
  },
  MEDIUM: {
    label: "Standard",
    questionCount: 30,
    estimatedMinutes: 4,
    initialPrecision: "60-68%",
    description: "일반적인 분석 수준",
  },
  DEEP: {
    label: "Deep",
    questionCount: 60,
    estimatedMinutes: 8,
    initialPrecision: "70-78%",
    description: "심층 분석, 높은 초기 정밀도",
  },
} as const

// ============================================================================
// 인큐베이터 관련 상수
// ============================================================================

/** 인큐베이터 기본 설정 */
export const INCUBATOR_DEFAULTS = {
  batchTime: "03:00",
  dailyLimit: 10,
  passThreshold: 90,
  strategy: {
    userDriven: 0.6,
    exploration: 0.2,
    gapFilling: 0.2,
  },
} as const

/** 인큐베이터 단계별 한도 */
export const INCUBATOR_PHASES = [
  { phase: 1, activeLimit: 20, userThreshold: 0, description: "초기 단계" },
  { phase: 2, activeLimit: 50, userThreshold: 1000, description: "성장 단계" },
  { phase: 3, activeLimit: 100, userThreshold: 5000, description: "확장 단계" },
  { phase: 4, activeLimit: 200, userThreshold: 20000, description: "안정 단계" },
] as const

// ============================================================================
// 시스템 관련 상수
// ============================================================================

/** 배포 환경 목록 */
export const DEPLOYMENT_ENVIRONMENTS = [
  { value: "DEV", label: "Development", color: "blue" },
  { value: "STG", label: "Staging", color: "yellow" },
  { value: "PROD", label: "Production", color: "red" },
] as const

/** 인시던트 심각도 */
export const INCIDENT_SEVERITIES = [
  { value: "LOW", label: "낮음", color: "blue" },
  { value: "MEDIUM", label: "보통", color: "yellow" },
  { value: "HIGH", label: "높음", color: "orange" },
  { value: "CRITICAL", label: "심각", color: "red" },
] as const

/** 백업 타입 */
export const BACKUP_TYPES = [
  { value: "FULL", label: "전체 백업", description: "전체 데이터 백업" },
  { value: "INCREMENTAL", label: "증분 백업", description: "변경 데이터만 백업" },
  { value: "DIFFERENTIAL", label: "차등 백업", description: "마지막 전체 백업 이후 변경분" },
] as const

// ============================================================================
// API 관련 상수
// ============================================================================

/** API 기본 설정 */
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
} as const

/** HTTP 상태 코드 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

/** 에러 코드 */
export const ERROR_CODES = {
  // 인증 관련
  AUTH_INVALID_CREDENTIALS: "AUTH_001",
  AUTH_TOKEN_EXPIRED: "AUTH_002",
  AUTH_INSUFFICIENT_PERMISSIONS: "AUTH_003",

  // 페르소나 관련
  PERSONA_NOT_FOUND: "PERSONA_001",
  PERSONA_VALIDATION_FAILED: "PERSONA_002",
  PERSONA_DUPLICATE_NAME: "PERSONA_003",

  // 매칭 관련
  MATCHING_NO_RESULTS: "MATCHING_001",
  MATCHING_ALGORITHM_ERROR: "MATCHING_002",

  // 시스템 관련
  SYSTEM_UNAVAILABLE: "SYSTEM_001",
  DATABASE_ERROR: "SYSTEM_002",
  RATE_LIMIT_EXCEEDED: "SYSTEM_003",

  // 일반
  VALIDATION_ERROR: "VALIDATION_001",
  UNKNOWN_ERROR: "UNKNOWN_001",
} as const

// ============================================================================
// UI 관련 상수
// ============================================================================

/** 페이지네이션 기본값 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const

/** 테이블 정렬 옵션 */
export const SORT_OPTIONS = {
  ASC: "asc",
  DESC: "desc",
} as const

/** 토스트 지속 시간 (ms) */
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const

/** 디바운스 지연 시간 (ms) */
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  SAVE: 1000,
  VALIDATION: 500,
} as const

// ============================================================================
// 차트 관련 상수
// ============================================================================

/** 차트 색상 팔레트 */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  chart1: "hsl(var(--chart-1))",
  chart2: "hsl(var(--chart-2))",
  chart3: "hsl(var(--chart-3))",
  chart4: "hsl(var(--chart-4))",
  chart5: "hsl(var(--chart-5))",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
} as const

/** 차트 기본 설정 */
export const CHART_DEFAULTS = {
  animationDuration: 300,
  responsiveBreakpoint: 768,
  legendPosition: "bottom" as const,
  tooltipEnabled: true,
} as const
