/**
 * DeepSight Engine Studio - Centralized Mock Data Service
 * 개발/테스트 환경에서 사용되는 모든 Mock 데이터를 중앙에서 관리합니다.
 *
 * 주의: 이 파일은 개발 환경에서만 사용됩니다.
 * Production 환경에서는 실제 API를 통해 데이터를 가져옵니다.
 */

import type { UserRole, PersonaRole, PersonaStatus, IncidentStatus } from "@/types"

// =============================================================================
// 타입 정의
// =============================================================================

export interface MockPersona {
  id: string
  name: string
  role: PersonaRole // DB enum과 일치
  expertise: string[]
  status: PersonaStatus // DB enum과 일치
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  }
  promptTemplate: string
  matchCount: number // 계산된 필드 (집계용)
  accuracy: number // 계산된 필드 (집계용)
  createdAt: string
  updatedAt: string
}

export interface MockUser {
  id: string
  email: string
  name: string
  role: UserRole
  image: string | null
  mfaEnabled: boolean
  createdAt: string
  lastLoginAt: string
}

export interface MockTeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  status: "ACTIVE" | "INACTIVE" | "PENDING"
  department: string
  lastActive: string
  joinedAt: string
  avatar?: string
}

export interface MockIncubatorPersona {
  id: string
  name: string
  role: PersonaRole // DB enum과 일치
  progress: number
  testScore: number
  status: "TESTING" | "READY" | "FAILED" // 인큐베이터 전용 상태
  createdAt: string
  author: string
}

export interface MockCluster {
  id: string
  name: string
  userCount: number
  avgVector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  }
  topPersonas: string[]
  growth: number
}

export interface MockKPIData {
  label: string
  value: number
  change: number
  trend: "up" | "down" | "stable"
  unit?: string
}

export interface MockIncident {
  id: string
  title: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: IncidentStatus // DB enum과 일치: REPORTED, INVESTIGATING, IDENTIFIED, FIXING, RESOLVED, CLOSED
  createdAt: string
  assignee: string
  description: string
}

export interface MockBackup {
  id: string
  type: "FULL" | "INCREMENTAL" | "DIFFERENTIAL"
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED"
  size: string
  createdAt: string
  duration: string
}

export interface MockAPIConfig {
  id: string
  name: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  status: "ACTIVE" | "INACTIVE"
  rateLimit: number
  lastCalled: string
}

export interface MockWebhook {
  id: string
  name: string
  url: string
  events: string[]
  status: "ACTIVE" | "INACTIVE"
  lastTriggered: string
  successRate: number
}

// =============================================================================
// Mock 페르소나 데이터
// =============================================================================

export const MOCK_PERSONAS: MockPersona[] = [
  {
    id: "1",
    name: "논리적 평론가",
    role: "REVIEWER", // DB enum: REVIEWER, CURATOR, EDUCATOR, COMPANION, ANALYST
    expertise: ["영화", "드라마"],
    status: "ACTIVE",
    vector: {
      depth: 0.85,
      lens: 0.78,
      stance: 0.72,
      scope: 0.45,
      taste: 0.68,
      purpose: 0.82,
    },
    promptTemplate:
      "당신은 논리적이고 분석적인 평론가입니다. 작품의 구조, 서사, 연출 기법을 체계적으로 분석하며 객관적인 시각을 유지합니다.",
    matchCount: 12340,
    accuracy: 96.2,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "감성적 스토리텔러",
    role: "CURATOR",
    expertise: ["소설", "에세이"],
    status: "ACTIVE",
    vector: {
      depth: 0.65,
      lens: 0.32,
      stance: 0.55,
      scope: 0.72,
      taste: 0.45,
      purpose: 0.58,
    },
    promptTemplate:
      "당신은 감성적인 스토리텔러입니다. 작품의 감정적 울림과 인물의 내면을 섬세하게 포착합니다.",
    matchCount: 8920,
    accuracy: 94.1,
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-14T15:20:00Z",
  },
  {
    id: "3",
    name: "트렌드 분석가",
    role: "ANALYST",
    expertise: ["음악", "예능"],
    status: "ACTIVE",
    vector: {
      depth: 0.55,
      lens: 0.68,
      stance: 0.48,
      scope: 0.85,
      taste: 0.78,
      purpose: 0.42,
    },
    promptTemplate:
      "당신은 트렌드를 읽는 분석가입니다. 대중문화의 흐름과 시대적 맥락을 파악합니다.",
    matchCount: 15680,
    accuracy: 92.8,
    createdAt: "2025-01-03T00:00:00Z",
    updatedAt: "2025-01-15T09:00:00Z",
  },
  {
    id: "4",
    name: "디테일 매니아",
    role: "REVIEWER",
    expertise: ["게임", "애니메이션"],
    status: "REVIEW",
    vector: {
      depth: 0.92,
      lens: 0.85,
      stance: 0.78,
      scope: 0.95,
      taste: 0.62,
      purpose: 0.75,
    },
    promptTemplate: "당신은 디테일에 집중하는 리뷰어입니다. 작품의 세부 요소를 꼼꼼히 분석합니다.",
    matchCount: 6240,
    accuracy: 97.5,
    createdAt: "2025-01-05T00:00:00Z",
    updatedAt: "2025-01-15T11:45:00Z",
  },
  {
    id: "5",
    name: "실험적 탐험가",
    role: "CURATOR",
    expertise: ["아트하우스", "독립영화"],
    status: "DRAFT",
    vector: {
      depth: 0.78,
      lens: 0.52,
      stance: 0.35,
      scope: 0.68,
      taste: 0.92,
      purpose: 0.88,
    },
    promptTemplate:
      "당신은 실험적인 콘텐츠를 탐험하는 큐레이터입니다. 새로운 시도와 독창성을 높이 평가합니다.",
    matchCount: 3120,
    accuracy: 89.3,
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-15T08:30:00Z",
  },
]

