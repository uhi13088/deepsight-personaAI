-- ═══════════════════════════════════════════════════════════════════════
-- 프로덕션 DB Catchup 마이그레이션 — Step 4 (042~047)
-- 생성일: 2026-03-06
--
-- 실행 전제: 041_production_catchup_038_040.sql 이 이미 적용됨
--   (apply_production_catchup_all.sql → 041 순서로 실행)
--
-- 포함 항목:
--   PART A: Migration 042 — 관계 모델 v4.2 확장 (attraction/peakStage/momentum/milestones)
--   PART B: Migration 043 — Adaptive Onboarding 확장 + 질문 풀 시드 (21문항)
--   PART C: Migration 044 — ContentItem + PersonaCuratedContent + UserContentFeedback
--   PART D: Migration 045 — v5.0 Semantic Memory Layer
--   PART E: Migration 046 — MediaSource + MediaItem + persona_posts.mediaItemId
--   PART F: Migration 047 — personas.fewShotEnabled
--
-- 안전성:
--   - 모든 CREATE TABLE → IF NOT EXISTS 적용
--   - 모든 ALTER TABLE ADD COLUMN → IF NOT EXISTS 적용
--   - FK 제약조건 → DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN ... END $$
--   - CREATE INDEX → IF NOT EXISTS 적용
--   - ENUM 생성 → DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL $$
--   - 재실행 가능 (idempotent)
--
-- 실행:
--   Neon 콘솔 → SQL Editor → 파일 내용 붙여넣기 → Run
-- ═══════════════════════════════════════════════════════════════════════


-- =====================================================================
-- PART A: Migration 042 — 관계 모델 v4.2 확장
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART A: 042 관계 모델 v4.2 시작 ==='; END $$;

ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS attraction DECIMAL(3,2) NOT NULL DEFAULT 0.00;

ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS peak_stage TEXT NOT NULL DEFAULT 'STRANGER';

ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS momentum DECIMAL(3,2) NOT NULL DEFAULT 0.00;

ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS milestones JSONB;

DO $$ BEGIN RAISE NOTICE '=== PART A 완료 ==='; END $$;


-- =====================================================================
-- PART B: Migration 043 — Adaptive Onboarding
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART B: 043 Adaptive Onboarding 시작 ==='; END $$;

ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT false;
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS pool_category TEXT DEFAULT 'core';
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS information_gain DECIMAL(3,2) DEFAULT 0.50;
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS min_prior_answers INT DEFAULT 0;

UPDATE psych_profile_templates
SET is_adaptive = true, pool_category = 'core', information_gain = 0.80, min_prior_answers = 0
WHERE id LIKE 'v3-q0%' AND "questionOrder" BETWEEN 1 AND 8;

UPDATE psych_profile_templates
SET is_adaptive = true, pool_category = 'cross_layer', information_gain = 0.70, min_prior_answers = 6
WHERE (id LIKE 'v3-q%') AND "questionOrder" BETWEEN 9 AND 16;

UPDATE psych_profile_templates
SET is_adaptive = true, pool_category = 'verification', information_gain = 0.60, min_prior_answers = 14
WHERE (id LIKE 'v3-q%') AND "questionOrder" BETWEEN 17 AND 24;

