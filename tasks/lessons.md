# Lessons Learned

> 사용자로부터 수정 지시를 받을 때마다 여기에 기록한다.
> 세션 시작 시 반드시 이 파일을 읽고 같은 실수를 반복하지 않는다.

---

## 기록 규칙

1. 사용자가 수정을 지시하면 → 즉시 해당 카테고리에 추가
2. 기록 형식: `- [YYYY-MM-DD] 구체적 교훈 (관련 티켓: T#)`
3. 모호한 교훈 금지 → "조심하기" (X) / "fetch 대신 lib/http.ts의 httpClient 사용" (O)
4. 카테고리에 맞는 섹션에 기록. 없으면 새 섹션 생성

---

## Naming

- [2026-02-09] Prisma 필드는 camelCase + `@map("snake_case")` 패턴 사용. snake_case 필드명 직접 사용 금지
- [2026-02-09] 6D 벡터 타입은 전 앱에서 `Decimal @db.Decimal(3, 2)` 통일. Float 사용 금지
- [2026-02-09] TypeScript 코드 전체 camelCase 통일 (API 응답 JSON 키 포함)
- [2026-02-09] Prisma Decimal → number 변환 시 반드시 `Number()` 래핑 (산술 연산 전)

## API

- [2026-02-19] `requireAuth()` 사용 패턴 — 반드시 `const { response } = await requireAuth(); if (response) return response;` 형태로 사용. 반환 타입이 `AuthResult | AuthError`이므로 `const authError = await requireAuth(); if (authError) return authError`는 타입 에러 발생. 또한 핸들러 함수에 명시적 `Promise<NextResponse<...>>` 반환 타입을 붙이면 `NextResponse<unknown>`과 불일치하므로, 기존 컨벤션대로 반환 타입 생략

## Style

(없음)

## Testing

(없음)

## Architecture

- [2026-02-20] **버전업 시 전체 연쇄 업데이트 체크리스트 필수.** 예: 엔진 v3→v4 전환 시, 파이프라인만 v4로 올리고 프롬프트 빌더(prompt-builder.ts)는 v3 형식 그대로 남겨두면 안 됨. 버전업 영향 범위 체크리스트: ① DB 스키마 ② 파이프라인(pipeline.ts) ③ 프롬프트 빌더(prompt-builder.ts) ④ API 라우트 ⑤ 프론트엔드 UI 표시 텍스트 ⑥ 온보딩/콜드스타트 문구 ⑦ API 문서(docs/api/) — 하나라도 빠지면 구버전/신버전 혼재 발생
- [2026-02-20] **유저에게 노출되는 UI 텍스트에 내부 기술 용어(L1/L2/L3, 벡터, 역설 감지, 교차축 등)를 절대 직접 노출하지 않을 것.** Phase subtitle, description 등 사용자 대면 문구는 반드시 자연어로 작성

## Process

- [2026-02-09] 작업 시작 전 사용자에게 계획 공유하고 승인 받을 것
- [2026-02-12] 가격, 수치, 스펙 등 사실 데이터는 반드시 설계 문서(docs/specs/)를 먼저 읽고 정확히 반영할 것. 절대 임의로 만들지 않는다
- [2026-02-12] 새 페이지/기능 만들기 전에 관련 설계서(specs/, design/)를 전부 확인할 것. 설계서 목차(CLAUDE.md 참조 문서 섹션)를 체크리스트로 활용
- [2026-02-12] 랜딩페이지 콘텐츠 작성 시 docs/specs/의 기능정의서가 1차 소스. 임의 추정이나 일반적 SaaS 패턴으로 대체 금지
- [2026-02-19] 작업 전 다른 앱(engine-studio, developer-console)의 기존 설정/패턴을 반드시 확인하고, 동일 프로젝트 내 컨벤션을 통일할 것. Vercel 환경변수도 기존 것 확인 우선
- [2026-02-19] 보안/버그픽스 등 긴급 작업도 반드시 TASK.md에 티켓 등록 후 진행할 것

## Security

- [2026-02-19] 새 API 라우트 생성 시 반드시 `requireAuth()` 가드를 추가할 것. 세션 없으면 401 반환. `auth()`만 호출하고 fallback으로 `findFirst()` 사용하는 것은 보호가 아님
- [2026-02-19] 새 앱 생성 시 반드시 `middleware.ts`를 추가하여 보호 경로(dashboard, profile 등)에 대한 서버 측 인증 체크를 할 것. 클라이언트 측 `useSession` 체크만으로는 URL 직접 접근 차단 불가
- [2026-02-19] `/api/health` 같은 공개 엔드포인트에서 환경변수 값, 내부 URL, VERCEL_ENV 등 인프라 정보를 절대 노출하지 않을 것. 설정 여부(configured/not set)만 반환

## Environment

- [2026-02-19] 새 라이브러리/기능 추가 시 라이브러리 기본 컨벤션이 아닌 프로젝트 기존 환경변수명을 먼저 확인하고 통일할 것. 예: NextAuth v5 기본은 `AUTH_GOOGLE_ID`이지만, 프로젝트에서 이미 `GOOGLE_CLIENT_ID`를 쓰면 그걸 사용

## Database

- [2026-02-19] 수동 SQL 시드 파일 작성 시 반드시 001_full_schema.sql(Prisma 마이그레이션)의 실제 컬럼명을 확인할 것. Prisma는 camelCase 컬럼명을 생성하므로 snake_case로 작성하면 불일치 발생. CREATE TABLE IF NOT EXISTS 대신 기존 테이블 전제로 INSERT만 작성

## Performance

(없음)
