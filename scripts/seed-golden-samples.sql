-- ============================================
-- 골든 샘플 마이그레이션 (10개)
-- 기존 데이터 전체 삭제 후 재등록
-- 한국영화 4 + 할리우드 6
-- ============================================

-- 기존 골든 샘플 전체 삭제
DELETE FROM "golden_samples";

-- ============================================
-- 한국영화 (4개)
-- ============================================

-- 1. 기생충 (MEDIUM / depth, stance, purpose)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-kr-001',
  '기생충 (Parasite)',
  '영화',
  '드라마/스릴러',
  '봉준호 감독. 반지하 가족이 부유한 박 사장 가족에 기생하며 벌어지는 계급 풍자극. 2020 아카데미 작품상.',
  '기생충에서 가장 인상 깊었던 장면은 무엇이고, 이 영화가 전달하려는 메시지는 뭐라고 생각해?',
  '{"high-depth": "계단과 수직 공간 배치가 계급 구조를 시각적으로 은유하며, 반지하-1층-2층의 물리적 높낮이가 곧 사회적 위계를 상징한다. 폭우 장면에서 물이 아래로 흐르는 것은 재난의 불평등한 분배를 보여준다.", "low-depth": "비 오는 날 지하에 물 차는 장면이 충격적이었어. 진짜 무섭더라.", "high-stance": "기택 가족도 결국 기생하는 존재라는 점에서 순수한 피해자가 아니다. 봉준호는 양쪽 모두의 도덕적 회색지대를 의도적으로 보여준다.", "low-stance": "가난한 가족이 너무 불쌍했어. 부자들이 좀 더 나눠주면 좋겠다.", "high-purpose": "이 영화는 자본주의 사회에서 계층 이동의 환상과 구조적 불평등을 이야기한다. 기우의 계획은 처음부터 실패할 수밖에 없는 시스템적 한계를 보여준다.", "low-purpose": "반전이 엄청나서 재밌었어. 스릴러로서 완벽한 영화!"}',
  'MEDIUM',
  ARRAY['depth', 'stance', 'purpose'],
  1, true, NOW(), NOW()
);

-- 2. 올드보이 (HARD / taste, stance, depth)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-kr-002',
  '올드보이 (Oldboy)',
  '영화',
  '스릴러/네오누아르',
  '박찬욱 감독 복수 3부작. 15년간 감금된 남자의 복수극. 2004 칸 영화제 심사위원대상.',
  '올드보이의 결말을 어떻게 받아들였어? 이 영화의 폭력 묘사에 대해서는 어떻게 생각해?',
  '{"high-taste": "박찬욱의 폭력은 장르적 쾌감이 아니라 인간 조건에 대한 극단적 탐구다. 그리스 비극의 오이디푸스적 구조를 현대 느와르로 재해석한 점이 영화사적으로 독보적이다.", "low-taste": "좀 너무 잔인하지 않나... 이런 류의 영화는 잘 안 보게 되는데, 유명하니까 봤어.", "high-stance": "오대수의 복수가 결국 이우진의 설계 안에 있었다는 점에서, 관객이 응원했던 복수 서사 자체를 해체한다. 불편하지만 그게 이 영화의 힘이다.", "low-stance": "복수극으로서 정말 카타르시스 있었어. 결말 반전도 대박이고.", "high-depth": "최면과 기억 조작이라는 소재를 통해 진실과 자기기만의 경계를 묻는다. 마지막 미소는 망각을 선택한 것인지, 수용한 것인지 해석이 갈린다.", "low-depth": "반전이 충격적이었어. 그 장면에서 소름 돋았다."}',
  'HARD',
  ARRAY['taste', 'stance', 'depth'],
  1, true, NOW(), NOW()
);

