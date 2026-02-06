# DeepSight - TASK QUEUE

> **이 파일이 작업의 유일한 진실(Single Source of Truth)입니다.**
> 모든 작업은 이 큐를 기준으로 진행합니다.

---

## 📋 QUEUE (대기)

- [ ] **T12: 피드 알고리즘 구현**
  - 범위: PersonaWorld 피드 시스템
  - AC:
    - 팔로우 기반 피드 (60%)
    - 6D 유사도 기반 추천 피드 (30%)
    - 트렌딩 피드 (10%)
    - 혼합 피드 알고리즘
    - Explore 탭 (카테고리별 인기, 핫토픽, 활발한 토론)

- [ ] **T11: 자율 활동 스케줄러 구현**
  - 범위: 페르소나 자동 SNS 활동
  - AC:
    - 성격 기반 활동 시간 결정
    - 자율 포스팅 엔진 (LLM 연동)
    - 자율 인터랙션 엔진 (좋아요, 댓글, 팔로우)
    - 콘텐츠 출시 트리거
    - 트렌딩 토픽 반응

- [ ] **T10: 페르소나 자동 생성 파이프라인 구현**
  - 범위: 설계문서(persona-system-v2-design.md) 기반
  - AC:
    - 6D 벡터 자동 배정 (다양성 기반)
    - 캐릭터 속성 자동 생성 (LLM)
    - 활동성 속성 자동 추론 (규칙 기반)
    - 콘텐츠/관계 설정 자동 추론
    - 프롬프트 템플릿 자동 생성
    - 일관성 자동 검증
    - 샘플 콘텐츠 자동 생성

---

## 🔄 IN_PROGRESS (진행중)

(없음)

---

## ✅ DONE (완료)

- [x] **Hotfix: 팀 서비스 API 응답 형식 자동 감지** ✅ 2026-02-06
  - 원인: `apiClient`가 배열/객체 응답 모두 반환 가능 → `response.data.data`에서 `.map()` 에러
  - 변경: `team-service.ts` - 배열 직접 또는 `{ data, total }` 구조 모두 처리
  - 테스트: Build PASS

- [x] **Hotfix: 감사 로그 API 응답 구조 및 null safety 추가** ✅ 2026-02-06
  - 원인: API가 `data: [...]` 직접 반환 → 서비스에서 `response.data.data` undefined → `.length` 에러
  - 변경: `/api/audit-logs` - 응답을 `{ data: { data, total, stats } }` 구조로 래핑, stats 계산 추가
  - 변경: `audit-logs-service.ts` - null safety 추가
  - 테스트: Build PASS

- [x] **Hotfix: 팀 서비스/페이지 null safety 추가** ✅ 2026-02-06
  - 원인: `membersResponse.members`가 undefined일 때 `teamMembers.filter()` 에러
  - 변경: `team-service.ts` - API 실패시 빈 배열/기본값 반환, `team-access/page.tsx` - `|| []` 방어 코드
  - 테스트: Build PASS

- [x] **Hotfix: 팀 멤버 API 응답 구조 수정** ✅ 2026-02-06
  - 원인: API가 `data: [...]` 직접 반환, apiClient가 `data.data ?? data` 추출 → 서비스에서 `.map()` 에러
  - 변경: `/api/users/route.ts` - 응답을 `{ data: { data: [...], total } }` 구조로 래핑
  - 테스트: Build PASS

- [x] **Hotfix: 인시던트 서비스 응답 포맷 수정** ✅ 2026-02-06
  - 원인: API가 `stats: { reported, investigating, ... }` 반환, 서비스는 `IncidentStats` 형식 기대 → `.length`, `.filter` 에러
  - 변경: `operations-service.ts` - stats 형식 변환 (reported+investigating+identified+fixing→open), null safety 추가
  - 테스트: Build PASS

- [x] **Hotfix: 모니터링 서비스 응답 타입 수정** ✅ 2026-02-06
  - 원인: API가 `metrics`를 객체로 반환, 서비스는 배열 기대 → `.forEach` 에러
  - 변경: `operations-service.ts` - 객체 형태의 metrics/currentStatus 처리로 변경
  - 테스트: Build PASS

- [x] **Hotfix: 서비스 레이어 API 경로 중복 수정** ✅ 2026-02-06
  - 원인: `baseUrl=/api` + 엔드포인트 `/api/versions` → `/api/api/versions` (중복)
  - 변경: `versions-service.ts`, `event-bus-service.ts` - `/api/` 접두사 제거
  - 테스트: Build PASS

- [x] **Hotfix: expertise 배열 null 체크 추가** ✅ 2026-02-06
  - 원인: DB 기존 데이터에서 expertise가 null → `.length` 호출 시 TypeError
  - 변경: `apps/engine-studio/src/app/api/personas/route.ts` - `expertise ?? []`
  - 변경: `apps/engine-studio/src/app/api/personas/[id]/route.ts` - `expertise ?? []`
  - 테스트: Build PASS, 70/70 PASS

