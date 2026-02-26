-- ═══════════════════════════════════════════════════════════════════════
-- 프로덕션 DB 보충 마이그레이션 — Prisma 외 항목만
-- 생성일: 2026-02-26
--
-- ⚠️  실행 전제: `prisma db push`가 먼저 완료되어야 함
--   prisma db push로 76개 테이블 + enum + 인덱스 동기화 완료 후,
--   이 파일로 Prisma가 관리하지 않는 항목만 보충 적용
--
-- 포함 항목:
--   1. pgcrypto 확장 + generate_cuid() 함수
--   2. 카운트 트리거 (좋아요/댓글/리포스트)
--   3. Non-Prisma 유저 프로파일링 테이블 (5개)
--   4. social_module_config 시드 데이터
--
-- 안전성: 모든 구문 IF NOT EXISTS / OR REPLACE 가드 포함
-- ═══════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────
-- 1. Extension + Helper Function
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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


-- ────────────────────────────────────────────────────────────
-- 2. 카운트 트리거 (좋아요/댓글/리포스트 자동 집계)
--    테이블 존재 여부를 먼저 확인 후 생성 (prisma db push 미완료 대비)
-- ────────────────────────────────────────────────────────────

-- 함수는 테이블 없이도 생성 가능
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

-- 트리거 연결 (테이블 존재 시에만)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persona_post_likes') THEN
    DROP TRIGGER IF EXISTS trg_update_post_like_count ON persona_post_likes;
    CREATE TRIGGER trg_update_post_like_count
    AFTER INSERT OR DELETE ON persona_post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_like_count();
    RAISE NOTICE 'trigger trg_update_post_like_count created';
  ELSE
    RAISE NOTICE 'SKIP: persona_post_likes not found — run prisma db push first';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persona_comments') THEN
    DROP TRIGGER IF EXISTS trg_update_post_comment_count ON persona_comments;
    CREATE TRIGGER trg_update_post_comment_count
    AFTER INSERT OR DELETE ON persona_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
    RAISE NOTICE 'trigger trg_update_post_comment_count created';
  ELSE
    RAISE NOTICE 'SKIP: persona_comments not found — run prisma db push first';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persona_reposts') THEN
    DROP TRIGGER IF EXISTS trg_update_post_repost_count ON persona_reposts;
    CREATE TRIGGER trg_update_post_repost_count
    AFTER INSERT OR DELETE ON persona_reposts
    FOR EACH ROW EXECUTE FUNCTION update_post_repost_count();
    RAISE NOTICE 'trigger trg_update_post_repost_count created';
  ELSE
    RAISE NOTICE 'SKIP: persona_reposts not found — run prisma db push first';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. Non-Prisma 유저 프로파일링 테이블
-- ────────────────────────────────────────────────────────────

-- 질문 마스터
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

-- 유저 응답
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

-- 유저 프로필 상태
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

-- SNS 연동
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

-- 코인 트랜잭션
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


-- ────────────────────────────────────────────────────────────
-- 4. social_module_config 시드
-- ────────────────────────────────────────────────────────────

INSERT INTO "social_module_config" ("id", "updatedAt", "updatedBy")
VALUES ('singleton', CURRENT_TIMESTAMP, 'system')
ON CONFLICT ("id") DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════
-- 완료!
-- ═══════════════════════════════════════════════════════════════════════
