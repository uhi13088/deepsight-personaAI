-- ============================================================
-- DeepSight Engine Studio — Base Seed Data
-- Generated: 2026-02-17
--
-- 기본 인프라: branches, api_endpoints
-- 멱등성(Idempotent): ON CONFLICT DO NOTHING
--
-- 별도 시드 파일:
--   003_seed_golden_samples.sql  — 골든 샘플 (가끔 업데이트)
--   004_seed_cold_start.sql      — Cold Start v3 질문 (가끔 업데이트)
--   005_seed_archetypes.sql      — 아키타입 12종 (가끔 업데이트)
-- ============================================================

-- ── 1. 기본 브랜치 ────────────────────────────────────────

INSERT INTO "branches" ("id", "name", "isDefault", "isProtected", "lastCommitMessage")
VALUES (generate_cuid(), 'main', true, true, 'Initial commit')
ON CONFLICT ("name") DO NOTHING;

-- ── 2. API 엔드포인트 시드 ────────────────────────────────

INSERT INTO "api_endpoints" ("id", "path", "method", "name", "description", "version", "status", "category", "requiresAuth", "rateLimit", "timeout", "createdAt", "updatedAt")
VALUES
  ('ep_match', '/v1/match', 'POST', '페르소나 매칭', '사용자 벡터와 페르소나 벡터를 매칭하여 최적의 페르소나를 추천합니다.', 'v1', 'ACTIVE', 'matching', true, 100, 30000, NOW(), NOW()),
  ('ep_batch_match', '/v1/batch-match', 'POST', '배치 매칭', '여러 사용자에 대한 페르소나 매칭을 일괄 처리합니다.', 'v1', 'ACTIVE', 'matching', true, 20, 60000, NOW(), NOW()),
  ('ep_personas_list', '/v1/personas', 'GET', '페르소나 목록', '사용 가능한 페르소나 목록을 조회합니다.', 'v1', 'ACTIVE', 'personas', true, 200, 15000, NOW(), NOW()),
  ('ep_personas_detail', '/v1/personas/:id', 'GET', '페르소나 상세', '특정 페르소나의 상세 정보를 조회합니다.', 'v1', 'ACTIVE', 'personas', true, 200, 15000, NOW(), NOW()),
  ('ep_feedback', '/v1/feedback', 'POST', '피드백 제출', '매칭 결과에 대한 사용자 피드백을 수집합니다.', 'v1', 'ACTIVE', 'feedback', true, 300, 10000, NOW(), NOW())
ON CONFLICT ("path", "method") DO NOTHING;