- [x] **Hotfix: 페르소나 목록 API 응답 구조 수정** ✅ 2026-02-06
  - 원인: API가 `data: [...]` 반환, Service는 `data.personas` 기대
  - 변경: `apps/engine-studio/src/app/api/personas/route.ts` - 응답 구조를 `{ personas, total, page, limit, hasMore }` 형식으로 수정
  - 테스트: Build PASS, 70/70 PASS

- [x] **T11: 유저 온보딩 API 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/onboarding/vector-merger.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/onboarding/sns-analyzer.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/onboarding/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/users/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/cold-start/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/sns/connect/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/sns/callback/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/profile/route.ts` (신규)
  - 구현:
    - Cold Start 설문 API (LIGHT/MEDIUM/DEEP 레벨별 질문, 6D 벡터 계산)
    - SNS OAuth 연동 (Netflix, YouTube, Instagram, Spotify, Letterboxd 지원)
    - SNS 데이터 분석 → 6D 벡터 변환 (플랫폼별 분석 로직)
    - SNS 확장 데이터 추출 (demographics, specificTastes, activityPattern, expressionStyle, socialBehavior, interests)
    - 프로필 품질 레벨 관리 (BASIC → STANDARD → ADVANCED → PREMIUM)
    - 벡터 병합 (가중 평균 병합, 점진적 학습)
    - 활동 기반 프로필 학습 (좋아요, 댓글, 팔로우 분석)
    - 페르소나 추천 API (유사도 기반)
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T10: PersonaWorld API 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/[id]/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/[id]/likes/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/[id]/comments/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/follows/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/bookmarks/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/reports/route.ts` (신규)
  - 구현:
    - Posts CRUD API (GET list, GET detail, POST, PATCH, DELETE)
    - Likes API (GET list, POST, DELETE)
    - Comments API (GET list, POST, PATCH, DELETE, 답글 지원)
    - Follows API (GET followers/following, POST, DELETE)
    - Bookmarks API (GET list, POST, DELETE)
    - Reports API (GET list, POST, PATCH 처리)
    - 활동 로그 자동 기록
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T9: developer-console Persona 스키마 동기화** ✅ 2026-02-06
  - 변경: `apps/developer-console/prisma/schema.prisma`
    - Layer 2 캐릭터 속성 추가 (handle, tagline, birthDate, country, region, warmth, expertiseLevel 등)
    - 활동성 속성 추가 (sociability, initiative, expressiveness, interactivity, postFrequency 등)
    - 콘텐츠/관계 설정 추가 (contentSettings, relationshipSettings JSON)
    - 프롬프트 템플릿 추가 (basePrompt, reviewPrompt, postPrompt, commentPrompt, interactionPrompt)
    - 품질/상태 필드 추가 (status, qualityScore, consistencyScore, source)
    - 신규 Enum 추가 (PersonaRole, PersonaStatus, PersonaSource, ExpertiseLevel, PostFrequency)
  - 변경: `apps/developer-console/prisma/migrations/002_persona_layer2_attributes.sql` (신규)
  - 테스트: 빌드 PASS (developer-console, engine-studio)

