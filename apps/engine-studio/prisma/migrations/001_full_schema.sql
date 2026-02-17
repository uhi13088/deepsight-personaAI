-- ============================================================
-- DeepSight Engine Studio — Consolidated Schema Migration
-- Generated: 2026-02-17
-- Source: schema.prisma (v3.0 106D+ Multi-Layer Vector System)
--
-- 이 파일은 001~017 + 20260208 마이그레이션을 하나로 통합한 것입니다.
-- 멱등성(Idempotent): 중복 실행해도 안전합니다.
-- ============================================================

-- ############################################################
-- EXTENSIONS
-- ############################################################

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ############################################################
-- SECTION 1: ENUMS
-- ############################################################

-- 인증 및 사용자
DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AI_ENGINEER', 'CONTENT_MANAGER', 'ANALYST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 페르소나 관리
DO $$ BEGIN CREATE TYPE "PersonaVisibility" AS ENUM ('GLOBAL', 'PRIVATE', 'SHARED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PersonaRole" AS ENUM ('REVIEWER', 'CURATOR', 'EDUCATOR', 'COMPANION', 'ANALYST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PersonaStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'STANDARD', 'LEGACY', 'DEPRECATED', 'PAUSED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PersonaSource" AS ENUM ('MANUAL', 'INCUBATOR', 'MUTATION', 'AUTO_GENERATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExpertiseLevel" AS ENUM ('CASUAL', 'ENTHUSIAST', 'EXPERT', 'CRITIC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PostFrequency" AS ENUM ('RARE', 'OCCASIONAL', 'MODERATE', 'ACTIVE', 'HYPERACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LayerType" AS ENUM ('SOCIAL', 'TEMPERAMENT', 'NARRATIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OnboardingLevel" AS ENUM ('LIGHT', 'MEDIUM', 'DEEP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 매칭 알고리즘
DO $$ BEGIN CREATE TYPE "AlgorithmType" AS ENUM ('COSINE', 'WEIGHTED', 'CONTEXT', 'HYBRID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AlgorithmStatus" AS ENUM ('DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ChangeType" AS ENUM ('MAJOR', 'MINOR', 'PATCH', 'ROLLBACK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE', 'NONE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ABTestType" AS ENUM ('ALGORITHM', 'PERSONA', 'PARAMETER', 'WEIGHT', 'DIMENSION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 설문 및 프로파일링
DO $$ BEGIN CREATE TYPE "QuestionType" AS ENUM ('SLIDER', 'MULTIPLE_CHOICE', 'RANKING', 'TEXT', 'IMAGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IncubatorStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- API 엔드포인트
DO $$ BEGIN CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EndpointStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FilterType" AS ENUM ('PROFANITY', 'HATE_SPEECH', 'POLITICAL', 'RELIGIOUS', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 배포 관리
DO $$ BEGIN CREATE TYPE "DeploymentTarget" AS ENUM ('PERSONA', 'ALGORITHM', 'CONFIG'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DeploymentEnv" AS ENUM ('DEV', 'STG', 'PROD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 장애 관리
DO $$ BEGIN CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'IDENTIFIED', 'FIXING', 'RESOLVED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 버전 관리
DO $$ BEGIN CREATE TYPE "VersionStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PersonaWorld SNS
DO $$ BEGIN CREATE TYPE "PersonaPostType" AS ENUM (
  'REVIEW', 'THOUGHT', 'RECOMMENDATION', 'REACTION', 'QUESTION',
  'LIST', 'THREAD', 'VS_BATTLE', 'QNA', 'CURATION',
  'DEBATE', 'MEME', 'COLLAB', 'TRIVIA', 'PREDICTION',
  'ANNIVERSARY', 'BEHIND_STORY'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ActivityTrigger" AS ENUM (
  'SCHEDULED', 'CONTENT_RELEASE', 'SOCIAL_EVENT',
  'USER_INTERACTION', 'TRENDING', 'AUTONOMOUS'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ProfileQuality" AS ENUM ('BASIC', 'STANDARD', 'ADVANCED', 'PREMIUM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "SNSPlatform" AS ENUM (
  'NETFLIX', 'YOUTUBE', 'INSTAGRAM', 'SPOTIFY',
  'LETTERBOXD', 'TWITTER', 'TIKTOK'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 신고 및 모더레이션
DO $$ BEGIN CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'MISINFORMATION', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PersonaActivityType" AS ENUM (
  'POST_CREATED', 'POST_LIKED', 'POST_COMMENTED', 'POST_REPOSTED',
  'PERSONA_FOLLOWED', 'PERSONA_UNFOLLOWED',
  'DEBATE_STARTED', 'COLLAB_STARTED', 'SYSTEM'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PersonaWorld v3: 소비 기록
DO $$ BEGIN CREATE TYPE "ConsumptionContentType" AS ENUM ('MOVIE', 'DRAMA', 'MUSIC', 'BOOK', 'ARTICLE', 'GAME', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ConsumptionSource" AS ENUM ('AUTONOMOUS', 'FEED', 'RECOMMENDATION', 'ONBOARDING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 이벤트 버스
DO $$ BEGIN CREATE TYPE "EventChannelStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EventPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 인터랙션 로그
DO $$ BEGIN CREATE TYPE "ParticipantType" AS ENUM ('PERSONA', 'USER', 'CONTENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InteractionType" AS ENUM ('CONVERSATION', 'COMMENT', 'REPLY', 'REACTION', 'POST', 'MENTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LlmCallStatus" AS ENUM ('SUCCESS', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InteractionSource" AS ENUM ('DIRECT', 'PERSONA_RELAY', 'EXTERNAL_FEED', 'SYSTEM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PostSource" AS ENUM ('AUTONOMOUS', 'FEED_INSPIRED', 'ARENA_TEST', 'SCHEDULED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 블로그
DO $$ BEGIN CREATE TYPE "BlogCategory" AS ENUM ('TECH', 'PRODUCT', 'INSIGHT', 'ANNOUNCEMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 격리 시스템
DO $$ BEGIN CREATE TYPE "QuarantineStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 아레나
DO $$ BEGIN CREATE TYPE "ArenaMode" AS ENUM ('SPARRING_1V1'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ArenaSessionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProfileLoadLevel" AS ENUM ('FULL', 'STANDARD', 'LITE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ArenaJudgmentMethod" AS ENUM ('RULE_BASED', 'LLM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ArenaTokenPhase" AS ENUM ('TURN', 'JUDGMENT', 'PROFILE_LOAD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DR 훈련
DO $$ BEGIN CREATE TYPE "DRDrillStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 백업
DO $$ BEGIN CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL', 'DIFFERENTIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ############################################################
-- SECTION 2: HELPER FUNCTION
-- ############################################################

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

-- ############################################################
-- SECTION 3: TABLES (dependency order)
-- ############################################################

-- ============================================
-- 1. users
-- ============================================

CREATE TABLE IF NOT EXISTS "users" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- ============================================
-- 2. accounts (FK → users)
-- ============================================

CREATE TABLE IF NOT EXISTS "accounts" (
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

  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- ============================================
-- 3. sessions (FK → users)
-- ============================================

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- ============================================
-- 4. verification_tokens
-- ============================================

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ============================================
-- 5. personas (FK → users, self-ref)
-- ============================================

CREATE TABLE IF NOT EXISTS "personas" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "visibility" "PersonaVisibility" NOT NULL DEFAULT 'PRIVATE',
  "sharedWithOrgs" TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- 기본 정보
  "name" TEXT NOT NULL,
  "role" "PersonaRole" NOT NULL,
  "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "description" TEXT,
  "profileImageUrl" TEXT,

  -- Layer 2: 캐릭터 속성
  "handle" TEXT,
  "tagline" TEXT,
  "birthDate" TIMESTAMP(3),
  "country" TEXT DEFAULT 'KR',
  "region" TEXT,
  "warmth" DECIMAL(3,2),
  "expertiseLevel" "ExpertiseLevel" NOT NULL DEFAULT 'ENTHUSIAST',
  "speechPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "quirks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "background" TEXT,
  "favoriteGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "dislikedGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "viewingHabits" TEXT,

  -- 활동성 속성 (PersonaWorld용)
  "sociability" DECIMAL(3,2),
  "initiative" DECIMAL(3,2),
  "expressiveness" DECIMAL(3,2),
  "interactivity" DECIMAL(3,2),
  "postFrequency" "PostFrequency" NOT NULL DEFAULT 'MODERATE',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
  "activeHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "peakHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

  -- 콘텐츠/관계 설정 (JSON)
  "contentSettings" JSONB,
  "relationshipSettings" JSONB,

  -- 프롬프트 템플릿
  "promptTemplate" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL DEFAULT '1.0',
  "basePrompt" TEXT,
  "reviewPrompt" TEXT,
  "postPrompt" TEXT,
  "commentPrompt" TEXT,
  "interactionPrompt" TEXT,
  "specialPrompts" JSONB,

  -- 품질 및 검증
  "status" "PersonaStatus" NOT NULL DEFAULT 'DRAFT',
  "qualityScore" DECIMAL(5,2),
  "validationScore" DECIMAL(3,2),
  "validationVersion" INTEGER,
  "lastValidationDate" TIMESTAMP(3),
  "consistencyScore" DECIMAL(3,2),

  -- 생성 소스
  "source" "PersonaSource" NOT NULL DEFAULT 'MANUAL',
  "generationConfig" JSONB,
  "parentPersonaId" TEXT,

  -- 샘플 콘텐츠
  "sampleContents" JSONB,

  -- v3.0: 3-Layer Paradox & Dynamics (JSON)
  "paradoxConfig" JSONB,
  "dynamicsConfig" JSONB,

  -- v3.0: Qualitative Dimensions (JSON)
  "backstory" JSONB,
  "pressureContext" JSONB,
  "voiceProfile" JSONB,
  "zeitgeist" JSONB,

  -- v3.0: Interaction Rules (JSON)
  "interactionRules" JSONB,

  -- v3.0: Archetype & Scores
  "archetypeId" TEXT,
  "paradoxScore" DECIMAL(4,3),
  "dimensionalityScore" DECIMAL(4,3),
  "engineVersion" TEXT DEFAULT '3.0',

  -- 타임스탬프
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "personas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personas_parentPersonaId_fkey" FOREIGN KEY ("parentPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "personas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================
-- 6. persona_vectors (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_vectors" (
  "id" TEXT NOT NULL,
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
-- 7. persona_layer_vectors (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_layer_vectors" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "layerType" "LayerType" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "dim1" DECIMAL(4,3),
  "dim2" DECIMAL(4,3),
  "dim3" DECIMAL(4,3),
  "dim4" DECIMAL(4,3),
  "dim5" DECIMAL(4,3),
  "dim6" DECIMAL(4,3),
  "dim7" DECIMAL(4,3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_layer_vectors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_layer_vectors_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_layer_vectors_personaId_layerType_version_key"
  ON "persona_layer_vectors"("personaId", "layerType", "version");
CREATE INDEX IF NOT EXISTS "persona_layer_vectors_personaId_idx"
  ON "persona_layer_vectors"("personaId");
CREATE INDEX IF NOT EXISTS "persona_layer_vectors_layerType_idx"
  ON "persona_layer_vectors"("layerType");

-- ============================================
-- 8. user_vectors
-- ============================================

CREATE TABLE IF NOT EXISTS "user_vectors" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "onboardingLevel" "OnboardingLevel" NOT NULL DEFAULT 'LIGHT',
  "depth" DECIMAL(3,2) NOT NULL,
  "lens" DECIMAL(3,2) NOT NULL,
  "stance" DECIMAL(3,2) NOT NULL,
  "scope" DECIMAL(3,2) NOT NULL,
  "taste" DECIMAL(3,2) NOT NULL,
  "purpose" DECIMAL(3,2) NOT NULL,
  "sociability" DECIMAL(3,2),
  "openness" DECIMAL(3,2),
  "conscientiousness" DECIMAL(3,2),
  "extraversion" DECIMAL(3,2),
  "agreeableness" DECIMAL(3,2),
  "neuroticism" DECIMAL(3,2),
  "hasOceanProfile" BOOLEAN NOT NULL DEFAULT false,
  "archetype" TEXT,
  "confidenceScores" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_vectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_vectors_userId_key" ON "user_vectors"("userId");

-- ============================================
-- 9. archetypes
-- ============================================

CREATE TABLE IF NOT EXISTS "archetypes" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_ko" TEXT,
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
  "reference_vector" JSONB,
  "threshold_config" JSONB,
  "is_builtin" BOOLEAN NOT NULL DEFAULT false,
  "recommendedPersonaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "archetypes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "archetypes_name_key" ON "archetypes"("name");

-- ============================================
-- 10. matching_algorithms
-- ============================================

CREATE TABLE IF NOT EXISTS "matching_algorithms" (
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

-- ============================================
-- 11. algorithm_versions (FK → matching_algorithms)
-- ============================================

CREATE TABLE IF NOT EXISTS "algorithm_versions" (
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

  CONSTRAINT "algorithm_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "algorithm_versions_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 12. matching_logs (FK → matching_algorithms, personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "matching_logs" (
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

  CONSTRAINT "matching_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "matching_logs_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "matching_logs_selectedPersonaId_fkey" FOREIGN KEY ("selectedPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "matching_logs_requestId_key" ON "matching_logs"("requestId");

-- ============================================
-- 13. feedbacks (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" TEXT NOT NULL,
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
-- 14. ab_tests (FK → matching_algorithms, users)
-- ============================================

CREATE TABLE IF NOT EXISTS "ab_tests" (
  "id" TEXT NOT NULL,
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
-- 15. psych_profile_templates
-- ============================================

CREATE TABLE IF NOT EXISTS "psych_profile_templates" (
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

-- ============================================
-- 16. surveys
-- ============================================

CREATE TABLE IF NOT EXISTS "surveys" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "onboardingLevel" "OnboardingLevel" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 17. survey_questions (FK → surveys, psych_profile_templates)
-- ============================================

CREATE TABLE IF NOT EXISTS "survey_questions" (
  "id" TEXT NOT NULL,
  "surveyId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "questionOrder" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "survey_questions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "psych_profile_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "survey_questions_surveyId_templateId_key" ON "survey_questions"("surveyId", "templateId");

-- ============================================
-- 18. survey_responses (FK → surveys)
-- ============================================

CREATE TABLE IF NOT EXISTS "survey_responses" (
  "id" TEXT NOT NULL,
  "surveyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "computedVector" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "survey_responses_surveyId_userId_key" ON "survey_responses"("surveyId", "userId");

-- ============================================
-- 19. survey_answers (FK → survey_responses)
-- ============================================

CREATE TABLE IF NOT EXISTS "survey_answers" (
  "id" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "survey_answers_responseId_questionId_key" ON "survey_answers"("responseId", "questionId");

-- ============================================
-- 20. golden_samples
-- ============================================

CREATE TABLE IF NOT EXISTS "golden_samples" (
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

-- ============================================
-- 21. incubator_logs
-- ============================================

CREATE TABLE IF NOT EXISTS "incubator_logs" (
  "id" TEXT NOT NULL,
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
-- 22. review_styles
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

-- ============================================
-- 23. style_content_reviews (FK → review_styles)
-- ============================================

CREATE TABLE IF NOT EXISTS "style_content_reviews" (
  "id" TEXT NOT NULL,
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

-- ============================================
-- 24. style_review_logs
-- ============================================

CREATE TABLE IF NOT EXISTS "style_review_logs" (
  "id" TEXT NOT NULL,
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
-- 25. persona_test_results (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_test_results" (
  "id" TEXT NOT NULL,
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
-- 26. api_endpoints
-- ============================================

CREATE TABLE IF NOT EXISTS "api_endpoints" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "method" "HttpMethod" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "version" TEXT NOT NULL DEFAULT 'v1',
  "status" "EndpointStatus" NOT NULL DEFAULT 'ACTIVE',
  "category" TEXT NOT NULL DEFAULT 'general',
  "scope" TEXT NOT NULL DEFAULT 'external',
  "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
  "rateLimit" INTEGER NOT NULL DEFAULT 100,
  "timeout" INTEGER NOT NULL DEFAULT 30000,
  "rateLimitConfig" JSONB,
  "healthCheckConfig" JSONB,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "api_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_endpoints_path_method_key" ON "api_endpoints"("path", "method");

-- ============================================
-- 27. system_configs
-- ============================================

CREATE TABLE IF NOT EXISTS "system_configs" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_category_key_key" ON "system_configs"("category", "key");

-- ============================================
-- 28. safety_filters
-- ============================================

CREATE TABLE IF NOT EXISTS "safety_filters" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filterType" "FilterType" NOT NULL,
  "pattern" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "safety_filters_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 29. deployments
-- ============================================

CREATE TABLE IF NOT EXISTS "deployments" (
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

-- ============================================
-- 30. incidents
-- ============================================

CREATE TABLE IF NOT EXISTS "incidents" (
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

-- ============================================
-- 31. incident_timelines (FK → incidents)
-- ============================================

CREATE TABLE IF NOT EXISTS "incident_timelines" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "incident_timelines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incident_timelines_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 32. audit_logs (FK → users)
-- ============================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
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
-- 33. system_metrics
-- ============================================

CREATE TABLE IF NOT EXISTS "system_metrics" (
  "id" TEXT NOT NULL,
  "metricType" TEXT NOT NULL,
  "value" DECIMAL(10,4) NOT NULL,
  "unit" TEXT NOT NULL,
  "tags" JSONB,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "system_metrics_metricType_recordedAt_idx" ON "system_metrics"("metricType", "recordedAt");

-- ============================================
-- 34. backup_records
-- ============================================

CREATE TABLE IF NOT EXISTS "backup_records" (
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
-- 35. versions (FK → users)
-- ============================================

CREATE TABLE IF NOT EXISTS "versions" (
  "id" TEXT NOT NULL,
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

-- ============================================
-- 36. commits
-- ============================================

CREATE TABLE IF NOT EXISTS "commits" (
  "id" TEXT NOT NULL,
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

-- ============================================
-- 37. branches
-- ============================================

CREATE TABLE IF NOT EXISTS "branches" (
  "id" TEXT NOT NULL,
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
-- 38. persona_world_users
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_world_users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "profileImageUrl" TEXT,

  -- 6D 벡터
  "depth" DECIMAL(3,2),
  "lens" DECIMAL(3,2),
  "stance" DECIMAL(3,2),
  "scope" DECIMAL(3,2),
  "taste" DECIMAL(3,2),
  "purpose" DECIMAL(3,2),

  -- v3: L2 OCEAN
  "openness" DECIMAL(3,2),
  "conscientiousness" DECIMAL(3,2),
  "extraversion" DECIMAL(3,2),
  "agreeableness" DECIMAL(3,2),
  "neuroticism" DECIMAL(3,2),
  "hasOceanProfile" BOOLEAN NOT NULL DEFAULT false,

  -- v3: 프로필 품질 레벨
  "profile_level" TEXT NOT NULL DEFAULT 'BASIC',

  -- 프로필 품질
  "profileQuality" "ProfileQuality" NOT NULL DEFAULT 'BASIC',
  "confidenceScore" DECIMAL(3,2),

  -- 데이터 소스
  "dataSources" JSONB,
  "snsExtendedData" JSONB,
  "preferences" JSONB,

  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_world_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_world_users_email_key" ON "persona_world_users"("email");

-- ============================================
-- 39. persona_posts (FK → personas, self-ref for parentId)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_posts" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "type" "PersonaPostType" NOT NULL,
  "content" TEXT NOT NULL,
  "contentId" TEXT,
  "metadata" JSONB,

  -- 스레드
  "parentId" TEXT,

  -- 트리거
  "trigger" "ActivityTrigger" NOT NULL DEFAULT 'SCHEDULED',

  -- 통계 (비정규화)
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "repostCount" INTEGER NOT NULL DEFAULT 0,

  -- 모더레이션
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenAt" TIMESTAMP(3),
  "hiddenBy" TEXT,

  -- v4.0: Poignancy Score
  "poignancyScore" DECIMAL(4,3),

  -- v4.0: Data Provenance
  "postSource" "PostSource" DEFAULT 'AUTONOMOUS',

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_posts_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persona_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "persona_posts_personaId_createdAt_idx" ON "persona_posts"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "persona_posts_type_createdAt_idx" ON "persona_posts"("type", "createdAt");

-- ============================================
-- 40. persona_post_likes (FK → persona_posts, personas, persona_world_users)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_post_likes" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "personaId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_post_likes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_post_likes_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_like_author" CHECK (
    ("personaId" IS NOT NULL AND "userId" IS NULL) OR
    ("personaId" IS NULL AND "userId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_post_likes_postId_personaId_key" ON "persona_post_likes"("postId", "personaId");
CREATE UNIQUE INDEX IF NOT EXISTS "persona_post_likes_postId_userId_key" ON "persona_post_likes"("postId", "userId");

-- ============================================
-- 41. persona_comments (FK → persona_posts, personas, persona_world_users, self-ref)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_comments" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "personaId" TEXT,
  "userId" TEXT,
  "content" TEXT NOT NULL,

  -- 답글
  "parentId" TEXT,

  -- 모더레이션
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenAt" TIMESTAMP(3),
  "hiddenBy" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_comments_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persona_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "chk_comment_author" CHECK (
    ("personaId" IS NOT NULL AND "userId" IS NULL) OR
    ("personaId" IS NULL AND "userId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "persona_comments_postId_createdAt_idx" ON "persona_comments"("postId", "createdAt");

-- ============================================
-- 42. persona_reposts (FK → persona_posts, personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_reposts" (
  "id" TEXT NOT NULL,
  "originalPostId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_reposts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_reposts_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_reposts_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_reposts_originalPostId_personaId_key" ON "persona_reposts"("originalPostId", "personaId");

-- ============================================
-- 43. persona_follows (FK → personas, persona_world_users)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_follows" (
  "id" TEXT NOT NULL,
  "followerPersonaId" TEXT,
  "followerUserId" TEXT,
  "followingPersonaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_follows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_follows_followerPersonaId_fkey" FOREIGN KEY ("followerPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_follows_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_follows_followingPersonaId_fkey" FOREIGN KEY ("followingPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_follower" CHECK (
    ("followerPersonaId" IS NOT NULL AND "followerUserId" IS NULL) OR
    ("followerPersonaId" IS NULL AND "followerUserId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_follows_followerPersonaId_followingPersonaId_key" ON "persona_follows"("followerPersonaId", "followingPersonaId");
CREATE UNIQUE INDEX IF NOT EXISTS "persona_follows_followerUserId_followingPersonaId_key" ON "persona_follows"("followerUserId", "followingPersonaId");

-- ============================================
-- 44. persona_post_bookmarks (FK → persona_world_users)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_post_bookmarks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_post_bookmarks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_post_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_post_bookmarks_userId_postId_key" ON "persona_post_bookmarks"("userId", "postId");

-- ============================================
-- 45. pw_user_survey_responses (FK → persona_world_users)
-- ============================================

CREATE TABLE IF NOT EXISTS "pw_user_survey_responses" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "surveyLevel" "OnboardingLevel" NOT NULL,
  "answers" JSONB NOT NULL,
  "computedVector" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pw_user_survey_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pw_user_survey_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pw_user_survey_responses_userId_surveyLevel_key" ON "pw_user_survey_responses"("userId", "surveyLevel");

-- ============================================
-- 46. sns_connections
-- ============================================

CREATE TABLE IF NOT EXISTS "sns_connections" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" "SNSPlatform" NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "profileData" JSONB,
  "extractedData" JSONB,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sns_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sns_connections_userId_platform_key" ON "sns_connections"("userId", "platform");

-- ============================================
-- 47. persona_world_reports
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_world_reports" (
  "id" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "description" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_world_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "persona_world_reports_status_createdAt_idx" ON "persona_world_reports"("status", "createdAt");

-- ============================================
-- 48. persona_activity_logs
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_activity_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "activityType" "PersonaActivityType" NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "trigger" "ActivityTrigger" NOT NULL,

  -- v3 신규 필드
  "postTypeReason" JSONB,
  "stateSnapshot" JSONB,
  "matching_score" DECIMAL(4,3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "persona_activity_logs_personaId_createdAt_idx" ON "persona_activity_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "persona_activity_logs_activityType_createdAt_idx" ON "persona_activity_logs"("activityType", "createdAt");

-- ============================================
-- 49. persona_states (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_states" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "mood" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "energy" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  "socialBattery" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  "paradoxTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "narrativeTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_states_personaId_key" ON "persona_states"("personaId");

DO $$ BEGIN
  ALTER TABLE "persona_states"
    ADD CONSTRAINT "persona_states_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 50. persona_relationships (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_relationships" (
  "id" TEXT NOT NULL,
  "personaAId" TEXT NOT NULL,
  "personaBId" TEXT NOT NULL,
  "warmth" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "tension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "frequency" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "depth" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "lastInteractionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_relationships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_relationships_personaAId_personaBId_key"
  ON "persona_relationships"("personaAId", "personaBId");
CREATE INDEX IF NOT EXISTS "persona_relationships_personaAId_idx"
  ON "persona_relationships"("personaAId");
CREATE INDEX IF NOT EXISTS "persona_relationships_personaBId_idx"
  ON "persona_relationships"("personaBId");

DO $$ BEGIN
  ALTER TABLE "persona_relationships"
    ADD CONSTRAINT "persona_relationships_personaAId_fkey"
    FOREIGN KEY ("personaAId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "persona_relationships"
    ADD CONSTRAINT "persona_relationships_personaBId_fkey"
    FOREIGN KEY ("personaBId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 51. consumption_logs (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "consumption_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "contentType" "ConsumptionContentType" NOT NULL,
  "contentId" TEXT,
  "title" TEXT NOT NULL,
  "impression" TEXT NOT NULL,
  "rating" DECIMAL(3,2),
  "emotionalImpact" DECIMAL(3,2) NOT NULL,
  "tags" TEXT[],
  "source" "ConsumptionSource" NOT NULL,
  "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consumption_logs_personaId_consumedAt_idx"
  ON "consumption_logs"("personaId", "consumedAt");
CREATE INDEX IF NOT EXISTS "consumption_logs_personaId_tags_idx"
  ON "consumption_logs"("personaId", "tags");

DO $$ BEGIN
  ALTER TABLE "consumption_logs"
    ADD CONSTRAINT "consumption_logs_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 52. event_channels
-- ============================================

CREATE TABLE IF NOT EXISTS "event_channels" (
  "id" TEXT NOT NULL,
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

-- ============================================
-- 53. events (FK → event_channels)
-- ============================================

CREATE TABLE IF NOT EXISTS "events" (
  "id" TEXT NOT NULL,
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

-- ============================================
-- 54. dead_letter_events (FK → event_channels)
-- ============================================

CREATE TABLE IF NOT EXISTS "dead_letter_events" (
  "id" TEXT NOT NULL,
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
-- 55. interaction_sessions (FK → personas)
-- ============================================

CREATE TABLE IF NOT EXISTS "interaction_sessions" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "totalTurns" INTEGER NOT NULL DEFAULT 0,
  "avgPressure" DECIMAL(3,2),
  "peakPressure" DECIMAL(3,2),
  "dominantTopic" TEXT,
  "integrityScore" DECIMAL(4,3),
  "edgeWeight" DECIMAL(5,3),
  "semanticSimilarity" DECIMAL(4,3),
  "sentimentValence" DECIMAL(3,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interaction_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interaction_sessions_personaId_idx"
  ON "interaction_sessions"("personaId");
CREATE INDEX IF NOT EXISTS "interaction_sessions_userId_idx"
  ON "interaction_sessions"("userId");
CREATE INDEX IF NOT EXISTS "interaction_sessions_personaId_userId_idx"
  ON "interaction_sessions"("personaId", "userId");

DO $$ BEGIN
  ALTER TABLE "interaction_sessions"
    ADD CONSTRAINT "interaction_sessions_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 56. interaction_logs (FK → interaction_sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS "interaction_logs" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "initiatorType" "ParticipantType" NOT NULL,
  "initiatorId" TEXT NOT NULL,
  "receiverType" "ParticipantType" NOT NULL,
  "receiverId" TEXT NOT NULL,
  "interactionType" "InteractionType" NOT NULL,
  "userMessage" TEXT,
  "personaResponse" TEXT,
  "responseLengthTokens" INTEGER,
  "pressure" DECIMAL(3,2),
  "activeLayer" TEXT,
  "vFinalDrift" DECIMAL(4,3),
  "paradoxActivation" DECIMAL(4,3),
  "behaviorTags" JSONB,
  "contextRecall" DECIMAL(4,3),
  "settingConsistency" DECIMAL(4,3),
  "voiceDrift" DECIMAL(4,3),
  "poignancyScore" DECIMAL(4,3),
  "source" "InteractionSource" DEFAULT 'DIRECT',
  "trustLevel" DECIMAL(3,2),
  "propagationDepth" INTEGER DEFAULT 0,
  "originPersonaId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interaction_logs_sessionId_idx"
  ON "interaction_logs"("sessionId");
CREATE INDEX IF NOT EXISTS "interaction_logs_initiatorId_initiatorType_idx"
  ON "interaction_logs"("initiatorId", "initiatorType");
CREATE INDEX IF NOT EXISTS "interaction_logs_receiverId_receiverType_idx"
  ON "interaction_logs"("receiverId", "receiverType");
CREATE INDEX IF NOT EXISTS "interaction_logs_interactionType_idx"
  ON "interaction_logs"("interactionType");
CREATE INDEX IF NOT EXISTS "interaction_logs_timestamp_idx"
  ON "interaction_logs"("timestamp");

DO $$ BEGIN
  ALTER TABLE "interaction_logs"
    ADD CONSTRAINT "interaction_logs_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "interaction_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 57. blog_posts (FK → users)
-- ============================================

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "content" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "category" "BlogCategory" NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "authorId" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_published_publishedAt_idx" ON "blog_posts"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts"("category");

-- ============================================
-- 58. llm_usage_logs
-- ============================================

CREATE TABLE IF NOT EXISTS "llm_usage_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT,
  "callType" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "estimatedCostUsd" DECIMAL(10,6) NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "status" "LlmCallStatus" NOT NULL DEFAULT 'SUCCESS',
  "errorMessage" TEXT,
  "cacheCreationInputTokens" INTEGER,
  "cacheReadInputTokens" INTEGER,
  "cacheSavingsUsd" DECIMAL(10,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "llm_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "llm_usage_logs_createdAt_idx" ON "llm_usage_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "llm_usage_logs_callType_idx" ON "llm_usage_logs"("callType");
CREATE INDEX IF NOT EXISTS "llm_usage_logs_personaId_idx" ON "llm_usage_logs"("personaId");

-- ============================================
-- 59. quarantine_entries
-- ============================================

CREATE TABLE IF NOT EXISTS "quarantine_entries" (
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

CREATE INDEX IF NOT EXISTS "quarantine_entries_personaId_idx" ON "quarantine_entries"("personaId");
CREATE INDEX IF NOT EXISTS "quarantine_entries_status_idx" ON "quarantine_entries"("status");
CREATE INDEX IF NOT EXISTS "quarantine_entries_createdAt_idx" ON "quarantine_entries"("createdAt");

-- ============================================
-- 60. system_safety_config
-- ============================================

CREATE TABLE IF NOT EXISTS "system_safety_config" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "emergencyFreeze" BOOLEAN NOT NULL DEFAULT false,
  "freezeReason" TEXT,
  "freezeAt" TIMESTAMP(3),
  "featureToggles" JSONB NOT NULL,
  "autoTriggers" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT NOT NULL,

  CONSTRAINT "system_safety_config_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 61. arena_sessions
-- ============================================

CREATE TABLE IF NOT EXISTS "arena_sessions" (
  "id" TEXT NOT NULL,
  "mode" "ArenaMode" NOT NULL DEFAULT 'SPARRING_1V1',
  "participantA" TEXT NOT NULL,
  "participantB" TEXT NOT NULL,
  "profileLoadLevel" "ProfileLoadLevel" NOT NULL DEFAULT 'STANDARD',
  "topic" TEXT NOT NULL,
  "maxTurns" INTEGER NOT NULL DEFAULT 6,
  "budgetTokens" INTEGER NOT NULL DEFAULT 10000,
  "usedTokens" INTEGER NOT NULL DEFAULT 0,
  "status" "ArenaSessionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "arena_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "arena_sessions_status_idx" ON "arena_sessions"("status");
CREATE INDEX IF NOT EXISTS "arena_sessions_participantA_idx" ON "arena_sessions"("participantA");
CREATE INDEX IF NOT EXISTS "arena_sessions_participantB_idx" ON "arena_sessions"("participantB");
CREATE INDEX IF NOT EXISTS "arena_sessions_createdAt_idx" ON "arena_sessions"("createdAt");

-- ============================================
-- 62. arena_turns (FK → arena_sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS "arena_turns" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "speakerId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tokensUsed" INTEGER NOT NULL DEFAULT 0,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vectorSnapshot" JSONB,
  "poignancy" DECIMAL(3,2),

  CONSTRAINT "arena_turns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "arena_turns_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "arena_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "arena_turns_sessionId_turnNumber_key" ON "arena_turns"("sessionId", "turnNumber");
CREATE INDEX IF NOT EXISTS "arena_turns_sessionId_idx" ON "arena_turns"("sessionId");
CREATE INDEX IF NOT EXISTS "arena_turns_speakerId_idx" ON "arena_turns"("speakerId");

-- ============================================
-- 63. arena_judgments (FK → arena_sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS "arena_judgments" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "method" "ArenaJudgmentMethod" NOT NULL DEFAULT 'RULE_BASED',
  "characterConsistency" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "l2Emergence" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "paradoxEmergence" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "triggerResponse" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "overallScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "issues" JSONB NOT NULL DEFAULT '[]',
  "summary" TEXT NOT NULL DEFAULT '',
  "judgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "arena_judgments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "arena_judgments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "arena_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "arena_judgments_sessionId_key" ON "arena_judgments"("sessionId");
CREATE INDEX IF NOT EXISTS "arena_judgments_sessionId_idx" ON "arena_judgments"("sessionId");

-- ============================================
-- 64. arena_correction_requests (FK → arena_judgments)
-- ============================================

CREATE TABLE IF NOT EXISTS "arena_correction_requests" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "judgmentId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "originalContent" TEXT NOT NULL,
  "correctedContent" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,

  CONSTRAINT "arena_correction_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "arena_correction_requests_judgmentId_fkey" FOREIGN KEY ("judgmentId") REFERENCES "arena_judgments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "arena_correction_requests_sessionId_idx" ON "arena_correction_requests"("sessionId");
CREATE INDEX IF NOT EXISTS "arena_correction_requests_judgmentId_idx" ON "arena_correction_requests"("judgmentId");
CREATE INDEX IF NOT EXISTS "arena_correction_requests_status_idx" ON "arena_correction_requests"("status");

-- ============================================
-- 65. arena_token_usage (FK → arena_sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS "arena_token_usage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnId" TEXT,
  "phase" "ArenaTokenPhase" NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "arena_token_usage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "arena_token_usage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "arena_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "arena_token_usage_sessionId_idx" ON "arena_token_usage"("sessionId");

-- ============================================
-- 66. system_logs
-- ============================================

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

CREATE INDEX IF NOT EXISTS "system_logs_level_createdAt_idx" ON "system_logs"("level", "createdAt");
CREATE INDEX IF NOT EXISTS "system_logs_service_createdAt_idx" ON "system_logs"("service", "createdAt");

-- ============================================
-- 67. post_mortems (FK → incidents)
-- ============================================

CREATE TABLE IF NOT EXISTS "post_mortems" (
  "id" TEXT NOT NULL,
  "incident_id" TEXT NOT NULL,
  "root_cause" TEXT NOT NULL,
  "affected_users" INTEGER NOT NULL DEFAULT 0,
  "downtime_minutes" INTEGER NOT NULL DEFAULT 0,
  "data_loss" BOOLEAN NOT NULL DEFAULT false,
  "action_items" JSONB,
  "lessons" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "post_mortems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "post_mortems_incident_id_idx" ON "post_mortems"("incident_id");

DO $$ BEGIN
  ALTER TABLE "post_mortems"
    ADD CONSTRAINT "post_mortems_incident_id_fkey"
    FOREIGN KEY ("incident_id") REFERENCES "incidents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 68. dr_drills
-- ============================================

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
  "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dr_drills_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dr_drills_status_idx" ON "dr_drills"("status");
CREATE INDEX IF NOT EXISTS "dr_drills_plan_id_idx" ON "dr_drills"("plan_id");

-- ############################################################
-- SECTION 4: TRIGGERS
-- ############################################################

-- 좋아요 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona_posts SET "likeCount" = "likeCount" + 1 WHERE id = NEW."postId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona_posts SET "likeCount" = "likeCount" - 1 WHERE id = OLD."postId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_like_count ON persona_post_likes;
CREATE TRIGGER trg_update_post_like_count
AFTER INSERT OR DELETE ON persona_post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- 댓글 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona_posts SET "commentCount" = "commentCount" + 1 WHERE id = NEW."postId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona_posts SET "commentCount" = "commentCount" - 1 WHERE id = OLD."postId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_comment_count ON persona_comments;
CREATE TRIGGER trg_update_post_comment_count
AFTER INSERT OR DELETE ON persona_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- 리포스트 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona_posts SET "repostCount" = "repostCount" + 1 WHERE id = NEW."originalPostId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona_posts SET "repostCount" = "repostCount" - 1 WHERE id = OLD."originalPostId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_repost_count ON persona_reposts;
CREATE TRIGGER trg_update_post_repost_count
AFTER INSERT OR DELETE ON persona_reposts
FOR EACH ROW EXECUTE FUNCTION update_post_repost_count();

-- ############################################################
-- SECTION 5: NON-PRISMA TABLES (유저 프로파일링 v3)
-- ############################################################

-- 질문 마스터 테이블
CREATE TABLE IF NOT EXISTS profiling_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase           SMALLINT,
  sequence        SMALLINT,
  scenario_text   TEXT NOT NULL,
  choices         JSONB NOT NULL,
  l1_primary_axis VARCHAR(20) NOT NULL,
  l2_primary_axis VARCHAR(20) NOT NULL,
  difficulty      SMALLINT DEFAULT 1,
  category        VARCHAR(30),
  source          VARCHAR(10) DEFAULT 'manual',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 유저 응답 테이블
CREATE TABLE IF NOT EXISTS user_profiling_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  question_id     UUID NOT NULL REFERENCES profiling_questions(id),
  selected_choice SMALLINT NOT NULL,
  phase           SMALLINT,
  response_time_ms INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 유저 프로필 상태 테이블
CREATE TABLE IF NOT EXISTS user_profiling_status (
  user_id         UUID PRIMARY KEY,
  current_phase   SMALLINT DEFAULT 1,
  phase1_completed BOOLEAN DEFAULT false,
  phase2_completed BOOLEAN DEFAULT false,
  phase3_completed BOOLEAN DEFAULT false,
  quality_grade   VARCHAR(10) DEFAULT 'NONE',
  daily_count     INTEGER DEFAULT 0,
  last_daily_at   TIMESTAMPTZ,
  coin_balance    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SNS 연동 테이블
CREATE TABLE IF NOT EXISTS user_sns_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  platform        VARCHAR(30) NOT NULL,
  platform_user_id VARCHAR(255),
  access_token_enc TEXT,
  analysis_status VARCHAR(20) DEFAULT 'pending',
  analyzed_at     TIMESTAMPTZ,
  vector_result   JSONB,
  confidence      REAL,
  data_volume     INTEGER,
  cost_usd        REAL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- 코인 트랜잭션 테이블
CREATE TABLE IF NOT EXISTS user_coin_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  amount          INTEGER NOT NULL,
  reason          VARCHAR(50) NOT NULL,
  reference_id    UUID,
  balance_after   INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Non-Prisma 인덱스
CREATE INDEX IF NOT EXISTS idx_profiling_questions_phase ON profiling_questions(phase, sequence);
CREATE INDEX IF NOT EXISTS idx_profiling_questions_axes ON profiling_questions(l1_primary_axis, l2_primary_axis);
CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_profiling_answers(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_sns_user ON user_sns_connections(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON user_coin_transactions(user_id, created_at);

-- ############################################################
-- SECTION 6: SEED DATA
-- ############################################################

-- 기본 브랜치
INSERT INTO "branches" ("id", "name", "isDefault", "isProtected", "lastCommitMessage")
VALUES (generate_cuid(), 'main', true, true, 'Initial commit')
ON CONFLICT ("name") DO NOTHING;

-- ============================================================
-- 완료
-- ============================================================

SELECT 'DeepSight Engine Studio — Consolidated Schema Migration 완료!' AS status;
