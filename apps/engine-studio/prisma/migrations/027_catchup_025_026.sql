-- ═══════════════════════════════════════════════════════════════
-- 프로덕션 DB 마이그레이션: 025 ~ 026 통합 적용
-- 적용 순서: apply_missing_016_to_024.sql 이후 실행
-- 모든 구문은 IF NOT EXISTS 가드 포함 → 안전 재실행 가능
--
-- 실행 방법:
--   Neon 콘솔 → SQL Editor → 파일 내용 붙여넣기 → Run
--   또는: psql $DATABASE_URL -f 027_catchup_025_026.sql
--
-- 원인: 2026-02-22 추가된 컬럼/테이블이 프로덕션에 미적용
--   → /api/public/auth/register 500 오류 (sns_analysis_count 컬럼 없음)
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 025: PersonaWorldUser SNS 분석 횟수 추적
-- ────────────────────────────────────────────────────────────
ALTER TABLE "persona_world_users"
  ADD COLUMN IF NOT EXISTS "sns_analysis_count" INTEGER NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────────────────────
-- 026: PersonaWorld 보안 감사 로그 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "pw_security_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "details"     JSONB,
    "ipAddress"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pw_security_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pw_security_logs_userId_createdAt_idx"
  ON "pw_security_logs"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "pw_security_logs_eventType_createdAt_idx"
  ON "pw_security_logs"("eventType", "createdAt");
