-- DeepSight AI Engine Studio - Database Migration Script
-- v3.0 - 6D Vector System
-- Generated from schema.prisma
-- 멱등성(Idempotent): 중복 실행해도 안전합니다

-- ============================================
-- ENUMS (이미 존재하면 스킵)
-- ============================================

DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AI_ENGINEER', 'CONTENT_MANAGER', 'ANALYST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PersonaVisibility" AS ENUM ('GLOBAL', 'PRIVATE', 'SHARED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PersonaRole" AS ENUM ('REVIEWER', 'CURATOR', 'EDUCATOR', 'COMPANION', 'ANALYST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PersonaStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'STANDARD', 'LEGACY', 'DEPRECATED', 'PAUSED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PersonaSource" AS ENUM ('MANUAL', 'INCUBATOR', 'MUTATION'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OnboardingLevel" AS ENUM ('LIGHT', 'MEDIUM', 'DEEP'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AlgorithmType" AS ENUM ('COSINE', 'WEIGHTED', 'CONTEXT', 'HYBRID'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AlgorithmStatus" AS ENUM ('DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ChangeType" AS ENUM ('MAJOR', 'MINOR', 'PATCH', 'ROLLBACK'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE', 'NONE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ABTestType" AS ENUM ('ALGORITHM', 'PERSONA', 'PARAMETER', 'WEIGHT', 'DIMENSION'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "QuestionType" AS ENUM ('SLIDER', 'MULTIPLE_CHOICE', 'RANKING', 'TEXT', 'IMAGE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IncubatorStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "FilterType" AS ENUM ('PROFANITY', 'HATE_SPEECH', 'POLITICAL', 'RELIGIOUS', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DeploymentTarget" AS ENUM ('PERSONA', 'ALGORITHM', 'CONFIG'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DeploymentEnv" AS ENUM ('DEV', 'STG', 'PROD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'IDENTIFIED', 'FIXING', 'RESOLVED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "VersionStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EventChannelStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EventPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL', 'DIFFERENTIAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- HELPER FUNCTION FOR CUID
-- ============================================

CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := lpad(to_hex(floor(extract(epoch from now()) * 1000)::bigint), 12, '0');
  random_part := encode(gen_random_bytes(8), 'hex');
  RETURN 'c' || timestamp_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 인증 및 사용자 관리
-- ============================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "email" TEXT NOT NULL,
  "name" TEXT,
  "password" TEXT,
  "image" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,

  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ============================================
-- 페르소나 관리
-- ============================================

CREATE TABLE IF NOT EXISTS "personas" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "organizationId" TEXT,
  "visibility" "PersonaVisibility" NOT NULL DEFAULT 'PRIVATE',
  "sharedWithOrgs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "name" TEXT NOT NULL,
  "role" "PersonaRole" NOT NULL,
  "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "description" TEXT,
  "profileImageUrl" TEXT,
  "promptTemplate" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL DEFAULT '1.0',
  "status" "PersonaStatus" NOT NULL DEFAULT 'DRAFT',
  "qualityScore" DECIMAL(5,2),
  "validationScore" DECIMAL(3,2),
  "validationVersion" INTEGER,
  "lastValidationDate" TIMESTAMP(3),
  "source" "PersonaSource" NOT NULL DEFAULT 'MANUAL',
  "parentPersonaId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "personas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personas_parentPersonaId_fkey" FOREIGN KEY ("parentPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "personas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "persona_vectors" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "personaId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "depth" DECIMAL(3,2) NOT NULL,
  "lens" DECIMAL(3,2) NOT NULL,
  "stance" DECIMAL(3,2) NOT NULL,
  "scope" DECIMAL(3,2) NOT NULL,
  "taste" DECIMAL(3,2) NOT NULL,
  "purpose" DECIMAL(3,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_vectors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_vectors_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 사용자 벡터 및 아키타입
-- ============================================

CREATE TABLE IF NOT EXISTS "user_vectors" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "userId" TEXT NOT NULL,
  "onboardingLevel" "OnboardingLevel" NOT NULL DEFAULT 'LIGHT',
  "depth" DECIMAL(3,2) NOT NULL,
  "lens" DECIMAL(3,2) NOT NULL,
  "stance" DECIMAL(3,2) NOT NULL,
  "scope" DECIMAL(3,2) NOT NULL,
  "taste" DECIMAL(3,2) NOT NULL,
  "purpose" DECIMAL(3,2) NOT NULL,
  "archetype" TEXT,
  "confidenceScores" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_vectors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_vectors_userId_key" ON "user_vectors"("userId");

CREATE TABLE IF NOT EXISTS "archetypes" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "depthMin" DECIMAL(3,2) NOT NULL,
  "depthMax" DECIMAL(3,2) NOT NULL,
  "lensMin" DECIMAL(3,2) NOT NULL,
  "lensMax" DECIMAL(3,2) NOT NULL,
  "stanceMin" DECIMAL(3,2) NOT NULL,
  "stanceMax" DECIMAL(3,2) NOT NULL,
  "scopeMin" DECIMAL(3,2) NOT NULL,
  "scopeMax" DECIMAL(3,2) NOT NULL,
  "tasteMin" DECIMAL(3,2) NOT NULL,
  "tasteMax" DECIMAL(3,2) NOT NULL,
  "purposeMin" DECIMAL(3,2) NOT NULL,
  "purposeMax" DECIMAL(3,2) NOT NULL,
  "recommendedPersonaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "archetypes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "archetypes_name_key" ON "archetypes"("name");

-- ============================================
-- 매칭 알고리즘
-- ============================================

CREATE TABLE IF NOT EXISTS "matching_algorithms" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "algorithmType" "AlgorithmType" NOT NULL,
  "parameters" JSONB,
  "weights" JSONB,
  "contextRules" JSONB,
  "status" "AlgorithmStatus" NOT NULL DEFAULT 'DRAFT',
  "deployedEnv" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "performanceMetrics" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "matching_algorithms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "algorithm_versions" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "algorithmId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "parentVersion" TEXT,
  "changeType" "ChangeType" NOT NULL,
  "changeSummary" TEXT NOT NULL,
  "changeDetails" JSONB,
  "parametersSnapshot" JSONB,
  "weightsSnapshot" JSONB,
  "contextRulesSnapshot" JSONB,
  "deployedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "algorithm_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "algorithm_versions_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 매칭 로그
-- ============================================

CREATE TABLE IF NOT EXISTS "matching_logs" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "requestId" TEXT NOT NULL DEFAULT generate_cuid(),
  "userId" TEXT NOT NULL,
  "algorithmId" TEXT,
  "algorithmVersion" TEXT,
  "context" JSONB,
  "matchedPersonas" JSONB,
  "selectedPersonaId" TEXT,
  "feedback" "FeedbackType",
  "responseTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "feedbackAt" TIMESTAMP(3),

  CONSTRAINT "matching_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "matching_logs_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "matching_logs_selectedPersonaId_fkey" FOREIGN KEY ("selectedPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "matching_logs_requestId_key" ON "matching_logs"("requestId");

CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "userId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "feedbackType" "FeedbackType" NOT NULL,
  "contentId" TEXT,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedbacks_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- A/B 테스트
-- ============================================

CREATE TABLE IF NOT EXISTS "ab_tests" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "testType" "ABTestType" NOT NULL,
  "status" "ABTestStatus" NOT NULL DEFAULT 'DRAFT',
  "controlConfig" JSONB NOT NULL,
  "controlAlgorithmId" TEXT,
  "testConfig" JSONB NOT NULL,
  "testAlgorithmId" TEXT,
  "trafficSplit" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "results" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ab_tests_controlAlgorithmId_fkey" FOREIGN KEY ("controlAlgorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ab_tests_testAlgorithmId_fkey" FOREIGN KEY ("testAlgorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ab_tests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================
-- 심리 프로파일링 템플릿
-- ============================================

CREATE TABLE IF NOT EXISTS "psych_profile_templates" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "onboardingLevel" "OnboardingLevel" NOT NULL,
  "questionOrder" INTEGER NOT NULL,
  "questionText" TEXT NOT NULL,
  "questionType" "QuestionType" NOT NULL,
  "options" JSONB,
  "targetDimensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "weightFormula" JSONB,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "psych_profile_templates_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 골든 샘플 (테스트용)
-- ============================================

CREATE TABLE IF NOT EXISTS "golden_samples" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "contentTitle" TEXT NOT NULL,
  "contentType" TEXT,
  "genre" TEXT,
  "description" TEXT,
  "testQuestion" TEXT NOT NULL,
  "expectedReactions" JSONB,
  "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
  "validationDimensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "golden_samples_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 인큐베이터 로그
-- ============================================

CREATE TABLE IF NOT EXISTS "incubator_logs" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "batchId" TEXT NOT NULL,
  "batchDate" DATE NOT NULL,
  "personaConfig" JSONB,
  "generatedVector" JSONB,
  "generatedPrompt" TEXT,
  "testSampleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "testResults" JSONB,
  "consistencyScore" DECIMAL(3,2),
  "vectorAlignmentScore" DECIMAL(3,2),
  "toneMatchScore" DECIMAL(3,2),
  "reasoningQualityScore" DECIMAL(3,2),
  "status" "IncubatorStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "incubator_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 리뷰 스타일 (v3.0)
-- ============================================

CREATE TABLE IF NOT EXISTS "review_styles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "depthLevel" TEXT NOT NULL,
  "lensLevel" TEXT NOT NULL,
  "stanceLevel" TEXT NOT NULL,
  "scopeLevel" TEXT NOT NULL,
  "tasteLevel" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "review_styles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "style_content_reviews" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "styleId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "contentType" TEXT,
  "rating" DECIMAL(3,1),
  "reviewText" TEXT NOT NULL,
  "reviewSummary" TEXT,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "generationTrigger" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "style_content_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "style_content_reviews_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "review_styles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "style_content_reviews_styleId_contentId_key" ON "style_content_reviews"("styleId", "contentId");

CREATE TABLE IF NOT EXISTS "style_review_logs" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "userId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "styleId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "styleCacheHit" BOOLEAN NOT NULL,
  "transformType" TEXT,
  "styleGenerationCost" DECIMAL(10,6),
  "transformCost" DECIMAL(10,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "style_review_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 페르소나 테스트 결과
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_test_results" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "personaId" TEXT NOT NULL,
  "testType" TEXT NOT NULL,
  "sampleContent" JSONB,
  "response" TEXT,
  "consistencyScore" DECIMAL(3,2),
  "toneMatchScore" DECIMAL(3,2),
  "reasoningScore" DECIMAL(3,2),
  "overallScore" DECIMAL(3,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_test_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_test_results_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 시스템 설정
-- ============================================

CREATE TABLE IF NOT EXISTS "system_configs" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_category_key_key" ON "system_configs"("category", "key");

CREATE TABLE IF NOT EXISTS "safety_filters" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "filterType" "FilterType" NOT NULL,
  "pattern" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "safety_filters_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 배포 관리
-- ============================================

CREATE TABLE IF NOT EXISTS "deployments" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "targetType" "DeploymentTarget" NOT NULL,
  "targetId" TEXT NOT NULL,
  "environment" "DeploymentEnv" NOT NULL,
  "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
  "version" TEXT,
  "notes" TEXT,
  "deployedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 장애 관리
-- ============================================

CREATE TABLE IF NOT EXISTS "incidents" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "IncidentSeverity" NOT NULL,
  "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
  "affectedSystems" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "resolution" TEXT,
  "reportedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "incident_timelines" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "incidentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "incident_timelines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incident_timelines_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 감사 로그
-- ============================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- ============================================
-- 시스템 모니터링
-- ============================================

CREATE TABLE IF NOT EXISTS "system_metrics" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "metricType" TEXT NOT NULL,
  "value" DECIMAL(10,4) NOT NULL,
  "unit" TEXT NOT NULL,
  "tags" JSONB,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "system_metrics_metricType_recordedAt_idx" ON "system_metrics"("metricType", "recordedAt");

-- ============================================
-- 백업 기록
-- ============================================

CREATE TABLE IF NOT EXISTS "backup_records" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "backupType" "BackupType" NOT NULL,
  "status" "BackupStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "size" BIGINT,
  "location" TEXT,
  "notes" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 버전 관리
-- ============================================

CREATE TABLE IF NOT EXISTS "versions" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "tag" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "commitHash" TEXT NOT NULL,
  "branch" TEXT NOT NULL DEFAULT 'main',
  "environment" TEXT,
  "status" "VersionStatus" NOT NULL DEFAULT 'ACTIVE',
  "addedCount" INTEGER NOT NULL DEFAULT 0,
  "modifiedCount" INTEGER NOT NULL DEFAULT 0,
  "deletedCount" INTEGER NOT NULL DEFAULT 0,
  "components" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "versions_tag_key" ON "versions"("tag");

CREATE TABLE IF NOT EXISTS "commits" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "hash" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "authorEmail" TEXT NOT NULL,
  "branch" TEXT NOT NULL DEFAULT 'main',
  "filesChanged" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "commits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "commits_hash_key" ON "commits"("hash");

CREATE TABLE IF NOT EXISTS "branches" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "lastCommitMessage" TEXT NOT NULL DEFAULT '',
  "lastCommitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastCommitAuthor" TEXT NOT NULL DEFAULT '',
  "isProtected" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "aheadCount" INTEGER NOT NULL DEFAULT 0,
  "behindCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "branches_name_key" ON "branches"("name");

-- ============================================
-- 이벤트 버스
-- ============================================

CREATE TABLE IF NOT EXISTS "event_channels" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "eventTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "EventChannelStatus" NOT NULL DEFAULT 'ACTIVE',
  "messagesPerSecond" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalMessages" BIGINT NOT NULL DEFAULT 0,
  "errorRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "event_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "payload" JSONB,
  "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "EventPriority" NOT NULL DEFAULT 'NORMAL',
  "processingTime" INTEGER,
  "error" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "channelId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "events_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "event_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events"("status");
CREATE INDEX IF NOT EXISTS "events_type_idx" ON "events"("type");
CREATE INDEX IF NOT EXISTS "events_createdAt_idx" ON "events"("createdAt");

CREATE TABLE IF NOT EXISTS "dead_letter_events" (
  "id" TEXT NOT NULL DEFAULT generate_cuid(),
  "originalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "error" TEXT NOT NULL,
  "payload" JSONB,
  "retries" INTEGER NOT NULL DEFAULT 0,
  "channelId" TEXT,
  "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dead_letter_events_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "event_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================
-- 초기 데이터 (중복 삽입 방지)
-- ============================================

-- 기본 브랜치
INSERT INTO "branches" ("name", "isDefault", "isProtected", "lastCommitMessage")
VALUES ('main', true, true, 'Initial commit')
ON CONFLICT ("name") DO NOTHING;

-- ============================================
-- 완료
-- ============================================

SELECT 'DeepSight AI Engine Studio 데이터베이스 마이그레이션 완료!' as status;
