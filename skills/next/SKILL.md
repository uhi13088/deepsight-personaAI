# next - 다음 작업 진행

TASK.md를 확인하고 다음 작업을 진행합니다.

## 트리거

- 사용자가 "다음 작업", "next", "작업 시작" 등을 요청할 때
- 현재 진행 중인 작업이 없을 때

## 실행 순서

### Step 1: 컨텍스트 로드

1. `TASK.md` 읽기 - 현재 상태 파악
2. `tasks/lessons.md` 읽기 - 과거 교훈 확인 (같은 실수 방지)
3. `CLAUDE.md` 규칙 재확인
4. API 작업이 포함된 티켓이면 → `docs/api/*.md` 읽기

### Step 2: 작업 선택

- IN_PROGRESS에 티켓이 있는가?
  - **있으면** -> 해당 티켓 계속 진행
  - **없으면** -> QUEUE 최상단 티켓을 IN_PROGRESS로 이동

### Step 3: 티켓 품질 검증

- `references/ticket-quality-checklist.md` 기준으로 현재 티켓 검증
- AC가 부족하면 → 작업 시작 전 사용자에게 보완 요청

### Step 4: Plan 수립

- AC(Acceptance Criteria) 확인
- 3단계 이상 또는 아키텍처 결정 필요 시 **반드시 Plan 먼저**
- Plan이 AC를 충족하는지 스스로 검증 후 구현 시작
- `lessons.md`의 관련 카테고리(API, Style, Testing 등) 교훈을 Plan에 반영

### Step 5: 구현

- 단계별로 구현
- 각 단계마다 테스트 실행
- 막히면 -> **즉시 멈추고 재계획** (밀어붙이지 않기)

### Step 6: 완료 처리

- 모든 AC 충족 + 테스트 PASS 확인
- "Staff Engineer가 승인할 코드인가?" 자문
- API 변경이 있었다면 → `docs/api/*.md` 및 `*.openapi.yaml` 최신화
- TASK.md 업데이트:
  ```
  - [x] **T#: 티켓제목** ✅ 날짜
    - 변경: 파일 목록
    - 테스트: PASS (n/n)
  ```
- IN_PROGRESS -> DONE으로 이동

### Step 7: 막힘 처리 (해당 시)

- 테스트 FAIL 또는 요구사항 불명확 시
- TASK.md에 기록:
  ```
  - [ ] **T#: 티켓제목** 🚫
    - 원인:
    - 필요:
    - 시도:
  ```
- IN_PROGRESS -> BLOCKED로 이동
- 멈추고 사용자에게 보고

## 출력

- 현재 진행 중인 티켓
- 다음 액션
- (완료 시) 변경 요약

## 성공 기준

- AC 전체 충족
- 테스트 PASS
- TASK.md 상태 업데이트 완료
- lessons.md 교훈이 반영됨
- API 변경 시 docs/api/ 문서 동기화 완료
