-- T403: AutonomyCorrectionLog 감사 로그
CREATE TABLE IF NOT EXISTS "autonomy_correction_logs" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personaId"           TEXT NOT NULL REFERENCES "personas"("id") ON DELETE CASCADE,
  "sessionId"           TEXT NOT NULL,
  "severity"            TEXT NOT NULL,
  "confidence"          DECIMAL(3,2) NOT NULL,
  "category"            TEXT NOT NULL,
  "patchSummary"        TEXT NOT NULL,
  "pisBeforeCorrection" DECIMAL(3,2),
  "reviewed"            BOOLEAN NOT NULL DEFAULT false,
  "reviewedBy"          TEXT,
  "reviewedAt"          TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "autonomy_correction_logs_personaId_createdAt_idx"
  ON "autonomy_correction_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "autonomy_correction_logs_reviewed_idx"
  ON "autonomy_correction_logs"("reviewed");
