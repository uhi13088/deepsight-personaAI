-- ============================================================
-- DeepSight Engine Studio — Cold Start v3.1 Questions Seed
-- Updated: 2026-02-17
--
-- Cold Start v3.1 질문 24문항 (3-Phase × 8)
-- 직교(Orthogonal) 설계: 옵션이 L1×L2 4사분면을 형성
-- → 역설(Paradox) 감지 구조적 지원
--
-- v3.0 → v3.1 주요 변경:
--   1. Phase 1: 선형 → 직교 옵션 (4사분면)
--   2. Phase 2: L3 가중치 추가 (Narrative Drive 4D)
--   3. Phase 3: 3/7 역설 쌍 → 7/7 역설 쌍 완전 커버
--
-- 독립 실행 가능: 기존 v3 질문 삭제 후 재등록
-- 업데이트 시 이 파일만 재실행하면 됩니다.
--
-- Phase 1 (Q1~Q8):  L1 주력 + L2 직교 → BASIC (~65% 신뢰도)
-- Phase 2 (Q9~Q16): L2 주력 + L1 교차 + L3 탐색 → STANDARD (~80% 신뢰도)
-- Phase 3 (Q17~Q24): 7쌍 역설 직교 검증 + L3 종합 → ADVANCED (~93% 신뢰도)
--
-- 직교 설계 원칙:
--   aligned 쌍: A(L1↑L2↑) B(L1↑L2↓=역설) C(L1↓L2↑=역설) D(L1↓L2↓)
--   inverse 쌍: A(L1↑L2↓=일관) B(L1↑L2↑=역설) C(L1↓L2↓=역설) D(L1↓L2↑=일관)
-- ============================================================

-- 기존 v3 질문 삭제
DELETE FROM psych_profile_templates WHERE id LIKE 'v3-q%';

-- 기존 6D 60문항도 삭제 (있으면)
DELETE FROM psych_profile_templates WHERE id LIKE 'seed-q-%';

-- ============================================
-- Phase 1: L1 주력 + L2 직교 (8문항)
-- 7개 L1↔L2 역설 쌍 각각에 직교 4사분면
-- ============================================

-- Q01: depth↔openness (aligned) — "지적 호기심의 역설"
-- 직교: A(depth↑open↑) B(depth↑open↓=역설) C(depth↓open↑=역설) D(depth↓open↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q01-depth-openness',
  'Q01-depth↔openness-탐구 스타일',
  'QUICK', 1,
  '3일간 자유 시간이 주어졌습니다. 어떤 프로젝트에 몰두하고 싶나요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "이전부터 궁금했던 새로운 분야를 처음부터 깊이 공부한다", "l1Weights": {"depth": 0.25}, "l2Weights": {"openness": 0.2}},
    {"key": "B", "label": "이미 잘 아는 분야에서 전문가 수준의 심화 연구를 한다", "l1Weights": {"depth": 0.25}, "l2Weights": {"openness": -0.15}},
    {"key": "C", "label": "여러 새로운 분야를 빠르게 체험하며 가능성을 탐색한다", "l1Weights": {"depth": -0.15}, "l2Weights": {"openness": 0.2}},
    {"key": "D", "label": "좋아하는 콘텐츠를 편하게 즐기며 충전한다", "l1Weights": {"depth": -0.2}, "l2Weights": {"openness": -0.15}}
  ]'::jsonb,
  ARRAY['depth', 'openness'],
  '{"type": "orthogonal", "phase": 1, "pair": "depth↔openness", "direction": "aligned"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q02: lens↔neuroticism (inverse) — "감성/불안의 역설"
-- inverse 직교: A(lens↑neuro↓=일관) B(lens↑neuro↑=역설) C(lens↓neuro↓=역설) D(lens↓neuro↑=일관)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q02-lens-neuroticism',
  'Q02-lens↔neuroticism-결정 방식',
  'QUICK', 2,
  '인생의 중요한 결정(이직, 이사 등)을 앞두고 있습니다. 당신의 접근 방식은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "데이터와 장단점을 정리하면 답이 보인다. 분석하면 마음이 편해진다", "l1Weights": {"lens": 0.25}, "l2Weights": {"neuroticism": -0.2}},
    {"key": "B", "label": "논리적으로 따져볼수록 변수가 보여 불안하다. 분석해도 확신이 안 선다", "l1Weights": {"lens": 0.2}, "l2Weights": {"neuroticism": 0.2}},
    {"key": "C", "label": "직감을 믿는다. 어떤 선택이든 잘 될 거라는 편안한 확신이 있다", "l1Weights": {"lens": -0.2}, "l2Weights": {"neuroticism": -0.2}},
    {"key": "D", "label": "마음이 끌리는 쪽으로 가지만, 선택 후에도 계속 괜찮은지 되돌아본다", "l1Weights": {"lens": -0.2}, "l2Weights": {"neuroticism": 0.2}}
  ]'::jsonb,
  ARRAY['lens', 'neuroticism'],
  '{"type": "orthogonal", "phase": 1, "pair": "lens↔neuroticism", "direction": "inverse"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q03: stance↔agreeableness (inverse) — "태도의 역설 (츤데레)"