// =============================================================================
// Mock 사용자 데이터
// =============================================================================

export const MOCK_USERS: MockUser[] = [
  {
    id: "1",
    email: "admin@deepsight.ai",
    name: "관리자",
    role: "ADMIN",
    image: null,
    mfaEnabled: true,
    createdAt: "2024-01-01T00:00:00Z",
    lastLoginAt: "2025-01-15T09:00:00Z",
  },
  {
    id: "2",
    email: "engineer@deepsight.ai",
    name: "AI 엔지니어",
    role: "AI_ENGINEER",
    image: null,
    mfaEnabled: false,
    createdAt: "2024-02-15T00:00:00Z",
    lastLoginAt: "2025-01-15T10:30:00Z",
  },
  {
    id: "3",
    email: "content@deepsight.ai",
    name: "콘텐츠 매니저",
    role: "CONTENT_MANAGER",
    image: null,
    mfaEnabled: false,
    createdAt: "2024-03-01T00:00:00Z",
    lastLoginAt: "2025-01-14T18:00:00Z",
  },
  {
    id: "4",
    email: "analyst@deepsight.ai",
    name: "분석가",
    role: "ANALYST",
    image: null,
    mfaEnabled: false,
    createdAt: "2024-04-15T00:00:00Z",
    lastLoginAt: "2025-01-15T08:45:00Z",
  },
]

// =============================================================================
// Mock 팀 멤버 데이터
// =============================================================================

export const MOCK_TEAM_MEMBERS: MockTeamMember[] = [
  {
    id: "1",
    name: "김철수",
    email: "kim@deepsight.ai",
    role: "ADMIN",
    status: "ACTIVE",
    department: "Engineering",
    lastActive: "2025-01-15T09:00:00Z",
    joinedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    name: "이영희",
    email: "lee@deepsight.ai",
    role: "AI_ENGINEER",
    status: "ACTIVE",
    department: "AI Research",
    lastActive: "2025-01-15T10:30:00Z",
    joinedAt: "2024-02-01T00:00:00Z",
  },
  {
    id: "3",
    name: "박민수",
    email: "park@deepsight.ai",
    role: "CONTENT_MANAGER",
    status: "ACTIVE",
    department: "Content",
    lastActive: "2025-01-14T17:00:00Z",
    joinedAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "4",
    name: "정수진",
    email: "jung@deepsight.ai",
    role: "ANALYST",
    status: "INACTIVE",
    department: "Analytics",
    lastActive: "2025-01-10T15:00:00Z",
    joinedAt: "2024-04-01T00:00:00Z",
  },
  {
    id: "5",
    name: "최동현",
    email: "choi@deepsight.ai",
    role: "AI_ENGINEER",
    status: "PENDING",
    department: "AI Research",
    lastActive: "2025-01-15T11:00:00Z",
    joinedAt: "2025-01-10T00:00:00Z",
  },
]

// =============================================================================
// Mock 인큐베이터 페르소나 데이터
// =============================================================================