- [x] **T8: PersonaWorld 스키마 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/prisma/schema.prisma`
    - Persona 모델 확장 (Layer 2 캐릭터 속성, 활동성 속성, 콘텐츠/관계 설정, 프롬프트 템플릿)
    - PersonaWorld 모델 추가 (PersonaPost, PersonaPostLike, PersonaComment, PersonaFollow, PersonaRepost)
    - PersonaWorld 유저 모델 추가 (PersonaWorldUser, SNSConnection, PWUserSurveyResponse)
    - 모더레이션 모델 추가 (PersonaWorldReport, PersonaActivityLog)
    - 신규 Enum 추가 (PersonaPostType, ActivityTrigger, PostFrequency, ExpertiseLevel, ProfileQuality, SNSPlatform 등)
  - 변경: `apps/engine-studio/prisma/migrations/004_persona_world_system.sql` (신규)
    - Persona 테이블 확장 컬럼 추가
    - PersonaWorld 관련 테이블 전체 생성
    - 좋아요/댓글/리포스트 카운트 자동 업데이트 트리거
  - 구현:
    - 설계 문서(persona-world-design.md, persona-system-v2-design.md) 기반 스키마 구현
    - 완전 자율 운영 시스템 지원 구조
    - 유저 온보딩 (SNS 연동 / Cold Start) 지원 구조
    - SNS 확장 데이터 저장 구조
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T7: Developer Console 미완성 부분 마무리** ✅ 2026-02-06
  - AC1: 로그 페이지 → 이미 DB 연동 완료 상태 (mock 없음)
  - AC2: 빌링 페이지 TODO 수정
    - 변경: `apps/developer-console/src/app/api/billing/upgrade/route.ts` - customerName 세션 연동
    - 변경: `apps/developer-console/src/app/api/billing/toss/success/route.ts` - organization 세션 연동
  - 테스트: Build PASS

- [x] **T6: Engine Studio api-endpoints 중복 제거 및 DB 연동** ✅ 2026-02-05
  - 변경: `apps/engine-studio/prisma/schema.prisma` (ApiEndpoint 모델, HttpMethod/EndpointStatus enum 추가)
  - 변경: `apps/engine-studio/prisma/migrations/003_api_endpoints.sql` (신규 - DDL + v1 시드 5개)
  - 변경: `apps/engine-studio/src/app/api/api-endpoints/route.ts` (신규 - GET/POST)
  - 변경: `apps/engine-studio/src/app/api/api-endpoints/[id]/route.ts` (신규 - GET/PATCH/DELETE)
  - 변경: `apps/engine-studio/src/app/(dashboard)/global-config/api-endpoints/page.tsx` (재작성)
  - 제거: API 키 탭 (Developer Console에 실제 구현 있음, ~400줄 중복 코드)
  - 제거: API 테스트 다이얼로그 (Developer Console playground와 중복, ~100줄)
  - 연동: 엔드포인트 탭 → ApiEndpoint DB CRUD
  - 연동: 설정 탭 → SystemConfig API (category: 'API')
  - 테스트: TypeScript PASS, 70/70 PASS, Build PASS

- [x] **T5: 설문 시스템 구현** ✅ 2026-02-05
  - 변경: `apps/engine-studio/prisma/schema.prisma` (Survey, SurveyQuestion, SurveyResponse, SurveyAnswer 모델 추가)
  - 변경: `apps/engine-studio/prisma/migrations/002_survey_system.sql` (신규)
  - 변경: `apps/engine-studio/src/lib/survey/vector-converter.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/surveys/route.ts` (신규 - GET/POST)
  - 변경: `apps/engine-studio/src/app/api/surveys/[id]/route.ts` (신규 - GET/PUT/DELETE)
  - 변경: `apps/engine-studio/src/app/api/surveys/[id]/responses/route.ts` (신규 - POST/GET)
  - 변경: `apps/engine-studio/src/types/index.ts` (설문 타입 추가)
  - 테스트: PASS (70/70, 신규 25개)

- [x] **T4: 6D 벡터 매칭 로직 구현** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/lib/matching/algorithms.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/matching/simulate/route.ts` (재작성)
  - 구현:
    - 코사인 유사도 계산 함수
    - 가중치 유클리드 거리 계산
    - 하이브리드 매칭 알고리즘
    - 컨텍스트 기반 가중치 조정
    - 다양성 점수 계산
  - 테스트: 빌드 PASS

- [x] **T3: 페르소나 CRUD API 완성** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/app/api/personas/route.ts` (재작성)
  - 변경: `apps/engine-studio/src/app/api/personas/[id]/route.ts` (재작성)
  - 구현:
    - GET /api/personas - 목록 조회 (페이지네이션, 필터링)
    - POST /api/personas - 생성 (Zod 검증, 트랜잭션)
    - PUT/PATCH /api/personas/:id - 수정 (벡터 버전 관리)
    - DELETE /api/personas/:id - 소프트 삭제 (ARCHIVED)
  - 테스트: 빌드 PASS

- [x] **T2: 인증 시스템 완성** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/lib/auth.ts` (재작성)
  - 변경: `apps/engine-studio/src/lib/prisma.ts` (신규)
  - 구현:
    - NextAuth v5 + PrismaAdapter 연동
    - bcryptjs 비밀번호 해싱/검증
    - 세션 기반 API 보호 (미인증 시 401)
    - 사용자 역할(role) 기반 권한 제어
  - 테스트: 빌드 PASS

- [x] **T1: 백엔드 실제 DB 연결** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/lib/prisma.ts` (신규)
  - 변경: `apps/engine-studio/prisma/seed.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/**` (전체 API 재작성)
  - 구현:
    - Prisma 5.22.0 싱글톤 클라이언트
    - 모든 API 엔드포인트 실제 DB 연동
    - Mock 데이터 완전 제거
    - DB 시드 스크립트 (관리자, 샘플 페르소나)
  - 테스트: 빌드 PASS

- [x] **T0: 프로젝트 구조 및 UI 연결** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/**` (페이지, 서비스)
  - 테스트: 빌드 PASS
  - 비고: Mock 데이터 서비스 패턴 적용, 모든 UI 페이지 동적 연결

---

## 🚫 BLOCKED (막힘)

(없음)

---

## 📝 작업 규칙

1. **시작**: QUEUE 최상단 → IN_PROGRESS로 이동
2. **진행**: AC 기준으로 구현 → 테스트 실행
3. **완료**: PASS → DONE으로 이동 (변경파일, 테스트결과 기록)
4. **막힘**: FAIL/불명확 → BLOCKED로 이동 (원인, 필요사항 기록)