-- inverse 직교: A(stance↑agree↓=일관) B(stance↑agree↑=역설/츤데레) C(stance↓agree↓=역설) D(stance↓agree↑=일관)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q03-stance-agreeableness',
  'Q03-stance↔agreeableness-팀 의사결정',
  'QUICK', 3,
  '팀 회의에서 다수의 의견이 당신의 분석과 충돌합니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "내 분석이 정확하다면 소수 의견이라도 끝까지 주장한다", "l1Weights": {"stance": 0.25}, "l2Weights": {"agreeableness": -0.2}},
    {"key": "B", "label": "내 의견을 분명히 전달하되, 최종 결정은 팀의 합의를 따른다", "l1Weights": {"stance": 0.2}, "l2Weights": {"agreeableness": 0.2}},
    {"key": "C", "label": "특별한 이견은 없지만, 팀의 방향보다 내 방식대로 실행하겠다", "l1Weights": {"stance": -0.2}, "l2Weights": {"agreeableness": -0.15}},
    {"key": "D", "label": "다수의 의견에 자연스럽게 동의한다. 팀워크가 더 중요하다", "l1Weights": {"stance": -0.2}, "l2Weights": {"agreeableness": 0.25}}
  ]'::jsonb,
  ARRAY['stance', 'agreeableness'],
  '{"type": "orthogonal", "phase": 1, "pair": "stance↔agreeableness", "direction": "inverse"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q04: scope↔conscientiousness (aligned) — "게으른 완벽주의자"
-- 직교: A(scope↑consc↑) B(scope↑consc↓=역설) C(scope↓consc↑=역설) D(scope↓consc↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q04-scope-conscientiousness',
  'Q04-scope↔conscientiousness-프로젝트 접근',
  'QUICK', 4,
  '새로운 프로젝트를 시작할 때 당신의 접근 방식은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "세부 사항까지 꼼꼼하게 계획을 세우고 체계적으로 진행한다", "l1Weights": {"scope": 0.25}, "l2Weights": {"conscientiousness": 0.2}},
    {"key": "B", "label": "디테일에 집착하지만 정작 실행은 기분 따라, 마감에 쫓기기도 한다", "l1Weights": {"scope": 0.2}, "l2Weights": {"conscientiousness": -0.2}},
    {"key": "C", "label": "큰 그림만 잡지만 일단 시작하면 규칙적이고 꾸준하게 한다", "l1Weights": {"scope": -0.15}, "l2Weights": {"conscientiousness": 0.2}},
    {"key": "D", "label": "핵심만 파악하고 유연하게, 흐름을 타며 진행한다", "l1Weights": {"scope": -0.2}, "l2Weights": {"conscientiousness": -0.2}}
  ]'::jsonb,
  ARRAY['scope', 'conscientiousness'],
  '{"type": "orthogonal", "phase": 1, "pair": "scope↔conscientiousness", "direction": "aligned"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q05: taste↔openness (aligned) — "보수적 힙스터"
-- 직교: A(taste↑open↑) B(taste↑open↓=역설) C(taste↓open↑=역설) D(taste↓open↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q05-taste-openness',
  'Q05-taste↔openness-문화생활 태도',
  'QUICK', 5,
  '문화생활(음악, 영화, 전시 등)에 대한 당신의 태도는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "다양한 장르의 실험적인 작품을 적극 탐색한다. 새로운 것이 곧 자극이다", "l1Weights": {"taste": 0.25}, "l2Weights": {"openness": 0.2}},
    {"key": "B", "label": "취향은 독특하고 까다롭지만, 일상은 안정적인 루틴을 선호한다", "l1Weights": {"taste": 0.2}, "l2Weights": {"openness": -0.2}},
    {"key": "C", "label": "검증된 클래식을 좋아하지만, 삶에서는 새로운 경험에 열려 있다", "l1Weights": {"taste": -0.15}, "l2Weights": {"openness": 0.2}},
    {"key": "D", "label": "좋아하는 장르가 정해져 있고, 삶의 패턴도 익숙한 것을 유지한다", "l1Weights": {"taste": -0.2}, "l2Weights": {"openness": -0.2}}
  ]'::jsonb,
  ARRAY['taste', 'openness'],
  '{"type": "orthogonal", "phase": 1, "pair": "taste↔openness", "direction": "aligned"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q06: purpose↔conscientiousness (aligned) — "목표/실천의 역설"