export const MOCK_INCUBATOR_PERSONAS: MockIncubatorPersona[] = [
  {
    id: "inc-1",
    name: "신규 평론가 A",
    role: "REVIEWER", // DB enum과 일치
    progress: 85,
    testScore: 92,
    status: "READY",
    createdAt: "2025-01-14T00:00:00Z",
    author: "AI 엔지니어",
  },
  {
    id: "inc-2",
    name: "큐레이터 후보 B",
    role: "CURATOR", // DB enum과 일치
    progress: 60,
    testScore: 78,
    status: "TESTING",
    createdAt: "2025-01-13T00:00:00Z",
    author: "콘텐츠 매니저",
  },
  {
    id: "inc-3",
    name: "분석가 테스트 C",
    role: "ANALYST", // DB enum과 일치
    progress: 100,
    testScore: 65,
    status: "FAILED",
    createdAt: "2025-01-12T00:00:00Z",
    author: "AI 엔지니어",
  },
]

// =============================================================================
// Mock 클러스터 데이터
// =============================================================================

export const MOCK_CLUSTERS: MockCluster[] = [
  {
    id: "cl-1",
    name: "심층 분석 선호 그룹",
    userCount: 15420,
    avgVector: {
      depth: 0.85,
      lens: 0.72,
      stance: 0.65,
      scope: 0.78,
      taste: 0.45,
      purpose: 0.82,
    },
    topPersonas: ["논리적 평론가", "디테일 매니아"],
    growth: 12.5,
  },
  {
    id: "cl-2",
    name: "감성적 콘텐츠 소비 그룹",
    userCount: 23180,
    avgVector: {
      depth: 0.55,
      lens: 0.28,
      stance: 0.42,
      scope: 0.62,
      taste: 0.58,
      purpose: 0.68,
    },
    topPersonas: ["감성적 스토리텔러"],
    growth: 8.3,
  },
  {
    id: "cl-3",
    name: "트렌드 추종 그룹",
    userCount: 31250,
    avgVector: {
      depth: 0.45,
      lens: 0.55,
      stance: 0.38,
      scope: 0.72,
      taste: 0.82,
      purpose: 0.35,
    },
    topPersonas: ["트렌드 분석가"],
    growth: 18.7,
  },
]

// =============================================================================
// Mock KPI 데이터
// =============================================================================

export const MOCK_KPI_DATA: MockKPIData[] = [
  {
    label: "총 페르소나 수",
    value: 127,
    change: 12,
    trend: "up",
    unit: "개",
  },
  {
    label: "활성 사용자",
    value: 45892,
    change: 8.5,
    trend: "up",
    unit: "명",
  },
  {
    label: "일일 매칭 수",
    value: 128450,
    change: 15.2,
    trend: "up",
    unit: "회",
  },
  {
    label: "평균 정확도",
    value: 94.8,
    change: 0.3,
    trend: "up",
    unit: "%",
  },
  {
    label: "시스템 가동률",
    value: 99.97,
    change: 0.02,
    trend: "stable",
    unit: "%",
  },
  {
    label: "평균 응답 시간",
    value: 45,
    change: -5,
    trend: "down",
    unit: "ms",
  },
]

// =============================================================================
// Mock 인시던트 데이터
// =============================================================================

export const MOCK_INCIDENTS: MockIncident[] = [
  {
    id: "inc-001",
    title: "API 응답 지연",
    severity: "MEDIUM",
    status: "RESOLVED", // DB enum: REPORTED, INVESTIGATING, IDENTIFIED, FIXING, RESOLVED, CLOSED
    createdAt: "2025-01-15T08:30:00Z",
    assignee: "AI 엔지니어",
    description: "매칭 API 응답 시간이 평소보다 2배 이상 증가",
  },
  {
    id: "inc-002",
    title: "데이터베이스 연결 오류",
    severity: "HIGH",
    status: "INVESTIGATING", // 변경: IN_PROGRESS → INVESTIGATING (DB enum)
    createdAt: "2025-01-15T10:15:00Z",
    assignee: "관리자",
    description: "간헐적인 DB 연결 실패 발생",
  },
  {
    id: "inc-003",
    title: "메모리 사용량 경고",
    severity: "LOW",
    status: "REPORTED", // 변경: OPEN → REPORTED (DB enum)
    createdAt: "2025-01-15T11:00:00Z",
    assignee: "미배정",
    description: "서버 메모리 사용량 80% 초과",
  },
]

// =============================================================================
// Mock 백업 데이터
// =============================================================================

