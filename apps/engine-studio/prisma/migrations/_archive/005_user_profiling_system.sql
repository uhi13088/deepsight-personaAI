-- Migration: 005_user_profiling_system
-- Description: 유저 프로파일링 시스템 v3 (T41 설계 기반)
-- Date: 2026-02-11
-- Reference: docs/design/persona-engine-v3.md §19.9

-- 질문 마스터 테이블
CREATE TABLE IF NOT EXISTS profiling_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase           SMALLINT,                 -- 1/2/3 = 온보딩, NULL = Daily 풀
  sequence        SMALLINT,                 -- Phase 내 순서 (1~8), Daily는 NULL
  scenario_text   TEXT NOT NULL,            -- 시나리오 본문 (한국어)
  choices         JSONB NOT NULL,           -- 4개 선택지 배열
  l1_primary_axis VARCHAR(20) NOT NULL,     -- 주 측정 L1 축
  l2_primary_axis VARCHAR(20) NOT NULL,     -- 주 측정 L2 축
  difficulty      SMALLINT DEFAULT 1,       -- 1=쉬움, 2=보통, 3=어려움
  category        VARCHAR(30),              -- 시나리오 카테고리
  source          VARCHAR(10) DEFAULT 'manual',  -- manual | llm
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 유저 응답 테이블
CREATE TABLE IF NOT EXISTS user_profiling_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  question_id     UUID NOT NULL REFERENCES profiling_questions(id),
  selected_choice SMALLINT NOT NULL,        -- 0~3 (A/B/C/D)
  phase           SMALLINT,                 -- 응답 시점의 Phase (1/2/3/NULL=Daily)
  response_time_ms INTEGER,                 -- 응답 소요 시간 (밀리초)
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
  quality_grade   VARCHAR(10) DEFAULT 'NONE',  -- NONE/STARTER/STANDARD/ADVANCED/EXPERT
  daily_count     INTEGER DEFAULT 0,
  last_daily_at   TIMESTAMPTZ,
  coin_balance    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 유저 벡터 테이블 (L1+L2)
CREATE TABLE IF NOT EXISTS user_vectors (
  user_id              UUID PRIMARY KEY,
  l1_depth             REAL DEFAULT 0.5,
  l1_lens              REAL DEFAULT 0.5,
  l1_stance            REAL DEFAULT 0.5,
  l1_scope             REAL DEFAULT 0.5,
  l1_taste             REAL DEFAULT 0.5,
  l1_purpose           REAL DEFAULT 0.5,
  l1_sociability       REAL DEFAULT 0.5,
  l2_openness          REAL DEFAULT 0.5,
  l2_conscientiousness REAL DEFAULT 0.5,
  l2_extraversion      REAL DEFAULT 0.5,
  l2_agreeableness     REAL DEFAULT 0.5,
  l2_neuroticism       REAL DEFAULT 0.5,
  measurement_count    JSONB,
  confidence_map       JSONB,
  source_weights       JSONB,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
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

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiling_questions_phase ON profiling_questions(phase, sequence);
CREATE INDEX IF NOT EXISTS idx_profiling_questions_axes ON profiling_questions(l1_primary_axis, l2_primary_axis);
CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_profiling_answers(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_sns_user ON user_sns_connections(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON user_coin_transactions(user_id, created_at);
