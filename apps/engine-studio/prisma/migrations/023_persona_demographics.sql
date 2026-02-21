-- T174: 페르소나 기본 프로필 확장 (인구통계)
-- gender, nationality, educationLevel, languages, knowledgeAreas 추가

ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "knowledgeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
