-- 002: Survey System
-- 설문 시스템 (Survey, SurveyQuestion, SurveyResponse, SurveyAnswer)

-- 설문
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  "onboardingLevel" TEXT NOT NULL DEFAULT 'LIGHT',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 설문 질문 (PsychProfileTemplate 참조)
CREATE TABLE IF NOT EXISTS survey_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "surveyId" TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  "templateId" TEXT NOT NULL REFERENCES psych_profile_templates(id) ON DELETE CASCADE,
  "questionOrder" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  UNIQUE ("surveyId", "templateId")
);

-- 설문 응답
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "surveyId" TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "computedVector" JSONB,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("surveyId", "userId")
);

-- 설문 개별 답변
CREATE TABLE IF NOT EXISTS survey_answers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "responseId" TEXT NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  "questionId" TEXT NOT NULL,
  value JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("responseId", "questionId")
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions("surveyId");
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses("surveyId");
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses("userId");
CREATE INDEX IF NOT EXISTS idx_survey_answers_response ON survey_answers("responseId");