-- 직교: A(purpose↑consc↑) B(purpose↑consc↓=역설) C(purpose↓consc↑=역설) D(purpose↓consc↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q06-purpose-conscientiousness',
  'Q06-purpose↔conscientiousness-소비 패턴',
  'QUICK', 6,
  '콘텐츠 소비 패턴에 가장 가까운 것은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "배울 목표가 분명하고, 학습 일정까지 체계적으로 관리한다", "l1Weights": {"purpose": 0.25}, "l2Weights": {"conscientiousness": 0.2}},
    {"key": "B", "label": "의미 있는 콘텐츠를 추구하지만, 기분이 내킬 때 충동적으로 본다", "l1Weights": {"purpose": 0.2}, "l2Weights": {"conscientiousness": -0.2}},
    {"key": "C", "label": "특별한 목적 없이 보지만, 보는 시간과 양은 철저히 관리한다", "l1Weights": {"purpose": -0.15}, "l2Weights": {"conscientiousness": 0.2}},
    {"key": "D", "label": "재미있으면 그만, 자유롭게 기분 따라 즐긴다", "l1Weights": {"purpose": -0.2}, "l2Weights": {"conscientiousness": -0.2}}
  ]'::jsonb,
  ARRAY['purpose', 'conscientiousness'],
  '{"type": "orthogonal", "phase": 1, "pair": "purpose↔conscientiousness", "direction": "aligned"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q07: sociability↔extraversion (aligned) — "사교적 내향인"
-- 직교: A(soc↑extra↑) B(soc↑extra↓=역설) C(soc↓extra↑=역설) D(soc↓extra↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q07-sociability-extraversion',
  'Q07-sociability↔extraversion-공유 성향',
  'QUICK', 7,
  '인상 깊은 경험을 한 후 당신의 반응은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "바로 SNS에 올리거나 모임에서 이야기한다. 사람들과 나눌 때 에너지가 난다", "l1Weights": {"sociability": 0.25}, "l2Weights": {"extraversion": 0.2}},
    {"key": "B", "label": "온라인에서 활발히 공유하지만, 실제로는 혼자 있는 시간에서 에너지를 얻는다", "l1Weights": {"sociability": 0.2}, "l2Weights": {"extraversion": -0.2}},
    {"key": "C", "label": "혼자 감상하는 편이지만, 사교 모임 자체는 즐기고 활발하다", "l1Weights": {"sociability": -0.15}, "l2Weights": {"extraversion": 0.2}},
    {"key": "D", "label": "혼자 조용히 음미한다. 내 감상은 나만의 것이다", "l1Weights": {"sociability": -0.2}, "l2Weights": {"extraversion": -0.2}}
  ]'::jsonb,
  ARRAY['sociability', 'extraversion'],
  '{"type": "orthogonal", "phase": 1, "pair": "sociability↔extraversion", "direction": "aligned"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q08: 복합 교차 (depth+lens ↔ neuroticism+openness) — 다차원 직교
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q08-complex-cross',
  'Q08-복합-평론 갈등 상황',
  'QUICK', 8,
  '기대하던 영화가 평론가 호평과 관객 혹평으로 갈렸습니다. 당신의 반응은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "내 직감으로 직접 보고 판단한다. 남의 평가에 흔들리지 않는다", "l1Weights": {"depth": 0.15, "lens": -0.2}, "l2Weights": {"neuroticism": -0.15, "openness": 0.1}},
    {"key": "B", "label": "평론가와 관객 리뷰를 꼼꼼히 비교 분석하지만, 결정이 어렵다", "l1Weights": {"depth": 0.2, "lens": 0.2}, "l2Weights": {"neuroticism": 0.15, "openness": 0.15}},
    {"key": "C", "label": "혼란스러워서 결정을 미룬다. 차라리 검증된 다른 작품을 본다", "l1Weights": {"depth": -0.1, "lens": -0.15}, "l2Weights": {"neuroticism": 0.2, "openness": -0.15}},
    {"key": "D", "label": "시각 차이 자체가 흥미롭다. 두 관점 모두 이해하며 관람한다", "l1Weights": {"depth": 0.2, "lens": 0.15}, "l2Weights": {"neuroticism": -0.1, "openness": 0.2}}
  ]'::jsonb,
  ARRAY['depth', 'lens', 'neuroticism', 'openness'],
  '{"type": "orthogonal", "phase": 1, "pair": "complex_cross"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Phase 2: L2 주력 + L1 교차 + L3 탐색 (8문항)
-- L3(Narrative Drive): lack, moralCompass, volatility, growthArc
-- ============================================

