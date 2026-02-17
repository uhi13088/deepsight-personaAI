/**
 * ═══════════════════════════════════════════════════════════════
 * Demo Fixtures — 관리자 대시보드 UI용 시드 데이터
 *
 * ⚠️ 이 모듈의 데이터는 DB 연동 전 UI 데모 전용입니다.
 * 실제 프로덕션에서는 Prisma 쿼리로 교체해야 합니다.
 * ═══════════════════════════════════════════════════════════════
 */

export {
  DEMO_TEAM_MEMBERS,
  DEMO_TEAM_NAME,
  DEMO_AUDIT_ENTRIES,
  type DemoAuditEntry,
} from "./team-fixtures"

export { DEMO_INCIDENTS, DEMO_DETECTION_RULES, DEMO_DR_PLAN } from "./operations-fixtures"

export {
  DEMO_EVENT_SUBSCRIPTIONS,
  DEMO_SAMPLE_EVENTS,
  DEMO_EVENT_SOURCE,
  DEMO_EVENT_METADATA,
} from "./event-fixtures"

export { DEMO_PERSONA_ARCHETYPES, type DemoPersonaArchetype } from "./matching-fixtures"

export {
  DEMO_INCUBATOR_STRATEGY,
  DEMO_INCUBATOR_LIFECYCLE,
  DEMO_INCUBATOR_CUMULATIVE_ACTIVE,
  DEMO_INCUBATOR_MONTHLY_COST_CALLS,
} from "./incubator-fixtures"
