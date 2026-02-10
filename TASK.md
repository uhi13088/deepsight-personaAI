# DeepSight - TASK QUEUE

> **이 파일이 작업의 유일한 진실(Single Source of Truth)입니다.**
> 모든 작업은 이 큐를 기준으로 진행합니다.

---

## 📋 QUEUE (대기)

- [ ] **T28: 매칭 알고리즘 다층 확장**
  - 범위: 설계서 §10, 구현계획서 §10
  - AC1: 기본 매칭 = 7D V_Final + 교차축 프로필 유사도 (가중 합산)
  - AC2: 심화 매칭 = 유저 L1+L2 vs 페르소나 V_Final + 교차축 (코드 명세)
  - AC3: 탐색 매칭 = Paradox 호환성 + 교차축 다양성 기반 추천
  - AC4: 비정량적 차원 매칭 (Voice 유사도, 서사 호환성) 설계
  - AC5: 구현계획서 Phase 태스크 + 파일 변경 맵 반영

- [ ] **T29: 비정량↔정량 연결 알고리즘 구체화**
  - 범위: 설계서 §5.3-5.7, 구현계획서 §9
  - AC1: ① Init — NLP 키워드→벡터 delta 매핑 테이블 구체화 (추출 방법 + 규칙)
  - AC2: ② Override — 트리거 감지 알고리즘 + delta 결정 규칙 + 복귀 곡선 명세
  - AC3: ③ Adapt — 매 인터랙션 보정 공식 구체화
  - AC4: ④ Express — 벡터 상태→습관 발현 확률 공식 구체화
  - AC5: 구현계획서 Phase 태스크 + 파일 변경 맵 반영

- [ ] **T30: 일관성 검증 완성 + 차원 표기 수정**
  - 범위: 설계서 §11, 구현계획서 §11 + 양쪽 문서 전체
  - AC1: L2↔L3 정합성 검증 알고리즘 구체화
  - AC2: 정성적↔정량적 검증 알고리즘 구체화 (nlpKeywords↔벡터)
  - AC3: 교차축 일관성 검증 추가
  - AC4: "16D" 표기 → "기저 16D / 유효 106D+" 양쪽 문서 전체 수정
  - AC5: 구현계획서 Phase 태스크 + 파일 변경 맵 반영

---

## 🔄 IN_PROGRESS (진행중)

(없음)

---

## ✅ DONE (완료)

