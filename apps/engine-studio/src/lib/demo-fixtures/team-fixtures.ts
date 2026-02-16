/**
 * 팀 관리 + 감사 로그 데모 데이터
 * ⚠️ DB 연동 전 UI 데모 전용
 */
import type { AuditAction, AuditTargetType, Role } from "@/lib/team"

// ── 팀 기본 정보 ────────────────────────────────────────────

export const DEMO_TEAM_NAME = "DeepSight"

export const DEMO_TEAM_MEMBERS: Array<{
  email: string
  name: string
  role: Role
}> = [
  { email: "engineer@example.com", name: "Kim Engineer", role: "ai_engineer" },
  { email: "content@example.com", name: "Lee Content", role: "content_manager" },
  { email: "analyst@example.com", name: "Park Analyst", role: "analyst" },
]

// ── 감사 로그 시드 ──────────────────────────────────────────

export interface DemoAuditEntry {
  actorId: string
  actorName: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  details: Record<string, string>
  ip: string
  offset: number
}

export const DEMO_AUDIT_ENTRIES: DemoAuditEntry[] = [
  {
    actorId: "demo-u1",
    actorName: "Admin",
    action: "team.created",
    targetType: "team",
    targetId: "demo-team-1",
    details: { name: DEMO_TEAM_NAME },
    ip: "0.0.0.0",
    offset: -86400000 * 5,
  },
  {
    actorId: "demo-u1",
    actorName: "Admin",
    action: "user.invited",
    targetType: "user",
    targetId: "demo-u2",
    details: { email: "engineer@example.com", role: "ai_engineer" },
    ip: "0.0.0.0",
    offset: -86400000 * 4,
  },
  {
    actorId: "demo-u1",
    actorName: "Admin",
    action: "user.invited",
    targetType: "user",
    targetId: "demo-u3",
    details: { email: "content@example.com", role: "content_manager" },
    ip: "0.0.0.0",
    offset: -86400000 * 4,
  },
  {
    actorId: "demo-u2",
    actorName: "Kim Engineer",
    action: "persona.created",
    targetType: "persona",
    targetId: "demo-p1",
    details: { name: "심층 분석가" },
    ip: "0.0.0.0",
    offset: -86400000 * 3,
  },
  {
    actorId: "demo-u2",
    actorName: "Kim Engineer",
    action: "persona.updated",
    targetType: "persona",
    targetId: "demo-p1",
    details: { field: "vectors", description: "L1 벡터 조정" },
    ip: "0.0.0.0",
    offset: -86400000 * 2,
  },
  {
    actorId: "demo-u2",
    actorName: "Kim Engineer",
    action: "matching.executed",
    targetType: "matching",
    targetId: "demo-match-1",
    details: { mode: "single", score: "0.87" },
    ip: "0.0.0.0",
    offset: -86400000 * 2,
  },
  {
    actorId: "demo-u3",
    actorName: "Lee Content",
    action: "content.created",
    targetType: "content",
    targetId: "demo-c1",
    details: { title: "트렌드 리포트" },
    ip: "0.0.0.0",
    offset: -86400000,
  },
  {
    actorId: "demo-u3",
    actorName: "Lee Content",
    action: "content.published",
    targetType: "content",
    targetId: "demo-c1",
    details: { title: "트렌드 리포트" },
    ip: "0.0.0.0",
    offset: -86400000,
  },
  {
    actorId: "demo-u1",
    actorName: "Admin",
    action: "settings.updated",
    targetType: "settings",
    targetId: "global",
    details: { key: "matching.threshold", oldValue: "0.5", newValue: "0.6" },
    ip: "0.0.0.0",
    offset: -43200000,
  },
  {
    actorId: "demo-u2",
    actorName: "Kim Engineer",
    action: "persona.published",
    targetType: "persona",
    targetId: "demo-p1",
    details: { name: "심층 분석가" },
    ip: "0.0.0.0",
    offset: -3600000,
  },
  {
    actorId: "demo-u1",
    actorName: "Admin",
    action: "user.role_changed",
    targetType: "user",
    targetId: "demo-u3",
    details: { from: "content_manager", to: "analyst" },
    ip: "0.0.0.0",
    offset: -1800000,
  },
  {
    actorId: "demo-u2",
    actorName: "Kim Engineer",
    action: "matching.configured",
    targetType: "matching",
    targetId: "demo-config-1",
    details: { parameter: "diversity_weight", value: "0.3" },
    ip: "0.0.0.0",
    offset: -600000,
  },
]