-- Q09: openness + taste + L3(growthArc, lack)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q09-openness-taste-l3',
  'Q09-openness+taste+L3-전환 기회',
  'QUICK', 9,
  '만약 지금과 전혀 다른 분야로 전환할 기회가 주어진다면?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "지금에 갈증이 있다. 새로운 도전으로 성장하고 싶다", "l2Weights": {"openness": 0.3}, "l1Weights": {"taste": 0.2}, "l3Weights": {"growthArc": 0.25, "lack": 0.15}},
    {"key": "B", "label": "새로운 것에 열려 있지만, 지금 충분히 만족해서 천천히 탐색한다", "l2Weights": {"openness": 0.2}, "l1Weights": {"taste": -0.1}, "l3Weights": {"growthArc": -0.1, "lack": -0.1}},
    {"key": "C", "label": "다른 분야보다, 지금 분야에서 더 특별한 것을 만들고 싶다", "l2Weights": {"openness": -0.15}, "l1Weights": {"taste": 0.15}, "l3Weights": {"growthArc": 0.15, "lack": 0.2}},
    {"key": "D", "label": "현재가 좋다. 안정적인 지금을 지키겠다", "l2Weights": {"openness": -0.2}, "l1Weights": {"taste": -0.15}, "l3Weights": {"growthArc": -0.2, "lack": -0.15}}
  ]'::jsonb,
  ARRAY['openness', 'taste', 'growthArc', 'lack'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q10: conscientiousness + scope + L3(moralCompass, volatility)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q10-conscientiousness-scope-l3',
  'Q10-conscientiousness+scope+L3-마감 압박',
  'QUICK', 10,
  '프로젝트 마감 3일 전, 결과물 품질이 기대에 못 미칩니다. 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "마감까지 체계적으로 수정한다. 모든 세부사항이 기준에 맞아야 한다", "l2Weights": {"conscientiousness": 0.25}, "l1Weights": {"scope": 0.15}, "l3Weights": {"moralCompass": 0.2, "volatility": -0.1}},
    {"key": "B", "label": "핵심만 완벽하게 다듬고 나머지는 과감히 잘라낸다. 타협은 없다", "l2Weights": {"conscientiousness": 0.2}, "l1Weights": {"scope": -0.1}, "l3Weights": {"moralCompass": 0.15, "volatility": 0.15}},
    {"key": "C", "label": "완벽하지 않아도 전체적으로 봤을 때 충분하다. 큰 그림이 중요하다", "l2Weights": {"conscientiousness": -0.1}, "l1Weights": {"scope": 0.1}, "l3Weights": {"moralCompass": -0.1, "volatility": -0.1}},
    {"key": "D", "label": "스트레스가 폭발한다. 일단 제출하고 후회는 나중에", "l2Weights": {"conscientiousness": -0.2}, "l1Weights": {"scope": -0.15}, "l3Weights": {"moralCompass": -0.2, "volatility": 0.2}}
  ]'::jsonb,
  ARRAY['conscientiousness', 'scope', 'moralCompass', 'volatility'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q11: extraversion + sociability + L3(lack, growthArc)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q11-extraversion-sociability-l3',
  'Q11-extraversion+sociability+L3-연휴 계획',
  'QUICK', 11,
  '긴 연휴가 주어졌을 때, 가장 하고 싶은 것은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "새로운 사람들과 여행하며, 경험을 통해 자극받고 싶다", "l2Weights": {"extraversion": 0.25}, "l1Weights": {"sociability": 0.15}, "l3Weights": {"lack": 0.15, "growthArc": 0.15}},
    {"key": "B", "label": "혼자 여행을 떠나 낯선 곳에서 새로운 시각을 얻는다", "l2Weights": {"extraversion": 0.15}, "l1Weights": {"sociability": -0.1}, "l3Weights": {"lack": -0.1, "growthArc": 0.2}},
    {"key": "C", "label": "친한 친구들과 편한 공간에서 깊은 대화를 나눈다", "l2Weights": {"extraversion": -0.15}, "l1Weights": {"sociability": 0.15}, "l3Weights": {"lack": 0.1, "growthArc": -0.1}},
    {"key": "D", "label": "혼자 집에서 밀린 콘텐츠를 즐기며 충전한다", "l2Weights": {"extraversion": -0.25}, "l1Weights": {"sociability": -0.2}, "l3Weights": {"lack": -0.15, "growthArc": -0.15}}
  ]'::jsonb,
  ARRAY['extraversion', 'sociability', 'lack', 'growthArc'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q12: agreeableness + stance + L3(moralCompass, volatility)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q12-agreeableness-stance-l3',
  'Q12-agreeableness+stance+L3-도덕 딜레마',
  'QUICK', 12,
  '존경하던 사람의 도덕적 문제가 밝혀졌을 때, 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "기준이 명확하다. 잘못은 잘못이고, 실망을 분명히 표현한다", "l2Weights": {"agreeableness": -0.2}, "l1Weights": {"stance": 0.25}, "l3Weights": {"moralCompass": 0.25, "volatility": 0.1}},
    {"key": "B", "label": "비판하되 맥락을 고려한다. 사람과 행동은 구분해야 한다", "l2Weights": {"agreeableness": 0.15}, "l1Weights": {"stance": 0.15}, "l3Weights": {"moralCompass": 0.15, "volatility": -0.1}},
    {"key": "C", "label": "누구나 실수한다. 전체적인 기여를 보면 이해할 수 있다", "l2Weights": {"agreeableness": 0.2}, "l1Weights": {"stance": -0.2}, "l3Weights": {"moralCompass": -0.15, "volatility": -0.15}},
    {"key": "D", "label": "혼란스럽다. 뭐가 맞는지 모르겠고, 감정이 요동친다", "l2Weights": {"agreeableness": -0.1}, "l1Weights": {"stance": -0.15}, "l3Weights": {"moralCompass": -0.2, "volatility": 0.25}}
  ]'::jsonb,
  ARRAY['agreeableness', 'stance', 'moralCompass', 'volatility'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q13: neuroticism + lens + L3(volatility, lack)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q13-neuroticism-lens-l3',
  'Q13-neuroticism+lens+L3-실패 반응',
  'STANDARD', 13,
  '큰 실패를 경험한 직후, 당신의 반응은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "냉정하게 원인을 분석한다. 감정에 휘둘리지 않는다", "l2Weights": {"neuroticism": -0.2}, "l1Weights": {"lens": 0.2}, "l3Weights": {"volatility": -0.2, "lack": -0.1}},
    {"key": "B", "label": "불안하지만 분석을 멈출 수 없다. 어디서 잘못됐는지 끊임없이 복기한다", "l2Weights": {"neuroticism": 0.15}, "l1Weights": {"lens": 0.15}, "l3Weights": {"volatility": 0.15, "lack": 0.15}},
    {"key": "C", "label": "직감적으로 괜찮을 거라 느낀다. 어차피 다음 기회가 있다", "l2Weights": {"neuroticism": -0.1}, "l1Weights": {"lens": -0.15}, "l3Weights": {"volatility": -0.1, "lack": 0.1}},
    {"key": "D", "label": "감정이 몰아친다. 한동안 아무것도 손에 잡히지 않는다", "l2Weights": {"neuroticism": 0.25}, "l1Weights": {"lens": -0.2}, "l3Weights": {"volatility": 0.25, "lack": 0.2}}
  ]'::jsonb,
  ARRAY['neuroticism', 'lens', 'volatility', 'lack'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q14: openness+extraversion + purpose + L3(growthArc)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q14-openness-extraversion-l3',
  'Q14-openness+extraversion+L3-커뮤니티 참여',
  'STANDARD', 14,
  '완전히 새로운 분야의 커뮤니티에 초대받았을 때?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "성장의 기회! 적극 참여하며 배울 것을 찾는다", "l2Weights": {"openness": 0.2, "extraversion": 0.15}, "l1Weights": {"purpose": 0.1}, "l3Weights": {"growthArc": 0.2}},
    {"key": "B", "label": "관심 분야라면 조용히 참여해 관찰하고 배운다", "l2Weights": {"openness": 0.15, "extraversion": -0.1}, "l1Weights": {"purpose": 0.15}, "l3Weights": {"growthArc": 0.15}},
    {"key": "C", "label": "사람 만나는 건 좋지만, 특별한 목적 없이 분위기를 즐긴다", "l2Weights": {"openness": -0.1, "extraversion": 0.15}, "l1Weights": {"purpose": -0.1}, "l3Weights": {"growthArc": -0.1}},
    {"key": "D", "label": "낯선 환경은 부담스럽다. 익숙한 곳에 머무르겠다", "l2Weights": {"openness": -0.2, "extraversion": -0.2}, "l1Weights": {"purpose": -0.15}, "l3Weights": {"growthArc": -0.2}}
  ]'::jsonb,
  ARRAY['openness', 'extraversion', 'purpose', 'growthArc'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q15: conscientiousness+agreeableness + depth + L3(moralCompass)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q15-conscientiousness-agreeableness-l3',
  'Q15-conscientiousness+agreeableness+L3-팀원 발견',
  'STANDARD', 15,
  '팀원이 의도적으로 일을 대충 하는 것을 발견했을 때?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "증거를 정리해 상위에 보고한다. 원칙은 지켜야 한다", "l2Weights": {"conscientiousness": 0.2, "agreeableness": -0.15}, "l1Weights": {"depth": 0.1}, "l3Weights": {"moralCompass": 0.2}},
    {"key": "B", "label": "직접 대화하며 이유를 듣고, 함께 개선 방법을 찾는다", "l2Weights": {"conscientiousness": 0.15, "agreeableness": 0.15}, "l1Weights": {"depth": 0.1}, "l3Weights": {"moralCompass": 0.1}},
    {"key": "C", "label": "사정이 있겠지. 내 일에 집중하고 넘어간다", "l2Weights": {"conscientiousness": -0.1, "agreeableness": 0.2}, "l1Weights": {"depth": -0.1}, "l3Weights": {"moralCompass": -0.15}},
    {"key": "D", "label": "나도 가끔 그러니까. 서로 눈감아주는 게 현실적이다", "l2Weights": {"conscientiousness": -0.15, "agreeableness": -0.1}, "l1Weights": {"depth": -0.1}, "l3Weights": {"moralCompass": -0.2}}
  ]'::jsonb,
  ARRAY['conscientiousness', 'agreeableness', 'depth', 'moralCompass'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q16: neuroticism+openness + taste + L3(volatility, growthArc)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q16-neuroticism-openness-l3',
  'Q16-neuroticism+openness+L3-인생관 충격',
  'STANDARD', 16,
  '인생관을 뒤흔드는 콘텐츠(책, 영화, 강연)를 접했을 때?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "내 세계가 넓어졌다. 담담하게 받아들이고 성장의 계기로 삼는다", "l2Weights": {"neuroticism": -0.15, "openness": 0.2}, "l1Weights": {"taste": 0.15}, "l3Weights": {"volatility": -0.1, "growthArc": 0.25}},
    {"key": "B", "label": "충격적이지만 끌린다. 불안하면서도 더 깊이 알고 싶다", "l2Weights": {"neuroticism": 0.15, "openness": 0.15}, "l1Weights": {"taste": 0.1}, "l3Weights": {"volatility": 0.2, "growthArc": 0.15}},
    {"key": "C", "label": "흥미롭지만 내 가치관은 변하지 않는다. 참고만 한다", "l2Weights": {"neuroticism": -0.1, "openness": -0.15}, "l1Weights": {"taste": -0.15}, "l3Weights": {"volatility": -0.15, "growthArc": -0.1}},
    {"key": "D", "label": "혼란스럽고 불안하다. 지금까지 믿어온 것들이 흔들린다", "l2Weights": {"neuroticism": 0.2, "openness": -0.1}, "l1Weights": {"taste": -0.1}, "l3Weights": {"volatility": 0.25, "growthArc": -0.1}}
  ]'::jsonb,
  ARRAY['neuroticism', 'openness', 'taste', 'volatility', 'growthArc'],
  '{"type": "mapped", "phase": 2, "layers": ["L2", "L1", "L3"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Phase 3: 7쌍 역설 직교 검증 + L3 종합 (8문항)