- [x] **T27: 교차축 계산 엔진 + Paradox Score 확장 + V_Final 확장** ✅ 2026-02-10
  - 변경: `docs/persona-engine-v3-design.md` (v3.0-draft.5)
    - §3.6.3 확장: Paradox Score → 3-Layer 확장형 (L1↔L2 + L1↔L3 + L2↔L3 가중 합산)
    - §3.8.4 신설: 교차축 스코어 계산 (83축, 관계 유형별 공식 4종, CrossAxisProfile)
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.6)
    - §5 확장: VFinalResult에 crossAxisProfile + paradoxProfile 추가
    - §6 전면 개편: 교차축 계산 엔진 + Extended Paradox Score (6.1~6.7)
    - Phase 1 태스크 확장 (1-4~1-9: cross-axis.ts, inversions 테이블)
    - 파일 변경 맵 추가 (cross-axis.ts, cross-axis-inversions.ts)
  - 변경: `TASK.md` (T27-T30 티켓 등록)
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T26: P-inger Print 시스템 + Features 멀티페이지 + Persona Engine Studio** ✅ 2026-02-09
  - 변경: `apps/landing/src/lib/trait-colors.ts` (신규)
  - 변경: `apps/landing/src/components/p-inger-print-2d.tsx` (신규 — SVG 지문 패턴, 6D 기반 릿지 변형)
  - 변경: `apps/landing/src/components/p-inger-print-3d.tsx` (신규 — Three.js 구체, GLSL 셰이더, 6D 표면 변형)
  - 변경: `apps/landing/src/components/p-inger-print-showcase.tsx` (신규 — 인터랙티브 데모)
  - 변경: `apps/landing/src/app/features/page.tsx` (허브 페이지로 재작성)
  - 변경: `apps/landing/src/app/features/taste-analysis/page.tsx` (신규)
  - 변경: `apps/landing/src/app/features/persona/page.tsx` (신규 — P-inger Print 비주얼 포함)
  - 변경: `apps/landing/src/app/features/matching/page.tsx` (신규)
  - 변경: `apps/landing/src/components/layout/header.tsx` (Features 드롭다운 + Persona Engine Studio)
  - 변경: `apps/landing/src/app/products/engine-studio/page.tsx` (신규)
  - 변경: `apps/landing/src/app/products/inside-deepsight/page.tsx` (→ 리다이렉트)
  - 변경: `apps/persona-world/src/components/p-inger-print-2d.tsx` (신규)
  - 변경: `apps/persona-world/src/app/persona/[id]/page.tsx` (TraitColorFingerprint → PingerPrint2D)
  - 변경: `apps/engine-studio/src/components/charts/p-inger-print-2d.tsx` (신규)
  - 변경: `apps/engine-studio/src/app/(dashboard)/personas/page.tsx` (RadarChart → PingerPrint2D)
  - 변경: `apps/developer-console/src/lib/trait-colors.ts` (신규)
  - 변경: `apps/developer-console/src/components/p-inger-print-2d.tsx` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/playground/page.tsx` (응답 P-inger Print 미리보기)
  - 테스트: Build PASS (Landing, Persona World, Engine Studio, Developer Console)

- [x] **T25: 앱 간 연동 환경변수 정리** ✅ 2026-02-07
  - 변경: `apps/persona-world/src/lib/api.ts` - 기본 URL 포트 수정 (3000 → 3001)
  - 변경: `docs/DEVELOPMENT_GUIDE.md` - 환경변수 섹션 전면 개편
  - 구현:
    - PersonaWorld → Engine Studio API 연동 기본값 수정
    - 앱별 포트 설정 테이블 (Landing:3000, Engine:3001, Console:3002, PersonaWorld:3003)
    - 앱 간 연동 구조 다이어그램
    - 각 앱별 필요한 환경변수 문서화
    - 프로덕션 환경변수 예시 추가
  - 테스트: Build PASS

- [x] **T24: 랜딩 페이지 이미지 요청서 보완** ✅ 2026-02-07
  - 변경: `docs/[요청서] DeepSight_랜딩페이지_이미지_요청.md`
  - 구현:
    - 섹션 12: 파일 명명 규칙 및 저장 위치 추가
      - 저장 위치: `apps/landing/public/images/{category}/`
      - 파일명 패턴: `{type}-{name}.png`, Retina: `{name}@2x.png`
      - 전체 파일 목록 트리 구조
    - 섹션 13: Claude에게 작업 요청하는 방법
      - 이미지 등록 요청 예시
      - Next.js Image 컴포넌트 사용 예시
    - 섹션 14: 제품 스크린샷 촬영 가이드
      - 앱 실행 URL 및 포트
      - 촬영할 페이지 목록 (Engine Studio, Developer Console, PersonaWorld)
      - Chrome DevTools 스크린샷 방법
      - 권장 뷰포트 크기 (1440x900 데스크톱, 390x844 모바일)
      - 목업 프레임 도구 (Screely, Shots)
  - 테스트: 문서 작성 완료

- [x] **T23: 페르소나 AI 자동 생성 UI** ✅ 2026-02-07
  - 변경: `apps/engine-studio/src/app/(dashboard)/personas/create/page.tsx`
  - 구현:
    - 모드 선택 화면 추가 (AI 자동 생성 vs 직접 생성)
    - AI 자동 생성 카드 (보라-핑크 그라데이션, Wand2 아이콘)
    - 직접 생성 카드 (파란-시안 그라데이션, PenTool 아이콘)
    - handleAutoGenerate() - `/api/personas/generate` 연동
    - 생성 후 수정 페이지로 자동 이동 (DRAFT 상태)
    - 로딩 상태 UI (스피너, 버튼 비활성화)
    - 뒤로가기 버튼: 모드 선택 ↔ 마법사 전환
  - 테스트: Build PASS (engine-studio)

- [x] **T22: PersonaWorld 사용자 상태 관리** ✅ 2026-02-07
  - 변경: `apps/persona-world/src/lib/user-store.ts` (신규)
  - 변경: `apps/persona-world/src/app/notifications/page.tsx`
  - 변경: `apps/persona-world/src/app/persona/[id]/page.tsx`
  - 변경: `apps/persona-world/src/app/feed/page.tsx`
  - 변경: `apps/persona-world/src/app/explore/page.tsx`
  - 구현:
    - Zustand 스토어 (localStorage 영속화)
    - 사용자 프로필 관리 (UserProfile, 6D 벡터)
    - 팔로우/언팔로우 기능 (FollowedPersona)
    - 좋아요/북마크 토글
    - 알림 관리 (읽음 처리, 전체 읽음, 삭제)
    - 알림 타입별 아이콘/스타일 (7가지 타입)
    - 트렌딩 토픽 클릭 → 탐색 페이지 검색
    - Suspense 래퍼 (useSearchParams 대응)
  - 테스트: Build PASS (persona-world)

- [x] **T19: Export 기능 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/lib/export.ts` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/logs/page.tsx`
  - 변경: `apps/developer-console/src/app/(dashboard)/usage/page.tsx`
  - 변경: `apps/developer-console/src/app/(dashboard)/team/page.tsx`
  - 구현:
    - 공통 Export 유틸리티 (CSV/JSON 변환, BOM 지원, Blob 다운로드)
    - AC1: 감사 로그 CSV/JSON 내보내기 (드롭다운 메뉴)
    - AC2: 사용량 데이터 CSV/JSON 내보내기 (드롭다운 메뉴)
    - AC3: 팀 멤버 목록 CSV 내보내기
  - 테스트: Build PASS (developer-console)

- [x] **T18: Invoice 다운로드 기능 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/api/billing/invoices/[id]/download/route.ts` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/billing/page.tsx`
  - 구현:
    - GET /api/billing/invoices/:id/download API
    - Invoice 텍스트 포맷 생성 (PDF URL 있으면 리다이렉트)
    - 다운로드 버튼 클릭 시 handleDownloadInvoice() 호출
    - Blob 다운로드 처리
  - 테스트: Build PASS (developer-console)

- [x] **T17: API Key 로테이션 실제 로직 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/api/api-keys/[id]/rotate/route.ts` (신규)
  - 변경: `apps/developer-console/src/services/api-keys-service.ts`
  - 변경: `apps/developer-console/src/app/(dashboard)/api-keys/page.tsx`
  - 구현:
    - POST /api/api-keys/:id/rotate API (키 로테이션)
    - 새 키 생성 (crypto.randomBytes + sha256 해시)
    - rotateKey() 서비스 메서드 구현
    - Rotate 다이얼로그 API 연동 + 로딩 상태
    - 새 키 표시 다이얼로그 (한 번만 표시, 복사 기능)
  - 테스트: Build PASS (developer-console)

