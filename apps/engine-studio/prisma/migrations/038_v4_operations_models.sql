-- ============================================
-- Migration 038: v4.0 Operations Models (T263~T275)
-- ============================================
-- T263: PersonaRelationship v4.0 fields (stage/type/counters)
-- T264: PersonaState activity counters
-- T265: ConsumptionLog v4.0 fields
-- T266: PersonaActivityLog security/provenance fields
-- T267: UserTrustScore (new)
-- T268: PWQuarantineEntry (new)
-- T269: ModerationLog (new)
-- T270: PostQualityLog + CommentQualityLog (new)
-- T271: InterviewLog (new)
-- T272: KPISnapshot (new)
-- T273: DailyCostReport (new)
-- T274: ContentReport (new)
-- T275: BudgetConfig (new)
-- ============================================

-- T263: PersonaRelationship v4.0 fields
ALTER TABLE "persona_relationships"
  ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'STRANGER',
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'NEUTRAL',
  ADD COLUMN IF NOT EXISTS "positiveComments" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "negativeComments" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalInteractions" INTEGER NOT NULL DEFAULT 0;

-- T264: PersonaState activity counters
ALTER TABLE "persona_states"
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "postsThisWeek" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "commentsThisWeek" INTEGER NOT NULL DEFAULT 0;

-- T265: ConsumptionLog v4.0 fields
ALTER TABLE "consumption_logs"
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "interactionType" TEXT,
  ADD COLUMN IF NOT EXISTS "poignancyScore" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "retentionScore" DECIMAL(3,2);

CREATE INDEX IF NOT EXISTS "consumption_logs_sourceType_idx" ON "consumption_logs"("sourceType");

-- T266: PersonaActivityLog security/provenance fields
ALTER TABLE "persona_activity_logs"
  ADD COLUMN IF NOT EXISTS "securityCheck" JSONB,
  ADD COLUMN IF NOT EXISTS "provenanceData" JSONB;

-- T267: UserTrustScore
CREATE TABLE IF NOT EXISTS "user_trust_scores" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" DECIMAL(3,2) NOT NULL DEFAULT 0.80,
  "inspectionLevel" TEXT NOT NULL DEFAULT 'HIGH',
  "blockCount" INTEGER NOT NULL DEFAULT 0,
  "warnCount" INTEGER NOT NULL DEFAULT 0,
  "reportCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_trust_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_trust_scores_userId_key" ON "user_trust_scores"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_trust_scores_userId_fkey'
      AND table_name = 'user_trust_scores'
  ) THEN
    ALTER TABLE "user_trust_scores"
      ADD CONSTRAINT "user_trust_scores_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- T268: PWQuarantineEntry
CREATE TABLE IF NOT EXISTS "pw_quarantine_entries" (
  "id" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pw_quarantine_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pw_quarantine_entries_status_idx" ON "pw_quarantine_entries"("status");
CREATE INDEX IF NOT EXISTS "pw_quarantine_entries_personaId_idx" ON "pw_quarantine_entries"("personaId");
CREATE INDEX IF NOT EXISTS "pw_quarantine_entries_expiresAt_idx" ON "pw_quarantine_entries"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pw_quarantine_entries_personaId_fkey'
      AND table_name = 'pw_quarantine_entries'
  ) THEN
    ALTER TABLE "pw_quarantine_entries"
      ADD CONSTRAINT "pw_quarantine_entries_personaId_fkey"
      FOREIGN KEY ("personaId") REFERENCES "personas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- T269: ModerationLog
CREATE TABLE IF NOT EXISTS "moderation_logs" (
  "id" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "personaId" TEXT,
  "stage" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "violations" JSONB,
  "actions" JSONB,
  "processingTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_logs_personaId_idx" ON "moderation_logs"("personaId");
CREATE INDEX IF NOT EXISTS "moderation_logs_contentId_idx" ON "moderation_logs"("contentId");
CREATE INDEX IF NOT EXISTS "moderation_logs_createdAt_idx" ON "moderation_logs"("createdAt");

-- T270: PostQualityLog + CommentQualityLog
CREATE TABLE IF NOT EXISTS "post_quality_logs" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "voiceSpecMatch" DECIMAL(3,2) NOT NULL,
  "factbookViolations" INTEGER NOT NULL DEFAULT 0,
  "repetitionScore" DECIMAL(3,2) NOT NULL,
  "topicRelevance" DECIMAL(3,2) NOT NULL,
  "overallScore" DECIMAL(3,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "post_quality_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "post_quality_logs_personaId_createdAt_idx" ON "post_quality_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "post_quality_logs_postId_idx" ON "post_quality_logs"("postId");

CREATE TABLE IF NOT EXISTS "comment_quality_logs" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "toneMatch" DECIMAL(3,2) NOT NULL,
  "contextRelevance" DECIMAL(3,2) NOT NULL,
  "memoryReference" BOOLEAN NOT NULL DEFAULT false,
  "naturalness" DECIMAL(3,2) NOT NULL,
  "overallScore" DECIMAL(3,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "comment_quality_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comment_quality_logs_personaId_createdAt_idx" ON "comment_quality_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "comment_quality_logs_commentId_idx" ON "comment_quality_logs"("commentId");

-- T271: InterviewLog
CREATE TABLE IF NOT EXISTS "interview_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "questionCount" INTEGER NOT NULL,
  "passCount" INTEGER NOT NULL,
  "warnCount" INTEGER NOT NULL,
  "failCount" INTEGER NOT NULL,
  "overallScore" DECIMAL(3,2) NOT NULL,
  "goldenSampleScore" DECIMAL(3,2),
  "contextualScore" DECIMAL(3,2),
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interview_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interview_logs_personaId_createdAt_idx" ON "interview_logs"("personaId", "createdAt");

-- T272: KPISnapshot
CREATE TABLE IF NOT EXISTS "kpi_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotType" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "period" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kpi_snapshots_snapshotType_createdAt_idx" ON "kpi_snapshots"("snapshotType", "createdAt");

-- T273: DailyCostReport
CREATE TABLE IF NOT EXISTS "daily_cost_reports" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "totalCost" DECIMAL(10,4) NOT NULL,
  "postingCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "commentCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "interviewCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "arenaCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "otherCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "llmCalls" INTEGER NOT NULL DEFAULT 0,
  "cacheHitRate" DECIMAL(3,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_cost_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_cost_reports_date_key" ON "daily_cost_reports"("date");

-- T274: ContentReport
CREATE TABLE IF NOT EXISTS "content_reports" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX IF NOT EXISTS "content_reports_targetId_idx" ON "content_reports"("targetId");
CREATE INDEX IF NOT EXISTS "content_reports_reporterId_idx" ON "content_reports"("reporterId");

-- T275: BudgetConfig
CREATE TABLE IF NOT EXISTS "budget_configs" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "dailyBudget" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  "monthlyBudget" DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  "costMode" TEXT NOT NULL DEFAULT 'BALANCE',
  "alertThresholds" JSONB,
  "autoActions" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,

  CONSTRAINT "budget_configs_pkey" PRIMARY KEY ("id")
);
