# DeepSight - TASK QUEUE

> **이 파일이 작업의 유일한 진실(Single Source of Truth)입니다.**
> 모든 작업은 이 큐를 기준으로 진행합니다.

---

## 📋 QUEUE (대기)

(없음)

---

## 🔄 IN_PROGRESS (진행중)

(없음)

---

## ✅ DONE (완료)

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