export const MOCK_BACKUPS: MockBackup[] = [
  {
    id: "bak-001",
    type: "FULL",
    status: "COMPLETED",
    size: "45.2 GB",
    createdAt: "2025-01-15T03:00:00Z",
    duration: "45분",
  },
  {
    id: "bak-002",
    type: "INCREMENTAL",
    status: "COMPLETED",
    size: "2.1 GB",
    createdAt: "2025-01-15T09:00:00Z",
    duration: "5분",
  },
  {
    id: "bak-003",
    type: "INCREMENTAL",
    status: "IN_PROGRESS",
    size: "-",
    createdAt: "2025-01-15T12:00:00Z",
    duration: "-",
  },
]

// =============================================================================
// Mock API 설정 데이터
// =============================================================================

export const MOCK_API_CONFIGS: MockAPIConfig[] = [
  {
    id: "api-001",
    name: "페르소나 조회 API",
    endpoint: "/api/personas",
    method: "GET",
    status: "ACTIVE",
    rateLimit: 1000,
    lastCalled: "2025-01-15T11:45:00Z",
  },
  {
    id: "api-002",
    name: "매칭 실행 API",
    endpoint: "/api/matching/execute",
    method: "POST",
    status: "ACTIVE",
    rateLimit: 500,
    lastCalled: "2025-01-15T11:44:30Z",
  },
  {
    id: "api-003",
    name: "사용자 분석 API",
    endpoint: "/api/user-insight/analyze",
    method: "POST",
    status: "INACTIVE",
    rateLimit: 200,
    lastCalled: "2025-01-14T18:00:00Z",
  },
]

// =============================================================================
// Mock Webhook 데이터
// =============================================================================

export const MOCK_WEBHOOKS: MockWebhook[] = [
  {
    id: "wh-001",
    name: "Slack 알림",
    url: "https://hooks.slack.com/services/xxx",
    events: ["persona.created", "persona.activated", "incident.created"],
    status: "ACTIVE",
    lastTriggered: "2025-01-15T10:30:00Z",
    successRate: 99.5,
  },
  {
    id: "wh-002",
    name: "Discord 알림",
    url: "https://discord.com/api/webhooks/xxx",
    events: ["incident.critical"],
    status: "ACTIVE",
    lastTriggered: "2025-01-10T15:00:00Z",
    successRate: 100,
  },
  {
    id: "wh-003",
    name: "PagerDuty 연동",
    url: "https://events.pagerduty.com/v2/enqueue",
    events: ["incident.critical", "system.down"],
    status: "INACTIVE",
    lastTriggered: "2025-01-05T08:00:00Z",
    successRate: 98.2,
  },
]

// =============================================================================
// Mock 차트 데이터
// =============================================================================

export const MOCK_MATCHING_TREND_DATA = [
  { date: "2025-01-09", matches: 118200, accuracy: 93.2 },
  { date: "2025-01-10", matches: 122450, accuracy: 93.8 },
  { date: "2025-01-11", matches: 115800, accuracy: 94.1 },
  { date: "2025-01-12", matches: 108900, accuracy: 93.9 },
  { date: "2025-01-13", matches: 125600, accuracy: 94.5 },
  { date: "2025-01-14", matches: 131200, accuracy: 94.2 },
  { date: "2025-01-15", matches: 128450, accuracy: 94.8 },
]

export const MOCK_USER_GROWTH_DATA = [
  { month: "2024-08", users: 28500 },
  { month: "2024-09", users: 32100 },
  { month: "2024-10", users: 35800 },
  { month: "2024-11", users: 39200 },
  { month: "2024-12", users: 42500 },
  { month: "2025-01", users: 45892 },
]

export const MOCK_PERSONA_DISTRIBUTION_DATA: {
  role: PersonaRole
  count: number
  percentage: number
}[] = [
  { role: "REVIEWER", count: 42, percentage: 33.1 }, // 평론가/리뷰어
  { role: "CURATOR", count: 35, percentage: 27.6 }, // 큐레이터
  { role: "ANALYST", count: 28, percentage: 22.0 }, // 분석가
  { role: "EDUCATOR", count: 15, percentage: 11.8 }, // 교육자
  { role: "COMPANION", count: 7, percentage: 5.5 }, // 동반자
]

// =============================================================================
// Mock 데이터 서비스 함수
// =============================================================================

/**
 * ID로 페르소나 조회
 */
export function getMockPersonaById(id: string): MockPersona | undefined {
  return MOCK_PERSONAS.find((p) => p.id === id)
}

/**
 * 상태별 페르소나 필터링
 */
