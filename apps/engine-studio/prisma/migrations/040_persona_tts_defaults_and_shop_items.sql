-- ═══════════════════════════════════════════════════════════════
-- 040: 페르소나별 고유 TTS 음성 기본값 + ShopItem 관리 모델
-- ═══════════════════════════════════════════════════════════════

-- ── 1. 페르소나별 고유 TTS 음성 설정 ──────────────────────────
-- 각 페르소나의 성격/역할에 맞는 독창적인 음성을 할당
-- OpenAI TTS voices: alloy(중성), echo(깊은남성), fable(표현력), onyx(권위남성), nova(따뜻여성), shimmer(밝은여성)

-- 논리적 평론가 → onyx (권위 있는 깊은 목소리, 차분한 속도)
UPDATE personas SET
  "ttsProvider"  = 'openai',
  "ttsVoiceId"   = 'onyx',
  "ttsPitch"     = 0.0,
  "ttsSpeed"     = 0.92,
  "ttsLanguage"  = 'ko-KR'
WHERE id = 'seed-논리적-평론가';

-- 감성 에세이스트 → nova (따뜻하고 부드러운 여성 목소리)
UPDATE personas SET
  "ttsProvider"  = 'openai',
  "ttsVoiceId"   = 'nova',
  "ttsPitch"     = 0.0,
  "ttsSpeed"     = 1.00,
  "ttsLanguage"  = 'ko-KR'
WHERE id = 'seed-감성-에세이스트';

-- 트렌드 헌터 → shimmer (밝고 에너지 넘치는 목소리, 빠른 속도)
UPDATE personas SET
  "ttsProvider"  = 'openai',
  "ttsVoiceId"   = 'shimmer',
  "ttsPitch"     = 0.0,
  "ttsSpeed"     = 1.15,
  "ttsLanguage"  = 'ko-KR'
WHERE id = 'seed-트렌드-헌터';

-- 균형 잡힌 가이드 → alloy (중성적이고 안정감 있는 목소리)
UPDATE personas SET
  "ttsProvider"  = 'openai',
  "ttsVoiceId"   = 'alloy',
  "ttsPitch"     = 0.0,
  "ttsSpeed"     = 1.05,
  "ttsLanguage"  = 'ko-KR'
WHERE id = 'seed-균형-잡힌-가이드';

-- 시네필 평론가 → echo (깊고 사색적인 목소리, 느린 속도)
UPDATE personas SET
  "ttsProvider"  = 'openai',
  "ttsVoiceId"   = 'echo',
  "ttsPitch"     = 0.0,
  "ttsSpeed"     = 0.88,
  "ttsLanguage"  = 'ko-KR'
WHERE id = 'seed-시네필-평론가';

-- ── 2. ShopItem 관리 테이블 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "pw_shop_items" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "item_key"     TEXT        NOT NULL UNIQUE,              -- 고유 식별 키 (follow_slot_expand 등)
  "name"         TEXT        NOT NULL,
  "description"  TEXT        NOT NULL,
  "price"        INTEGER     NOT NULL DEFAULT 0,
  "price_label"  TEXT,                                      -- "10 코인/턴" 같은 커스텀 라벨
  "category"     TEXT        NOT NULL DEFAULT 'persona',    -- persona | profile
  "emoji"        TEXT        NOT NULL DEFAULT '🎁',
  "repeatable"   BOOLEAN     NOT NULL DEFAULT false,
  "tag"          TEXT,                                      -- NEW | HOT | SOON | null
  "is_active"    BOOLEAN     NOT NULL DEFAULT true,
  "sort_order"   INTEGER     NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. 기본 상점 아이템 시드 ──────────────────────────────────
INSERT INTO "pw_shop_items" ("item_key", "name", "description", "price", "price_label", "category", "emoji", "repeatable", "tag", "sort_order")
VALUES
  ('follow_slot_expand',      '팔로우 슬롯 확장',       '팔로우 가능 페르소나 수 +3 (기본 30개)',                150, NULL,          'persona',  '👥', true,  NULL,  1),
  ('premium_persona_unlock',  '프리미엄 페르소나 해금',   '특별 페르소나 1명을 해금합니다',                        200, NULL,          'persona',  '🌟', true,  'HOT', 2),
  ('persona_chat',            '페르소나 1:1 대화',       'AI 페르소나와 1:1 채팅 (턴마다 코인 차감)',              10,  '10 코인/턴',  'persona',  '💬', true,  'NEW', 3),
  ('persona_call_reservation','페르소나 통화 예약',       '페르소나와 통화 약속 — 약속 시간에 페르소나가 전화',       200, NULL,          'persona',  '📞', true,  'NEW', 4),
  ('profile_reset',           '성향 초기화',             '온보딩 벡터 리셋 — 처음부터 다시 시작',                 100, NULL,          'profile',  '🔄', true,  NULL,  5),
  ('badge_taste_expert',      '배지: 취향 전문가',       '프로필에 ''취향 전문가'' 배지가 표시됩니다',              80,  NULL,          'profile',  '🎯', false, NULL,  6),
  ('badge_early_adopter',     '배지: 얼리어답터',        '프로필에 ''얼리어답터'' 배지가 표시됩니다',               50,  NULL,          'profile',  '🚀', false, 'NEW', 7),
  ('badge_trendsetter',       '배지: 트렌드세터',        '프로필에 ''트렌드세터'' 배지가 표시됩니다',               80,  NULL,          'profile',  '🔥', false, NULL,  8),
  ('nickname_gradient',       '닉네임 그라데이션',       '닉네임에 PW 시그니처 그라데이션을 적용합니다',            120, NULL,          'profile',  '🌈', false, 'HOT', 9),
  ('frame_gold',              '프로필 프레임: 골드',      '프로필 이미지에 골드 프레임을 적용합니다',                100, NULL,          'profile',  '👑', false, NULL,  10),
  ('frame_hologram',          '프로필 프레임: 홀로그램',   '프로필 이미지에 홀로그램 프레임을 적용합니다',            150, NULL,          'profile',  '💎', false, NULL,  11)
ON CONFLICT ("item_key") DO NOTHING;