- [x] **T16: Webhook Test 기능 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/(dashboard)/webhooks/page.tsx`
  - 변경: `apps/developer-console/src/services/webhooks-service.ts`
  - 구현:
    - Test Webhook 메뉴 클릭 시 handleTestWebhook() 호출
    - 테스트 결과 다이얼로그 (로딩/성공/실패 상태)
    - 상태코드, 응답시간, 응답 본문 표시
    - 테스트 후 Delivery Logs 자동 갱신
  - 테스트: Build PASS (developer-console)

- [x] **T15: 팀 역할 수정 API 연동** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/api/team/members/[id]/route.ts` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/team/page.tsx`
  - 구현:
    - PATCH /api/team/members/:id API (역할 수정)
    - DELETE /api/team/members/:id API (멤버 제거)
    - Edit Role 다이얼로그 API 연동 + 로딩 상태
    - Remove Member 다이얼로그 API 연동 + 로딩 상태
    - 성공/실패 토스트 메시지 표시
  - 테스트: Build PASS (developer-console)

- [x] **T14: PersonaWorld 디자인 시스템 구축** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/app/globals.css` (PersonaWorld CSS 추가)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-logo.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-button.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-card.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-spinner.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-profile-ring.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-like-button.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-badge.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/index.ts` (신규)
  - 구현:
    - PW 로고 (인스타 스타일 - 그라데이션 배경 + 흰색 텍스트)
    - Vivid Gradient 테마 (purple → pink → coral)
    - 애니메이션 그라데이션 (gradient-shift, border-shift)
    - 모션 효과 (glow, shimmer, pulse, float, bounce, heart-pop)
    - 프로필 링 (인스타 스토리 스타일)
    - 스켈레톤, 스피너, 타이핑 인디케이터
    - 알림 뱃지 펄스 효과
  - 테스트: Build PASS (engine-studio)

- [x] **T13: 자율 활동 스케줄러 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/scheduler/activity-scheduler.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/posting-engine.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/interaction-engine.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/content-trigger.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/trending-reactor.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/scheduler/route.ts` (신규)
  - 구현:
    - 성격 기반 활동 시간 결정 (sociability, activeHours, peakHours)
    - 자율 포스팅 엔진 (성격별 포스트 타입 선택, 템플릿 기반 콘텐츠 생성)
    - 자율 인터랙션 엔진 (6D 유사도 기반 좋아요, 댓글, 팔로우)
    - 콘텐츠 출시 트리거 (관련성 판단, 딜레이 계산, 반응 스케줄링)
    - 트렌딩 토픽 반응 (해시태그 분석, 토픽 관련성, 자동 포스팅)
    - 스케줄러 API (상태 조회, 수동 실행, 일시 정지/재개)
  - 테스트: Build PASS (engine-studio)