-- 각 역설 쌍에 대해 직교 4사분면으로 교차검증
-- ============================================

-- Q17: depth↔openness (aligned) — 역설 검증
-- 직교: A(depth↑open↑) B(depth↑open↓) C(depth↓open↑) D(depth↓open↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q17-paradox-depth-openness',
  'Q17-역설검증-depth↔openness',
  'STANDARD', 17,
  '이상적인 학습 방식을 하나만 고른다면?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "다양한 분야를 깊이 파는 폴리매스형 — 넓고 깊게", "l1Weights": {"depth": 0.15}, "l2Weights": {"openness": 0.15}},
    {"key": "B", "label": "한 분야를 끝까지 파는 장인형 — 좁고 깊게", "l1Weights": {"depth": 0.15}, "l2Weights": {"openness": -0.15}},
    {"key": "C", "label": "폭넓은 교양을 갖추는 제너럴리스트 — 넓고 얕게", "l1Weights": {"depth": -0.15}, "l2Weights": {"openness": 0.15}},
    {"key": "D", "label": "필요한 것만 실용적으로 익히는 것 — 좁고 얕게", "l1Weights": {"depth": -0.15}, "l2Weights": {"openness": -0.15}}
  ]'::jsonb,
  ARRAY['depth', 'openness'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "depth↔openness"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q18: lens↔neuroticism (inverse) — 역설 검증
-- inverse 직교: A(lens↑neuro↓=일관) B(lens↑neuro↑=역설) C(lens↓neuro↓=역설) D(lens↓neuro↑=일관)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q18-paradox-lens-neuroticism',
  'Q18-역설검증-lens↔neuroticism',
  'STANDARD', 18,
  '감정적으로 힘든 친구의 고민을 들을 때, 당신의 방식은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "상황을 객관적으로 정리해주고, 냉정하게 해결책을 제시한다", "l1Weights": {"lens": 0.15}, "l2Weights": {"neuroticism": -0.15}},
    {"key": "B", "label": "분석적으로 조언하지만, 속으로는 나도 같이 불안해진다", "l1Weights": {"lens": 0.15}, "l2Weights": {"neuroticism": 0.15}},
    {"key": "C", "label": "감정적으로 공감하면서도, 내 마음은 흔들리지 않는다", "l1Weights": {"lens": -0.15}, "l2Weights": {"neuroticism": -0.15}},
    {"key": "D", "label": "함께 감정을 나누며, 나도 같이 마음이 무거워진다", "l1Weights": {"lens": -0.15}, "l2Weights": {"neuroticism": 0.15}}
  ]'::jsonb,
  ARRAY['lens', 'neuroticism'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "lens↔neuroticism"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q19: stance↔agreeableness (inverse) — 역설 검증
-- inverse 직교: A(stance↑agree↓=일관) B(stance↑agree↑=역설/츤데레) C(stance↓agree↓=역설) D(stance↓agree↑=일관)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q19-paradox-stance-agreeableness',
  'Q19-역설검증-stance↔agreeableness',
  'STANDARD', 19,
  '존경하는 사람이 당신과 정반대 의견을 강하게 주장합니다.',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "존경과 별개로, 틀린 것은 지적한다. 진실이 더 중요하다", "l1Weights": {"stance": 0.15}, "l2Weights": {"agreeableness": -0.15}},
    {"key": "B", "label": "내 반론을 정리하되, 대화를 통해 공통점을 찾으려 한다", "l1Weights": {"stance": 0.15}, "l2Weights": {"agreeableness": 0.15}},
    {"key": "C", "label": "크게 신경 쓰지 않지만, 그 사람의 방식을 따르지도 않는다", "l1Weights": {"stance": -0.15}, "l2Weights": {"agreeableness": -0.15}},
    {"key": "D", "label": "그 사람의 의견을 신뢰하고, 자연스럽게 수용한다", "l1Weights": {"stance": -0.15}, "l2Weights": {"agreeableness": 0.15}}
  ]'::jsonb,
  ARRAY['stance', 'agreeableness'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "stance↔agreeableness"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q20: scope↔conscientiousness (aligned) — 역설 검증
-- 직교: A(scope↑consc↑) B(scope↑consc↓=역설) C(scope↓consc↑=역설) D(scope↓consc↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q20-paradox-scope-conscientiousness',
  'Q20-역설검증-scope↔conscientiousness',
  'STANDARD', 20,
  '대규모 이벤트(여행, 프로젝트)를 준비할 때 당신은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "모든 세부사항을 체크리스트로 만들어 하나씩 확인한다", "l1Weights": {"scope": 0.15}, "l2Weights": {"conscientiousness": 0.15}},
    {"key": "B", "label": "세부사항을 신경 쓰면서도 정작 실행은 즉흥적으로 한다", "l1Weights": {"scope": 0.15}, "l2Weights": {"conscientiousness": -0.15}},
    {"key": "C", "label": "큰 틀만 정하고, 정해진 일정에 맞춰 체계적으로 움직인다", "l1Weights": {"scope": -0.15}, "l2Weights": {"conscientiousness": 0.15}},
    {"key": "D", "label": "대략적으로 파악하고, 그때그때 유연하게 대처한다", "l1Weights": {"scope": -0.15}, "l2Weights": {"conscientiousness": -0.15}}
  ]'::jsonb,
  ARRAY['scope', 'conscientiousness'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "scope↔conscientiousness"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q21: taste↔openness (aligned) — 역설 검증
-- 직교: A(taste↑open↑) B(taste↑open↓=역설) C(taste↓open↑=역설) D(taste↓open↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q21-paradox-taste-openness',
  'Q21-역설검증-taste↔openness',
  'STANDARD', 21,
  '음식, 음악, 패션 등 취향과 실제 생활방식을 비교하면?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "독특한 것을 추구하며, 삶 전반에서도 새로운 시도를 즐긴다", "l1Weights": {"taste": 0.15}, "l2Weights": {"openness": 0.15}},
    {"key": "B", "label": "취향은 독특하지만, 일상은 변화보다 안정을 선호한다", "l1Weights": {"taste": 0.15}, "l2Weights": {"openness": -0.15}},
    {"key": "C", "label": "취향은 대중적이지만, 삶에서는 새로운 경험에 적극적이다", "l1Weights": {"taste": -0.15}, "l2Weights": {"openness": 0.15}},
    {"key": "D", "label": "검증된 것을 좋아하고, 삶도 익숙한 패턴을 유지한다", "l1Weights": {"taste": -0.15}, "l2Weights": {"openness": -0.15}}
  ]'::jsonb,
  ARRAY['taste', 'openness'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "taste↔openness"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q22: purpose↔conscientiousness (aligned) — 역설 검증
-- 직교: A(purpose↑consc↑) B(purpose↑consc↓=역설) C(purpose↓consc↑=역설) D(purpose↓consc↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q22-paradox-purpose-conscientiousness',
  'Q22-역설검증-purpose↔conscientiousness',
  'STANDARD', 22,
  '하루 일과를 돌아보면, 콘텐츠는 주로 어떤 역할인가요?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "정해진 시간에 의미 있는 콘텐츠를 계획적으로 소비한다", "l1Weights": {"purpose": 0.15}, "l2Weights": {"conscientiousness": 0.15}},
    {"key": "B", "label": "의미 있는 것을 찾지만, 보는 시간과 양은 통제가 안 된다", "l1Weights": {"purpose": 0.15}, "l2Weights": {"conscientiousness": -0.15}},
    {"key": "C", "label": "특별한 목적 없이 보지만, 정해진 시간 안에서만 본다", "l1Weights": {"purpose": -0.15}, "l2Weights": {"conscientiousness": 0.15}},
    {"key": "D", "label": "재미있으면 시간 가는 줄 모르고 자유롭게 즐긴다", "l1Weights": {"purpose": -0.15}, "l2Weights": {"conscientiousness": -0.15}}
  ]'::jsonb,
  ARRAY['purpose', 'conscientiousness'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "purpose↔conscientiousness"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q23: sociability↔extraversion (aligned) — 역설 검증
-- 직교: A(soc↑extra↑) B(soc↑extra↓=역설) C(soc↓extra↑=역설) D(soc↓extra↓)
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q23-paradox-sociability-extraversion',
  'Q23-역설검증-sociability↔extraversion',
  'STANDARD', 23,
  '새로운 사교 모임에 가게 되었을 때, 당신의 패턴은?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "적극적으로 대화를 시작하고, 모임 후에도 연락을 이어간다", "l1Weights": {"sociability": 0.15}, "l2Weights": {"extraversion": 0.15}},
    {"key": "B", "label": "온라인으로 먼저 친해지고, 현장에서는 조용히 관찰하는 편이다", "l1Weights": {"sociability": 0.15}, "l2Weights": {"extraversion": -0.15}},
    {"key": "C", "label": "현장에서는 활발하지만, 모임 후 연락을 이어가진 않는다", "l1Weights": {"sociability": -0.15}, "l2Weights": {"extraversion": 0.15}},
    {"key": "D", "label": "소규모로 조용히 어울리거나, 참여 자체를 망설인다", "l1Weights": {"sociability": -0.15}, "l2Weights": {"extraversion": -0.15}}
  ]'::jsonb,
  ARRAY['sociability', 'extraversion'],
  '{"type": "orthogonal", "phase": 3, "purpose": "paradox_verification", "pair": "sociability↔extraversion"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Q24: L3 종합 + 교차 레이어 통합
-- L3 4차원(lack, moralCompass, volatility, growthArc)을 직접 탐색 + L1/L2 교차
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'v3-q24-l3-comprehensive',
  'Q24-L3종합-삶의 태도',
  'STANDARD', 24,
  '가장 공감되는 삶의 태도는?',
  'MULTIPLE_CHOICE',
  '[
    {"key": "A", "label": "채워야 할 것이 있다. 명확한 기준을 갖고 꾸준히 성장해 나간다", "l3Weights": {"lack": 0.2, "moralCompass": 0.2, "volatility": -0.15, "growthArc": 0.2}, "l1Weights": {"depth": 0.1, "purpose": 0.1}, "l2Weights": {"conscientiousness": 0.1, "openness": 0.1}},
    {"key": "B", "label": "불안정하지만 자유롭다. 기존 틀을 깨며 나만의 길을 만들어간다", "l3Weights": {"lack": 0.15, "moralCompass": -0.15, "volatility": 0.2, "growthArc": 0.15}, "l1Weights": {"taste": 0.1, "stance": 0.1}, "l2Weights": {"openness": 0.1, "neuroticism": 0.1}},
    {"key": "C", "label": "지금에 만족한다. 안정적인 가치관 안에서 맡은 바를 충실히 한다", "l3Weights": {"lack": -0.15, "moralCompass": 0.15, "volatility": -0.2, "growthArc": -0.1}, "l1Weights": {"scope": 0.1, "lens": 0.1}, "l2Weights": {"conscientiousness": 0.1, "agreeableness": 0.1}},
    {"key": "D", "label": "규칙보다 경험이 중요하다. 사람들과 부딪히며 변화해 나간다", "l3Weights": {"lack": -0.1, "moralCompass": -0.2, "volatility": 0.15, "growthArc": 0.2}, "l1Weights": {"sociability": 0.1, "scope": -0.1}, "l2Weights": {"extraversion": 0.1, "agreeableness": -0.1}}
  ]'::jsonb,
  ARRAY['lack', 'moralCompass', 'volatility', 'growthArc', 'depth', 'purpose', 'taste', 'stance', 'scope', 'lens', 'sociability'],
  '{"type": "orthogonal", "phase": 3, "purpose": "l3_comprehensive", "layers": ["L3", "L1", "L2"]}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;
