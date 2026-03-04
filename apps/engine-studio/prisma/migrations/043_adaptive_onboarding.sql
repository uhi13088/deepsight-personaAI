-- ============================================================
-- 043: Adaptive Onboarding — PsychProfileTemplate 확장 + 질문 풀 시드
-- 2026-03-04
--
-- 1. PsychProfileTemplate에 적응형 메타데이터 컬럼 추가
-- 2. 기존 24문항에 적응형 메타 태깅
-- 3. 추가 21문항 시드 (총 45문항 풀)
-- ============================================================

-- ① 스키마 확장
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT false;
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS pool_category TEXT DEFAULT 'core';
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS information_gain DECIMAL(3,2) DEFAULT 0.50;
ALTER TABLE psych_profile_templates ADD COLUMN IF NOT EXISTS min_prior_answers INT DEFAULT 0;

-- ② 기존 Phase 1 (Q1~Q8) → core, isAdaptive=true
UPDATE psych_profile_templates
SET is_adaptive = true, pool_category = 'core', information_gain = 0.80, min_prior_answers = 0
WHERE id LIKE 'v3-q0%' AND "questionOrder" BETWEEN 1 AND 8;

-- ③ 기존 Phase 2 (Q9~Q16) → cross_layer, isAdaptive=true
UPDATE psych_profile_templates
SET is_adaptive = true, pool_category = 'cross_layer', information_gain = 0.70, min_prior_answers = 6
WHERE (id LIKE 'v3-q%') AND "questionOrder" BETWEEN 9 AND 16;

-- ④ 기존 Phase 3 (Q17~Q24) → verification, isAdaptive=true
UPDATE psych_profile_templates
SET is_adaptive = true, pool_category = 'verification', information_gain = 0.60, min_prior_answers = 14
WHERE (id LIKE 'v3-q%') AND "questionOrder" BETWEEN 17 AND 24;

-- ⑤ 추가 21문항 시드 (적응형 전용)
-- L1 Deepening 7문항 (AQ25~AQ31)
-- L2 Deepening 5문항 (AQ32~AQ36)
-- L3 Narrative 4문항 (AQ37~AQ40)
-- Cross-Layer 3문항 (AQ41~AQ43)
-- Verification 2문항 (AQ44~AQ45)

