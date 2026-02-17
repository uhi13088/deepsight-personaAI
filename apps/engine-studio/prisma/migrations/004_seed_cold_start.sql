-- ============================================================
-- DeepSight Engine Studio — Cold Start v3 Questions Seed
-- Generated: 2026-02-17
--
-- Cold Start v3 질문 24문항 (3-Phase × 8)
-- 독립 실행 가능: 기존 v3 질문 삭제 후 재등록
-- 업데이트 시 이 파일만 재실행하면 됩니다.
--
-- Phase 1 (Q1~Q8):  L1 주력 + L2 부가 → BASIC (~65% 신뢰도)
-- Phase 2 (Q9~Q16): L2 주력 + L1 교차 → STANDARD (~80% 신뢰도)
-- Phase 3 (Q17~Q24): 교차검증 + 역설 감지 → ADVANCED (~93% 신뢰도)
-- ============================================================

-- 기존 v3 질문 삭제
DELETE FROM psych_profile_templates WHERE id LIKE 'v3-q%';

-- 기존 6D 60문항도 삭제 (있으면)
DELETE FROM psych_profile_templates WHERE id LIKE 'seed-q-%';

-- ============================================
-- Phase 1: L1 주력 (8문항)
-- ============================================

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q01-depth-openness',
  'Q01-depth-콘텐츠 깊이 선호',
  'LIGHT', 1,
  '주말에 관심 있는 주제의 다큐멘터리를 발견했습니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "흥미로운 장면만 골라서 빠르게 훑어본다", "l1Weights": {"depth": -0.2}, "l2Weights": {"openness": 0.1}},
    {"key": "B", "label": "한 편 정도는 끝까지 본다", "l1Weights": {"depth": 0.1}, "l2Weights": {"openness": 0.15}},
    {"key": "C", "label": "관련 자료까지 찾아보며 깊이 파고든다", "l1Weights": {"depth": 0.3}, "l2Weights": {"openness": 0.25}},
    {"key": "D", "label": "시리즈 전체를 정주행하고 감독 인터뷰까지 찾아본다", "l1Weights": {"depth": 0.4}, "l2Weights": {"openness": 0.3}}
  ]'::jsonb,
  ARRAY['depth', 'openness'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q02-lens-conscientiousness',
  'Q02-lens-평가 기준',
  'LIGHT', 2,
  '새로운 레스토랑을 고를 때, 가장 먼저 확인하는 것은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "분위기 사진을 보고 직감으로 결정한다", "l1Weights": {"lens": -0.3}, "l2Weights": {"conscientiousness": -0.2}},
    {"key": "B", "label": "친구의 추천을 믿고 따라간다", "l1Weights": {"lens": -0.1}, "l2Weights": {"conscientiousness": 0.0}},
    {"key": "C", "label": "평점과 리뷰 수를 비교해본다", "l1Weights": {"lens": 0.2}, "l2Weights": {"conscientiousness": 0.25}},
    {"key": "D", "label": "메뉴, 가격, 위치, 리뷰를 종합 분석한다", "l1Weights": {"lens": 0.35}, "l2Weights": {"conscientiousness": 0.35}}
  ]'::jsonb,
  ARRAY['lens', 'conscientiousness'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q03-stance-agreeableness',
  'Q03-stance-의견 충돌 상황',
  'LIGHT', 3,
  '친구와 영화에 대해 정반대 의견일 때, 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "\"그럴 수도 있지\" 하고 넘어간다", "l1Weights": {"stance": -0.3}, "l2Weights": {"agreeableness": 0.3}},
    {"key": "B", "label": "상대 의견을 들어보고 공감 포인트를 찾는다", "l1Weights": {"stance": -0.1}, "l2Weights": {"agreeableness": 0.2}},
    {"key": "C", "label": "내 근거를 조목조목 설명한다", "l1Weights": {"stance": 0.25}, "l2Weights": {"agreeableness": -0.1}},
    {"key": "D", "label": "토론을 즐기며 끝까지 논쟁한다", "l1Weights": {"stance": 0.4}, "l2Weights": {"agreeableness": -0.3}}
  ]'::jsonb,
  ARRAY['stance', 'agreeableness'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q04-scope-openness',
  'Q04-scope-정보 탐색 범위',
  'LIGHT', 4,
  '온라인 서점에서 책을 고를 때, 어떤 방식이 자연스럽나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "좋아하는 장르 베스트셀러만 확인한다", "l1Weights": {"scope": -0.3}, "l2Weights": {"openness": -0.2}},
    {"key": "B", "label": "관심 분야 2~3개를 번갈아 본다", "l1Weights": {"scope": -0.05}, "l2Weights": {"openness": 0.05}},
    {"key": "C", "label": "추천 알고리즘이 보여주는 다양한 카테고리를 탐색한다", "l1Weights": {"scope": 0.2}, "l2Weights": {"openness": 0.2}},
    {"key": "D", "label": "전혀 모르는 분야까지 호기심에 이끌려 둘러본다", "l1Weights": {"scope": 0.35}, "l2Weights": {"openness": 0.35}}
  ]'::jsonb,
  ARRAY['scope', 'openness'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q05-taste-openness',
  'Q05-taste-새로운 장르 반응',
  'LIGHT', 5,
  '친구가 평소 안 듣던 장르의 음악을 추천해줍니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "별로 끌리지 않아서 내 플레이리스트를 튼다", "l1Weights": {"taste": -0.3}, "l2Weights": {"openness": -0.3}},
    {"key": "B", "label": "한 곡 정도는 예의상 들어본다", "l1Weights": {"taste": -0.1}, "l2Weights": {"openness": -0.05}},
    {"key": "C", "label": "흥미롭다, 비슷한 곡을 더 찾아본다", "l1Weights": {"taste": 0.2}, "l2Weights": {"openness": 0.25}},
    {"key": "D", "label": "완전 새로운 경험! 그 장르를 파보기 시작한다", "l1Weights": {"taste": 0.4}, "l2Weights": {"openness": 0.35}}
  ]'::jsonb,
  ARRAY['taste', 'openness'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q06-purpose-conscientiousness',
  'Q06-purpose-콘텐츠 소비 동기',
  'LIGHT', 6,
  '유튜브를 켤 때, 주된 이유는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "그냥 시간을 때우려고, 뭐든 재미있으면 OK", "l1Weights": {"purpose": -0.3}, "l2Weights": {"conscientiousness": -0.25}},
    {"key": "B", "label": "기분 전환이나 힐링이 필요해서", "l1Weights": {"purpose": -0.1}, "l2Weights": {"conscientiousness": -0.05}},
    {"key": "C", "label": "관심 분야의 새로운 정보를 얻으려고", "l1Weights": {"purpose": 0.2}, "l2Weights": {"conscientiousness": 0.2}},
    {"key": "D", "label": "구체적으로 배우거나 해결할 문제가 있어서", "l1Weights": {"purpose": 0.35}, "l2Weights": {"conscientiousness": 0.35}}
  ]'::jsonb,
  ARRAY['purpose', 'conscientiousness'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q07-sociability-extraversion',
  'Q07-sociability-공유 토론 성향',
  'LIGHT', 7,
  '인상 깊은 콘텐츠를 발견했을 때, 가장 먼저 하는 행동은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "혼자 조용히 감상을 음미한다", "l1Weights": {"sociability": -0.3}, "l2Weights": {"extraversion": -0.3}},
    {"key": "B", "label": "마음에 담아두고, 나중에 기회가 되면 언급한다", "l1Weights": {"sociability": -0.1}, "l2Weights": {"extraversion": -0.1}},
    {"key": "C", "label": "가까운 친구에게 바로 공유한다", "l1Weights": {"sociability": 0.2}, "l2Weights": {"extraversion": 0.2}},
    {"key": "D", "label": "SNS에 올리고 사람들과 토론하고 싶다", "l1Weights": {"sociability": 0.4}, "l2Weights": {"extraversion": 0.35}}
  ]'::jsonb,
  ARRAY['sociability', 'extraversion'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q08-depth-lens-neuroticism',
  'Q08-depth+lens-복합 반응 상황',
  'LIGHT', 8,
  '기대하던 영화가 평론가 호평, 관객 혹평을 받았습니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "일단 가서 본다, 내 감각을 믿는다", "l1Weights": {"depth": 0.1, "lens": -0.2}, "l2Weights": {"neuroticism": -0.2}},
    {"key": "B", "label": "관객 리뷰를 몇 개 더 읽어보고 결정한다", "l1Weights": {"depth": 0.1, "lens": 0.15}, "l2Weights": {"neuroticism": 0.1}},
    {"key": "C", "label": "혼란스러워서 다른 콘텐츠로 눈을 돌린다", "l1Weights": {"depth": -0.15, "lens": 0.0}, "l2Weights": {"neuroticism": 0.3}},
    {"key": "D", "label": "평론가와 관객의 시각 차이 자체가 흥미롭다", "l1Weights": {"depth": 0.3, "lens": 0.2}, "l2Weights": {"neuroticism": -0.1}}
  ]'::jsonb,
  ARRAY['depth', 'lens', 'neuroticism'],
  '{"type": "mapped", "phase": 1}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Phase 2: L2 주력 (8문항)
