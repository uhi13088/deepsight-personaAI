-- PersonaWorld 사용자 페르소나 생성 요청 테이블
-- 콜드스타트 매칭 유사도 < 70% → 인큐베이터 큐에 추가

-- PersonaSource enum에 USER_REQUEST 추가
ALTER TYPE "PersonaSource" ADD VALUE IF NOT EXISTS 'USER_REQUEST';

-- PersonaRequestStatus enum 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PersonaRequestStatus') THEN
    CREATE TYPE "PersonaRequestStatus" AS ENUM ('PENDING', 'SCHEDULED', 'GENERATING', 'COMPLETED', 'FAILED');
  END IF;
END$$;

-- persona_generation_requests 테이블
CREATE TABLE IF NOT EXISTS "persona_generation_requests" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"                TEXT NOT NULL,
  "userVector"            JSONB NOT NULL,
  "topSimilarity"         DECIMAL(5,2) NOT NULL,
  "status"                "PersonaRequestStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledDate"         TIMESTAMP(3) NOT NULL,
  "generatedPersonaId"    TEXT,
  "completedAt"           TIMESTAMP(3),
  "failReason"            TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_generation_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_generation_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE,
  CONSTRAINT "persona_generation_requests_generatedPersonaId_fkey"
    FOREIGN KEY ("generatedPersonaId") REFERENCES "personas"("id")
);

-- 인덱스
CREATE INDEX IF NOT EXISTS "persona_generation_requests_userId_idx"
  ON "persona_generation_requests"("userId");
CREATE INDEX IF NOT EXISTS "persona_generation_requests_status_scheduledDate_idx"
  ON "persona_generation_requests"("status", "scheduledDate");
