# DeepSight - TASK QUEUE

> **이 파일이 작업의 유일한 진실(Single Source of Truth)입니다.**
> 모든 작업은 이 큐를 기준으로 진행합니다.

---

## 📋 QUEUE (대기)

- [ ] **T1: 백엔드 실제 DB 연결**
  - AC: Mock 데이터 대신 실제 Prisma DB 연결
  - AC: Supabase PostgreSQL 설정 완료
  - AC: 기존 API 엔드포인트가 DB와 연동
  - AC: 개발 환경에서 CRUD 동작 확인

- [ ] **T2: 인증 시스템 완성**
  - AC: NextAuth 로그인/로그아웃 동작
  - AC: 세션 기반 API 보호 (미인증 시 401)
  - AC: 사용자 정보 세션에서 조회 가능
  - AC: 테스트 PASS

- [ ] **T3: 페르소나 CRUD API 완성**
  - AC: GET /api/personas - 목록 조회 (페이지네이션)
  - AC: POST /api/personas - 생성
  - AC: PATCH /api/personas/:id - 수정
  - AC: DELETE /api/personas/:id - 삭제
  - AC: 통합 테스트 PASS

- [ ] **T4: 6D 벡터 매칭 로직 구현**
  - AC: 코사인 유사도 계산 함수 구현
  - AC: 사용자 벡터 → 페르소나 매칭 함수
  - AC: 유닛 테스트 커버리지 90%+
  - AC: 매칭 결과에 점수 포함

- [ ] **T5: 설문 시스템 구현**
  - AC: 설문 생성/수정/삭제 API
  - AC: 설문 응답 제출 API
  - AC: 응답 → 6D 벡터 변환 로직
  - AC: 테스트 PASS

---

## 🔄 IN_PROGRESS (진행중)

(없음)

---

## ✅ DONE (완료)

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
