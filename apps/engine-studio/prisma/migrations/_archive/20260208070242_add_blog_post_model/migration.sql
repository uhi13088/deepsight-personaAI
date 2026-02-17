-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AI_ENGINEER', 'CONTENT_MANAGER', 'ANALYST');

-- CreateEnum
CREATE TYPE "PersonaVisibility" AS ENUM ('GLOBAL', 'PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "PersonaRole" AS ENUM ('REVIEWER', 'CURATOR', 'EDUCATOR', 'COMPANION', 'ANALYST');

-- CreateEnum
CREATE TYPE "PersonaStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'STANDARD', 'LEGACY', 'DEPRECATED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PersonaSource" AS ENUM ('MANUAL', 'INCUBATOR', 'MUTATION', 'AUTO_GENERATED');

-- CreateEnum
CREATE TYPE "ExpertiseLevel" AS ENUM ('CASUAL', 'ENTHUSIAST', 'EXPERT', 'CRITIC');

-- CreateEnum
CREATE TYPE "PostFrequency" AS ENUM ('RARE', 'OCCASIONAL', 'MODERATE', 'ACTIVE', 'HYPERACTIVE');

-- CreateEnum
CREATE TYPE "OnboardingLevel" AS ENUM ('LIGHT', 'MEDIUM', 'DEEP');

-- CreateEnum
CREATE TYPE "AlgorithmType" AS ENUM ('COSINE', 'WEIGHTED', 'CONTEXT', 'HYBRID');

-- CreateEnum
CREATE TYPE "AlgorithmStatus" AS ENUM ('DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('MAJOR', 'MINOR', 'PATCH', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE', 'NONE');

-- CreateEnum
CREATE TYPE "ABTestType" AS ENUM ('ALGORITHM', 'PERSONA', 'PARAMETER', 'WEIGHT', 'DIMENSION');

-- CreateEnum
CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SLIDER', 'MULTIPLE_CHOICE', 'RANKING', 'TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "IncubatorStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "EndpointStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'DISABLED');

-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('PROFANITY', 'HATE_SPEECH', 'POLITICAL', 'RELIGIOUS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DeploymentTarget" AS ENUM ('PERSONA', 'ALGORITHM', 'CONFIG');

-- CreateEnum
CREATE TYPE "DeploymentEnv" AS ENUM ('DEV', 'STG', 'PROD');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'IDENTIFIED', 'FIXING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL', 'DIFFERENTIAL');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PersonaPostType" AS ENUM ('REVIEW', 'THOUGHT', 'RECOMMENDATION', 'REACTION', 'QUESTION', 'LIST', 'THREAD', 'VS_BATTLE', 'QNA', 'CURATION', 'DEBATE', 'MEME', 'COLLAB', 'TRIVIA', 'PREDICTION', 'ANNIVERSARY', 'BEHIND_STORY');

-- CreateEnum
CREATE TYPE "ActivityTrigger" AS ENUM ('SCHEDULED', 'CONTENT_RELEASE', 'SOCIAL_EVENT', 'USER_INTERACTION', 'TRENDING', 'AUTONOMOUS');