-- ============================================

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q09-openness-taste',
  'Q09-openness-변화에 대한 태도',
  'LIGHT', 9,
  '매일 가는 카페에서 메뉴를 고를 때, 당신의 패턴은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "항상 같은 메뉴를 주문한다, 실패하고 싶지 않다", "l2Weights": {"openness": -0.3}, "l1Weights": {"taste": -0.25}},
    {"key": "B", "label": "가끔 신메뉴를 시도하지만 대체로 단골 메뉴", "l2Weights": {"openness": -0.05}, "l1Weights": {"taste": -0.05}},
    {"key": "C", "label": "시즌 메뉴가 나오면 꼭 한번 먹어본다", "l2Weights": {"openness": 0.2}, "l1Weights": {"taste": 0.15}},
    {"key": "D", "label": "매번 다른 메뉴를 시도하는 게 즐겁다", "l2Weights": {"openness": 0.35}, "l1Weights": {"taste": 0.3}}
  ]'::jsonb,
  ARRAY['openness', 'taste'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q10-conscientiousness-scope',
  'Q10-conscientiousness-계획성 vs 즉흥성',
  'LIGHT', 10,
  '여행을 갈 때, 일정을 어떻게 준비하나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "즉흥적으로 간다, 그때그때 결정이 재미있다", "l2Weights": {"conscientiousness": -0.3}, "l1Weights": {"scope": 0.2}},
    {"key": "B", "label": "큰 틀만 잡고 나머지는 현지에서 결정한다", "l2Weights": {"conscientiousness": -0.05}, "l1Weights": {"scope": 0.1}},
    {"key": "C", "label": "주요 일정은 미리 예약하고, 자유 시간도 배분한다", "l2Weights": {"conscientiousness": 0.2}, "l1Weights": {"scope": -0.05}},
    {"key": "D", "label": "시간표, 동선, 예산까지 꼼꼼하게 계획한다", "l2Weights": {"conscientiousness": 0.35}, "l1Weights": {"scope": -0.2}}
  ]'::jsonb,
  ARRAY['conscientiousness', 'scope'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q11-extraversion-sociability',
  'Q11-extraversion-사회적 에너지',
  'LIGHT', 11,
  '금요일 저녁, 에너지 충전을 위해 선택하는 것은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "혼자 집에서 좋아하는 콘텐츠에 몰입한다", "l2Weights": {"extraversion": -0.3}, "l1Weights": {"sociability": -0.25}},
    {"key": "B", "label": "친한 친구 한두 명과 조용히 만난다", "l2Weights": {"extraversion": -0.05}, "l1Weights": {"sociability": 0.05}},
    {"key": "C", "label": "여러 친구를 불러 모아 함께 논다", "l2Weights": {"extraversion": 0.25}, "l1Weights": {"sociability": 0.2}},
    {"key": "D", "label": "새로운 모임이나 행사에 참여해서 사람들을 만난다", "l2Weights": {"extraversion": 0.35}, "l1Weights": {"sociability": 0.35}}
  ]'::jsonb,
  ARRAY['extraversion', 'sociability'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q12-agreeableness-stance',
  'Q12-agreeableness-갈등 해결 방식',
  'LIGHT', 12,
  '온라인 커뮤니티에서 누군가 잘못된 정보를 확신에 차서 올렸습니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "그냥 넘어간다, 내가 나설 일은 아니다", "l2Weights": {"agreeableness": 0.2}, "l1Weights": {"stance": -0.3}},
    {"key": "B", "label": "틀렸다는 것만 알려주고, 반응은 기대하지 않는다", "l2Weights": {"agreeableness": 0.05}, "l1Weights": {"stance": 0.1}},
    {"key": "C", "label": "근거를 들어 정중하게 바로잡는다", "l2Weights": {"agreeableness": -0.05}, "l1Weights": {"stance": 0.25}},
    {"key": "D", "label": "확실한 출처와 함께 반박 글을 작성한다", "l2Weights": {"agreeableness": -0.25}, "l1Weights": {"stance": 0.35}}
  ]'::jsonb,
  ARRAY['agreeableness', 'stance'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q13-neuroticism-lens',
  'Q13-neuroticism-스트레스 반응',
  'MEDIUM', 13,
  '중요한 발표를 앞두고 있을 때, 콘텐츠 소비 패턴은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "평소와 다를 것 없다, 스트레스를 별로 안 받는다", "l2Weights": {"neuroticism": -0.3}, "l1Weights": {"lens": 0.0}},
    {"key": "B", "label": "가벼운 예능이나 음악으로 긴장을 푼다", "l2Weights": {"neuroticism": 0.1}, "l1Weights": {"lens": -0.15}},
    {"key": "C", "label": "발표 관련 자료를 반복해서 확인한다", "l2Weights": {"neuroticism": 0.2}, "l1Weights": {"lens": 0.2}},
    {"key": "D", "label": "불안해서 이것저것 검색하다 시간을 보낸다", "l2Weights": {"neuroticism": 0.35}, "l1Weights": {"lens": -0.1}}
  ]'::jsonb,
  ARRAY['neuroticism', 'lens'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q14-openness-extraversion-purpose',
  'Q14-openness+extraversion-경험 추구 동기',
  'MEDIUM', 14,
  '새로운 취미 활동을 시작하게 된 계기는 보통?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "주변 사람이 하는 걸 보고 따라 시작했다", "l2Weights": {"openness": 0.05, "extraversion": 0.15}, "l1Weights": {"purpose": -0.1}},
    {"key": "B", "label": "우연히 접했는데 재미있어서 계속했다", "l2Weights": {"openness": 0.2, "extraversion": -0.05}, "l1Weights": {"purpose": -0.05}},
    {"key": "C", "label": "배우고 싶은 것이 있어서 의도적으로 찾았다", "l2Weights": {"openness": 0.15, "extraversion": 0.0}, "l1Weights": {"purpose": 0.25}},
    {"key": "D", "label": "완전히 새로운 도전을 위해 스스로 발굴했다", "l2Weights": {"openness": 0.35, "extraversion": 0.1}, "l1Weights": {"purpose": 0.3}}
  ]'::jsonb,
  ARRAY['openness', 'extraversion', 'purpose'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q15-conscientiousness-agreeableness-depth',
  'Q15-conscientiousness+agreeableness-규범 vs 유연성',
  'MEDIUM', 15,
  '팀 프로젝트에서 마감이 촉박할 때, 당신의 우선순위는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "일단 제출하는 게 중요하다, 대충이라도 완성한다", "l2Weights": {"conscientiousness": -0.2, "agreeableness": 0.1}, "l1Weights": {"depth": -0.2}},
    {"key": "B", "label": "핵심만 잘 정리하고 나머지는 추후 보완한다", "l2Weights": {"conscientiousness": 0.1, "agreeableness": 0.05}, "l1Weights": {"depth": 0.05}},
    {"key": "C", "label": "마감을 연장 요청하더라도 퀄리티를 지킨다", "l2Weights": {"conscientiousness": 0.25, "agreeableness": -0.15}, "l1Weights": {"depth": 0.25}},
    {"key": "D", "label": "다른 팀원에게 분담을 제안하고 각자 강점을 살린다", "l2Weights": {"conscientiousness": 0.15, "agreeableness": 0.25}, "l1Weights": {"depth": 0.1}}
  ]'::jsonb,
  ARRAY['conscientiousness', 'agreeableness', 'depth'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q16-neuroticism-openness-taste',
  'Q16-neuroticism+openness-불확실성 반응',
  'MEDIUM', 16,
  '결말을 모르는 열린 결말 영화를 봤을 때, 당신의 반응은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "찝찝하다, 확실한 결말을 선호한다", "l2Weights": {"neuroticism": 0.2, "openness": -0.2}, "l1Weights": {"taste": -0.2}},
    {"key": "B", "label": "아쉽지만 나름 여운이 남는다", "l2Weights": {"neuroticism": 0.05, "openness": 0.05}, "l1Weights": {"taste": 0.0}},
    {"key": "C", "label": "해석의 여지가 있어서 재미있다", "l2Weights": {"neuroticism": -0.1, "openness": 0.25}, "l1Weights": {"taste": 0.2}},
    {"key": "D", "label": "오히려 정해진 결말보다 좋다, 상상이 확장된다", "l2Weights": {"neuroticism": -0.25, "openness": 0.35}, "l1Weights": {"taste": 0.3}}
  ]'::jsonb,
  ARRAY['neuroticism', 'openness', 'taste'],
  '{"type": "mapped", "phase": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Phase 3: 교차검증 + 역설 감지 (8문항)
