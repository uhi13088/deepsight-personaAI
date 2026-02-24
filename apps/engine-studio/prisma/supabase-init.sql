-- DeepSight AI Engine Studio - Database Schema
-- v3.0 - 6D Vector System
-- Supabase PostgreSQL 초기화 스크립트

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AI_ENGINEER', 'CONTENT_MANAGER', 'ANALYST');
CREATE TYPE "PersonaVisibility" AS ENUM ('GLOBAL', 'PRIVATE', 'SHARED');
CREATE TYPE "PersonaRole" AS ENUM ('REVIEWER', 'CURATOR', 'EDUCATOR', 'COMPANION', 'ANALYST');
CREATE TYPE "PersonaStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'STANDARD', 'LEGACY', 'DEPRECATED', 'PAUSED', 'ARCHIVED');
CREATE TYPE "PersonaSource" AS ENUM ('MANUAL', 'INCUBATOR', 'MUTATION');
CREATE TYPE "OnboardingLevel" AS ENUM ('QUICK', 'STANDARD', 'DEEP');
CREATE TYPE "AlgorithmType" AS ENUM ('COSINE', 'WEIGHTED', 'CONTEXT', 'HYBRID');
CREATE TYPE "AlgorithmStatus" AS ENUM ('DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED');
CREATE TYPE "ChangeType" AS ENUM ('MAJOR', 'MINOR', 'PATCH', 'ROLLBACK');
CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE', 'NONE');
CREATE TYPE "ABTestType" AS ENUM ('ALGORITHM', 'PERSONA', 'PARAMETER', 'WEIGHT', 'DIMENSION');
CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "QuestionType" AS ENUM ('SLIDER', 'MULTIPLE_CHOICE', 'RANKING', 'TEXT', 'IMAGE');
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "IncubatorStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'APPROVED', 'REJECTED');
CREATE TYPE "FilterType" AS ENUM ('PROFANITY', 'HATE_SPEECH', 'POLITICAL', 'RELIGIOUS', 'CUSTOM');
CREATE TYPE "DeploymentTarget" AS ENUM ('PERSONA', 'ALGORITHM', 'CONFIG');
CREATE TYPE "DeploymentEnv" AS ENUM ('DEV', 'STG', 'PROD');
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK');
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'IDENTIFIED', 'FIXING', 'RESOLVED', 'CLOSED');
CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL', 'DIFFERENTIAL');
CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- ============================================
-- TABLES
-- ============================================

-- Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Accounts (NextAuth)
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
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
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- Sessions (NextAuth)
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- Verification Tokens (NextAuth)
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- Personas
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
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
    "qualityScore" DECIMAL(5, 2),
    "validationScore" DECIMAL(3, 2),
    "validationVersion" INTEGER,
    "lastValidationDate" TIMESTAMP(3),
    "source" "PersonaSource" NOT NULL DEFAULT 'MANUAL',
    "parentPersonaId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- Persona Vectors
CREATE TABLE "persona_vectors" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "depth" DECIMAL(3, 2) NOT NULL,
    "lens" DECIMAL(3, 2) NOT NULL,
    "stance" DECIMAL(3, 2) NOT NULL,
    "scope" DECIMAL(3, 2) NOT NULL,
    "taste" DECIMAL(3, 2) NOT NULL,
    "purpose" DECIMAL(3, 2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "persona_vectors_pkey" PRIMARY KEY ("id")
);

-- User Vectors
CREATE TABLE "user_vectors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "onboardingLevel" "OnboardingLevel" NOT NULL DEFAULT 'QUICK',
    "depth" DECIMAL(3, 2) NOT NULL,
    "lens" DECIMAL(3, 2) NOT NULL,
    "stance" DECIMAL(3, 2) NOT NULL,
    "scope" DECIMAL(3, 2) NOT NULL,
    "taste" DECIMAL(3, 2) NOT NULL,
    "purpose" DECIMAL(3, 2) NOT NULL,
    "archetype" TEXT,
    "confidenceScores" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_vectors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_vectors_userId_key" ON "user_vectors"("userId");

-- Archetypes
CREATE TABLE "archetypes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "depthMin" DECIMAL(3, 2) NOT NULL,
    "depthMax" DECIMAL(3, 2) NOT NULL,
    "lensMin" DECIMAL(3, 2) NOT NULL,
    "lensMax" DECIMAL(3, 2) NOT NULL,
    "stanceMin" DECIMAL(3, 2) NOT NULL,
    "stanceMax" DECIMAL(3, 2) NOT NULL,
    "scopeMin" DECIMAL(3, 2) NOT NULL,
    "scopeMax" DECIMAL(3, 2) NOT NULL,
    "tasteMin" DECIMAL(3, 2) NOT NULL,
    "tasteMax" DECIMAL(3, 2) NOT NULL,
    "purposeMin" DECIMAL(3, 2) NOT NULL,
    "purposeMax" DECIMAL(3, 2) NOT NULL,
    "recommendedPersonaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "archetypes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "archetypes_name_key" ON "archetypes"("name");