-- CreateEnum
CREATE TYPE "ProfileQuality" AS ENUM ('BASIC', 'STANDARD', 'ADVANCED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SNSPlatform" AS ENUM ('NETFLIX', 'YOUTUBE', 'INSTAGRAM', 'SPOTIFY', 'LETTERBOXD', 'TWITTER', 'TIKTOK');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'MISINFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PersonaActivityType" AS ENUM ('POST_CREATED', 'POST_LIKED', 'POST_COMMENTED', 'POST_REPOSTED', 'PERSONA_FOLLOWED', 'PERSONA_UNFOLLOWED', 'DEBATE_STARTED', 'COLLAB_STARTED');

-- CreateEnum
CREATE TYPE "EventChannelStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "EventPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BlogCategory" AS ENUM ('TECH', 'PRODUCT', 'INSIGHT', 'ANNOUNCEMENT');

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
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
    "sociability" DECIMAL(3,2),
    "initiative" DECIMAL(3,2),
    "expressiveness" DECIMAL(3,2),
    "interactivity" DECIMAL(3,2),
    "postFrequency" "PostFrequency" NOT NULL DEFAULT 'MODERATE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "activeHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "peakHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "contentSettings" JSONB,
    "relationshipSettings" JSONB,
    "promptTemplate" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT '1.0',
    "basePrompt" TEXT,
    "reviewPrompt" TEXT,
    "postPrompt" TEXT,
    "commentPrompt" TEXT,
    "interactionPrompt" TEXT,
    "specialPrompts" JSONB,
    "status" "PersonaStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityScore" DECIMAL(5,2),
    "validationScore" DECIMAL(3,2),
    "validationVersion" INTEGER,
    "lastValidationDate" TIMESTAMP(3),
    "consistencyScore" DECIMAL(3,2),
    "source" "PersonaSource" NOT NULL DEFAULT 'MANUAL',
    "generationConfig" JSONB,
    "parentPersonaId" TEXT,
    "sampleContents" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_vectors" (
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

    CONSTRAINT "persona_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vectors" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archetypes" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archetypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_algorithms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "trafficSplit" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "results" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psych_profile_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "onboardingLevel" "OnboardingLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "questionOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "computedVector" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "golden_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incubator_logs" (
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "style_content_reviews" (
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

    CONSTRAINT "style_content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_review_logs" (
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

-- CreateTable
CREATE TABLE "persona_test_results" (
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

    CONSTRAINT "persona_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_endpoints" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "status" "EndpointStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" TEXT NOT NULL DEFAULT 'general',
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterType" "FilterType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_timelines" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "tags" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "versions" (
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

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commits" (
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

-- CreateTable
CREATE TABLE "branches" (
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

-- CreateTable
CREATE TABLE "persona_posts" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "type" "PersonaPostType" NOT NULL,
    "content" TEXT NOT NULL,
    "contentId" TEXT,
    "metadata" JSONB,
    "parentId" TEXT,
    "trigger" "ActivityTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "repostCount" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "hiddenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "personaId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "personaId" TEXT,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "hiddenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_reposts" (
    "id" TEXT NOT NULL,
    "originalPostId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_reposts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_follows" (
    "id" TEXT NOT NULL,
    "followerPersonaId" TEXT,
    "followerUserId" TEXT,
    "followingPersonaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_world_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "profileImageUrl" TEXT,
    "depth" DECIMAL(3,2),
    "lens" DECIMAL(3,2),
    "stance" DECIMAL(3,2),
    "scope" DECIMAL(3,2),
    "taste" DECIMAL(3,2),
    "purpose" DECIMAL(3,2),
    "profileQuality" "ProfileQuality" NOT NULL DEFAULT 'BASIC',
    "confidenceScore" DECIMAL(3,2),
    "dataSources" JSONB,
    "snsExtendedData" JSONB,
    "preferences" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_world_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_post_bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_post_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pw_user_survey_responses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surveyLevel" "OnboardingLevel" NOT NULL,
    "answers" JSONB NOT NULL,
    "computedVector" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pw_user_survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sns_connections" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sns_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_world_reports" (
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

-- CreateTable
CREATE TABLE "persona_activity_logs" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "activityType" "PersonaActivityType" NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "trigger" "ActivityTrigger" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_channels" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
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

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_events" (
    "id" TEXT NOT NULL,
    "originalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "payload" JSONB,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "channelId" TEXT,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "user_vectors_userId_key" ON "user_vectors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "archetypes_name_key" ON "archetypes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "matching_logs_requestId_key" ON "matching_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_questions_surveyId_templateId_key" ON "survey_questions"("surveyId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_surveyId_userId_key" ON "survey_responses"("surveyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_answers_responseId_questionId_key" ON "survey_answers"("responseId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "style_content_reviews_styleId_contentId_key" ON "style_content_reviews"("styleId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "api_endpoints_path_method_key" ON "api_endpoints"("path", "method");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_category_key_key" ON "system_configs"("category", "key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "system_metrics_metricType_recordedAt_idx" ON "system_metrics"("metricType", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "versions_tag_key" ON "versions"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "commits_hash_key" ON "commits"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE INDEX "persona_posts_personaId_createdAt_idx" ON "persona_posts"("personaId", "createdAt");

-- CreateIndex
CREATE INDEX "persona_posts_type_createdAt_idx" ON "persona_posts"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "persona_post_likes_postId_personaId_key" ON "persona_post_likes"("postId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "persona_post_likes_postId_userId_key" ON "persona_post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "persona_comments_postId_createdAt_idx" ON "persona_comments"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "persona_reposts_originalPostId_personaId_key" ON "persona_reposts"("originalPostId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "persona_follows_followerPersonaId_followingPersonaId_key" ON "persona_follows"("followerPersonaId", "followingPersonaId");

-- CreateIndex
CREATE UNIQUE INDEX "persona_follows_followerUserId_followingPersonaId_key" ON "persona_follows"("followerUserId", "followingPersonaId");

-- CreateIndex
CREATE UNIQUE INDEX "persona_world_users_email_key" ON "persona_world_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "persona_post_bookmarks_userId_postId_key" ON "persona_post_bookmarks"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "pw_user_survey_responses_userId_surveyLevel_key" ON "pw_user_survey_responses"("userId", "surveyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "sns_connections_userId_platform_key" ON "sns_connections"("userId", "platform");

-- CreateIndex
CREATE INDEX "persona_world_reports_status_createdAt_idx" ON "persona_world_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "persona_activity_logs_personaId_createdAt_idx" ON "persona_activity_logs"("personaId", "createdAt");

-- CreateIndex
CREATE INDEX "persona_activity_logs_activityType_createdAt_idx" ON "persona_activity_logs"("activityType", "createdAt");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_published_publishedAt_idx" ON "blog_posts"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_parentPersonaId_fkey" FOREIGN KEY ("parentPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_vectors" ADD CONSTRAINT "persona_vectors_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithm_versions" ADD CONSTRAINT "algorithm_versions_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_logs" ADD CONSTRAINT "matching_logs_algorithmId_fkey" FOREIGN KEY ("algorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_logs" ADD CONSTRAINT "matching_logs_selectedPersonaId_fkey" FOREIGN KEY ("selectedPersonaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_controlAlgorithmId_fkey" FOREIGN KEY ("controlAlgorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_testAlgorithmId_fkey" FOREIGN KEY ("testAlgorithmId") REFERENCES "matching_algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "psych_profile_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_content_reviews" ADD CONSTRAINT "style_content_reviews_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "review_styles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_test_results" ADD CONSTRAINT "persona_test_results_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_timelines" ADD CONSTRAINT "incident_timelines_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_posts" ADD CONSTRAINT "persona_posts_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_posts" ADD CONSTRAINT "persona_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persona_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_post_likes" ADD CONSTRAINT "persona_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_post_likes" ADD CONSTRAINT "persona_post_likes_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_post_likes" ADD CONSTRAINT "persona_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_comments" ADD CONSTRAINT "persona_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_comments" ADD CONSTRAINT "persona_comments_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_comments" ADD CONSTRAINT "persona_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_comments" ADD CONSTRAINT "persona_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persona_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_reposts" ADD CONSTRAINT "persona_reposts_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_reposts" ADD CONSTRAINT "persona_reposts_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_follows" ADD CONSTRAINT "persona_follows_followerPersonaId_fkey" FOREIGN KEY ("followerPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_follows" ADD CONSTRAINT "persona_follows_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_follows" ADD CONSTRAINT "persona_follows_followingPersonaId_fkey" FOREIGN KEY ("followingPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_post_bookmarks" ADD CONSTRAINT "persona_post_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pw_user_survey_responses" ADD CONSTRAINT "pw_user_survey_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "event_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_events" ADD CONSTRAINT "dead_letter_events_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "event_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