-- 3. 헤어질 결심 (HARD / lens, depth, taste)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-kr-003',
  '헤어질 결심 (Decision to Leave)',
  '영화',
  '로맨스/미스터리',
  '박찬욱 감독. 형사 해준과 용의자 서래의 미묘한 사랑. 2022 칸 감독상. 절제된 감정 연출이 특징.',
  '해준과 서래의 관계를 사랑이라고 볼 수 있을까? 영화의 감정 표현 방식에 대해 어떻게 느꼈어?',
  '{"high-lens": "이 영화는 감정을 직접 보여주지 않고 시선, 통역앱, 산과 바다의 대비로 암호화한다. 관객이 감정을 추론해야 하는 구조 자체가 해준의 심리 상태를 체험하게 만든다.", "low-lens": "둘이 서로 좋아하는 게 느껴져서 가슴이 아팠어. 마지막 바다 장면에서 눈물 났어.", "high-depth": "안개와 파도의 시각적 모티프가 감정의 불확실성을 표현하고, 번역앱을 통한 소통은 언어와 감정 사이의 번역 불가능성을 은유한다.", "low-depth": "영상미가 정말 예쁘더라. 탕웨이 연기도 좋았고.", "high-taste": "멜로를 느와르 문법으로 재구성한 실험이 성공적이다. 히치콕의 현기증에 대한 21세기적 응답이면서도 완전히 박찬욱적인 영화.", "low-taste": "좀 어렵고 느렸어. 로맨스인데 확실하게 감정 표현을 해줬으면 좋겠는데."}',
  'HARD',
  ARRAY['lens', 'depth', 'taste'],
  1, true, NOW(), NOW()
);

-- 4. 극한직업 (EASY / lens, purpose, scope)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-kr-004',
  '극한직업 (Extreme Job)',
  '영화',
  '코미디/액션',
  '이병헌 감독. 마약반 형사들이 잠복을 위해 치킨집을 운영하다 치킨이 대박 나는 코미디. 역대 한국 박스오피스 2위.',
  '극한직업에서 가장 웃겼던 장면은? 이 영화가 단순한 코미디 이상의 의미가 있다고 생각해?',
  '{"high-lens": "웃음 뒤에 공무원의 열악한 처우와 소명의식 사이의 갈등이 있다. 치킨집 성공이 형사직보다 나은 삶을 보여주는 건 꽤 씁쓸한 현실 반영이다.", "low-lens": "치킨 양념 비법 찾는 장면에서 빵 터졌어ㅋㅋ 류승룡 연기 미쳤다!", "high-purpose": "한국 사회에서 공직자의 딜레마를 코미디로 포장해서 전달한다. 정의 구현보다 치킨 장사가 보람찬 현실이라는 풍자가 핵심.", "low-purpose": "그냥 웃기고 재밌는 영화! 스트레스 풀기 딱 좋아.", "high-scope": "각 형사 캐릭터의 개별 서사가 탄탄하다. 마형사의 가정 사정, 영호의 연기 욕심 등 디테일이 살아있어서 앙상블 코미디로서 완성도가 높다.", "low-scope": "류승룡이 치킨 튀기는 거 자체가 개그. 그게 이 영화의 전부이자 매력이지!"}',
  'EASY',
  ARRAY['lens', 'purpose', 'scope'],
  1, true, NOW(), NOW()
);

-- ============================================
-- 할리우드 영화 (6개)
-- ============================================

-- 5. The Shawshank Redemption (MEDIUM / purpose, depth, stance)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-hw-001',
  '쇼생크 탈출 (The Shawshank Redemption)',
  '영화',
  '드라마',
  '프랭크 다라본트 감독. 무고한 죄로 투옥된 앤디 듀프레인의 20년간의 감옥 생활과 탈출. IMDb 역대 1위.',
  '앤디가 비를 맞으며 두 팔을 벌리는 장면의 의미는 뭘까? 이 영화가 오랫동안 사랑받는 이유가 뭐라고 생각해?',
  '{"high-purpose": "이 영화는 부조리한 시스템 안에서도 인간의 존엄과 희망을 포기하지 않는 것에 대한 이야기다. 앤디의 탈출은 물리적 탈출인 동시에 제도적 폭력에 대한 정신적 승리다.", "low-purpose": "탈출 성공하는 순간 진짜 통쾌했어! 나쁜 소장 잡히는 것도 사이다.", "high-depth": "하수도 500야드는 성경적 세례의 은유다. 더러움을 통과해 정화되는 구조이며, 레드의 내레이션은 관객이 아닌 자기 자신에게 하는 고백으로 기능한다.", "low-depth": "탈출 계획이 천재적이었어. 포스터 뒤에 구멍 파놓은 거 소름.", "high-stance": "희망이라는 주제를 너무 직접적으로 대사로 전달하는 건 한계다. 브룩스의 비극이 오히려 더 진실에 가깝고, 앤디의 성공은 생존자 편향의 서사다.", "low-stance": "최고의 영화. 볼 때마다 감동이야. 희망에 대한 완벽한 이야기."}',
  'MEDIUM',
  ARRAY['purpose', 'depth', 'stance'],
  1, true, NOW(), NOW()
);