export function getMockPersonasByStatus(status: string): MockPersona[] {
  return MOCK_PERSONAS.filter((p) => p.status === status)
}

/**
 * ID로 팀 멤버 조회
 */
export function getMockTeamMemberById(id: string): MockTeamMember | undefined {
  return MOCK_TEAM_MEMBERS.find((m) => m.id === id)
}

/**
 * 역할별 팀 멤버 필터링
 */
export function getMockTeamMembersByRole(role: UserRole): MockTeamMember[] {
  return MOCK_TEAM_MEMBERS.filter((m) => m.role === role)
}

/**
 * ID로 인시던트 조회
 */
export function getMockIncidentById(id: string): MockIncident | undefined {
  return MOCK_INCIDENTS.find((i) => i.id === id)
}

/**
 * 인큐베이터 페르소나 조회 (상태별)
 */
export function getMockIncubatorPersonasByStatus(
  status: MockIncubatorPersona["status"]
): MockIncubatorPersona[] {
  return MOCK_INCUBATOR_PERSONAS.filter((p) => p.status === status)
}

/**
 * KPI 데이터 조회 (레이블별)
 */
export function getMockKPIByLabel(label: string): MockKPIData | undefined {
  return MOCK_KPI_DATA.find((k) => k.label === label)
}

// =============================================================================
// Mock 아키타입 데이터
// =============================================================================

export interface MockArchetype {
  id: string
  name: string
  description: string
  userCount: number
  percentage: number
  trend: "up" | "down" | "stable"
  trendValue: number
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  }
  color: string
  status: "active" | "inactive"
  createdAt: string
}

export interface MockArchetypeStats {
  totalUsers: number
  avgMatchAccuracy: number
  lastClusterUpdate: string
  nextScheduledUpdate: string
}

export const MOCK_ARCHETYPES: MockArchetype[] = [
  {
    id: "1",
    name: "분석적 탐험가",
    description: "깊이 있는 분석과 다양한 장르 탐색을 추구하는 유형",
    userCount: 23456,
    percentage: 18.5,
    trend: "up",
    trendValue: 2.3,
    vector: { depth: 0.85, lens: 0.7, stance: 0.65, scope: 0.8, taste: 0.6, purpose: 0.75 },
    color: "#3b82f6",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "2",
    name: "감성 몰입러",
    description: "주관적 감정과 깊은 몰입을 중시하는 유형",
    userCount: 31245,
    percentage: 24.7,
    trend: "up",
    trendValue: 1.8,
    vector: { depth: 0.7, lens: 0.25, stance: 0.35, scope: 0.45, taste: 0.7, purpose: 0.4 },
    color: "#ec4899",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "3",
    name: "트렌드 서퍼",
    description: "인기 콘텐츠와 대중적 취향을 따르는 유형",
    userCount: 28934,
    percentage: 22.9,
    trend: "stable",
    trendValue: 0.2,
    vector: { depth: 0.35, lens: 0.5, stance: 0.4, scope: 0.75, taste: 0.2, purpose: 0.3 },
    color: "#f59e0b",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "4",
    name: "까다로운 비평가",
    description: "엄격한 기준과 깊은 분석으로 콘텐츠를 평가하는 유형",
    userCount: 15678,
    percentage: 12.4,
    trend: "down",
    trendValue: -0.8,
    vector: { depth: 0.9, lens: 0.8, stance: 0.85, scope: 0.5, taste: 0.75, purpose: 0.7 },
    color: "#ef4444",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "5",
    name: "캐주얼 뷰어",
    description: "가벼운 오락 목적으로 콘텐츠를 소비하는 유형",
    userCount: 19234,
    percentage: 15.2,
    trend: "up",
    trendValue: 3.1,
    vector: { depth: 0.2, lens: 0.4, stance: 0.25, scope: 0.6, taste: 0.35, purpose: 0.15 },
    color: "#10b981",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "6",
    name: "니치 전문가",
    description: "특정 장르에 깊이 몰입하고 전문 지식을 추구하는 유형",
    userCount: 8012,
    percentage: 6.3,
    trend: "stable",
    trendValue: 0.5,
    vector: { depth: 0.95, lens: 0.75, stance: 0.7, scope: 0.15, taste: 0.9, purpose: 0.85 },
    color: "#8b5cf6",
    status: "active",
    createdAt: "2025-01-01",
  },
]

export const MOCK_ARCHETYPE_STATS: MockArchetypeStats = {
  totalUsers: 126559,
  avgMatchAccuracy: 89.3,
  lastClusterUpdate: "2025-01-15 03:00",
  nextScheduledUpdate: "2025-01-22 03:00",
}

