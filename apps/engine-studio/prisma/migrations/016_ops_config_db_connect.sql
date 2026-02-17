-- ============================================================
-- T158: 운영/설정 API 전면 DB 동적 연결
-- 새 테이블 3개 + 기존 테이블 컬럼 추가
-- ============================================================

-- ── 1. api_endpoints: scope, healthCheckConfig, tags 추가 ──

ALTER TABLE "api_endpoints"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS "rate_limit_config" JSONB,
  ADD COLUMN IF NOT EXISTS "health_check_config" JSONB,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';

-- ── 2. archetypes: nameKo, referenceVector, thresholdConfig, isBuiltin 추가 ──

ALTER TABLE "archetypes"
  ADD COLUMN IF NOT EXISTS "name_ko" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_vector" JSONB,
  ADD COLUMN IF NOT EXISTS "threshold_config" JSONB,
  ADD COLUMN IF NOT EXISTS "is_builtin" BOOLEAN NOT NULL DEFAULT false;

-- ── 3. system_logs: 시스템 로그 (모니터링) ──

CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "trace_id" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "system_logs_level_createdAt_idx"
  ON "system_logs" ("level", "createdAt");

CREATE INDEX IF NOT EXISTS "system_logs_service_createdAt_idx"
  ON "system_logs" ("service", "createdAt");

-- ── 4. post_mortems: 장애 포스트모템 ──

CREATE TABLE IF NOT EXISTS "post_mortems" (
  "id" TEXT NOT NULL,
  "incident_id" TEXT NOT NULL,
  "root_cause" TEXT NOT NULL,
  "affected_users" INTEGER NOT NULL DEFAULT 0,
  "downtime_minutes" INTEGER NOT NULL DEFAULT 0,
  "data_loss" BOOLEAN NOT NULL DEFAULT false,
  "action_items" JSONB,
  "lessons" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "post_mortems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "post_mortems_incident_id_idx"
  ON "post_mortems" ("incident_id");

ALTER TABLE "post_mortems"
  ADD CONSTRAINT "post_mortems_incident_id_fkey"
  FOREIGN KEY ("incident_id") REFERENCES "incidents" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. dr_drills: 재해 복구 훈련 ──

DO $$ BEGIN
  CREATE TYPE "DRDrillStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "dr_drills" (
  "id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "status" "DRDrillStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "actual_rto_minutes" INTEGER,
  "actual_rpo_minutes" INTEGER,
  "issues" TEXT[] NOT NULL DEFAULT '{}',
  "improvements" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dr_drills_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dr_drills_status_idx"
  ON "dr_drills" ("status");

CREATE INDEX IF NOT EXISTS "dr_drills_plan_id_idx"
  ON "dr_drills" ("plan_id");