-- 6. Inception (MEDIUM / depth, scope, lens)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-hw-002',
  '인셉션 (Inception)',
  '영화',
  'SF/액션',
  '크리스토퍼 놀란 감독. 꿈속의 꿈에 침투해 아이디어를 심는 산업 스파이의 이야기. 다층 꿈 구조.',
  '마지막에 토템(팽이)이 멈추는 걸까? 이 영화에서 가장 흥미로운 꿈의 층은 어디였어?',
  '{"high-depth": "팽이의 멈춤 여부는 의도적 미결이다. 놀란은 현실 판별이 아니라 콥이 더 이상 팽이를 바라보지 않는다는 점에 초점을 맞췄다. 현실 여부보다 수용의 선택이 주제다.", "low-depth": "팽이 흔들리니까 현실인 거 같은데? 아이들 만나서 다행이야.", "high-scope": "킥의 동기화, 꿈 층위별 시간 비율(1:20:400), 림보의 물리 법칙, 아리아드네의 건축 규칙 등 세계관 설정이 내적으로 일관되며 각 층이 독립적 장르로 작동한다.", "low-scope": "눈 내리는 요새 전투 장면이 제일 멋있었어. 액션이 화려하더라.", "high-lens": "기술적 설정보다 중요한 건 콥의 죄책감이다. 말의 기억을 조작해 자살로 몬 트라우마가 모든 꿈 구조의 불안정성으로 투영된다.", "low-lens": "와이프가 너무 불쌍했어. 콥이 결국 집에 돌아가서 진짜 다행이다."}',
  'MEDIUM',
  ARRAY['depth', 'scope', 'lens'],
  1, true, NOW(), NOW()
);

-- 7. The Dark Knight (MEDIUM / stance, depth, purpose)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-hw-003',
  '다크 나이트 (The Dark Knight)',
  '영화',
  '액션/범죄',
  '크리스토퍼 놀란 감독. 배트맨과 조커의 대결. 히스 레저의 유작이자 슈퍼히어로 장르의 패러다임 전환작.',
  '조커의 철학이 맞다고 생각해? 배트맨의 "감시 시스템" 결정에 대해서는 어떻게 생각해?',
  '{"high-stance": "배트맨의 대규모 감시 시스템은 9/11 이후 미국 안보국가의 은유다. 정의를 위한 프라이버시 침해를 용인하는 순간, 배트맨과 조커의 방법론 차이는 사라진다.", "low-stance": "배트맨이 결국 옳은 일을 했잖아. 조커를 잡으려면 어쩔 수 없었어.", "high-depth": "조커는 무정부 철학자가 아니라 실험 설계자다. 두 배의 딜레마는 홉스적 자연상태 가설의 검증이며, 시민들의 선택이 가설을 반증한 것이 서사의 핵심이다.", "low-depth": "히스 레저 연기 미쳤다. 조커 등장할 때마다 긴장감 장난 아니야.", "high-purpose": "슈퍼히어로 장르를 빌려 포스트 9/11 시대의 정의와 안보, 시민적 자유의 갈등을 다룬다. 하비 덴트의 타락은 영웅 서사의 허구성에 대한 경고다.", "low-purpose": "배트맨 영화 중 최고. 액션도 대박이고 조커랑 대결 구도가 완벽해."}',
  'MEDIUM',
  ARRAY['stance', 'depth', 'purpose'],
  1, true, NOW(), NOW()
);

-- 8. Eternal Sunshine of the Spotless Mind (HARD / lens, taste, purpose)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-hw-004',
  '이터널 선샤인 (Eternal Sunshine of the Spotless Mind)',
  '영화',
  '로맨스/SF',
  '미셸 공드리 감독, 찰리 카우프만 각본. 헤어진 연인이 서로의 기억을 지우는 시술을 받는 이야기. 기억과 사랑의 본질 탐구.',
  '기억을 지워도 같은 사람에게 끌린다는 결말을 어떻게 해석해? 아픈 기억도 지우지 말아야 할까?',
  '{"high-lens": "기억 삭제 과정에서 조엘이 저항하는 건 합리적 판단이 아니라 감정적 각성이다. 논리적으로는 고통을 지우는 게 효율적이지만, 감정의 비합리적 집착이 인간 관계의 본질임을 논증한다.", "low-lens": "기억이 사라지는 장면에서 너무 슬펐어. 사랑했던 순간들이 사라지는 게 진짜 가슴 아프더라.", "high-taste": "찰리 카우프만의 비선형 서사와 공드리의 수공예적 시각 효과가 만나 할리우드 로맨스의 문법을 완전히 해체했다. 독립영화의 감수성으로 만든 SF 로맨스의 정수.", "low-taste": "좀 난해했는데 결국 사랑 이야기잖아. 짐 캐리가 진지한 연기하는 게 신기했어.", "high-purpose": "기억 삭제는 현대인의 감정 회피 문화에 대한 은유다. 고통 없는 사랑은 불가능하며, 상처를 포함한 전체 경험이 관계의 의미를 구성한다는 실존적 메시지.", "low-purpose": "예쁜 러브스토리. 결국 다시 만나니까 해피엔딩이지!"}',
  'HARD',
  ARRAY['lens', 'taste', 'purpose'],
  1, true, NOW(), NOW()
);