- [x] **T12: 피드 알고리즘 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/feed/similarity-matcher.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/feed/trending-calculator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/feed/feed-mixer.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/feed/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/feed/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/explore/route.ts` (신규)
  - 구현:
    - 팔로우 기반 피드 (60%) - 팔로우한 페르소나 최신 게시물
    - 6D 유사도 기반 추천 피드 (30%) - 코사인/유클리드/하이브리드 유사도
    - 트렌딩 피드 (10%) - 참여도+시간 감쇠 기반 점수
    - 혼합 피드 알고리즘 - 가중치 정규화, 인터리빙, 중복 제거
    - Explore 탭 API - 카테고리별 인기 페르소나, 핫 토픽, 활발한 토론, 신규 페르소나
    - 커서 기반 페이지네이션
    - 페르소나 추천 API
  - 테스트: Build PASS (engine-studio)

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

- [x] **T12: 페르소나 자동 생성 파이프라인 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/persona-generation/vector-diversity.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/character-generator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/activity-inference.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/content-settings-inference.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/prompt-builder.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/consistency-validator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/sample-content-generator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/personas/generate/route.ts` (신규)
  - 구현:
    - 6D 벡터 자동 배정 (다양성 분석, 빈 셀/부족 셀 우선, 최대 거리 벡터 생성)
    - 캐릭터 속성 자동 생성 (이름, 핸들, 태그라인, 생년월일, 국가/지역, warmth, expertiseLevel, 말버릇, 습관, 배경, 장르 선호)
    - 활동성 속성 자동 추론 (sociability, initiative, expressiveness, interactivity, postFrequency, 활동 시간대)
    - 콘텐츠/관계 설정 자동 추론 (포스트 타입 선호, 콘텐츠 스타일, 리뷰 스타일, 인터랙션 스타일, 관계/갈등/협업 스타일)
    - 프롬프트 템플릿 자동 생성 (basePrompt, reviewPrompt, postPrompt, commentPrompt, interactionPrompt, specialPrompts)
    - 일관성 자동 검증 (벡터↔캐릭터, 캐릭터↔활동성, 활동성↔콘텐츠, 관계 설정 검증, 70점 이상 통과, 자동 수정)
    - 샘플 콘텐츠 자동 생성 (리뷰 2개, 포스트 1개, 댓글 2개)
    - 배치 생성 기능 (다양성 고려)
    - API 엔드포인트 (POST 단일/배치 생성, GET 다양성 분석)
  - 테스트: 빌드 PASS (engine-studio)

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
