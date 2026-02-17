-- CreateEnum: HttpMethod
DO $$ BEGIN
  CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: EndpointStatus
DO $$ BEGIN
  CREATE TYPE "EndpointStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: api_endpoints
CREATE TABLE IF NOT EXISTS "api_endpoints" (
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

-- CreateIndex: unique path + method
CREATE UNIQUE INDEX IF NOT EXISTS "api_endpoints_path_method_key" ON "api_endpoints"("path", "method");

-- Seed: Developer Console v1 API endpoints
INSERT INTO "api_endpoints" ("id", "path", "method", "name", "description", "version", "status", "category", "requiresAuth", "rateLimit", "timeout", "createdAt", "updatedAt")
VALUES
  ('ep_match', '/v1/match', 'POST', '페르소나 매칭', '사용자 벡터와 페르소나 벡터를 매칭하여 최적의 페르소나를 추천합니다.', 'v1', 'ACTIVE', 'matching', true, 100, 30000, NOW(), NOW()),
  ('ep_batch_match', '/v1/batch-match', 'POST', '배치 매칭', '여러 사용자에 대한 페르소나 매칭을 일괄 처리합니다.', 'v1', 'ACTIVE', 'matching', true, 20, 60000, NOW(), NOW()),
  ('ep_personas_list', '/v1/personas', 'GET', '페르소나 목록', '사용 가능한 페르소나 목록을 조회합니다.', 'v1', 'ACTIVE', 'personas', true, 200, 15000, NOW(), NOW()),
  ('ep_personas_detail', '/v1/personas/:id', 'GET', '페르소나 상세', '특정 페르소나의 상세 정보를 조회합니다.', 'v1', 'ACTIVE', 'personas', true, 200, 15000, NOW(), NOW()),
  ('ep_feedback', '/v1/feedback', 'POST', '피드백 제출', '매칭 결과에 대한 사용자 피드백을 수집합니다.', 'v1', 'ACTIVE', 'feedback', true, 300, 10000, NOW(), NOW())
ON CONFLICT ("path", "method") DO NOTHING;