-- ═══════════════════════════════════
-- L1 Deepening: depth 심층 탐색
-- ═══════════════════════════════════
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-25-depth-deepen',
  'AQ25-depth-심층',
  'STANDARD', 25,
  '다큐멘터리를 고를 때, 어떤 기준이 가장 중요한가요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "얼마나 새로운 시각을 제공하는지 — 기존 상식을 뒤집는 이야기가 좋다", "l1Weights": {"depth": 0.20}, "l2Weights": {"openness": 0.10}},
    {"key": "B", "label": "얼마나 꼼꼼하게 취재했는지 — 데이터와 근거가 탄탄해야 한다", "l1Weights": {"depth": 0.25}, "l2Weights": {"conscientiousness": 0.10}},
    {"key": "C", "label": "이야기가 얼마나 감동적인지 — 사람들의 진짜 이야기가 중요하다", "l1Weights": {"depth": -0.10}, "l2Weights": {"agreeableness": 0.10}},
    {"key": "D", "label": "짧고 핵심만 전달하는지 — 요약 영상이나 카드뉴스를 선호한다", "l1Weights": {"depth": -0.20}}
  ]'::jsonb,
  ARRAY['depth', 'openness', 'conscientiousness'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.75, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L1 Deepening: lens (분석/감성 관점)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-26-lens-deepen',
  'AQ26-lens-심층',
  'STANDARD', 26,
  '뉴스에서 큰 사건이 터졌을 때, 가장 먼저 하는 행동은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "관련 데이터와 통계를 찾아본다 — 숫자가 말해주는 게 있으니까", "l1Weights": {"lens": 0.25}},
    {"key": "B", "label": "전문가 분석 기사를 읽는다 — 맥락과 배경을 이해하고 싶다", "l1Weights": {"lens": 0.15}, "l1Weights2": {"depth": 0.10}},
    {"key": "C", "label": "당사자들의 인터뷰나 경험담을 찾아본다 — 사람의 이야기가 핵심이다", "l1Weights": {"lens": -0.20}},
    {"key": "D", "label": "SNS 반응을 훑어본다 — 사람들이 어떻게 느끼는지 궁금하다", "l1Weights": {"lens": -0.15}, "l2Weights": {"extraversion": 0.10}}
  ]'::jsonb,
  ARRAY['lens', 'depth'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L1 Deepening: stance (비판적 태도)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-27-stance-deepen',
  'AQ27-stance-심층',
  'STANDARD', 27,
  '친한 친구가 자신 있게 추천한 영화가 당신 취향이 아니었습니다. 어떻게 반응하나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "솔직하게 왜 별로였는지 구체적으로 이야기한다", "l1Weights": {"stance": 0.25}, "l2Weights": {"agreeableness": -0.10}},
    {"key": "B", "label": "좋았던 부분은 인정하되, 아쉬운 점도 함께 이야기한다", "l1Weights": {"stance": 0.10}, "l2Weights": {"agreeableness": 0.10}},
    {"key": "C", "label": "그냥 ''재밌었어''라고 넘어간다 — 굳이 분위기를 깰 필요는 없다", "l1Weights": {"stance": -0.20}, "l2Weights": {"agreeableness": 0.15}},
    {"key": "D", "label": "친구의 취향 포인트를 물어본다 — 내가 놓친 게 있을 수도 있으니", "l1Weights": {"stance": -0.05}, "l2Weights": {"openness": 0.10}}
  ]'::jsonb,
  ARRAY['stance', 'agreeableness'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L1 Deepening: scope (관심 범위)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-28-scope-deepen',
  'AQ28-scope-심층',
  'STANDARD', 28,
  '서점에 가면 어떤 패턴으로 책을 고르나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "한 분야 코너에서 오래 머문다 — 관심 주제를 더 깊게 파고 싶다", "l1Weights": {"scope": -0.20}, "l1Weights2": {"depth": 0.10}},
    {"key": "B", "label": "이것저것 다양한 코너를 둘러본다 — 예상 못한 발견이 좋다", "l1Weights": {"scope": 0.25}, "l2Weights": {"openness": 0.10}},
    {"key": "C", "label": "베스트셀러 목록을 먼저 확인한다 — 다른 사람들이 뭘 읽는지 궁금하다", "l1Weights": {"scope": 0.10}, "l2Weights": {"extraversion": 0.05}},
    {"key": "D", "label": "좋아하는 작가의 신간이 있는지만 확인한다 — 검증된 것이 편하다", "l1Weights": {"scope": -0.15}, "l2Weights": {"openness": -0.10}}
  ]'::jsonb,
  ARRAY['scope', 'depth', 'openness'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L1 Deepening: taste (취향 독특성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-29-taste-deepen',
  'AQ29-taste-심층',
  'STANDARD', 29,
  '음악을 고를 때 어떤 경향이 가장 강한가요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "아무도 안 듣는 인디/언더그라운드 아티스트를 파고든다", "l1Weights": {"taste": 0.25}},
    {"key": "B", "label": "장르를 가리지 않지만, 완성도가 높은 음악이어야 한다", "l1Weights": {"taste": 0.10}, "l1Weights2": {"depth": 0.10}},
    {"key": "C", "label": "차트 상위권 음악을 주로 듣되, 가끔 새로운 것도 시도한다", "l1Weights": {"taste": -0.10}},
    {"key": "D", "label": "유행하는 음악을 듣는 게 편하다 — 대중적인 게 대중적인 이유가 있다", "l1Weights": {"taste": -0.20}}
  ]'::jsonb,
  ARRAY['taste'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.65, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L1 Deepening: purpose (사용 목적)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-30-purpose-deepen',
  'AQ30-purpose-심층',
  'STANDARD', 30,
  '하루의 끝, 침대에서 스마트폰을 들었을 때 가장 먼저 여는 앱의 성격은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "뉴스/학습 앱 — 하루를 정리하며 새로운 걸 배우고 싶다", "l1Weights": {"purpose": 0.25}},
    {"key": "B", "label": "커뮤니티/메신저 — 사람들과 대화하며 하루를 마무리한다", "l1Weights": {"purpose": 0.10}, "l1Weights2": {"sociability": 0.15}},
    {"key": "C", "label": "숏폼/밈 — 머리 비우고 웃기는 영상 보며 릴렉스한다", "l1Weights": {"purpose": -0.20}},
    {"key": "D", "label": "팟캐스트/오디오북 — 누워서 듣는 게 편하다", "l1Weights": {"purpose": 0.10}, "l1Weights2": {"depth": 0.05}}
  ]'::jsonb,
  ARRAY['purpose', 'sociability'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.65, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L1 Deepening: sociability (사교성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-31-sociability-deepen',
  'AQ31-sociability-심층',
  'STANDARD', 31,
  '새로운 동네로 이사했습니다. 한 달 후, 이웃과의 관계는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "동네 모임이나 커뮤니티에 적극 참여해서 여러 이웃과 친해졌다", "l1Weights": {"sociability": 0.25}, "l2Weights": {"extraversion": 0.15}},
    {"key": "B", "label": "마주치면 인사하는 정도, 자연스럽게 아는 얼굴이 생겼다", "l1Weights": {"sociability": 0.05}, "l2Weights": {"extraversion": 0.05}},
    {"key": "C", "label": "특별히 교류하진 않지만, 필요하면 도움을 주고받을 수 있다", "l1Weights": {"sociability": -0.10}},
    {"key": "D", "label": "이웃과의 교류 없이 조용히 지내는 게 편하다", "l1Weights": {"sociability": -0.20}, "l2Weights": {"extraversion": -0.15}}
  ]'::jsonb,
  ARRAY['sociability', 'extraversion'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 4,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════
-- L2 Deepening: OCEAN 5차원
-- ═══════════════════════════════════

-- L2 Deepening: openness (개방성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-32-openness-deepen',
  'AQ32-openness-심층',
  'STANDARD', 32,
  '완전히 낯선 나라에서 한 달을 보내야 한다면?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "설렌다! 문화, 음식, 언어 — 모든 게 새로운 경험이 될 거다", "l2Weights": {"openness": 0.25}},
    {"key": "B", "label": "흥미롭지만 준비를 철저히 하고 가겠다 — 리스크 관리가 중요하다", "l2Weights": {"openness": 0.05}, "l2Weights2": {"conscientiousness": 0.15}},
    {"key": "C", "label": "약간 불안하지만 가보면 적응할 수 있을 거다", "l2Weights": {"openness": 0.05}, "l2Weights2": {"neuroticism": 0.10}},
    {"key": "D", "label": "솔직히 부담스럽다 — 익숙한 환경이 편하다", "l2Weights": {"openness": -0.20}}
  ]'::jsonb,
  ARRAY['openness', 'conscientiousness'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.75, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L2 Deepening: conscientiousness (성실성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-33-conscientiousness-deepen',
  'AQ33-conscientiousness-심층',
  'STANDARD', 33,
  '마감이 2주 남은 프로젝트. 첫 주에 당신의 상태는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "이미 50% 이상 완료 — 마감 전에 수정할 여유를 확보해둔다", "l2Weights": {"conscientiousness": 0.25}},
    {"key": "B", "label": "큰 틀은 잡아두었다 — 디테일은 마감 가까워지면 집중한다", "l2Weights": {"conscientiousness": 0.10}},
    {"key": "C", "label": "아이디어는 많지만 아직 시작은 안 했다 — 영감이 올 때 몰아서 한다", "l2Weights": {"conscientiousness": -0.15}},
    {"key": "D", "label": "마감 3일 전부터 폭풍 집중 — 압박이 있어야 최선이 나온다", "l2Weights": {"conscientiousness": -0.20}}
  ]'::jsonb,
  ARRAY['conscientiousness'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L2 Deepening: extraversion (외향성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-34-extraversion-deepen',
  'AQ34-extraversion-심층',
  'STANDARD', 34,
  '금요일 퇴근 후, 에너지를 충전하는 방법은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "친구들과 만나서 수다 — 사람을 만나면 오히려 에너지가 충전된다", "l2Weights": {"extraversion": 0.25}},
    {"key": "B", "label": "소규모 모임이나 친한 친구 1~2명과 조용한 시간 — 깊은 대화가 좋다", "l2Weights": {"extraversion": 0.05}},
    {"key": "C", "label": "집에서 혼자만의 시간 — 책, 영화, 게임 등 온전히 나를 위한 시간이 필요하다", "l2Weights": {"extraversion": -0.20}},
    {"key": "D", "label": "상황에 따라 다르다 — 에너지가 있으면 만나고, 없으면 쉰다", "l2Weights": {"extraversion": 0.0}}
  ]'::jsonb,
  ARRAY['extraversion'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L2 Deepening: agreeableness (친화성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-35-agreeableness-deepen',
  'AQ35-agreeableness-심층',
  'STANDARD', 35,
  '팀 프로젝트에서 의견이 갈릴 때, 보통 어떤 역할을 맡게 되나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "양쪽 의견을 조율하는 중재자 — 모두가 만족하는 방안을 찾으려 한다", "l2Weights": {"agreeableness": 0.25}},
    {"key": "B", "label": "각 의견의 장단점을 분석하는 분석가 — 객관적 근거로 결정해야 한다", "l2Weights": {"agreeableness": -0.05}, "l1Weights": {"lens": 0.10}},
    {"key": "C", "label": "내가 옳다고 생각하면 밀고 나가는 주도자 — 확신이 중요하다", "l2Weights": {"agreeableness": -0.20}, "l1Weights": {"stance": 0.15}},
    {"key": "D", "label": "다수 의견을 따르되, 치명적 문제가 있으면 조용히 지적한다", "l2Weights": {"agreeableness": 0.10}}
  ]'::jsonb,
  ARRAY['agreeableness', 'stance'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.75, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L2 Deepening: neuroticism (신경증)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-36-neuroticism-deepen',
  'AQ36-neuroticism-심층',
  'STANDARD', 36,
  '예상치 못한 변수가 계획을 망쳤을 때, 당신의 첫 반응은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "일단 심호흡 — 이런 일은 있을 수 있고, 대안을 찾으면 된다", "l2Weights": {"neuroticism": -0.25}},
    {"key": "B", "label": "짜증이 나지만 금방 전환한다 — 감정 소모할 시간에 대응하는 게 낫다", "l2Weights": {"neuroticism": -0.10}},
    {"key": "C", "label": "한동안 스트레스를 받는다 — 왜 이런 일이 생겼는지 계속 생각하게 된다", "l2Weights": {"neuroticism": 0.15}},
    {"key": "D", "label": "상당히 불안해진다 — 연쇄적으로 뭐가 더 잘못될지 걱정된다", "l2Weights": {"neuroticism": 0.25}}
  ]'::jsonb,
  ARRAY['neuroticism'],
  '{"type": "adaptive", "category": "deepening"}'::jsonb,
  false, true, 'deepening', 0.70, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════
-- L3 Narrative: 서사 드라이브 4차원
-- ═══════════════════════════════════

-- L3: lack (결핍감/동기의 원천)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-37-lack-narrative',
  'AQ37-lack-서사',
  'STANDARD', 37,
  '지금 당신에게 가장 부족하다고 느끼는 것은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "시간 — 하고 싶은 것에 비해 시간이 항상 모자란다", "l3Weights": {"lack": 0.20}, "l3Weights2": {"growthArc": 0.10}},
    {"key": "B", "label": "인정 — 내 노력과 능력이 제대로 평가받지 못하는 느낌이다", "l3Weights": {"lack": 0.25}},
    {"key": "C", "label": "방향 — 뭘 해야 할지는 아는데, 왜 해야 하는지 모를 때가 있다", "l3Weights": {"lack": 0.15}, "l3Weights2": {"moralCompass": 0.10}},
    {"key": "D", "label": "딱히 부족한 건 없다 — 지금 상태에 대체로 만족한다", "l3Weights": {"lack": -0.20}}
  ]'::jsonb,
  ARRAY['lack', 'growthArc'],
  '{"type": "adaptive", "category": "narrative"}'::jsonb,
  false, true, 'narrative', 0.80, 10,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L3: moralCompass (도덕적 지향)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-38-moral-narrative',
  'AQ38-moralCompass-서사',
  'STANDARD', 38,
  '효율을 위해 규칙을 어기는 것에 대해 어떻게 생각하나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "규칙은 이유가 있어서 만들어진 것 — 원칙을 지키는 게 중요하다", "l3Weights": {"moralCompass": 0.25}},
    {"key": "B", "label": "큰 원칙은 지키되, 사소한 규칙은 상황에 맞게 유연하게 적용한다", "l3Weights": {"moralCompass": 0.10}},
    {"key": "C", "label": "결과가 좋으면 과정의 유연함은 허용된다 — 목적이 더 중요하다", "l3Weights": {"moralCompass": -0.15}},
    {"key": "D", "label": "비효율적인 규칙은 바꿔야 한다 — 관성적으로 따르는 건 무의미하다", "l3Weights": {"moralCompass": -0.20}, "l2Weights": {"openness": 0.10}}
  ]'::jsonb,
  ARRAY['moralCompass'],
  '{"type": "adaptive", "category": "narrative"}'::jsonb,
  false, true, 'narrative', 0.80, 10,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L3: volatility (변동성)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-39-volatility-narrative',
  'AQ39-volatility-서사',
  'STANDARD', 39,
  '평소 당신의 감정 패턴은 어떤 편인가요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "꽤 안정적이다 — 기분의 고저 없이 꾸준한 편이다", "l3Weights": {"volatility": -0.25}},
    {"key": "B", "label": "작은 변동은 있지만 금방 회복한다 — 전체적으로 안정적이다", "l3Weights": {"volatility": -0.10}},
    {"key": "C", "label": "기분의 파도가 있다 — 좋을 때는 매우 좋고, 가라앉을 때는 확실히 가라앉는다", "l3Weights": {"volatility": 0.15}},
    {"key": "D", "label": "감정 기복이 큰 편이다 — 예측하기 어렵지만 그게 나의 에너지원이기도 하다", "l3Weights": {"volatility": 0.25}}
  ]'::jsonb,
  ARRAY['volatility'],
  '{"type": "adaptive", "category": "narrative"}'::jsonb,
  false, true, 'narrative', 0.75, 10,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- L3: growthArc (성장 추구)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-40-growth-narrative',
  'AQ40-growthArc-서사',
  'STANDARD', 40,
  '1년 전의 자신과 비교했을 때, 어떤 느낌이 드나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "확실히 성장했다 — 생각, 능력, 관점 모두 넓어졌다", "l3Weights": {"growthArc": 0.25}},
    {"key": "B", "label": "조금씩 발전하고 있다 — 속도는 느리지만 방향은 맞다", "l3Weights": {"growthArc": 0.10}},
    {"key": "C", "label": "비슷한 것 같다 — 딱히 변한 건 없지만 불만도 없다", "l3Weights": {"growthArc": -0.15}},
    {"key": "D", "label": "솔직히 정체된 느낌이다 — 뭔가 바꿔야 할 것 같은데 뭔지 모르겠다", "l3Weights": {"growthArc": -0.10}, "l3Weights2": {"lack": 0.15}}
  ]'::jsonb,
  ARRAY['growthArc', 'lack'],
  '{"type": "adaptive", "category": "narrative"}'::jsonb,
  false, true, 'narrative', 0.80, 10,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════
-- Cross-Layer: L1↔L2 교차 측정 3문항
-- ═══════════════════════════════════

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-41-cross-depth-conscient',
  'AQ41-cross-depth↔conscientiousness',
  'STANDARD', 41,
  '복잡한 설명서를 읽어야 할 때, 당신의 방식은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "처음부터 끝까지 순서대로 꼼꼼히 읽는다", "l1Weights": {"depth": 0.20}, "l2Weights": {"conscientiousness": 0.20}},
    {"key": "B", "label": "전체를 훑은 후 필요한 부분만 깊게 읽는다", "l1Weights": {"depth": 0.15}, "l2Weights": {"conscientiousness": -0.05}},
    {"key": "C", "label": "일단 해보고, 막히면 해당 부분만 찾아본다", "l1Weights": {"depth": -0.15}, "l2Weights": {"conscientiousness": -0.15}},
    {"key": "D", "label": "유튜브에서 요약 영상을 찾아본다", "l1Weights": {"depth": -0.20}, "l2Weights": {"conscientiousness": -0.05}}
  ]'::jsonb,
  ARRAY['depth', 'conscientiousness'],
  '{"type": "adaptive", "category": "cross_layer"}'::jsonb,
  false, true, 'cross_layer', 0.85, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-42-cross-sociab-agree',
  'AQ42-cross-sociability↔agreeableness',
  'STANDARD', 42,
  '모임에서 한 사람이 계속 불편한 발언을 합니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "직접 그 자리에서 지적한다 — 불편한 건 바로 말해야 한다", "l1Weights": {"sociability": 0.10}, "l2Weights": {"agreeableness": -0.20}, "l1Weights2": {"stance": 0.15}},
    {"key": "B", "label": "나중에 따로 조용히 이야기한다 — 공개적으로 망신 줄 필요는 없다", "l1Weights": {"sociability": 0.05}, "l2Weights": {"agreeableness": 0.15}},
    {"key": "C", "label": "다른 사람이 말하길 기다린다 — 내가 나서기엔 부담스럽다", "l1Weights": {"sociability": -0.15}, "l2Weights": {"agreeableness": 0.05}},
    {"key": "D", "label": "그냥 그 모임에서 빠진다 — 에너지를 쏟고 싶지 않다", "l1Weights": {"sociability": -0.20}, "l2Weights": {"agreeableness": -0.10}}
  ]'::jsonb,
  ARRAY['sociability', 'agreeableness', 'stance'],
  '{"type": "adaptive", "category": "cross_layer"}'::jsonb,
  false, true, 'cross_layer', 0.85, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-43-cross-taste-open',
  'AQ43-cross-taste↔openness',
  'STANDARD', 43,
  '친구가 당신의 취향과 정반대인 작품을 강력 추천합니다. 어떻게 하나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "흥미롭다! 내 시야를 넓힐 기회로 본다 — 적극적으로 감상한다", "l1Weights": {"taste": -0.05}, "l2Weights": {"openness": 0.25}},
    {"key": "B", "label": "일단 시도해보지만, 내 기준은 확고하다 — 좋으면 인정, 아니면 아닌 거다", "l1Weights": {"taste": 0.10}, "l2Weights": {"openness": 0.10}},
    {"key": "C", "label": "의무감으로 보긴 하지만, 결국 내 취향 아닌 건 안 맞을 것 같다", "l1Weights": {"taste": 0.15}, "l2Weights": {"openness": -0.15}},
    {"key": "D", "label": "정중히 거절한다 — 내 시간은 내가 좋아하는 것에 쓰고 싶다", "l1Weights": {"taste": 0.10}, "l2Weights": {"openness": -0.20}}
  ]'::jsonb,
  ARRAY['taste', 'openness'],
  '{"type": "adaptive", "category": "cross_layer"}'::jsonb,
  false, true, 'cross_layer', 0.85, 8,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════