// =============================================================================
// Mock Cold Start 데이터
// =============================================================================

export interface MockColdStartMode {
  id: string
  name: string
  nameKr: string
  description: string
  questions: number
  accuracy: number
  duration: string
  color: string
  bgColor: string
  features: string[]
}

export interface MockColdStartStats {
  totalNewUsers: number
  todayNewUsers: number
  avgCompletionRate: number
  avgTimeToComplete: string
  modeDistribution: {
    quick: number
    standard: number
    deep: number
  }
}

export interface MockColdStartTrendData {
  date: string
  quick: number
  standard: number
  deep: number
}

export interface MockColdStartQuestion {
  id: number
  question: string
  type: "single" | "multi" | "ranking" | "scale"
}

export const MOCK_COLD_START_STATS: MockColdStartStats = {
  totalNewUsers: 12456,
  todayNewUsers: 342,
  avgCompletionRate: 78.5,
  avgTimeToComplete: "1분 42초",
  modeDistribution: {
    quick: 45,
    standard: 38,
    deep: 17,
  },
}

export const MOCK_COLD_START_TREND_DATA: MockColdStartTrendData[] = [
  { date: "01/10", quick: 156, standard: 124, deep: 52 },
  { date: "01/11", quick: 178, standard: 145, deep: 61 },
  { date: "01/12", quick: 142, standard: 132, deep: 48 },
  { date: "01/13", quick: 189, standard: 156, deep: 72 },
  { date: "01/14", quick: 201, standard: 168, deep: 78 },
  { date: "01/15", quick: 167, standard: 142, deep: 65 },
  { date: "01/16", quick: 154, standard: 130, deep: 58 },
]

export const MOCK_COLD_START_QUESTION_SETS: Record<string, MockColdStartQuestion[]> = {
  quick: [
    { id: 1, question: "콘텐츠를 선택할 때 가장 중요하게 생각하는 것은?", type: "single" },
    { id: 2, question: "평소 선호하는 분위기/톤은?", type: "single" },
    { id: 3, question: "새로운 콘텐츠 발견 방식은?", type: "single" },
  ],
  standard: [
    { id: 1, question: "콘텐츠를 선택할 때 가장 중요하게 생각하는 것은?", type: "single" },
    { id: 2, question: "평소 선호하는 분위기/톤은?", type: "single" },
    { id: 3, question: "새로운 콘텐츠 발견 방식은?", type: "single" },
    { id: 4, question: "콘텐츠 소비 시 집중하는 요소는?", type: "multi" },
    { id: 5, question: "선호하는 콘텐츠 길이는?", type: "single" },
    { id: 6, question: "비평/리뷰에 대한 태도는?", type: "single" },
    { id: 7, question: "콘텐츠 소비 목적은?", type: "multi" },
  ],
  deep: [
    { id: 1, question: "콘텐츠 선택 기준", type: "single" },
    { id: 2, question: "분위기/톤 선호", type: "single" },
    { id: 3, question: "발견 방식", type: "single" },
    { id: 4, question: "집중 요소", type: "multi" },
    { id: 5, question: "콘텐츠 길이", type: "single" },
    { id: 6, question: "비평 태도", type: "single" },
    { id: 7, question: "소비 목적", type: "multi" },
    { id: 8, question: "장르 선호도", type: "ranking" },
    { id: 9, question: "시청 패턴", type: "single" },
    { id: 10, question: "공유 성향", type: "single" },
    { id: 11, question: "재시청 패턴", type: "single" },
    { id: 12, question: "트렌드 민감도", type: "scale" },
    { id: 13, question: "깊이 vs 다양성", type: "scale" },
    { id: 14, question: "감성 vs 논리", type: "scale" },
    { id: 15, question: "모험 성향", type: "scale" },
  ],
}

// =============================================================================
// Mock 데이터 생성 유틸리티
// =============================================================================

/**
 * 랜덤 벡터 생성
 */
export function generateRandomVector() {
  return {
    depth: Math.random(),
    lens: Math.random(),
    stance: Math.random(),
    scope: Math.random(),
    taste: Math.random(),
    purpose: Math.random(),
  }
}

/**
 * 랜덤 날짜 생성 (최근 N일 이내)
 */
export function generateRandomDate(daysAgo: number = 30): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date.toISOString()
}

/**
 * 랜덤 ID 생성
 */
export function generateRandomId(prefix: string = ""): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