-- 9. Mad Max: Fury Road (EASY / taste, scope, stance)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-hw-005',
  '매드맥스: 분노의 도로 (Mad Max: Fury Road)',
  '영화',
  '액션/SF',
  '조지 밀러 감독. 핵전쟁 이후 황무지에서 벌어지는 추격전. 실제 스턴트 중심의 액션 연출. 아카데미 6관왕.',
  '이 영화가 "단순한 액션 영화"라는 평가에 대해 어떻게 생각해? 퓨리오사의 역할은?',
  '{"high-taste": "2시간짜리 추격 시퀀스를 장편 서사로 성립시킨 것 자체가 영화 문법의 실험이다. CGI 시대에 실물 스턴트를 고집한 건 디지털 피로에 대한 아날로그 반란.", "low-taste": "액션 영화는 역시 이런 거지! 폭발, 추격, 시원시원해서 좋았어.", "high-scope": "이모탄 조의 물 독점 체제, 워보이즈의 종교적 세뇌, 우유 착취 시스템, 씨앗 할머니들의 저항 등 최소한의 대사로 완성도 높은 세계관을 구축했다.", "low-scope": "사막에서 차 타고 쫓고 쫓기는 거. 심플하고 화끈해서 좋아!", "high-stance": "페미니즘 영화라는 해석에 동의하지만, 맥스가 조력자로 전락한 건 원작 팬으로서 아쉽다. 퓨리오사의 서사가 강력한 만큼 맥스의 존재 이유가 희미해졌다.", "low-stance": "퓨리오사 멋있었어! 맥스도 쿨하고. 다 좋았어!"}',
  'EASY',
  ARRAY['taste', 'scope', 'stance'],
  1, true, NOW(), NOW()
);

-- 10. The Grand Budapest Hotel (MEDIUM / taste, scope, lens)
INSERT INTO "golden_samples" (
  "id", "contentTitle", "contentType", "genre", "description",
  "testQuestion", "expectedReactions", "difficultyLevel",
  "validationDimensions", "version", "isActive", "createdAt", "updatedAt"
) VALUES (
  'gs-hw-006',
  '그랜드 부다페스트 호텔 (The Grand Budapest Hotel)',
  '영화',
  '코미디/드라마',
  '웨스 앤더슨 감독. 전설적 호텔 컨시어지 구스타브와 로비보이 제로의 모험. 독특한 대칭 구도와 색채 미학.',
  '웨스 앤더슨의 스타일에 대해 어떻게 생각해? 이 영화가 동화 같은 외형 뒤에 담고 있는 이야기는 뭘까?',
  '{"high-taste": "4:3, 16:9, 2.35:1 화면비를 시간대별로 전환하는 건 형식이 곧 서사가 되는 앤더슨적 실험의 정점이다. 대칭 구도는 질서에 대한 집착이자 붕괴하는 세계에 대한 저항.", "low-taste": "색감이 예쁘긴 한데 좀 과하지 않아? 영화가 인형의 집 같아서 몰입이 좀 안 됐어.", "high-scope": "액자식 3중 구조(작가-노인 제로-젊은 제로)가 기억의 왜곡과 미화를 구조적으로 보여준다. 멘들 케이크, 보이스카우트, 교도소 탈출 등 각 에피소드가 톤은 가볍지만 서사 기능은 정밀하다.", "low-scope": "구스타브 아저씨 캐릭터가 매력적이야. 레이프 파인스 연기 최고!", "high-lens": "유럽 문명의 몰락을 다루면서도 감상에 빠지지 않는다. 구스타브의 예의와 품격은 사라져가는 세계에 대한 비가(悲歌)이며, 유머는 슬픔의 방어기제다.", "low-lens": "제로랑 구스타브 우정이 감동적이었어. 마지막에 좀 슬프기도 하고."}',
  'MEDIUM',
  ARRAY['taste', 'scope', 'lens'],
  1, true, NOW(), NOW()
);
