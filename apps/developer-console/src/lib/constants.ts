/**
 * Developer Console 공통 상수
 *
 * 가격, 쿼터, API 비용 등 여러 라우트에서 공유하는 값을 여기서 관리.
 * 변경 시 이 파일만 수정하면 모든 라우트에 자동 반영됨.
 */

// ============================================================================
// API 비용
// ============================================================================

/** API 호출 1건당 비용 (USD) */
export const API_COST_PER_CALL = 0.002

// ============================================================================
// 플랜별 정보 (billing/route.ts, billing/upgrade/route.ts 공용)
// ============================================================================

export interface PlanInfo {
  name: string
  description: string
  price: number | null // null = 문의 필요 (Enterprise)
  pricePerCall: number | null
  calls: number | null // null = 무제한
  rateLimit: number | null // null = 무제한
  features: { name: string; included: boolean }[]
}

export const PLAN_INFO: Record<string, PlanInfo> = {
  FREE: {
    name: "Free",
    description: "개인 프로젝트와 테스트용",
    price: 0,
    pricePerCall: null,
    calls: 3000,
    rateLimit: 10,
    features: [
      { name: "월 3,000 API 호출", included: true },
      { name: "기본 Match API 접근", included: true },
      { name: "테스트 환경 전용", included: true },
      { name: "커뮤니티 지원", included: true },
      { name: "이메일 지원", included: false },
      { name: "Webhook 연동", included: false },
      { name: "우선 처리", included: false },
    ],
  },
  STARTER: {
    name: "Starter",
    description: "스타트업과 소규모 팀용",
    price: 29000,
    pricePerCall: 0.58,
    calls: 50000,
    rateLimit: 100,
    features: [
      { name: "월 50,000 API 호출", included: true },
      { name: "모든 API 접근", included: true },
      { name: "Live + Test 환경", included: true },
      { name: "이메일 지원", included: true },
      { name: "Webhook 연동", included: true },
      { name: "기본 분석 대시보드", included: true },
      { name: "우선 처리", included: false },
    ],
  },
  PRO: {
    name: "Pro",
    description: "성장하는 비즈니스용",
    price: 99000,
    pricePerCall: 0.198,
    calls: 500000,
    rateLimit: 500,
    features: [
      { name: "월 500,000 API 호출", included: true },
      { name: "모든 API 접근", included: true },
      { name: "Live + Test 환경", included: true },
      { name: "우선 이메일 지원", included: true },
      { name: "Webhook 연동", included: true },
      { name: "고급 분석 대시보드", included: true },
      { name: "우선 처리 큐", included: true },
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "대규모 기업용 맞춤 솔루션",
    price: null,
    pricePerCall: null,
    calls: null,
    rateLimit: null,
    features: [
      { name: "무제한 API 호출", included: true },
      { name: "전용 인프라", included: true },
      { name: "SLA 보장 (99.9%)", included: true },
      { name: "전담 기술 지원", included: true },
      { name: "맞춤 통합 지원", included: true },
      { name: "온프레미스 옵션", included: true },
      { name: "커스텀 계약", included: true },
    ],
  },
}

/** 플랜별 Toss 결제 가격 (원화) — billing/upgrade/route.ts 공용 */
export const PLAN_PRICES: Record<string, number> = {
  starter: PLAN_INFO.STARTER.price ?? 29000,
  pro: PLAN_INFO.PRO.price ?? 99000,
  enterprise: 299000, // Enterprise는 문의 기반이지만 결제 시 사용
}

/** 플랜별 표시 이름 — billing/upgrade/route.ts 공용 */
export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  starter: "Starter 플랜",
  pro: "Pro 플랜",
  enterprise: "Enterprise 플랜",
}

/** 플랜 키(PlanType enum)로 API 호출 쿼터 반환. 없으면 FREE 기본값 */
export function getQuotaByPlan(plan: string): number {
  return PLAN_INFO[plan]?.calls ?? PLAN_INFO.FREE.calls ?? 3000
}