-- Verification: 패러독스 검증 2문항
-- ═══════════════════════════════════

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-44-verify-depth-open',
  'AQ44-verify-depth↔openness',
  'DEEP', 44,
  '어떤 주제든 깊이 파고들 수 있는 능력 vs 무엇이든 열린 마음으로 받아들이는 유연함. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "깊이 — 한 가지에 진짜 전문가가 되는 게 나답다", "l1Weights": {"depth": 0.15}, "l2Weights": {"openness": -0.10}},
    {"key": "B", "label": "깊이+유연함 둘 다 — 파고들되 새로운 관점도 환영한다", "l1Weights": {"depth": 0.10}, "l2Weights": {"openness": 0.10}},
    {"key": "C", "label": "유연함 — 다양한 것을 경험하며 넓은 시야를 갖는 게 중요하다", "l1Weights": {"depth": -0.10}, "l2Weights": {"openness": 0.15}},
    {"key": "D", "label": "상황에 따라 다르다 — 때로는 깊게, 때로는 넓게", "l1Weights": {"depth": 0.0}, "l2Weights": {"openness": 0.0}}
  ]'::jsonb,
  ARRAY['depth', 'openness'],
  '{"type": "adaptive", "category": "verification"}'::jsonb,
  false, true, 'verification', 0.90, 16,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired", is_adaptive, pool_category, information_gain, min_prior_answers, "createdAt", "updatedAt")
VALUES (
  'aq-45-verify-stance-agree',
  'AQ45-verify-stance↔agreeableness',
  'DEEP', 45,
  '원칙과 조화 사이에서 갈등할 때, 당신의 선택은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "원칙 — 내가 옳다고 믿는 것을 양보하면 안 된다", "l1Weights": {"stance": 0.15}, "l2Weights": {"agreeableness": -0.15}},
    {"key": "B", "label": "원칙을 지키되 표현 방식을 조절한다 — 맞는 말도 방법이 중요하다", "l1Weights": {"stance": 0.10}, "l2Weights": {"agreeableness": 0.10}},
    {"key": "C", "label": "조화 — 관계를 해치면서까지 내 의견을 고집할 필요는 없다", "l1Weights": {"stance": -0.15}, "l2Weights": {"agreeableness": 0.15}},
    {"key": "D", "label": "상황에 따라 유연하게 — 꼭 이분법으로 나눌 필요는 없다", "l1Weights": {"stance": -0.05}, "l2Weights": {"agreeableness": 0.05}}
  ]'::jsonb,
  ARRAY['stance', 'agreeableness'],
  '{"type": "adaptive", "category": "verification"}'::jsonb,
  false, true, 'verification', 0.90, 16,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;
