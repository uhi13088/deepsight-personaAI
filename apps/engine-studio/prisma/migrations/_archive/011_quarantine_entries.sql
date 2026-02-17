-- v4.0 Security: QuarantineEntry table for Output Sentinel
-- T140: 격리 시스템 (flagged 콘텐츠 관리)

CREATE TYPE "QuarantineStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED');

CREATE TABLE "quarantine_entries" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "violations" JSONB NOT NULL,
    "status" "QuarantineStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quarantine_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quarantine_entries_personaId_idx" ON "quarantine_entries"("personaId");
CREATE INDEX "quarantine_entries_status_idx" ON "quarantine_entries"("status");
CREATE INDEX "quarantine_entries_createdAt_idx" ON "quarantine_entries"("createdAt");