-- 추가 21문항 시드 (ON CONFLICT DO NOTHING → 재실행 안전)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-25-depth-deepen', 'AQ25-depth-심층', 'STANDARD', 25,
  '다큐멘터리를 고를 때, 어떤 기준이 가장 중요한가요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"얼마나 새로운 시각을 제공하는지","l1Weights":{"depth":0.20},"l2Weights":{"openness":0.10}},{"key":"B","label":"얼마나 꼼꼼하게 취재했는지","l1Weights":{"depth":0.25},"l2Weights":{"conscientiousness":0.10}},{"key":"C","label":"이야기가 얼마나 감동적인지","l1Weights":{"depth":-0.10},"l2Weights":{"agreeableness":0.10}},{"key":"D","label":"짧고 핵심만 전달하는지","l1Weights":{"depth":-0.20}}]'::jsonb,
  ARRAY['depth','openness','conscientiousness'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.75, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-26-lens-deepen', 'AQ26-lens-심층', 'STANDARD', 26,
  '뉴스에서 큰 사건이 터졌을 때, 가장 먼저 하는 행동은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"관련 데이터와 통계를 찾아본다","l1Weights":{"lens":0.25}},{"key":"B","label":"전문가 분석 기사를 읽는다","l1Weights":{"lens":0.15}},{"key":"C","label":"당사자들의 인터뷰나 경험담을 찾아본다","l1Weights":{"lens":-0.20}},{"key":"D","label":"SNS 반응을 훑어본다","l1Weights":{"lens":-0.15},"l2Weights":{"extraversion":0.10}}]'::jsonb,
  ARRAY['lens','depth'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-27-stance-deepen', 'AQ27-stance-심층', 'STANDARD', 27,
  '친한 친구가 자신 있게 추천한 영화가 당신 취향이 아니었습니다. 어떻게 반응하나요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"솔직하게 왜 별로였는지 구체적으로 이야기한다","l1Weights":{"stance":0.25},"l2Weights":{"agreeableness":-0.10}},{"key":"B","label":"좋았던 부분은 인정하되, 아쉬운 점도 함께 이야기한다","l1Weights":{"stance":0.10},"l2Weights":{"agreeableness":0.10}},{"key":"C","label":"그냥 재밌었어라고 넘어간다","l1Weights":{"stance":-0.20},"l2Weights":{"agreeableness":0.15}},{"key":"D","label":"친구의 취향 포인트를 물어본다","l1Weights":{"stance":-0.05},"l2Weights":{"openness":0.10}}]'::jsonb,
  ARRAY['stance','agreeableness'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-28-scope-deepen', 'AQ28-scope-심층', 'STANDARD', 28,
  '서점에 가면 어떤 패턴으로 책을 고르나요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"한 분야 코너에서 오래 머문다","l1Weights":{"scope":-0.20}},{"key":"B","label":"이것저것 다양한 코너를 둘러본다","l1Weights":{"scope":0.25},"l2Weights":{"openness":0.10}},{"key":"C","label":"베스트셀러 목록을 먼저 확인한다","l1Weights":{"scope":0.10}},{"key":"D","label":"좋아하는 작가의 신간이 있는지만 확인한다","l1Weights":{"scope":-0.15},"l2Weights":{"openness":-0.10}}]'::jsonb,
  ARRAY['scope','depth','openness'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-29-taste-deepen', 'AQ29-taste-심층', 'STANDARD', 29,
  '음악을 고를 때 어떤 경향이 가장 강한가요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"아무도 안 듣는 인디/언더그라운드 아티스트를 파고든다","l1Weights":{"taste":0.25}},{"key":"B","label":"장르를 가리지 않지만 완성도가 높은 음악이어야 한다","l1Weights":{"taste":0.10}},{"key":"C","label":"차트 상위권 음악을 주로 듣되 가끔 새로운 것도 시도한다","l1Weights":{"taste":-0.10}},{"key":"D","label":"유행하는 음악을 듣는 게 편하다","l1Weights":{"taste":-0.20}}]'::jsonb,
  ARRAY['taste'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.65, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-30-purpose-deepen', 'AQ30-purpose-심층', 'STANDARD', 30,
  '하루의 끝, 침대에서 스마트폰을 들었을 때 가장 먼저 여는 앱의 성격은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"뉴스/학습 앱","l1Weights":{"purpose":0.25}},{"key":"B","label":"커뮤니티/메신저","l1Weights":{"purpose":0.10}},{"key":"C","label":"숏폼/밈","l1Weights":{"purpose":-0.20}},{"key":"D","label":"팟캐스트/오디오북","l1Weights":{"purpose":0.10}}]'::jsonb,
  ARRAY['purpose','sociability'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.65, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-31-sociability-deepen', 'AQ31-sociability-심층', 'STANDARD', 31,
  '새로운 동네로 이사했습니다. 한 달 후, 이웃과의 관계는?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"동네 모임이나 커뮤니티에 적극 참여해서 여러 이웃과 친해졌다","l1Weights":{"sociability":0.25},"l2Weights":{"extraversion":0.15}},{"key":"B","label":"마주치면 인사하는 정도","l1Weights":{"sociability":0.05}},{"key":"C","label":"특별히 교류하진 않지만 필요하면 도움을 주고받을 수 있다","l1Weights":{"sociability":-0.10}},{"key":"D","label":"이웃과의 교류 없이 조용히 지내는 게 편하다","l1Weights":{"sociability":-0.20},"l2Weights":{"extraversion":-0.15}}]'::jsonb,
  ARRAY['sociability','extraversion'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-32-openness-deepen', 'AQ32-openness-심층', 'STANDARD', 32,
  '완전히 낯선 나라에서 한 달을 보내야 한다면?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"설렌다! 문화, 음식, 언어 — 모든 게 새로운 경험","l2Weights":{"openness":0.25}},{"key":"B","label":"흥미롭지만 준비를 철저히 하고 가겠다","l2Weights":{"openness":0.05,"conscientiousness":0.15}},{"key":"C","label":"약간 불안하지만 가보면 적응할 수 있을 거다","l2Weights":{"openness":0.05}},{"key":"D","label":"솔직히 부담스럽다 — 익숙한 환경이 편하다","l2Weights":{"openness":-0.20}}]'::jsonb,
  ARRAY['openness','conscientiousness'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.75, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-33-conscientiousness-deepen', 'AQ33-conscientiousness-심층', 'STANDARD', 33,
  '마감이 2주 남은 프로젝트. 첫 주에 당신의 상태는?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"이미 50% 이상 완료","l2Weights":{"conscientiousness":0.25}},{"key":"B","label":"큰 틀은 잡아두었다","l2Weights":{"conscientiousness":0.10}},{"key":"C","label":"아이디어는 많지만 아직 시작은 안 했다","l2Weights":{"conscientiousness":-0.15}},{"key":"D","label":"마감 3일 전부터 폭풍 집중","l2Weights":{"conscientiousness":-0.20}}]'::jsonb,
  ARRAY['conscientiousness'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-34-extraversion-deepen', 'AQ34-extraversion-심층', 'STANDARD', 34,
  '금요일 퇴근 후, 에너지를 충전하는 방법은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"친구들과 만나서 수다","l2Weights":{"extraversion":0.25}},{"key":"B","label":"소규모 모임이나 친한 친구 1~2명과 조용한 시간","l2Weights":{"extraversion":0.05}},{"key":"C","label":"집에서 혼자만의 시간","l2Weights":{"extraversion":-0.20}},{"key":"D","label":"상황에 따라 다르다","l2Weights":{"extraversion":0.0}}]'::jsonb,
  ARRAY['extraversion'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-35-agreeableness-deepen', 'AQ35-agreeableness-심층', 'STANDARD', 35,
  '팀 프로젝트에서 의견이 갈릴 때, 보통 어떤 역할을 맡게 되나요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"양쪽 의견을 조율하는 중재자","l2Weights":{"agreeableness":0.25}},{"key":"B","label":"각 의견의 장단점을 분석하는 분석가","l2Weights":{"agreeableness":-0.05}},{"key":"C","label":"내가 옳다고 생각하면 밀고 나가는 주도자","l2Weights":{"agreeableness":-0.20}},{"key":"D","label":"다수 의견을 따르되 치명적 문제가 있으면 조용히 지적한다","l2Weights":{"agreeableness":0.10}}]'::jsonb,
  ARRAY['agreeableness','stance'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.75, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-36-neuroticism-deepen', 'AQ36-neuroticism-심층', 'STANDARD', 36,
  '예상치 못한 변수가 계획을 망쳤을 때, 당신의 첫 반응은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"일단 심호흡 — 이런 일은 있을 수 있고 대안을 찾으면 된다","l2Weights":{"neuroticism":-0.25}},{"key":"B","label":"짜증이 나지만 금방 전환한다","l2Weights":{"neuroticism":-0.10}},{"key":"C","label":"한동안 스트레스를 받는다","l2Weights":{"neuroticism":0.15}},{"key":"D","label":"상당히 불안해진다","l2Weights":{"neuroticism":0.25}}]'::jsonb,
  ARRAY['neuroticism'], '{"type":"adaptive","category":"deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-37-lack-narrative', 'AQ37-lack-서사', 'STANDARD', 37,
  '지금 당신에게 가장 부족하다고 느끼는 것은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"시간","l3Weights":{"lack":0.20,"growthArc":0.10}},{"key":"B","label":"인정","l3Weights":{"lack":0.25}},{"key":"C","label":"방향","l3Weights":{"lack":0.15,"moralCompass":0.10}},{"key":"D","label":"딱히 부족한 건 없다","l3Weights":{"lack":-0.20}}]'::jsonb,
  ARRAY['lack','growthArc'], '{"type":"adaptive","category":"narrative"}'::jsonb,
  false, true, 'narrative', 0.80, 10, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-38-moral-narrative', 'AQ38-moralCompass-서사', 'STANDARD', 38,
  '효율을 위해 규칙을 어기는 것에 대해 어떻게 생각하나요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"규칙은 이유가 있어서 만들어진 것 — 원칙을 지키는 게 중요하다","l3Weights":{"moralCompass":0.25}},{"key":"B","label":"큰 원칙은 지키되 사소한 규칙은 유연하게","l3Weights":{"moralCompass":0.10}},{"key":"C","label":"결과가 좋으면 과정의 유연함은 허용된다","l3Weights":{"moralCompass":-0.15}},{"key":"D","label":"비효율적인 규칙은 바꿔야 한다","l3Weights":{"moralCompass":-0.20},"l2Weights":{"openness":0.10}}]'::jsonb,
  ARRAY['moralCompass'], '{"type":"adaptive","category":"narrative"}'::jsonb,
  false, true, 'narrative', 0.80, 10, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-39-volatility-narrative', 'AQ39-volatility-서사', 'STANDARD', 39,
  '평소 당신의 감정 패턴은 어떤 편인가요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"꽤 안정적이다","l3Weights":{"volatility":-0.25}},{"key":"B","label":"작은 변동은 있지만 금방 회복한다","l3Weights":{"volatility":-0.10}},{"key":"C","label":"기분의 파도가 있다","l3Weights":{"volatility":0.15}},{"key":"D","label":"감정 기복이 큰 편이다","l3Weights":{"volatility":0.25}}]'::jsonb,
  ARRAY['volatility'], '{"type":"adaptive","category":"narrative"}'::jsonb,
  false, true, 'narrative', 0.75, 10, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-40-growth-narrative', 'AQ40-growthArc-서사', 'STANDARD', 40,
  '1년 전의 자신과 비교했을 때, 어떤 느낌이 드나요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"확실히 성장했다","l3Weights":{"growthArc":0.25}},{"key":"B","label":"조금씩 발전하고 있다","l3Weights":{"growthArc":0.10}},{"key":"C","label":"비슷한 것 같다","l3Weights":{"growthArc":-0.15}},{"key":"D","label":"솔직히 정체된 느낌이다","l3Weights":{"growthArc":-0.10,"lack":0.15}}]'::jsonb,
  ARRAY['growthArc','lack'], '{"type":"adaptive","category":"narrative"}'::jsonb,
  false, true, 'narrative', 0.80, 10, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-41-cross-depth-conscient', 'AQ41-cross-depth↔conscientiousness', 'STANDARD', 41,
  '복잡한 설명서를 읽어야 할 때, 당신의 방식은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"처음부터 끝까지 순서대로 꼼꼼히 읽는다","l1Weights":{"depth":0.20},"l2Weights":{"conscientiousness":0.20}},{"key":"B","label":"전체를 훑은 후 필요한 부분만 깊게 읽는다","l1Weights":{"depth":0.15},"l2Weights":{"conscientiousness":-0.05}},{"key":"C","label":"일단 해보고 막히면 해당 부분만 찾아본다","l1Weights":{"depth":-0.15},"l2Weights":{"conscientiousness":-0.15}},{"key":"D","label":"유튜브에서 요약 영상을 찾아본다","l1Weights":{"depth":-0.20},"l2Weights":{"conscientiousness":-0.05}}]'::jsonb,
  ARRAY['depth','conscientiousness'], '{"type":"adaptive","category":"cross_layer"}'::jsonb,
  false, true, 'cross_layer', 0.85, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-42-cross-sociab-agree', 'AQ42-cross-sociability↔agreeableness', 'STANDARD', 42,
  '모임에서 한 사람이 계속 불편한 발언을 합니다. 당신은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"직접 그 자리에서 지적한다","l1Weights":{"sociability":0.10,"stance":0.15},"l2Weights":{"agreeableness":-0.20}},{"key":"B","label":"나중에 따로 조용히 이야기한다","l1Weights":{"sociability":0.05},"l2Weights":{"agreeableness":0.15}},{"key":"C","label":"다른 사람이 말하길 기다린다","l1Weights":{"sociability":-0.15},"l2Weights":{"agreeableness":0.05}},{"key":"D","label":"그냥 그 모임에서 빠진다","l1Weights":{"sociability":-0.20},"l2Weights":{"agreeableness":-0.10}}]'::jsonb,
  ARRAY['sociability','agreeableness','stance'], '{"type":"adaptive","category":"cross_layer"}'::jsonb,
  false, true, 'cross_layer', 0.85, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-43-cross-taste-open', 'AQ43-cross-taste↔openness', 'STANDARD', 43,
  '친구가 당신의 취향과 정반대인 작품을 강력 추천합니다. 어떻게 하나요?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"흥미롭다! 내 시야를 넓힐 기회로 본다","l1Weights":{"taste":-0.05},"l2Weights":{"openness":0.25}},{"key":"B","label":"일단 시도해보지만 내 기준은 확고하다","l1Weights":{"taste":0.10},"l2Weights":{"openness":0.10}},{"key":"C","label":"의무감으로 보긴 하지만 결국 내 취향 아닌 건 안 맞을 것 같다","l1Weights":{"taste":0.15},"l2Weights":{"openness":-0.15}},{"key":"D","label":"정중히 거절한다","l1Weights":{"taste":0.10},"l2Weights":{"openness":-0.20}}]'::jsonb,
  ARRAY['taste','openness'], '{"type":"adaptive","category":"cross_layer"}'::jsonb,
  false, true, 'cross_layer', 0.85, 8, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-44-verify-depth-open', 'AQ44-verify-depth↔openness', 'DEEP', 44,
  '어떤 주제든 깊이 파고들 수 있는 능력 vs 무엇이든 열린 마음으로 받아들이는 유연함. 당신은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"깊이 — 한 가지에 진짜 전문가가 되는 게 나답다","l1Weights":{"depth":0.15},"l2Weights":{"openness":-0.10}},{"key":"B","label":"깊이+유연함 둘 다","l1Weights":{"depth":0.10},"l2Weights":{"openness":0.10}},{"key":"C","label":"유연함 — 다양한 것을 경험하며 넓은 시야를 갖는 게 중요하다","l1Weights":{"depth":-0.10},"l2Weights":{"openness":0.15}},{"key":"D","label":"상황에 따라 다르다","l1Weights":{"depth":0.0},"l2Weights":{"openness":0.0}}]'::jsonb,
  ARRAY['depth','openness'], '{"type":"adaptive","category":"verification"}'::jsonb,
  false, true, 'verification', 0.90, 16, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-45-verify-stance-agree', 'AQ45-verify-stance↔agreeableness', 'DEEP', 45,
  '원칙과 조화 사이에서 갈등할 때, 당신의 선택은?', 'MULTIPLE_CHOICE',
  '[{"key":"A","label":"원칙 — 내가 옳다고 믿는 것을 양보하면 안 된다","l1Weights":{"stance":0.15},"l2Weights":{"agreeableness":-0.15}},{"key":"B","label":"원칙을 지키되 표현 방식을 조절한다","l1Weights":{"stance":0.10},"l2Weights":{"agreeableness":0.10}},{"key":"C","label":"조화 — 관계를 해치면서까지 내 의견을 고집할 필요는 없다","l1Weights":{"stance":-0.15},"l2Weights":{"agreeableness":0.15}},{"key":"D","label":"상황에 따라 유연하게","l1Weights":{"stance":-0.05},"l2Weights":{"agreeableness":0.05}}]'::jsonb,
  ARRAY['stance','agreeableness'], '{"type":"adaptive","category":"verification"}'::jsonb,
  false, true, 'verification', 0.90, 16, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN RAISE NOTICE '=== PART B 완료 ==='; END $$;


-- =====================================================================
-- PART C: Migration 044 — ContentItem + Curation + Feedback
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART C: 044 ContentItem 시작 ==='; END $$;

DO $$ BEGIN
  CREATE TYPE "ContentItemType" AS ENUM ('MOVIE','DRAMA','MUSIC','BOOK','ARTICLE','PRODUCT','VIDEO','PODCAST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CurationStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentFeedbackAction" AS ENUM ('LIKE','SKIP','SAVE','CONSUME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "content_items" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"        TEXT        NOT NULL,
  "contentType"     "ContentItemType" NOT NULL,
  "title"           TEXT        NOT NULL,
  "description"     TEXT,
  "sourceUrl"       TEXT,
  "externalId"      TEXT,
  "genres"          TEXT[]      NOT NULL DEFAULT '{}',
  "tags"            TEXT[]      NOT NULL DEFAULT '{}',
  "contentVector"   JSONB,
  "narrativeTheme"  JSONB,
  "vectorizedAt"    TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "content_items_tenantId_externalId_key"
  ON "content_items"("tenantId", "externalId")
  WHERE "externalId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "content_items_tenantId_idx" ON "content_items"("tenantId");
CREATE INDEX IF NOT EXISTS "content_items_contentType_idx" ON "content_items"("contentType");

CREATE TABLE IF NOT EXISTS "persona_curated_contents" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "personaId"       TEXT        NOT NULL,
  "contentItemId"   TEXT        NOT NULL,
  "curationScore"   DECIMAL(4,3) NOT NULL,
  "curationReason"  TEXT,
  "highlights"      TEXT[]      NOT NULL DEFAULT '{}',
  "status"          "CurationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "persona_curated_contents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_curated_contents_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE,
  CONSTRAINT "persona_curated_contents_contentItemId_fkey"
    FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_curated_contents_personaId_contentItemId_key"
  ON "persona_curated_contents"("personaId", "contentItemId");
CREATE INDEX IF NOT EXISTS "persona_curated_contents_personaId_status_idx"
  ON "persona_curated_contents"("personaId", "status");
CREATE INDEX IF NOT EXISTS "persona_curated_contents_contentItemId_idx"
  ON "persona_curated_contents"("contentItemId");

CREATE TABLE IF NOT EXISTS "user_content_feedbacks" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"          TEXT        NOT NULL,
  "contentItemId"   TEXT        NOT NULL,
  "action"          "ContentFeedbackAction" NOT NULL,
  "viaPersonaId"    TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_content_feedbacks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_content_feedbacks_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_content_feedbacks_contentItemId_fkey"
    FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_content_feedbacks_userId_contentItemId_key"
  ON "user_content_feedbacks"("userId", "contentItemId");
CREATE INDEX IF NOT EXISTS "user_content_feedbacks_userId_idx" ON "user_content_feedbacks"("userId");
CREATE INDEX IF NOT EXISTS "user_content_feedbacks_contentItemId_idx" ON "user_content_feedbacks"("contentItemId");

DO $$ BEGIN RAISE NOTICE '=== PART C 완료 ==='; END $$;


-- =====================================================================
-- PART D: Migration 045 — v5.0 Semantic Memory Layer
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART D: 045 Semantic Memory 시작 ==='; END $$;

DO $$ BEGIN
  CREATE TYPE "SemanticMemoryCategory" AS ENUM (
    'BELIEF', 'RELATIONSHIP_MODEL', 'LEARNED_PATTERN', 'SELF_NARRATIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "semantic_memories" (
  "id"               TEXT NOT NULL,
  "personaId"        TEXT NOT NULL,
  "category"         "SemanticMemoryCategory" NOT NULL,
  "subject"          TEXT NOT NULL,
  "belief"           TEXT NOT NULL,
  "confidence"       DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "evidenceCount"    INTEGER NOT NULL DEFAULT 1,
  "sourceEpisodeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "l3Influence"      JSONB,
  "consolidatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "semantic_memories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "semantic_memories_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "semantic_memories_personaId_category_idx"
  ON "semantic_memories"("personaId", "category");
CREATE INDEX IF NOT EXISTS "semantic_memories_personaId_confidence_idx"
  ON "semantic_memories"("personaId", "confidence");
CREATE INDEX IF NOT EXISTS "semantic_memories_personaId_consolidatedAt_idx"
  ON "semantic_memories"("personaId", "consolidatedAt");

DO $$ BEGIN RAISE NOTICE '=== PART D 완료 ==='; END $$;


-- =====================================================================
-- PART E: Migration 046 — MediaSource + MediaItem + persona_posts.mediaItemId
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART E: 046 Media 시작 ==='; END $$;

DO $$ BEGIN
  CREATE TYPE "MediaSourceType" AS ENUM (
    'TMDB_MOVIE', 'TMDB_TV', 'KOPIS_PERFORMANCE', 'KOPIS_EXHIBITION', 'ALADIN_BOOK', 'LASTFM_MUSIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaItemType" AS ENUM ('MOVIE','TV','PERFORMANCE','EXHIBITION','BOOK','MUSIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "media_sources" (
  "id"                  TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "sourceType"          "MediaSourceType" NOT NULL,
  "apiEndpoint"         TEXT,
  "region"              TEXT NOT NULL DEFAULT 'KR',
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "lastFetchAt"         TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "lastError"           TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "media_items" (
  "id"              TEXT NOT NULL,
  "sourceId"        TEXT NOT NULL,
  "mediaType"       "MediaItemType" NOT NULL,
  "title"           TEXT NOT NULL,
  "originalId"      TEXT NOT NULL,
  "description"     TEXT,
  "releaseDate"     TIMESTAMP(3),
  "venue"           TEXT,
  "creator"         TEXT,
  "genres"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "region"          TEXT NOT NULL DEFAULT 'KR',
  "importanceScore" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "rawData"         JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_items_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "media_sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- persona_posts.mediaItemId 컬럼 추가
ALTER TABLE "persona_posts" ADD COLUMN IF NOT EXISTS "mediaItemId" TEXT;

DO $$ BEGIN
  ALTER TABLE "persona_posts" DROP CONSTRAINT IF EXISTS "persona_posts_mediaItemId_fkey";
  ALTER TABLE "persona_posts"
    ADD CONSTRAINT "persona_posts_mediaItemId_fkey"
      FOREIGN KEY ("mediaItemId") REFERENCES "media_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  RAISE NOTICE '  FK persona_posts_mediaItemId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK persona_posts_mediaItemId_fkey skipped: %', SQLERRM;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "media_items_sourceId_originalId_key"
  ON "media_items"("sourceId", "originalId");
CREATE INDEX IF NOT EXISTS "media_items_mediaType_createdAt_idx"
  ON "media_items"("mediaType", "createdAt");
CREATE INDEX IF NOT EXISTS "media_items_region_idx"
  ON "media_items"("region");
CREATE INDEX IF NOT EXISTS "persona_posts_mediaItemId_idx"
  ON "persona_posts"("mediaItemId");

DO $$ BEGIN RAISE NOTICE '=== PART E 완료 ==='; END $$;


-- =====================================================================
-- PART F: Migration 047 — personas.fewShotEnabled
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART F: 047 fewShotEnabled 시작 ==='; END $$;

ALTER TABLE "personas"
  ADD COLUMN IF NOT EXISTS "fewShotEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN RAISE NOTICE '=== PART F 완료 ==='; END $$;


-- ═══════════════════════════════════════════════════════════════════════
-- 전체 완료! 검증 쿼리:
--
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--   AND tablename IN (
--     'chat_threads', 'chat_messages', 'call_reservations', 'call_sessions',
--     'content_items', 'persona_curated_contents', 'user_content_feedbacks',
--     'semantic_memories', 'media_sources', 'media_items'
--   )
-- ORDER BY tablename;
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'personas'
--   AND column_name IN ('fewShotEnabled', 'ttsProvider', 'ttsVoiceId');
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'persona_posts'
--   AND column_name = 'mediaItemId';
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'persona_relationships'
--   AND column_name IN ('attraction', 'peak_stage', 'momentum', 'milestones');
-- ═══════════════════════════════════════════════════════════════════════
