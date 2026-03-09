-- T406: MetaCognitionReport 메타 인지 보고서
CREATE TABLE IF NOT EXISTS "meta_cognition_reports" (
  "id"             TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personaId"      TEXT NOT NULL REFERENCES "personas"("id") ON DELETE CASCADE,
  "pisSnapshot"    DECIMAL(3,2) NOT NULL,
  "selfAssessment" TEXT NOT NULL,
  "driftAwareness" TEXT NOT NULL,
  "memoryHealth"   TEXT NOT NULL,
  "selfReport"     TEXT NOT NULL,
  "suggestion"     TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "meta_cognition_reports_personaId_createdAt_idx"
  ON "meta_cognition_reports"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "meta_cognition_reports_selfAssessment_idx"
  ON "meta_cognition_reports"("selfAssessment");
