-- T386: AlertLog 테이블 — 알림 발송 이력 저장

CREATE TABLE IF NOT EXISTS "alert_logs" (
  "id"        TEXT NOT NULL,
  "severity"  TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "channel"   TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "success"   BOOLEAN NOT NULL DEFAULT false,
  "error"     TEXT,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "alert_logs_severity_idx" ON "alert_logs"("severity");
CREATE INDEX IF NOT EXISTS "alert_logs_category_idx" ON "alert_logs"("category");
CREATE INDEX IF NOT EXISTS "alert_logs_createdAt_idx" ON "alert_logs"("createdAt");
