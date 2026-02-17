# Cold-Start 질문 v3 업그레이드 계획

## 현재 상태 진단

### 핵심 문제

1. **60문항 모두 L1만 측정** — L2(OCEAN) 가중치가 전혀 없음
2. **L3(Narrative Drive) 완전 부재** — lack, moralCompass, volatility, growthArc = 항상 0
3. **sociability(7번째 L1) 미존재** — v2 6D 시스템
4. **모순값(EPS) 계산 불가** — L2가 항상 0.5 → paradox score 무의미
5. **질문 품질 낮음** — 단일 차원 직접 측정, 슬라이더 반복, 고심 없이 즉답 가능

### 결과적으로

- EPS 엔진 (paradox.ts), 83-축 교차분석 (cross-axis.ts), V_Final 압박 블렌딩 전부 **사실상 작동 불능**
- 32종 아키타입의 paradoxPattern 매칭이 무의미

## 목표

**24문항 (8+8+8)으로 L1 7D + L2 5D + L3 4D + Paradox 7쌍을 모두 측정**

- Phase 1 (8Q): L1 Primary + L2 Secondary → 표면 페르소나 + 심리 기질 동시 측정
- Phase 2 (8Q): L2 Primary + L3 Probe → 심리 기질 확정 + 내면 서사 탐색
- Phase 3 (8Q): Paradox Detection + Cross-Validation → 모순 확인 + 벡터 보정

### 질문 설계 원칙

1. **시나리오 기반 복합 질문**: 각 질문이 L1+L2(+L3) 동시 측정 (4-bit/Q)
2. **모순 유발 구조**: 선택지 안에 "겉으로는 A지만 속으로는 B" 패턴 내장
3. **깊이 있는 딜레마**: 1분 정도 고심해야 하는 가치 충돌 시나리오
4. **4지선다 필수**: 모든 질문 객관식 4개 옵션 (슬라이더 제거)

## 변경 범위

### Step 1: 타입 확장 — L3 지원 추가

**파일**: `onboarding/questions.ts`

- `OnboardingQuestionOption`에 `l3Weights` 필드 추가
- `computeL3Vector()` 함수 신규 작성
- `crossValidate()` → `crossValidateWithParadox()` 확장: 7쌍 모순 + EPS 계산

### Step 2: Seed Data 전면 교체 — 24문항 v3 하이브리드

**파일**: `prisma/seed-data/cold-start-questions.ts`

기존 60문항 → 24문항 교체. 구조 변경:

- `QuestionSeed` 타입에 l1Weights, l2Weights, l3Weights 추가
- LIGHT/MEDIUM/DEEP → Phase 1/2/3 매핑 유지
- 절대값(0.1~0.95) → delta(-0.4~+0.4) 방식으로 전환

#### Phase 1 질문 설계 (8Q): L1 + L2 동시 측정

| Q   | 주요 시나리오                     | L1 Primary  | L2 Secondary         | 모순 쌍                   |
| --- | --------------------------------- | ----------- | -------------------- | ------------------------- |
| 1   | 밤새 파고들기 vs 넓게 훑기 딜레마 | depth       | openness             | depth↔openness            |
| 2   | 감정 vs 논리 판단 갈림길          | lens        | neuroticism          | lens↔neuroticism          |
| 3   | 친구의 나쁜 작품 리뷰 대응        | stance      | agreeableness        | stance↔agreeableness      |
| 4   | 완벽 계획 vs 즉흥 탐색            | scope       | conscientiousness    | scope↔conscientiousness   |
| 5   | 안전한 선택 vs 미지의 모험        | taste       | openness             | taste↔openness            |
| 6   | 목표 달성 vs 과정 즐기기          | purpose     | conscientiousness    | purpose↔conscientiousness |
| 7   | 혼자 vs 함께 콘텐츠 경험          | sociability | extraversion         | sociability↔extraversion  |
| 8   | 종합 가치관 딜레마                | depth+lens  | neuroticism+openness | 교차 검증                 |

#### Phase 2 질문 설계 (8Q): L2 확정 + L3 탐색

| Q   | 주요 시나리오                    | L2 Primary               | L3 Probe     | 내면 서사            |
| --- | -------------------------------- | ------------------------ | ------------ | -------------------- |
| 9   | 미지의 경험에 대한 두려움과 끌림 | openness                 | lack         | 결핍이 만드는 호기심 |
| 10  | 규칙 파괴의 유혹                 | conscientiousness        | moralCompass | 도덕적 경계          |
| 11  | 에너지 소진 후 회복 방식         | extraversion             | volatility   | 감정 폭발성          |
| 12  | 관계 속 자기 포기                | agreeableness            | lack         | 결핍이 만드는 순응   |
| 13  | 실패 후 반응 패턴                | neuroticism              | growthArc    | 불안이 만드는 성장   |
| 14  | 금지된 콘텐츠의 유혹             | openness+taste           | moralCompass | 도덕 vs 호기심       |
| 15  | 성장 vs 안정 갈림길              | conscientiousness        | growthArc    | 변화의 방향          |
| 16  | 감정적 폭발 순간                 | neuroticism+extraversion | volatility   | 감정 불안정성        |

#### Phase 3 질문 설계 (8Q): Paradox Detection

| Q   | 모순 탐지 대상                     | 설계 의도                                   |
| --- | ---------------------------------- | ------------------------------------------- |
| 17  | depth↔openness                     | 깊이 파지만 새것에 폐쇄적? → 지적 역설      |
| 18  | lens↔neuroticism                   | 논리적이지만 내면 불안? → 감성/불안 역설    |
| 19  | stance↔agreeableness               | 비판적이지만 착한? → 츤데레 역설            |
| 20  | scope↔conscientiousness            | 디테일하지만 게으른? → 게으른 완벽주의자    |
| 21  | taste↔openness                     | 실험적이지만 보수적? → 보수적 힙스터        |
| 22  | purpose↔conscientiousness          | 의미 추구하지만 실천 안함? → 목표/실천 역설 |
| 23  | sociability↔extraversion           | 사교적이지만 내향적? → 사교적 내향인        |
| 24  | L3 통합: lack+volatility+growthArc | 서사 벡터 최종 보정                         |

### Step 3: 벡터 산출 로직 업그레이드

**파일**: `onboarding/questions.ts`

- `computeL3Vector()` 추가
- `crossValidate()` 확장:
  - 7쌍 L1↔L2 역설 검증 (기존 3쌍 → 7쌍)
  - EPS 계산 연동 (paradox.ts 활용)
  - L3 벡터 산출 및 반환

### Step 4: Onboarding Engine 확장

**파일**: `onboarding/onboarding-engine.ts`

- `OnboardingResult`에 `l3Vector`, `paradoxProfile` 추가
- DEEP 모드: L3 벡터 + EPS 계산 결과 반환

### Step 5: 테스트 작성

- 24문항 벡터 산출 정합성 테스트
- 극단적 응답 패턴 (전부 A, 전부 D, 교차)의 EPS 범위 확인
- 모순 유발 응답의 paradox score > 0.3 확인

## 작업 순서

1. Step 1: 타입 확장 (questions.ts)
2. Step 2: 24문항 시드 데이터 작성 (cold-start-questions.ts)
3. Step 3: 벡터 산출 로직 (questions.ts)
4. Step 4: Onboarding Engine (onboarding-engine.ts)
5. Step 5: 테스트
6. 검증: `pnpm validate`