-- Matching Algorithms
CREATE TABLE "matching_algorithms" (
    "id" TEXT NOT NULL,
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

-- Algorithm Versions
CREATE TABLE "algorithm_versions" (
    "id" TEXT NOT NULL,
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
    CONSTRAINT "algorithm_versions_pkey" PRIMARY KEY ("id")
);

-- Matching Logs
CREATE TABLE "matching_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
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
    CONSTRAINT "matching_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "matching_logs_requestId_key" ON "matching_logs"("requestId");

-- Feedbacks
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "contentId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- AB Tests
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "testType" "ABTestType" NOT NULL,
    "status" "ABTestStatus" NOT NULL DEFAULT 'DRAFT',
    "controlConfig" JSONB NOT NULL,
    "controlAlgorithmId" TEXT,
    "testConfig" JSONB NOT NULL,
    "testAlgorithmId" TEXT,
    "trafficSplit" DECIMAL(3, 2) NOT NULL DEFAULT 0.5,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "results" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- Psych Profile Templates
CREATE TABLE "psych_profile_templates" (
    "id" TEXT NOT NULL,
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

-- Golden Samples
CREATE TABLE "golden_samples" (
    "id" TEXT NOT NULL,
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

-- Incubator Logs
CREATE TABLE "incubator_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchDate" DATE NOT NULL,
    "personaConfig" JSONB,
    "generatedVector" JSONB,
    "generatedPrompt" TEXT,
    "testSampleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "testResults" JSONB,
    "consistencyScore" DECIMAL(3, 2),
    "vectorAlignmentScore" DECIMAL(3, 2),
    "toneMatchScore" DECIMAL(3, 2),
    "reasoningQualityScore" DECIMAL(3, 2),
    "status" "IncubatorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incubator_logs_pkey" PRIMARY KEY ("id")
);

-- Review Styles
CREATE TABLE "review_styles" (
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

-- Style Content Reviews
CREATE TABLE "style_content_reviews" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT,
    "rating" DECIMAL(3, 1),
    "reviewText" TEXT NOT NULL,
    "reviewSummary" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generationTrigger" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "style_content_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "style_content_reviews_styleId_contentId_key" ON "style_content_reviews"("styleId", "contentId");

-- Style Review Logs
CREATE TABLE "style_review_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "styleCacheHit" BOOLEAN NOT NULL,
    "transformType" TEXT,
    "styleGenerationCost" DECIMAL(10, 6),
    "transformCost" DECIMAL(10, 6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "style_review_logs_pkey" PRIMARY KEY ("id")
);

-- Persona Test Results
CREATE TABLE "persona_test_results" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "sampleContent" JSONB,
    "response" TEXT,
    "consistencyScore" DECIMAL(3, 2),
    "toneMatchScore" DECIMAL(3, 2),
    "reasoningScore" DECIMAL(3, 2),
    "overallScore" DECIMAL(3, 2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "persona_test_results_pkey" PRIMARY KEY ("id")
);

-- System Configs
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "system_configs_category_key_key" ON "system_configs"("category", "key");

-- Safety Filters
CREATE TABLE "safety_filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterType" "FilterType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safety_filters_pkey" PRIMARY KEY ("id")
);

-- Deployments
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
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

-- Incidents
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
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

-- Incident Timelines
CREATE TABLE "incident_timelines" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incident_timelines_pkey" PRIMARY KEY ("id")
);

-- Audit Logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- System Metrics
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DECIMAL(10, 4) NOT NULL,
    "unit" TEXT NOT NULL,
    "tags" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "system_metrics_metricType_recordedAt_idx" ON "system_metrics"("metricType", "recordedAt");

-- Backup Records
CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
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
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "personas" ADD CONSTRAINT "personas_parentPersonaId_fkey" FOREIGN KEY ("parentPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "personas" ADD CONSTRAINT "personas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "persona_vectors" ADD CONSTRAINT "persona_vectors_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "algorithm_versions" ADD CONSTRAINT "algorithm_versions_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matching_logs" ADD CONSTRAINT "matching_logs_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matching_logs" ADD CONSTRAINT "matching_logs_selectedPersonaId_fkey" FOREIGN KEY ("selectedPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_controlAlgorithmId_fkey" FOREIGN KEY ("controlAlgorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_testAlgorithmId_fkey" FOREIGN KEY ("testAlgorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "style_content_reviews" ADD CONSTRAINT "style_content_reviews_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "review_styles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "persona_test_results" ADD CONSTRAINT "persona_test_results_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_timelines" ADD CONSTRAINT "incident_timelines_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