-- ============================================

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q17-paradox-depth-openness',
  'Q17-역설-depth↔openness',
  'MEDIUM', 17,
  '전혀 관심 없던 분야의 전문 서적을 선물 받았습니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "읽지 않을 것 같다, 관심 밖이다", "l1Weights": {"depth": -0.1}, "l2Weights": {"openness": -0.2}},
    {"key": "B", "label": "목차만 훑어보고 흥미로운 챕터만 읽는다", "l1Weights": {"depth": 0.05}, "l2Weights": {"openness": 0.1}},
    {"key": "C", "label": "의외로 빠져들어 끝까지 읽을 수도 있다", "l1Weights": {"depth": 0.2}, "l2Weights": {"openness": 0.25}},
    {"key": "D", "label": "몰랐던 세계를 알게 되어 관련 책을 더 찾아본다", "l1Weights": {"depth": 0.3}, "l2Weights": {"openness": 0.3}}
  ]'::jsonb,
  ARRAY['depth', 'openness'],
  '{"type": "mapped", "phase": 3, "purpose": "paradox_verification"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q18-paradox-stance-agreeableness',
  'Q18-역설-stance↔agreeableness',
  'MEDIUM', 18,
  '존경하는 사람이 당신과 반대되는 의견을 표명했습니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "그 사람이 말하니까 일리가 있을 것이다", "l1Weights": {"stance": -0.25}, "l2Weights": {"agreeableness": 0.25}},
    {"key": "B", "label": "존중하되, 내 생각은 따로 유지한다", "l1Weights": {"stance": 0.1}, "l2Weights": {"agreeableness": 0.1}},
    {"key": "C", "label": "직접 대화를 나눠서 차이를 이해하고 싶다", "l1Weights": {"stance": 0.15}, "l2Weights": {"agreeableness": 0.05}},
    {"key": "D", "label": "누구든 틀릴 수 있다, 내 근거를 다시 점검한다", "l1Weights": {"stance": 0.3}, "l2Weights": {"agreeableness": -0.15}}
  ]'::jsonb,
  ARRAY['stance', 'agreeableness'],
  '{"type": "mapped", "phase": 3, "purpose": "paradox_verification"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q19-paradox-sociability-extraversion',
  'Q19-역설-sociability↔extraversion',
  'MEDIUM', 19,
  '온라인에서는 활발하게 글을 쓰는 편인데, 오프라인 모임에서는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "오프라인에서도 똑같이 활발하다", "l1Weights": {"sociability": 0.15}, "l2Weights": {"extraversion": 0.3}},
    {"key": "B", "label": "오프라인에서는 약간 조용해진다", "l1Weights": {"sociability": 0.1}, "l2Weights": {"extraversion": -0.1}},
    {"key": "C", "label": "오프라인에서는 듣는 편이 많다", "l1Weights": {"sociability": 0.05}, "l2Weights": {"extraversion": -0.2}},
    {"key": "D", "label": "온라인이 편하다, 오프라인은 피곤하다", "l1Weights": {"sociability": 0.2}, "l2Weights": {"extraversion": -0.3}}
  ]'::jsonb,
  ARRAY['sociability', 'extraversion'],
  '{"type": "mapped", "phase": 3, "purpose": "paradox_verification"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q20-revalidate-depth-scope',
  'Q20-재검증-depth+scope',
  'MEDIUM', 20,
  '뉴스 앱에서 기사를 읽을 때, 보통 어떤 패턴인가요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "헤드라인만 빠르게 훑는다", "l1Weights": {"depth": -0.15, "scope": 0.15}, "l2Weights": {}},
    {"key": "B", "label": "관심 분야 기사 2~3개를 꼼꼼히 읽는다", "l1Weights": {"depth": 0.2, "scope": -0.1}, "l2Weights": {}},
    {"key": "C", "label": "다양한 분야를 고르게 살펴본다", "l1Weights": {"depth": 0.0, "scope": 0.25}, "l2Weights": {}},
    {"key": "D", "label": "하나의 이슈를 여러 매체로 비교하며 깊이 읽는다", "l1Weights": {"depth": 0.3, "scope": 0.1}, "l2Weights": {}}
  ]'::jsonb,
  ARRAY['depth', 'scope'],
  '{"type": "mapped", "phase": 3, "purpose": "l1_revalidation"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q21-revalidate-taste-purpose',
  'Q21-재검증-taste+purpose',
  'MEDIUM', 21,
  '넷플릭스에서 새 시리즈를 고를 때, 가장 끌리는 기준은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "인기 순위 1위, 다들 보니까 나도 본다", "l1Weights": {"taste": -0.2, "purpose": -0.15}, "l2Weights": {}},
    {"key": "B", "label": "좋아하는 배우나 감독이 참여한 작품", "l1Weights": {"taste": -0.05, "purpose": 0.05}, "l2Weights": {}},
    {"key": "C", "label": "독특한 설정이나 새로운 시도가 보이는 작품", "l1Weights": {"taste": 0.25, "purpose": 0.1}, "l2Weights": {}},
    {"key": "D", "label": "관심 주제를 다루는 작품, 배울 게 있으면 좋다", "l1Weights": {"taste": 0.1, "purpose": 0.3}, "l2Weights": {}}
  ]'::jsonb,
  ARRAY['taste', 'purpose'],
  '{"type": "mapped", "phase": 3, "purpose": "l1_revalidation"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q22-revalidate-openness-neuroticism',
  'Q22-재검증-openness+neuroticism',
  'MEDIUM', 22,
  '갑자기 해외 출장이 잡혀서 낯선 도시에 혼자 가게 되었습니다. 당신의 첫 반응은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "불안하다, 가능하면 피하고 싶다", "l2Weights": {"openness": -0.2, "neuroticism": 0.3}, "l1Weights": {}},
    {"key": "B", "label": "긴장되지만 준비를 잘 하면 괜찮을 것이다", "l2Weights": {"openness": 0.05, "neuroticism": 0.1}, "l1Weights": {}},
    {"key": "C", "label": "새로운 경험이 될 수 있겠다, 기대된다", "l2Weights": {"openness": 0.25, "neuroticism": -0.1}, "l1Weights": {}},
    {"key": "D", "label": "완전 신난다! 현지 맛집과 명소를 미리 찾아본다", "l2Weights": {"openness": 0.35, "neuroticism": -0.25}, "l1Weights": {}}
  ]'::jsonb,
  ARRAY['openness', 'neuroticism'],
  '{"type": "mapped", "phase": 3, "purpose": "l2_revalidation"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q23-revalidate-conscientiousness-extraversion',
  'Q23-재검증-conscientiousness+extraversion',
  'MEDIUM', 23,
  '주말 계획이 갑자기 취소되었을 때, 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "오히려 좋아, 하고 싶은 것을 하며 혼자 보낸다", "l2Weights": {"conscientiousness": -0.1, "extraversion": -0.25}, "l1Weights": {}},
    {"key": "B", "label": "밀린 할 일을 처리할 기회로 삼는다", "l2Weights": {"conscientiousness": 0.3, "extraversion": -0.15}, "l1Weights": {}},
    {"key": "C", "label": "다른 친구에게 연락해서 대안 약속을 잡는다", "l2Weights": {"conscientiousness": -0.05, "extraversion": 0.25}, "l1Weights": {}},
    {"key": "D", "label": "근처 카페에 가서 새로운 사람들 구경이라도 한다", "l2Weights": {"conscientiousness": -0.15, "extraversion": 0.3}, "l1Weights": {}}
  ]'::jsonb,
  ARRAY['conscientiousness', 'extraversion'],
  '{"type": "mapped", "phase": 3, "purpose": "l2_revalidation"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q24-comprehensive-paradox',
  'Q24-종합-복합 딜레마',
  'MEDIUM', 24,
  '혼자 깊이 파고드는 것도 좋지만 사람들과 나누는 것도 좋아하는 편입니다. 둘 중 하나만 골라야 한다면?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "혼자 깊이 집중하는 시간이 더 소중하다", "l1Weights": {"depth": 0.15, "sociability": -0.15}, "l2Weights": {"extraversion": -0.15, "openness": 0.1}},
    {"key": "B", "label": "알게 된 것을 다른 사람과 나눌 때 완성된다", "l1Weights": {"depth": 0.05, "sociability": 0.2}, "l2Weights": {"extraversion": 0.15, "agreeableness": 0.1}},
    {"key": "C", "label": "때에 따라 다르다, 컨디션과 주제에 따라 바뀐다", "l1Weights": {"depth": 0.05, "sociability": 0.05}, "l2Weights": {"neuroticism": 0.1, "openness": 0.1}},
    {"key": "D", "label": "둘 다 포기할 수 없다, 나만의 방식으로 양립한다", "l1Weights": {"depth": 0.1, "sociability": 0.1}, "l2Weights": {"openness": 0.2, "conscientiousness": 0.1}}
  ]'::jsonb,
  ARRAY['depth', 'sociability', 'extraversion', 'openness'],
  '{"type": "mapped", "phase": 3, "purpose": "comprehensive_paradox"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;
