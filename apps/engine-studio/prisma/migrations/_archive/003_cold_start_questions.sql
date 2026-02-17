-- 003: Cold Start Questions Seed Data
-- 60개 심리 프로파일링 질문 (6D 벡터 매핑)
-- LIGHT: 12개, MEDIUM: 18개, DEEP: 30개

-- ============================================
-- LIGHT 모드 (12문항) — 빠른 시작, 차원별 2문항
-- ============================================

-- L01: depth - 콘텐츠 몰입 깊이
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L01-depth-콘텐츠 몰입 깊이',
  'L01-depth-콘텐츠 몰입 깊이',
  'LIGHT',
  1,
  '콘텐츠를 접할 때, 얼마나 깊이 파고드는 것을 좋아하시나요?',
  'SLIDER',
  '[{"id": "min", "label": "가볍게 훑어보기", "value": 0}, {"id": "max", "label": "깊이 분석하기", "value": 1}]'::jsonb,
  ARRAY['depth'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L02: depth - 영화 감상 후 반응
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L02-depth-영화 감상 후 반응',
  'L02-depth-영화 감상 후 반응',
  'LIGHT',
  2,
  '영화를 본 후 주로 어떤 반응을 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "재밌었다/별로였다 정도로 넘어간다", "value": "a", "weights": {"depth": 0.1}}, {"id": "b", "label": "인상 깊은 장면을 떠올려본다", "value": "b", "weights": {"depth": 0.4}}, {"id": "c", "label": "줄거리와 인물 관계를 되짚어본다", "value": "c", "weights": {"depth": 0.7}}, {"id": "d", "label": "감독 의도와 숨겨진 메시지를 찾아본다", "value": "d", "weights": {"depth": 0.95}}]'::jsonb,
  ARRAY['depth'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L03: lens - 감정 vs 논리
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L03-lens-감정 vs 논리',
  'L03-lens-감정 vs 논리',
  'LIGHT',
  3,
  '콘텐츠를 선택할 때, 감정과 논리 중 어느 쪽에 더 기대시나요?',
  'SLIDER',
  '[{"id": "min", "label": "감정·직감으로 선택", "value": 0}, {"id": "max", "label": "평점·리뷰를 분석해서 선택", "value": 1}]'::jsonb,
  ARRAY['lens'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L04: lens - 추천 방식
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L04-lens-추천 방식',
  'L04-lens-추천 방식',
  'LIGHT',
  4,
  '친구에게 책을 추천할 때 어떤 식으로 말하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "\"이거 진짜 감동적이야, 꼭 읽어봐!\"", "value": "a", "weights": {"lens": 0.1}}, {"id": "b", "label": "\"주인공 감정선이 너무 좋아서 추천해\"", "value": "b", "weights": {"lens": 0.3}}, {"id": "c", "label": "\"구성이 탄탄하고 전개가 매끄러워\"", "value": "c", "weights": {"lens": 0.7}}, {"id": "d", "label": "\"작가의 문체와 서사 구조가 뛰어나\"", "value": "d", "weights": {"lens": 0.95}}]'::jsonb,
  ARRAY['lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L05: stance - 리뷰 선호
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L05-stance-리뷰 선호',
  'L05-stance-리뷰 선호',
  'LIGHT',
  5,
  '리뷰를 읽을 때 어떤 리뷰가 더 끌리시나요?',
  'SLIDER',
  '[{"id": "min", "label": "긍정적이고 응원하는 리뷰", "value": 0}, {"id": "max", "label": "날카롭게 분석하는 비평", "value": 1}]'::jsonb,
  ARRAY['stance'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L06: stance - 기대작 평가 갈림
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L06-stance-기대작 평가 갈림',
  'L06-stance-기대작 평가 갈림',
  'LIGHT',
  6,
  '기대하던 신작의 평이 안 좋을 때 어떻게 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "그래도 내가 보면 좋을 수 있으니 일단 본다", "value": "a", "weights": {"stance": 0.1}}, {"id": "b", "label": "일단 보고 나만의 판단을 한다", "value": "b", "weights": {"stance": 0.35}}, {"id": "c", "label": "왜 평이 안 좋은지 분석글을 먼저 찾아본다", "value": "c", "weights": {"stance": 0.7}}, {"id": "d", "label": "비평 리뷰를 꼼꼼히 읽고 볼지 결정한다", "value": "d", "weights": {"stance": 0.95}}]'::jsonb,
  ARRAY['stance'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L07: scope - 정보 수용 방식
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L07-scope-정보 수용 방식',
  'L07-scope-정보 수용 방식',
  'LIGHT',
  7,
  '정보를 받을 때 선호하는 방식은?',
  'SLIDER',
  '[{"id": "min", "label": "핵심만 간결하게", "value": 0}, {"id": "max", "label": "세부사항까지 상세하게", "value": 1}]'::jsonb,
  ARRAY['scope'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L08: scope - 드라마 탐색 범위
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L08-scope-드라마 탐색 범위',
  'L08-scope-드라마 탐색 범위',
  'LIGHT',
  8,
  '새로운 드라마를 알아볼 때 어디까지 확인하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "포스터, 제목 정도만 보고 결정한다", "value": "a", "weights": {"scope": 0.1}}, {"id": "b", "label": "간단한 줄거리와 장르를 확인한다", "value": "b", "weights": {"scope": 0.35}}, {"id": "c", "label": "출연진, 감독, 주요 에피소드 리뷰까지 본다", "value": "c", "weights": {"scope": 0.7}}, {"id": "d", "label": "제작 배경, 원작, 시청률 추이까지 전부 확인한다", "value": "d", "weights": {"scope": 0.95}}]'::jsonb,
  ARRAY['scope'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L09: taste - 취향 스펙트럼
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L09-taste-취향 스펙트럼',
  'L09-taste-취향 스펙트럼',
  'LIGHT',
  9,
  '콘텐츠 취향이 어느 쪽에 가까우신가요?',
  'SLIDER',
  '[{"id": "min", "label": "검증된 인기작 위주", "value": 0}, {"id": "max", "label": "숨겨진 독립작·실험작", "value": 1}]'::jsonb,
  ARRAY['taste'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L10: taste - 영화 선택 기준
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L10-taste-영화 선택 기준',
  'L10-taste-영화 선택 기준',
  'LIGHT',
  10,
  '주말에 영화를 고를 때 주로 어떤 기준으로 고르시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "박스오피스 순위나 화제작 위주로 본다", "value": "a", "weights": {"taste": 0.1}}, {"id": "b", "label": "좋아하는 배우나 감독의 신작을 찾는다", "value": "b", "weights": {"taste": 0.35}}, {"id": "c", "label": "영화제 수상작이나 평론가 추천작을 본다", "value": "c", "weights": {"taste": 0.7}}, {"id": "d", "label": "잘 알려지지 않은 독립영화나 실험작을 찾는다", "value": "d", "weights": {"taste": 0.95}}]'::jsonb,
  ARRAY['taste'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L11: purpose - 콘텐츠 소비 이유
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L11-purpose-콘텐츠 소비 이유',
  'L11-purpose-콘텐츠 소비 이유',
  'LIGHT',
  11,
  '콘텐츠를 즐기는 주된 이유는 무엇인가요?',
  'SLIDER',
  '[{"id": "min", "label": "스트레스 해소·재미", "value": 0}, {"id": "max", "label": "삶의 의미·영감 찾기", "value": 1}]'::jsonb,
  ARRAY['purpose'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- L12: purpose - 기억에 남는 콘텐츠
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-L12-purpose-기억에 남는 콘텐츠',
  'L12-purpose-기억에 남는 콘텐츠',
  'LIGHT',
  12,
  '가장 기억에 남는 콘텐츠는 어떤 종류인가요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "웃기고 가볍게 즐길 수 있었던 것", "value": "a", "weights": {"purpose": 0.1}}, {"id": "b", "label": "스릴이나 큰 감동이 있었던 것", "value": "b", "weights": {"purpose": 0.35}}, {"id": "c", "label": "새로운 관점을 알게 해준 것", "value": "c", "weights": {"purpose": 0.7}}, {"id": "d", "label": "인생관이 바뀔 정도로 깊은 울림을 준 것", "value": "d", "weights": {"purpose": 0.95}}]'::jsonb,
  ARRAY['purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MEDIUM 모드 (추가 18문항, Q13~Q30)
-- ============================================

-- M13: depth+lens - 다큐 매력 포인트
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M13-depth+lens-다큐 매력 포인트',
  'M13-depth+lens-다큐 매력 포인트',
  'MEDIUM',
  13,
  '다큐멘터리를 볼 때 가장 매력적인 부분은 무엇인가요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "흥미로운 이야기와 감동적인 순간", "value": "a", "weights": {"depth": 0.2, "lens": 0.15}}, {"id": "b", "label": "놀라운 사실과 새로운 정보", "value": "b", "weights": {"depth": 0.5, "lens": 0.6}}, {"id": "c", "label": "현상의 원인과 구조적 분석", "value": "c", "weights": {"depth": 0.8, "lens": 0.85}}, {"id": "d", "label": "사회적 맥락과 심층 비평", "value": "d", "weights": {"depth": 0.95, "lens": 0.7}}]'::jsonb,
  ARRAY['depth', 'lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M14: depth - 대화 깊이
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M14-depth-대화 깊이',
  'M14-depth-대화 깊이',
  'MEDIUM',
  14,
  '콘텐츠에 대해 다른 사람들과 대화할 때, 얼마나 깊은 이야기를 나누고 싶으신가요?',
  'SLIDER',
  '[{"id": "min", "label": "가벼운 감상 공유", "value": 0}, {"id": "max", "label": "깊은 해석 토론", "value": 1}]'::jsonb,
  ARRAY['depth'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M15: lens - 음악 감상 포인트
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M15-lens-음악 감상 포인트',
  'M15-lens-음악 감상 포인트',
  'MEDIUM',
  15,
  '음악을 들을 때 주로 어떤 요소에 집중하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "가사의 감정과 분위기", "value": "a", "weights": {"lens": 0.1}}, {"id": "b", "label": "멜로디와 전체적인 느낌", "value": "b", "weights": {"lens": 0.35}}, {"id": "c", "label": "편곡과 악기 구성", "value": "c", "weights": {"lens": 0.7}}, {"id": "d", "label": "음악 이론적 구조와 기법", "value": "d", "weights": {"lens": 0.95}}]'::jsonb,
  ARRAY['lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M16: lens+stance - 논란 작품 접근
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M16-lens+stance-논란 작품 접근',
  'M16-lens+stance-논란 작품 접근',
  'MEDIUM',
  16,
  '논란이 있는 작품(예: 특정 표현이 문제된 작품)에 대해 어떻게 접근하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "작품은 작품 자체로 느끼면 된다", "value": "a", "weights": {"lens": 0.2, "stance": 0.1}}, {"id": "b", "label": "논란은 알지만 감상에 큰 영향은 없다", "value": "b", "weights": {"lens": 0.4, "stance": 0.3}}, {"id": "c", "label": "논란의 맥락을 이해하고 비판적으로 본다", "value": "c", "weights": {"lens": 0.7, "stance": 0.75}}, {"id": "d", "label": "사회적 영향력을 분석하며 비평한다", "value": "d", "weights": {"lens": 0.85, "stance": 0.9}}]'::jsonb,
  ARRAY['lens', 'stance'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M17: stance - 비판적 사고 수준
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M17-stance-비판적 사고 수준',
  'M17-stance-비판적 사고 수준',
  'MEDIUM',
  17,
  '평소 콘텐츠를 접할 때 비판적 사고를 얼마나 적용하시나요?',
  'SLIDER',
  '[{"id": "min", "label": "있는 그대로 즐기기", "value": 0}, {"id": "max", "label": "항상 비판적으로 분석", "value": 1}]'::jsonb,
  ARRAY['stance'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M18: stance+purpose - 베스트셀러 실망
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M18-stance+purpose-베스트셀러 실망',
  'M18-stance+purpose-베스트셀러 실망',
  'MEDIUM',
  18,
  '베스트셀러를 읽은 후 실망했을 때 어떤 반응을 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "대중이 좋아하면 그만한 이유가 있겠지", "value": "a", "weights": {"stance": 0.1, "purpose": 0.2}}, {"id": "b", "label": "취향 차이니까 별 생각 없이 넘어간다", "value": "b", "weights": {"stance": 0.3, "purpose": 0.3}}, {"id": "c", "label": "왜 사람들이 좋아하는지 분석해본다", "value": "c", "weights": {"stance": 0.65, "purpose": 0.6}}, {"id": "d", "label": "과대평가된 이유를 비평적으로 짚어본다", "value": "d", "weights": {"stance": 0.9, "purpose": 0.8}}]'::jsonb,
  ARRAY['stance', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M19: scope - 탐색 범위
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M19-scope-탐색 범위',
  'M19-scope-탐색 범위',
  'MEDIUM',
  19,
  '새로운 장르나 분야에 관심이 생겼을 때 어느 정도까지 알아보시나요?',
  'SLIDER',
  '[{"id": "min", "label": "대표작 1~2개만", "value": 0}, {"id": "max", "label": "역사와 계보까지", "value": 1}]'::jsonb,
  ARRAY['scope'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M20: scope+depth - 아티스트 탐색
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M20-scope+depth-아티스트 탐색',
  'M20-scope+depth-아티스트 탐색',
  'MEDIUM',
  20,
  '좋아하는 아티스트를 발견했을 때 어떻게 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "좋아하는 곡/작품만 반복해서 즐긴다", "value": "a", "weights": {"scope": 0.1, "depth": 0.15}}, {"id": "b", "label": "다른 대표작도 찾아본다", "value": "b", "weights": {"scope": 0.35, "depth": 0.4}}, {"id": "c", "label": "디스코그래피/필모그래피 전체를 훑는다", "value": "c", "weights": {"scope": 0.7, "depth": 0.7}}, {"id": "d", "label": "인터뷰, 비하인드, 영향 받은 작품까지 파본다", "value": "d", "weights": {"scope": 0.95, "depth": 0.9}}]'::jsonb,
  ARRAY['scope', 'depth'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M21: taste - 실험적 콘텐츠 관심
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M21-taste-실험적 콘텐츠 관심',
  'M21-taste-실험적 콘텐츠 관심',
  'MEDIUM',
  21,
  '새로운 형식의 실험적 콘텐츠(인터랙티브 영화, AI 생성 음악 등)에 대한 관심은?',
  'SLIDER',
  '[{"id": "min", "label": "별로 관심 없음", "value": 0}, {"id": "max", "label": "적극적으로 찾아봄", "value": 1}]'::jsonb,
  ARRAY['taste'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M22: taste+lens - 추천 선호 스타일
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M22-taste+lens-추천 선호 스타일',
  'M22-taste+lens-추천 선호 스타일',
  'MEDIUM',
  22,
  '콘텐츠 추천을 받을 때 어떤 추천이 가장 마음에 드시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "지금 인기 있는 화제작", "value": "a", "weights": {"taste": 0.1, "lens": 0.3}}, {"id": "b", "label": "나와 비슷한 취향의 사람들이 좋아하는 것", "value": "b", "weights": {"taste": 0.3, "lens": 0.5}}, {"id": "c", "label": "내가 모르는 새로운 장르/감독의 작품", "value": "c", "weights": {"taste": 0.7, "lens": 0.6}}, {"id": "d", "label": "알고리즘이 발굴한 숨겨진 보석", "value": "d", "weights": {"taste": 0.9, "lens": 0.75}}]'::jsonb,
  ARRAY['taste', 'lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M23: purpose - 콘텐츠 소비 후 남는 것
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M23-purpose-콘텐츠 소비 후 남는 것',
  'M23-purpose-콘텐츠 소비 후 남는 것',
  'MEDIUM',
  23,
  '콘텐츠를 즐긴 후 가장 중요하게 여기는 것은?',
  'SLIDER',
  '[{"id": "min", "label": "기분 전환·즐거움", "value": 0}, {"id": "max", "label": "생각할 거리·영감", "value": 1}]'::jsonb,
  ARRAY['purpose'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M24: purpose+depth - 여행다큐 선호
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M24-purpose+depth-여행다큐 선호',
  'M24-purpose+depth-여행다큐 선호',
  'MEDIUM',
  24,
  '여행 다큐를 볼 때 가장 끌리는 스타일은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "예쁜 풍경과 힐링 영상", "value": "a", "weights": {"purpose": 0.1, "depth": 0.1}}, {"id": "b", "label": "현지 맛집과 관광 정보", "value": "b", "weights": {"purpose": 0.3, "depth": 0.3}}, {"id": "c", "label": "문화와 역사 배경 설명", "value": "c", "weights": {"purpose": 0.65, "depth": 0.7}}, {"id": "d", "label": "현지인의 삶과 사회 이슈 탐구", "value": "d", "weights": {"purpose": 0.9, "depth": 0.85}}]'::jsonb,
  ARRAY['purpose', 'depth'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M25: depth+stance - 전문가 의견 차이
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M25-depth+stance-전문가 의견 차이',
  'M25-depth+stance-전문가 의견 차이',
  'MEDIUM',
  25,
  '유명 평론가의 의견과 내 의견이 다를 때 어떻게 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "전문가니까 맞겠지 하고 수긍한다", "value": "a", "weights": {"depth": 0.15, "stance": 0.1}}, {"id": "b", "label": "참고는 하되 내 감상을 우선한다", "value": "b", "weights": {"depth": 0.4, "stance": 0.35}}, {"id": "c", "label": "왜 다른지 비교 분석해본다", "value": "c", "weights": {"depth": 0.7, "stance": 0.7}}, {"id": "d", "label": "나만의 근거를 들어 반박 포인트를 정리한다", "value": "d", "weights": {"depth": 0.9, "stance": 0.9}}]'::jsonb,
  ARRAY['depth', 'stance'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M26: scope+taste - OTT 탐색 방식
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M26-scope+taste-OTT 탐색 방식',
  'M26-scope+taste-OTT 탐색 방식',
  'MEDIUM',
  26,
  '넷플릭스 홈 화면에서 보통 어떻게 콘텐츠를 고르시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "톱10이나 추천 상위에서 바로 고른다", "value": "a", "weights": {"scope": 0.1, "taste": 0.1}}, {"id": "b", "label": "장르별로 둘러보다가 끌리는 걸 고른다", "value": "b", "weights": {"scope": 0.35, "taste": 0.35}}, {"id": "c", "label": "검색으로 특정 감독/배우 작품을 찾는다", "value": "c", "weights": {"scope": 0.7, "taste": 0.6}}, {"id": "d", "label": "카테고리 깊이 들어가 숨은 작품을 발굴한다", "value": "d", "weights": {"scope": 0.9, "taste": 0.9}}]'::jsonb,
  ARRAY['scope', 'taste'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M27: lens+purpose - 좋은 소설 기준
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M27-lens+purpose-좋은 소설 기준',
  'M27-lens+purpose-좋은 소설 기준',
  'MEDIUM',
  27,
  '좋은 소설의 기준은 무엇이라 생각하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "몰입감 있고 재미있는 스토리", "value": "a", "weights": {"lens": 0.2, "purpose": 0.1}}, {"id": "b", "label": "인물의 감정에 깊이 공감할 수 있는 것", "value": "b", "weights": {"lens": 0.15, "purpose": 0.4}}, {"id": "c", "label": "구성미와 문체가 뛰어난 것", "value": "c", "weights": {"lens": 0.8, "purpose": 0.5}}, {"id": "d", "label": "삶에 대한 통찰과 철학이 담긴 것", "value": "d", "weights": {"lens": 0.5, "purpose": 0.95}}]'::jsonb,
  ARRAY['lens', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M28: taste+purpose - 플레이리스트 스타일
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M28-taste+purpose-플레이리스트 스타일',
  'M28-taste+purpose-플레이리스트 스타일',
  'MEDIUM',
  28,
  '음악 플레이리스트를 만들 때의 스타일은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "인기 차트 위주로 가볍게", "value": "a", "weights": {"taste": 0.1, "purpose": 0.1}}, {"id": "b", "label": "분위기에 맞는 익숙한 노래들로", "value": "b", "weights": {"taste": 0.3, "purpose": 0.3}}, {"id": "c", "label": "다양한 장르를 섞어 새로운 조합으로", "value": "c", "weights": {"taste": 0.7, "purpose": 0.5}}, {"id": "d", "label": "테마나 메시지를 담은 큐레이션으로", "value": "d", "weights": {"taste": 0.6, "purpose": 0.9}}]'::jsonb,
  ARRAY['taste', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M29: scope+stance - 리뷰 작성 스타일
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M29-scope+stance-리뷰 작성 스타일',
  'M29-scope+stance-리뷰 작성 스타일',
  'MEDIUM',
  29,
  '콘텐츠 리뷰를 쓴다면 어떤 스타일이 될 것 같으신가요?',
  'SLIDER',
  '[{"id": "min", "label": "짧고 호불호 위주", "value": 0}, {"id": "max", "label": "상세하고 비평적", "value": 1}]'::jsonb,
  ARRAY['scope', 'stance'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- M30: all - 이상적 큐레이터
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-M30-all-이상적 큐레이터',
  'M30-all-이상적 큐레이터',
  'MEDIUM',
  30,
  '나에게 이상적인 콘텐츠 큐레이터는?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "재미있는 것만 쏙쏙 골라주는 친구 같은 존재", "value": "a", "weights": {"depth": 0.15, "lens": 0.2, "stance": 0.1, "scope": 0.15, "taste": 0.25, "purpose": 0.1}}, {"id": "b", "label": "트렌드를 잘 짚어주는 인플루언서", "value": "b", "weights": {"depth": 0.3, "lens": 0.4, "stance": 0.3, "scope": 0.4, "taste": 0.2, "purpose": 0.3}}, {"id": "c", "label": "깊이 있는 분석을 곁들인 평론가", "value": "c", "weights": {"depth": 0.8, "lens": 0.75, "stance": 0.7, "scope": 0.7, "taste": 0.55, "purpose": 0.7}}, {"id": "d", "label": "숨겨진 명작을 발굴해주는 탐험가", "value": "d", "weights": {"depth": 0.7, "lens": 0.5, "stance": 0.5, "scope": 0.8, "taste": 0.9, "purpose": 0.8}}]'::jsonb,
  ARRAY['depth', 'lens', 'stance', 'scope', 'taste', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEEP 모드 (추가 30문항, Q31~Q60)
-- ============================================

-- D31: depth+scope - 반복 감상
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D31-depth+scope-반복 감상',
  'D31-depth+scope-반복 감상',
  'DEEP',
  31,
  '한 편의 작품을 여러 번 반복해서 보거나 읽는 편인가요?',
  'SLIDER',
  '[{"id": "min", "label": "한 번 보면 충분", "value": 0}, {"id": "max", "label": "좋은 건 여러 번 곱씹기", "value": 1}]'::jsonb,
  ARRAY['depth', 'scope'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D32: lens - 게임 매력 포인트
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D32-lens-게임 매력 포인트',
  'D32-lens-게임 매력 포인트',
  'DEEP',
  32,
  '게임을 한다면, 더 끌리는 요소는?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "감동적인 스토리와 캐릭터", "value": "a", "weights": {"lens": 0.1}}, {"id": "b", "label": "아름다운 그래픽과 음악", "value": "b", "weights": {"lens": 0.3}}, {"id": "c", "label": "전략적 판단과 시스템 이해", "value": "c", "weights": {"lens": 0.7}}, {"id": "d", "label": "메커니즘 최적화와 효율 분석", "value": "d", "weights": {"lens": 0.95}}]'::jsonb,
  ARRAY['lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D33: stance+lens - SNS 콘텐츠 논쟁
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D33-stance+lens-SNS 콘텐츠 논쟁',
  'D33-stance+lens-SNS 콘텐츠 논쟁',
  'DEEP',
  33,
  'SNS에서 콘텐츠 관련 논쟁을 볼 때 어떻게 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "그냥 스크롤하고 넘어간다", "value": "a", "weights": {"stance": 0.1, "lens": 0.3}}, {"id": "b", "label": "재미있게 구경만 한다", "value": "b", "weights": {"stance": 0.25, "lens": 0.25}}, {"id": "c", "label": "양쪽 논거를 비교해본다", "value": "c", "weights": {"stance": 0.65, "lens": 0.7}}, {"id": "d", "label": "내 의견을 근거와 함께 댓글로 남긴다", "value": "d", "weights": {"stance": 0.9, "lens": 0.8}}]'::jsonb,
  ARRAY['stance', 'lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D34: scope - 시리즈물 시청 방식
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D34-scope-시리즈물 시청 방식',
  'D34-scope-시리즈물 시청 방식',
  'DEEP',
  34,
  '시리즈물을 볼 때 선호하는 방식은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "화제 에피소드만 골라본다", "value": "a", "weights": {"scope": 0.1}}, {"id": "b", "label": "마음에 드는 시즌만 본다", "value": "b", "weights": {"scope": 0.3}}, {"id": "c", "label": "시즌 1부터 순서대로 본다", "value": "c", "weights": {"scope": 0.7}}, {"id": "d", "label": "스핀오프, 비하인드까지 전부 챙긴다", "value": "d", "weights": {"scope": 0.95}}]'::jsonb,
  ARRAY['scope'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D35: purpose - 잠들기 전 콘텐츠
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D35-purpose-잠들기 전 콘텐츠',
  'D35-purpose-잠들기 전 콘텐츠',
  'DEEP',
  35,
  '잠들기 전 콘텐츠를 고를 때 기준은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "가볍고 웃긴 것", "value": "a", "weights": {"purpose": 0.05}}, {"id": "b", "label": "편안하고 힐링되는 것", "value": "b", "weights": {"purpose": 0.25}}, {"id": "c", "label": "몰입할 수 있는 스토리", "value": "c", "weights": {"purpose": 0.55}}, {"id": "d", "label": "생각할 거리를 주는 것", "value": "d", "weights": {"purpose": 0.9}}]'::jsonb,
  ARRAY['purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D36: depth+stance - 좋은 작품 기준
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D36-depth+stance-좋은 작품 기준',
  'D36-depth+stance-좋은 작품 기준',
  'DEEP',
  36,
  '''좋은 작품''의 기준에서, 완성도와 감동 중 어디에 더 비중을 두시나요?',
  'SLIDER',
  '[{"id": "min", "label": "감동·공감이 최우선", "value": 0}, {"id": "max", "label": "완성도·논리가 최우선", "value": 1}]'::jsonb,
  ARRAY['depth', 'stance'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D37: lens+stance - 평점 기준
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D37-lens+stance-평점 기준',
  'D37-lens+stance-평점 기준',
  'DEEP',
  37,
  '영화 평점을 매길 때의 기준은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "재미있으면 높은 점수", "value": "a", "weights": {"lens": 0.15, "stance": 0.1}}, {"id": "b", "label": "감정적으로 얼마나 울렸는가", "value": "b", "weights": {"lens": 0.1, "stance": 0.3}}, {"id": "c", "label": "연출, 각본, 연기의 균형", "value": "c", "weights": {"lens": 0.75, "stance": 0.65}}, {"id": "d", "label": "장르 내 혁신성과 영화사적 의미", "value": "d", "weights": {"lens": 0.85, "stance": 0.9}}]'::jsonb,
  ARRAY['lens', 'stance'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D38: taste+purpose - 전시회 선호
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D38-taste+purpose-전시회 선호',
  'D38-taste+purpose-전시회 선호',
  'DEEP',
  38,
  '전시회를 방문한다면 어떤 전시에 가장 끌리시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "인스타그래머블한 포토존이 많은 체험형 전시", "value": "a", "weights": {"taste": 0.1, "purpose": 0.05}}, {"id": "b", "label": "유명 화가의 대표작 모음 전시", "value": "b", "weights": {"taste": 0.25, "purpose": 0.35}}, {"id": "c", "label": "특정 시대나 사조를 깊이 다룬 기획 전시", "value": "c", "weights": {"taste": 0.6, "purpose": 0.7}}, {"id": "d", "label": "신진 작가의 실험적인 현대미술 전시", "value": "d", "weights": {"taste": 0.95, "purpose": 0.8}}]'::jsonb,
  ARRAY['taste', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D39: scope+depth - 관심분야 지식 깊이
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D39-scope+depth-관심분야 지식 깊이',
  'D39-scope+depth-관심분야 지식 깊이',
  'DEEP',
  39,
  '관심 분야에 대한 지식의 깊이는 어느 정도인가요?',
  'SLIDER',
  '[{"id": "min", "label": "가볍게 즐기는 수준", "value": 0}, {"id": "max", "label": "전문가 수준의 지식", "value": 1}]'::jsonb,
  ARRAY['scope', 'depth'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D40: stance - 밈과 패러디 반응
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D40-stance-밈과 패러디 반응',
  'D40-stance-밈과 패러디 반응',
  'DEEP',
  40,
  '유행하는 밈이나 패러디에 대한 반응은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "재미있으면 공유하고 따라한다", "value": "a", "weights": {"stance": 0.1}}, {"id": "b", "label": "웃기긴 한데 그냥 보고 넘긴다", "value": "b", "weights": {"stance": 0.3}}, {"id": "c", "label": "왜 유행하는지 맥락을 생각해본다", "value": "c", "weights": {"stance": 0.65}}, {"id": "d", "label": "원작에 대한 리스펙트가 있는지 따져본다", "value": "d", "weights": {"stance": 0.9}}]'::jsonb,
  ARRAY['stance'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D41: depth+purpose - 콘텐츠 글쓰기
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D41-depth+purpose-콘텐츠 글쓰기',
  'D41-depth+purpose-콘텐츠 글쓰기',
  'DEEP',
  41,
  '콘텐츠에 대해 글을 쓴다면 어떤 형태가 되실 것 같나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "한 줄 감상평 (\"꿀잼\", \"별로\")", "value": "a", "weights": {"depth": 0.1, "purpose": 0.1}}, {"id": "b", "label": "감정 위주의 짧은 후기", "value": "b", "weights": {"depth": 0.3, "purpose": 0.35}}, {"id": "c", "label": "장단점을 구분한 리뷰", "value": "c", "weights": {"depth": 0.7, "purpose": 0.6}}, {"id": "d", "label": "주제 해석과 의미 분석이 담긴 비평문", "value": "d", "weights": {"depth": 0.95, "purpose": 0.9}}]'::jsonb,
  ARRAY['depth', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D42: lens - SNS 공유 스타일
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D42-lens-SNS 공유 스타일',
  'D42-lens-SNS 공유 스타일',
  'DEEP',
  42,
  'SNS에 콘텐츠를 공유할 때의 멘트 스타일은?',
  'SLIDER',
  '[{"id": "min", "label": "\"이거 너무 좋아ㅠㅠ\" 감성 위주", "value": 0}, {"id": "max", "label": "\"~한 점이 인상적\" 분석 위주", "value": 1}]'::jsonb,
  ARRAY['lens'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D43: stance+scope - 독서모임 역할
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D43-stance+scope-독서모임 역할',
  'D43-stance+scope-독서모임 역할',
  'DEEP',
  43,
  '독서 모임에 참여한다면 어떤 역할이 될 것 같나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "다른 사람 의견을 잘 들어주는 청취자", "value": "a", "weights": {"stance": 0.1, "scope": 0.2}}, {"id": "b", "label": "감상과 느낌을 나누는 공유자", "value": "b", "weights": {"stance": 0.3, "scope": 0.35}}, {"id": "c", "label": "주제를 정리하고 토론을 이끄는 진행자", "value": "c", "weights": {"stance": 0.6, "scope": 0.7}}, {"id": "d", "label": "작품의 약점을 지적하고 논쟁을 일으키는 비평가", "value": "d", "weights": {"stance": 0.9, "scope": 0.85}}]'::jsonb,
  ARRAY['stance', 'scope'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D44: taste - 친구 추천 요청 대응
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D44-taste-친구 추천 요청 대응',
  'D44-taste-친구 추천 요청 대응',
  'DEEP',
  44,
  '친구가 "요즘 뭐 볼 만한 거 있어?"라고 물었을 때?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "요즘 핫한 인기작을 알려준다", "value": "a", "weights": {"taste": 0.1}}, {"id": "b", "label": "내가 최근에 본 것 중 괜찮은 걸 추천한다", "value": "b", "weights": {"taste": 0.35}}, {"id": "c", "label": "친구 취향을 고려해서 맞춤 추천한다", "value": "c", "weights": {"taste": 0.6}}, {"id": "d", "label": "아무도 모르는 숨은 작품을 소개해준다", "value": "d", "weights": {"taste": 0.9}}]'::jsonb,
  ARRAY['taste'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D45: purpose+lens - 가치관 영향
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D45-purpose+lens-가치관 영향',
  'D45-purpose+lens-가치관 영향',
  'DEEP',
  45,
  '콘텐츠가 나의 생각이나 가치관에 미치는 영향은 어느 정도인가요?',
  'SLIDER',
  '[{"id": "min", "label": "그냥 즐기는 것일 뿐", "value": 0}, {"id": "max", "label": "세계관에 큰 영향을 줌", "value": 1}]'::jsonb,
  ARRAY['purpose', 'lens'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D46: taste+depth - 장르 선호 조합
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D46-taste+depth-장르 선호 조합',
  'D46-taste+depth-장르 선호 조합',
  'DEEP',
  46,
  '선호하는 영화 스타일 조합은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "마블/DC 같은 블록버스터 액션", "value": "a", "weights": {"taste": 0.1, "depth": 0.15}}, {"id": "b", "label": "잘 만든 로맨스나 드라마", "value": "b", "weights": {"taste": 0.25, "depth": 0.35}}, {"id": "c", "label": "놀란/빌뇌브 같은 장르 혁신 감독 작품", "value": "c", "weights": {"taste": 0.65, "depth": 0.75}}, {"id": "d", "label": "A24 스타일의 아트하우스/독립영화", "value": "d", "weights": {"taste": 0.95, "depth": 0.85}}]'::jsonb,
  ARRAY['taste', 'depth'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D47: scope+lens - 팟캐스트/유튜브 기준
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D47-scope+lens-팟캐스트/유튜브 기준',
  'D47-scope+lens-팟캐스트/유튜브 기준',
  'DEEP',
  47,
  '팟캐스트나 유튜브를 선택할 때의 기준은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "짧고 재미있는 클립", "value": "a", "weights": {"scope": 0.1, "lens": 0.2}}, {"id": "b", "label": "관심 주제에 대한 쉬운 설명", "value": "b", "weights": {"scope": 0.35, "lens": 0.4}}, {"id": "c", "label": "전문가가 깊이 다루는 콘텐츠", "value": "c", "weights": {"scope": 0.7, "lens": 0.7}}, {"id": "d", "label": "1시간 이상의 심층 인터뷰·강의", "value": "d", "weights": {"scope": 0.95, "lens": 0.85}}]'::jsonb,
  ARRAY['scope', 'lens'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D48: purpose - 가장 좋아하는 콘텐츠 형태
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D48-purpose-가장 좋아하는 콘텐츠 형태',
  'D48-purpose-가장 좋아하는 콘텐츠 형태',
  'DEEP',
  48,
  '아래 중 가장 좋아하는 콘텐츠 형태는?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "예능·코미디 (웃음과 즐거움)", "value": "a", "weights": {"purpose": 0.05}}, {"id": "b", "label": "드라마·로맨스 (감정과 공감)", "value": "b", "weights": {"purpose": 0.35}}, {"id": "c", "label": "다큐·논픽션 (지식과 통찰)", "value": "c", "weights": {"purpose": 0.7}}, {"id": "d", "label": "에세이·철학 (의미와 성찰)", "value": "d", "weights": {"purpose": 0.95}}]'::jsonb,
  ARRAY['purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D49: taste - 외국어 콘텐츠 수용도
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D49-taste-외국어 콘텐츠 수용도',
  'D49-taste-외국어 콘텐츠 수용도',
  'DEEP',
  49,
  '외국어/자막 콘텐츠에 대한 수용도는?',
  'SLIDER',
  '[{"id": "min", "label": "한국 콘텐츠 위주", "value": 0}, {"id": "max", "label": "언어 상관없이 적극 탐색", "value": 1}]'::jsonb,
  ARRAY['taste'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D50: depth+purpose - 역사과학 콘텐츠 선호
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D50-depth+purpose-역사과학 콘텐츠 선호',
  'D50-depth+purpose-역사과학 콘텐츠 선호',
  'DEEP',
  50,
  '역사/과학 콘텐츠의 선호 스타일은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "짧은 팩트 모음이나 퀴즈형", "value": "a", "weights": {"depth": 0.1, "purpose": 0.15}}, {"id": "b", "label": "재미있게 풀어낸 교양 다큐", "value": "b", "weights": {"depth": 0.35, "purpose": 0.4}}, {"id": "c", "label": "전문 학자가 설명하는 강의형", "value": "c", "weights": {"depth": 0.7, "purpose": 0.7}}, {"id": "d", "label": "원본 논문/자료까지 찾아보게 되는 심층형", "value": "d", "weights": {"depth": 0.95, "purpose": 0.9}}]'::jsonb,
  ARRAY['depth', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D51: lens+purpose - 스트레스 시 콘텐츠
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D51-lens+purpose-스트레스 시 콘텐츠',
  'D51-lens+purpose-스트레스 시 콘텐츠',
  'DEEP',
  51,
  '스트레스를 받았을 때 찾게 되는 콘텐츠는?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "아무 생각 없이 볼 수 있는 예능", "value": "a", "weights": {"lens": 0.15, "purpose": 0.05}}, {"id": "b", "label": "감정을 실어 울 수 있는 멜로", "value": "b", "weights": {"lens": 0.1, "purpose": 0.3}}, {"id": "c", "label": "집중하면서 현실을 잊을 수 있는 스릴러", "value": "c", "weights": {"lens": 0.55, "purpose": 0.45}}, {"id": "d", "label": "내면을 돌아보게 하는 에세이/다큐", "value": "d", "weights": {"lens": 0.4, "purpose": 0.9}}]'::jsonb,
  ARRAY['lens', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D52: stance+taste - 취향 아닌 추천 받았을 때
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D52-stance+taste-취향 아닌 추천 받았을 때',
  'D52-stance+taste-취향 아닌 추천 받았을 때',
  'DEEP',
  52,
  '친구가 추천한 작품이 내 취향이 아닐 때 어떻게 하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "그래도 끝까지 보고 좋은 점을 찾아본다", "value": "a", "weights": {"stance": 0.1, "taste": 0.2}}, {"id": "b", "label": "적당히 보다가 안 맞으면 그만둔다", "value": "b", "weights": {"stance": 0.3, "taste": 0.35}}, {"id": "c", "label": "왜 안 맞는지 분석하고 친구에게 피드백한다", "value": "c", "weights": {"stance": 0.7, "taste": 0.55}}, {"id": "d", "label": "취향이 다르다는 걸 명확히 하고 내 추천을 역제안한다", "value": "d", "weights": {"stance": 0.85, "taste": 0.8}}]'::jsonb,
  ARRAY['stance', 'taste'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D53: scope - 관심 없던 분야 접근
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D53-scope-관심 없던 분야 접근',
  'D53-scope-관심 없던 분야 접근',
  'DEEP',
  53,
  '관심 없던 분야의 콘텐츠를 우연히 접하게 됐을 때?',
  'SLIDER',
  '[{"id": "min", "label": "빠르게 넘긴다", "value": 0}, {"id": "max", "label": "호기심으로 깊이 파본다", "value": 1}]'::jsonb,
  ARRAY['scope'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D54: depth - 긴 형식 vs 짧은 형식
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D54-depth-긴 형식 vs 짧은 형식',
  'D54-depth-긴 형식 vs 짧은 형식',
  'DEEP',
  54,
  '선호하는 콘텐츠 길이는?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "숏폼 (릴스, 쇼츠, 1분 이내)", "value": "a", "weights": {"depth": 0.05}}, {"id": "b", "label": "미드폼 (10~30분, 에피소드)", "value": "b", "weights": {"depth": 0.35}}, {"id": "c", "label": "롱폼 (1~2시간, 영화/다큐)", "value": "c", "weights": {"depth": 0.65}}, {"id": "d", "label": "초롱폼 (시리즈 전체, 장편소설)", "value": "d", "weights": {"depth": 0.95}}]'::jsonb,
  ARRAY['depth'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D55: taste+scope - 새 플랫폼 탐색
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D55-taste+scope-새 플랫폼 탐색',
  'D55-taste+scope-새 플랫폼 탐색',
  'DEEP',
  55,
  '새로운 콘텐츠 플랫폼이나 앱이 나왔을 때?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "대중적으로 인정받으면 그때 써본다", "value": "a", "weights": {"taste": 0.1, "scope": 0.15}}, {"id": "b", "label": "주변에서 추천하면 시도해본다", "value": "b", "weights": {"taste": 0.3, "scope": 0.3}}, {"id": "c", "label": "리뷰를 찾아보고 괜찮으면 바로 시도한다", "value": "c", "weights": {"taste": 0.6, "scope": 0.65}}, {"id": "d", "label": "얼리어답터로서 바로 탐색해본다", "value": "d", "weights": {"taste": 0.9, "scope": 0.85}}]'::jsonb,
  ARRAY['taste', 'scope'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D56: purpose+stance - 사회적 메시지 작품
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D56-purpose+stance-사회적 메시지 작품',
  'D56-purpose+stance-사회적 메시지 작품',
  'DEEP',
  56,
  '콘텐츠에 담긴 사회적 메시지에 대해 어떻게 생각하시나요?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "콘텐츠는 즐기는 거지, 메시지는 별로 안 중요하다", "value": "a", "weights": {"purpose": 0.1, "stance": 0.15}}, {"id": "b", "label": "자연스럽게 녹아있으면 좋지만 억지면 거부감이 든다", "value": "b", "weights": {"purpose": 0.35, "stance": 0.35}}, {"id": "c", "label": "좋은 메시지가 있으면 작품의 가치가 올라간다", "value": "c", "weights": {"purpose": 0.7, "stance": 0.55}}, {"id": "d", "label": "콘텐츠는 사회적 담론을 만들 수 있어야 한다", "value": "d", "weights": {"purpose": 0.95, "stance": 0.8}}]'::jsonb,
  ARRAY['purpose', 'stance'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D57: lens+depth - 예술성 vs 대중성
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D57-lens+depth-예술성 vs 대중성',
  'D57-lens+depth-예술성 vs 대중성',
  'DEEP',
  57,
  '예술성과 대중성 중 어디에 더 가치를 두시나요?',
  'SLIDER',
  '[{"id": "min", "label": "대중적이고 접근성 좋은 것", "value": 0}, {"id": "max", "label": "예술적이고 깊이 있는 것", "value": 1}]'::jsonb,
  ARRAY['lens', 'depth'],
  '{"type": "linear"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D58: taste+purpose - 10년 후 기억할 콘텐츠
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D58-taste+purpose-10년 후 기억할 콘텐츠',
  'D58-taste+purpose-10년 후 기억할 콘텐츠',
  'DEEP',
  58,
  '10년 후에도 기억하고 싶은 콘텐츠는?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "친구들과 같이 웃었던 추억의 콘텐츠", "value": "a", "weights": {"taste": 0.15, "purpose": 0.1}}, {"id": "b", "label": "한 시대를 대표하는 명작", "value": "b", "weights": {"taste": 0.3, "purpose": 0.45}}, {"id": "c", "label": "나의 관점을 완전히 바꿔준 작품", "value": "c", "weights": {"taste": 0.55, "purpose": 0.85}}, {"id": "d", "label": "아무도 몰랐지만 내가 발견한 숨겨진 걸작", "value": "d", "weights": {"taste": 0.95, "purpose": 0.75}}]'::jsonb,
  ARRAY['taste', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D59: all - 콘텐츠 소비 자아상
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D59-all-콘텐츠 소비 자아상',
  'D59-all-콘텐츠 소비 자아상',
  'DEEP',
  59,
  '나의 콘텐츠 소비 스타일을 가장 잘 표현하는 것은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "\"가볍게 즐기는 힐링러\"", "value": "a", "weights": {"depth": 0.15, "lens": 0.2, "stance": 0.1, "scope": 0.15, "taste": 0.2, "purpose": 0.1}}, {"id": "b", "label": "\"트렌드를 놓치지 않는 얼리캐처\"", "value": "b", "weights": {"depth": 0.35, "lens": 0.45, "stance": 0.3, "scope": 0.5, "taste": 0.35, "purpose": 0.3}}, {"id": "c", "label": "\"깊이 파는 분석가\"", "value": "c", "weights": {"depth": 0.85, "lens": 0.8, "stance": 0.75, "scope": 0.8, "taste": 0.5, "purpose": 0.65}}, {"id": "d", "label": "\"남들 모르는 걸 찾는 탐험가\"", "value": "d", "weights": {"depth": 0.7, "lens": 0.5, "stance": 0.55, "scope": 0.75, "taste": 0.95, "purpose": 0.8}}]'::jsonb,
  ARRAY['depth', 'lens', 'stance', 'scope', 'taste', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- D60: stance+lens+purpose - AI 콘텐츠 견해
INSERT INTO psych_profile_templates (id, name, "onboardingLevel", "questionOrder", "questionText", "questionType", options, "targetDimensions", "weightFormula", "isRequired")
VALUES (
  'seed-q-D60-stance+lens+purpose-AI 콘텐츠 견해',
  'D60-stance+lens+purpose-AI 콘텐츠 견해',
  'DEEP',
  60,
  'AI가 만든 콘텐츠(음악, 그림, 글)에 대한 생각은?',
  'MULTIPLE_CHOICE',
  '[{"id": "a", "label": "재미있으면 누가 만들든 상관없다", "value": "a", "weights": {"stance": 0.1, "lens": 0.3, "purpose": 0.1}}, {"id": "b", "label": "신기하고 가능성이 보이지만 아직은 부족하다", "value": "b", "weights": {"stance": 0.35, "lens": 0.5, "purpose": 0.35}}, {"id": "c", "label": "기술적으로는 인상적이지만 인간 창작과 구별해야 한다", "value": "c", "weights": {"stance": 0.7, "lens": 0.75, "purpose": 0.6}}, {"id": "d", "label": "예술은 인간 경험에서 나오는 것이라 본질적으로 다르다", "value": "d", "weights": {"stance": 0.85, "lens": 0.45, "purpose": 0.9}}]'::jsonb,
  ARRAY['stance', 'lens', 'purpose'],
  '{"type": "mapped"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;
