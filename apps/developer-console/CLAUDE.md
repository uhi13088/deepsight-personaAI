# CLAUDE.md - DeepSight 자동 개발 가이드

> **이 파일은 Claude Code가 자동으로 읽고 따르는 프로젝트 컨텍스트입니다.**
> **모든 개발 작업에서 이 규칙을 준수하고, 매 작업 완료 후 자동 검증을 수행하세요.**

---

# 🎯 프로젝트 개요

| 항목           | 내용                                         |
| -------------- | -------------------------------------------- |
| **프로젝트명** | DeepSight                                    |
| **설명**       | AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼 |
| **핵심 기술**  | 6D 벡터 매칭, LLM 스타일 캐싱, XAI 설명 생성 |
| **목표**       | MVP 개발 (2주) → 베타 서비스 → 상용화        |

---

# 📚 필수 참조 문서

> ⚠️ **모든 개발 작업 전에 관련 문서를 반드시 확인하세요.**

| 문서                          | 경로                                  | 핵심 용도                |
| ----------------------------- | ------------------------------------- | ------------------------ |
| **기능정의서 - 개발자콘솔**   | `docs/deepsight_developer_console.md` | API 관리, 대시보드 기능  |
| **기능정의서 - 엔진스튜디오** | `docs/deepsight_engine_studio.md`     | 페르소나 설정, 벡터 매칭 |
| **사업계획서**                | `docs/deepsight_business_plan.md`     | 비즈니스 모델, 시장 분석 |
| **마케팅 가이드**             | `docs/deepsight_marketing_guide.md`   | 가격 전략, GTM           |
| **기술 설계**                 | `docs/deepsight_technical_design.md`  | 아키텍처, DB, API 설계   |

### 문서 참조 규칙

```
[어떤 문서를 볼지 결정하는 로직]

페르소나 기능 개발 → 엔진스튜디오 기능정의서
API/대시보드 개발 → 개발자콘솔 기능정의서
벡터 매칭 로직 → 기술 설계
인증/멀티테넌트 → 기술 설계
UI/UX 개발 → 기능정의서 + 기술 설계
수익/과금 기능 → 사업계획서 + 마케팅 가이드
```

### 🚨 문서 충돌 시 우선순위

```
Level 1: 기술 원천 (최우선)
├── 기술 설계 → DB/API/아키텍처의 정본
└── Prisma 스키마 → 데이터 구조의 정본

Level 2: 기능 정의
├── 엔진스튜디오 → AI/페르소나 기능의 정본
└── 개발자콘솔 → API/대시보드 기능의 정본

Level 3: 비즈니스 정의
├── 사업계획서 → 비즈니스 모델의 정본
└── 마케팅 가이드 → 가격/플랜의 정본

Level 4: 개발 가이드
└── CLAUDE.md → 코드 규칙의 정본
```

---

# 🔧 기술 스택

```yaml
Frontend:
  framework: Next.js 14 (App Router) + TypeScript 5
  styling: TailwindCSS + shadcn/ui
  state: Zustand
  serverState: TanStack Query v5
  form: React Hook Form + Zod
  chart: Recharts

Backend:
  runtime: Node.js 20 LTS
  framework: Next.js API Routes
  orm: Prisma 5
  database: PostgreSQL (Neon)
  cache: Redis (Upstash)
  auth: NextAuth.js v5

AI/ML:
  llm: Anthropic Claude (Sonnet) — @anthropic-ai/sdk
  vector: pgvector (Neon)
  embedding: OpenAI text-embedding-3-small

Infrastructure:
  hosting: Vercel
  database: Neon PostgreSQL
  monitoring: Vercel Analytics
```

---

# 📁 프로젝트 구조

```
deepsight/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # 인증 라우트 그룹
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/          # 대시보드 라우트 그룹
│   │   │   ├── personas/
│   │   │   ├── analytics/
│   │   │   ├── api-keys/
│   │   │   └── settings/
│   │   ├── (public)/             # 공개 라우트 그룹
│   │   │   ├── survey/           # 설문 테스트
│   │   │   └── result/           # 결과 페이지
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/
│   │   │   ├── personas/
│   │   │   ├── survey/
│   │   │   ├── recommendations/
│   │   │   └── webhooks/
│   │   ├── layout.tsx
│   │   └── page.tsx              # 랜딩 페이지
│   │
│   ├── components/               # 컴포넌트
│   │   ├── ui/                   # shadcn/ui 기본
│   │   ├── common/               # 공통 컴포넌트
│   │   └── features/             # 기능별 컴포넌트
│   │       ├── persona/
│   │       ├── survey/
│   │       ├── recommendation/
│   │       └── analytics/
│   │
│   ├── lib/                      # 라이브러리
│   │   ├── db/                   # Prisma 클라이언트
│   │   │   └── prisma.ts
│   │   ├── ai/                   # AI/LLM 관련
│   │   │   ├── openai.ts
│   │   │   ├── embedding.ts
│   │   │   └── styleCache.ts
│   │   ├── vector/               # 벡터 연산
│   │   │   ├── calculate.ts
│   │   │   ├── matching.ts
│   │   │   └── similarity.ts
│   │   ├── auth/                 # 인증
│   │   │   └── nextauth.ts
│   │   └── utils/                # 유틸리티
│   │       ├── api.ts
│   │       ├── validation.ts
│   │       └── format.ts
│   │
│   ├── hooks/                    # 커스텀 훅
│   │   ├── usePersona.ts
│   │   ├── useSurvey.ts
│   │   └── useRecommendation.ts
│   │
│   ├── stores/                   # Zustand 스토어
│   │   ├── useAuthStore.ts
│   │   └── useSurveyStore.ts
│   │
│   ├── types/                    # ⭐ 타입 정의 (원천)
│   │   ├── persona.types.ts
│   │   ├── survey.types.ts
│   │   ├── recommendation.types.ts
│   │   ├── api.types.ts
│   │   └── index.ts
│   │
│   └── constants/                # 상수 정의
│       ├── vector.constants.ts
│       ├── survey.constants.ts
│       └── plan.constants.ts
│
├── prisma/
│   └── schema.prisma             # ⭐ DB 스키마 (원천)
│
├── tests/                        # 테스트
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # 기획 문서
└── CLAUDE.md                     # 이 파일
```

---

# 🏷️ 네이밍 컨벤션

## 파일명

| 대상      | 규칙                        | 예시                    |
| --------- | --------------------------- | ----------------------- |
| 컴포넌트  | PascalCase.tsx              | `PersonaCard.tsx`       |
| 페이지    | page.tsx (Next.js 규칙)     | `app/personas/page.tsx` |
| 훅        | use + PascalCase.ts         | `usePersona.ts`         |
| 스토어    | use + PascalCase + Store.ts | `useAuthStore.ts`       |
| 유틸리티  | camelCase.ts                | `calculateVector.ts`    |
| 타입      | camelCase.types.ts          | `persona.types.ts`      |
| 상수      | camelCase.constants.ts      | `vector.constants.ts`   |
| API Route | route.ts (Next.js 규칙)     | `api/personas/route.ts` |
| 테스트    | _.test.ts / _.spec.ts       | `vector.test.ts`        |

## 변수/함수명

| 대상            | 규칙                  | 예시                                 |
| --------------- | --------------------- | ------------------------------------ |
| 변수            | camelCase             | `personaList`, `vectorScore`         |
| 함수            | camelCase (동사 시작) | `getPersona()`, `calculateMatch()`   |
| 상수            | UPPER_SNAKE_CASE      | `MAX_DIMENSION`, `DEFAULT_THRESHOLD` |
| 타입/인터페이스 | PascalCase            | `Persona`, `VectorResult`            |
| Enum            | PascalCase            | `PersonaType`, `PlanTier`            |
| Enum 값         | UPPER_SNAKE_CASE      | `EXPLORER`, `ANALYST`                |

## 도메인 용어 통일표

> ⚠️ **필수**: 아래 용어를 전 프로젝트에서 통일하여 사용하세요.

| 한글     | 영문 (코드)      | 복수형            |
| -------- | ---------------- | ----------------- |
| 페르소나 | `persona`        | `personas`        |
| 벡터     | `vector`         | `vectors`         |
| 차원     | `dimension`      | `dimensions`      |
| 매칭     | `matching`       | -                 |
| 추천     | `recommendation` | `recommendations` |
| 콘텐츠   | `content`        | `contents`        |
| 사용자   | `user`           | `users`           |
| 테넌트   | `tenant`         | `tenants`         |
| 설문     | `survey`         | `surveys`         |
| 질문     | `question`       | `questions`       |
| 응답     | `response`       | `responses`       |
| 점수     | `score`          | `scores`          |
| 임베딩   | `embedding`      | `embeddings`      |
| 유사도   | `similarity`     | -                 |
| 캐싱     | `cache`          | -                 |
| 스타일   | `style`          | `styles`          |
| API 키   | `apiKey`         | `apiKeys`         |
| 플랜     | `plan`           | `plans`           |

---

# 🗄️ 데이터베이스 스키마

> 📌 **중요**: Prisma 스키마가 모든 타입 정의의 기준입니다.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// === 테넌트 (B2B 고객사) ===
model Tenant {
  id          String   @id @default(cuid())
  name        String
  domain      String?  @unique
  plan        Plan     @default(FREE)
  apiKey      String   @unique @default(cuid())
  apiCallCount Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  personas    Persona[]
  contents    Content[]
  surveys     Survey[]
}

enum Plan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

// === 사용자 (테넌트 내 관리자) ===
model User {
  id          String   @id @default(cuid())
  tenantId    String
  email       String
  name        String?
  password    String?
  role        Role     @default(MEMBER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, email])
  @@index([tenantId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

// === 페르소나 ===
model Persona {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?
  color       String   @default("#6366f1")
  icon        String   @default("user")
  vector      Float[]  // 6D 벡터 [0-1, 0-1, 0-1, 0-1, 0-1, 0-1]
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, isActive])
}

// === 콘텐츠 ===
model Content {
  id          String   @id @default(cuid())
  tenantId    String
  externalId  String
  title       String
  description String?
  category    String?
  tags        String[]
  metadata    Json?
  embedding   Float[]  // 임베딩 벡터 (1536 dimensions)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, externalId])
  @@index([tenantId])
}

// === 설문 ===
model Survey {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?
  questions   Json     // 질문 배열
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  responses   SurveyResponse[]

  @@index([tenantId])
}

// === 설문 응답 (최종 사용자) ===
model SurveyResponse {
  id          String   @id @default(cuid())
  surveyId    String
  sessionId   String   // 익명 사용자 세션
  answers     Json     // 질문별 응답
  vector      Float[]  // 계산된 6D 벡터
  personaId   String?  // 매칭된 페르소나 ID
  personaName String?  // 매칭된 페르소나 이름
  score       Float?   // 매칭 점수
  createdAt   DateTime @default(now())

  survey      Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@index([surveyId])
  @@index([sessionId])
}

// === 스타일 캐시 ===
model StyleCache {
  id          String   @id @default(cuid())
  tenantId    String
  personaId   String
  contentType String
  prompt      String
  response    String
  tokenCount  Int
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@unique([tenantId, personaId, contentType])
  @@index([tenantId])
  @@index([expiresAt])
}
```

---

# ✅ 자동 검증 체크리스트

> 🤖 **Claude Code는 모든 작업 완료 시 아래 체크리스트를 자동으로 검증합니다.**
> **요청이 없어도 매 작업 완료 후 반드시 실행하세요.**

```
┌─────────────────────────────────────────────────────────────────┐
│               🔍 자동 검증 체크리스트 (필수)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ 타입 안전성                                                 │
│     □ TypeScript strict 모드 에러 없음                          │
│     □ any 타입 사용 금지 (불가피 시 주석 필수)                   │
│     □ Prisma 스키마와 타입 정의 일치                            │
│     □ API 요청/응답 타입 정의됨                                 │
│                                                                 │
│  2️⃣ 코드 품질                                                   │
│     □ ESLint 에러/경고 0개                                      │
│     □ Prettier 포맷팅 적용됨                                    │
│     □ console.log 제거 (디버깅용 제외)                          │
│     □ 하드코딩된 값 없음 (상수/환경변수 사용)                   │
│     □ 중복 코드 없음 (DRY 원칙)                                 │
│                                                                 │
│  3️⃣ 에러 핸들링                                                 │
│     □ try-catch 적절히 사용                                     │
│     □ API 에러 응답 형식 통일                                   │
│     □ 사용자 친화적 에러 메시지                                 │
│     □ 에러 로깅 포함                                            │
│                                                                 │
│  4️⃣ 보안                                                        │
│     □ 환경변수로 민감정보 관리                                  │
│     □ SQL Injection 방지 (Prisma 사용)                          │
│     □ XSS 방지 (입력값 sanitize)                                │
│     □ API 인증/인가 확인                                        │
│     □ Rate Limiting 적용 (API)                                  │
│                                                                 │
│  5️⃣ 성능                                                        │
│     □ N+1 쿼리 없음 (include/select 사용)                       │
│     □ 필요한 필드만 조회 (select)                               │
│     □ 적절한 인덱스 사용                                        │
│     □ 불필요한 리렌더링 방지 (React.memo, useMemo)              │
│                                                                 │
│  6️⃣ 테스트                                                      │
│     □ 핵심 로직 유닛 테스트 작성                                │
│     □ API 엔드포인트 테스트 작성                                │
│     □ 기존 테스트 전체 통과                                     │
│     □ 에지 케이스 테스트 포함                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 검증 명령어 (매 작업 후 자동 실행)

```bash
# 1. TypeScript 검사
pnpm typecheck

# 2. ESLint 검사 및 자동 수정
pnpm lint
pnpm lint:fix

# 3. Prettier 포맷팅
pnpm format

# 4. Prisma 스키마 검증
pnpm prisma validate
pnpm prisma generate

# 5. 테스트 실행
pnpm test              # 전체 테스트
pnpm test:unit         # 유닛 테스트만
pnpm test:integration  # 통합 테스트만
pnpm test:coverage     # 커버리지 리포트

# 6. 빌드 테스트
pnpm build

# === 전체 검증 (한 번에) ===
pnpm validate  # typecheck + lint + test + build
```

## package.json 스크립트 설정

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --dir tests/unit",
    "test:integration": "vitest run --dir tests/integration",
    "test:coverage": "vitest run --coverage",
    "validate": "pnpm typecheck && pnpm lint && pnpm test && pnpm build",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

---

# 🧪 테스트 전략

## 테스트 구조

```
tests/
├── unit/                      # 유닛 테스트
│   ├── lib/
│   │   ├── vector/
│   │   │   ├── calculate.test.ts
│   │   │   ├── matching.test.ts
│   │   │   └── similarity.test.ts
│   │   └── ai/
│   │       └── embedding.test.ts
│   └── utils/
│       └── validation.test.ts
│
├── integration/               # 통합 테스트
│   ├── api/
│   │   ├── personas.test.ts
│   │   ├── survey.test.ts
│   │   └── recommendations.test.ts
│   └── db/
│       └── queries.test.ts
│
└── e2e/                       # E2E 테스트 (선택)
    └── flows/
        └── survey-flow.test.ts
```

## 테스트 작성 규칙

```typescript
// 테스트 파일 템플릿
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("모듈/기능명", () => {
  // 테스트 전 셋업
  beforeEach(() => {
    // mock 설정, 초기화 등
  })

  // 테스트 후 정리
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("함수/메서드명", () => {
    it("정상 케이스: [기대 동작 설명]", () => {
      // Given (준비)
      const input = {
        /* ... */
      }

      // When (실행)
      const result = targetFunction(input)

      // Then (검증)
      expect(result).toEqual(expected)
    })

    it("예외 케이스: [에러 상황 설명]", () => {
      // Given
      const invalidInput = {
        /* ... */
      }

      // When & Then
      expect(() => targetFunction(invalidInput)).toThrow("에러 메시지")
    })

    it("경계값 케이스: [경계 조건 설명]", () => {
      // 최소값, 최대값, 빈 배열 등 테스트
    })
  })
})
```

## 테스트 커버리지 기준

| 영역                           | 최소 커버리지 | 우선순위 |
| ------------------------------ | ------------- | -------- |
| 벡터 계산 로직 (`lib/vector/`) | **90%**       | 🔴 필수  |
| AI/LLM 로직 (`lib/ai/`)        | **80%**       | 🔴 필수  |
| API 엔드포인트 (`app/api/`)    | **80%**       | 🔴 필수  |
| 유틸리티 함수 (`lib/utils/`)   | **70%**       | 🟡 권장  |
| 커스텀 훅 (`hooks/`)           | **60%**       | 🟡 권장  |
| 컴포넌트 (`components/`)       | **50%**       | 🟢 선택  |

---

# 🔄 작업 완료 프로토콜

> 🤖 **Claude Code는 모든 작업 완료 시 아래 형식으로 보고합니다.**
> **이 보고서 없이 작업이 완료된 것으로 간주하지 마세요.**

## 작업 완료 보고 템플릿

```markdown
## ✅ 작업 완료 보고

### 1. 완료한 작업

- [작업 내용 요약]

### 2. 변경/생성된 파일

| 파일                            | 상태 | 내용             |
| ------------------------------- | ---- | ---------------- |
| `src/lib/vector/calculate.ts`   | 신규 | 벡터 계산 로직   |
| `src/app/api/personas/route.ts` | 수정 | 에러 핸들링 추가 |

### 3. 🔍 자동 검증 결과

| 검증 항목  | 결과    | 상세        |
| ---------- | ------- | ----------- |
| TypeScript | ✅ Pass | 에러 0개    |
| ESLint     | ✅ Pass | 경고 0개    |
| Prettier   | ✅ Pass | -           |
| Prisma     | ✅ Pass | 스키마 유효 |
| 테스트     | ✅ Pass | 24/24 통과  |
| 빌드       | ✅ Pass | -           |

### 4. 🧪 테스트 결과
```

✓ tests/unit/lib/vector/calculate.test.ts (5 tests)
✓ tests/unit/lib/vector/matching.test.ts (4 tests)
✓ tests/integration/api/personas.test.ts (8 tests)

Test Suites: 3 passed, 3 total
Tests: 17 passed, 17 total
Coverage: 87.5%

```

### 5. ⚠️ 주의사항 (있는 경우)
- [주의할 점이나 후속 필요 사항]

### 6. 📌 다음 작업 제안
- [자연스러운 후속 작업]
```

## 불일치/에러 발견 시 처리

```markdown
## ⚠️ 문제 발견 및 자동 수정

### 발견된 문제

| 유형       | 위치                  | 내용          |
| ---------- | --------------------- | ------------- |
| TypeScript | `types/persona.ts:25` | 타입 불일치   |
| ESLint     | `api/route.ts:10`     | unused import |
| 테스트     | `vector.test.ts`      | 실패 1건      |

### 자동 수정 내역

| 파일                  | Before              | After     |
| --------------------- | ------------------- | --------- |
| `types/persona.ts:25` | `any`               | `Persona` |
| `api/route.ts:10`     | `import { unused }` | (삭제)    |

### 수정 후 재검증 결과

- [x] TypeScript 에러 해결
- [x] ESLint 통과
- [x] 테스트 전체 통과
```

---

# 🔗 API 설계 표준

## RESTful 규칙

```
GET    /api/{resource}              # 목록 조회 (+ 페이지네이션, 필터)
GET    /api/{resource}/:id          # 단일 조회
POST   /api/{resource}              # 생성
PATCH  /api/{resource}/:id          # 부분 수정
PUT    /api/{resource}/:id          # 전체 수정
DELETE /api/{resource}/:id          # 삭제
POST   /api/{resource}/:id/{action} # 커스텀 액션
```

## API 응답 형식 (필수 준수)

```typescript
// src/types/api.types.ts

// 성공 응답
interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

// 에러 응답
interface ApiError {
  success: false
  error: {
    code: string // 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED' 등
    message: string // 사용자 친화적 메시지
    details?: unknown // 추가 정보 (개발용)
  }
}

// 에러 코드 상수
const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const
```

## 주요 API 엔드포인트

```
# 인증
POST   /api/auth/register      # 회원가입
POST   /api/auth/login         # 로그인
POST   /api/auth/logout        # 로그아웃
GET    /api/auth/me            # 현재 사용자

# 페르소나
GET    /api/personas           # 목록
POST   /api/personas           # 생성
GET    /api/personas/:id       # 조회
PATCH  /api/personas/:id       # 수정
DELETE /api/personas/:id       # 삭제

# 설문
GET    /api/surveys            # 목록
POST   /api/surveys            # 생성
GET    /api/surveys/:id        # 조회 (질문 포함)
POST   /api/surveys/:id/respond  # 응답 제출

# 추천
POST   /api/recommendations    # 추천 요청
GET    /api/recommendations/:sessionId  # 결과 조회

# 콘텐츠 (외부 연동)
POST   /api/contents/sync      # 콘텐츠 동기화
GET    /api/contents           # 목록

# 분석
GET    /api/analytics/overview # 대시보드 개요
GET    /api/analytics/personas # 페르소나별 통계
GET    /api/analytics/trends   # 트렌드 분석

# API 키 관리
GET    /api/api-keys           # API 키 목록
POST   /api/api-keys           # 키 생성
DELETE /api/api-keys/:id       # 키 삭제
```

---

# 📊 상수 관리

> 📌 **수치를 하드코딩하지 말고 상수로 관리하세요.**

```typescript
// src/constants/vector.constants.ts

// === 6D 벡터 차원 ===
export const VECTOR_DIMENSIONS = 6
export const DIMENSION_NAMES = [
  "openness", // 개방성
  "analytical", // 분석적
  "social", // 사회적
  "adventurous", // 모험적
  "practical", // 실용적
  "creative", // 창의적
] as const

// === 매칭 임계값 ===
export const MATCHING_THRESHOLD = 0.7 // 최소 매칭 점수
export const HIGH_MATCH_THRESHOLD = 0.85 // 높은 매칭
export const PERFECT_MATCH_THRESHOLD = 0.95 // 완벽한 매칭

// === 임베딩 ===
export const EMBEDDING_DIMENSION = 1536 // OpenAI text-embedding-3-small
export const EMBEDDING_MODEL = "text-embedding-3-small"
```

```typescript
// src/constants/plan.constants.ts

// === 플랜별 제한 ===
export const PLAN_LIMITS = {
  FREE: {
    personas: 3,
    apiCalls: 1000,
    contents: 100,
    teamMembers: 1,
  },
  STARTER: {
    personas: 10,
    apiCalls: 10000,
    contents: 1000,
    teamMembers: 3,
  },
  PRO: {
    personas: -1, // 무제한
    apiCalls: 100000,
    contents: 10000,
    teamMembers: 10,
  },
  ENTERPRISE: {
    personas: -1,
    apiCalls: -1,
    contents: -1,
    teamMembers: -1,
  },
} as const

// === 가격 (월간, USD) ===
export const PLAN_PRICES = {
  FREE: 0,
  STARTER: 49,
  PRO: 199,
  ENTERPRISE: null, // 문의
} as const
```

```typescript
// src/constants/survey.constants.ts

// === 설문 설정 ===
export const MIN_QUESTIONS = 5
export const MAX_QUESTIONS = 20
export const DEFAULT_QUESTIONS = 10

// === 응답 옵션 ===
export const LIKERT_SCALE = [1, 2, 3, 4, 5] as const
export const LIKERT_LABELS = {
  1: "전혀 아니다",
  2: "아니다",
  3: "보통",
  4: "그렇다",
  5: "매우 그렇다",
} as const
```

---

# 🚨 최우선 규칙

```
┌─────────────────────────────────────────────────────────────────┐
│                      🚨 최우선 규칙                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 코드 작성 전 관련 문서/스키마를 확인한다                    │
│                                                                 │
│  2. TypeScript strict 모드를 준수한다 (any 금지)               │
│                                                                 │
│  3. 모든 API는 통일된 응답 형식을 사용한다                     │
│                                                                 │
│  4. 매 작업 완료 후 자동 검증을 수행한다 (요청 없어도!)        │
│                                                                 │
│  5. 수치/설정값은 상수/환경변수로 관리한다                     │
│                                                                 │
│  6. 핵심 로직은 반드시 테스트를 작성한다                       │
│                                                                 │
│  7. 에러/불일치 발견 시 즉시 수정하고 보고한다                 │
│                                                                 │
│  8. 작업 완료 시 검증 결과를 포함한 보고서를 출력한다          │
│                                                                 │
│  9. 보안 민감 정보는 절대 코드에 포함하지 않는다               │
│                                                                 │
│  10. 성능 문제가 예상되면 사전에 최적화를 고려한다             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 🔐 환경변수

```env
# .env.local (예시 - 실제 값은 절대 커밋하지 않음!)

# Database (Neon)
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb?sslmode=require"

# Auth
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# AI
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Redis (Upstash) - 선택
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

# 🤝 협업 가이드

## 효율적인 요청 방법

```
✅ 좋은 요청:
"페르소나 CRUD API를 만들어줘.
- Prisma 스키마의 Persona 모델 사용
- 위치: src/app/api/personas/
- 인증: NextAuth 세션 필요
- 응답 형식: ApiResponse 타입 사용
- 테스트도 작성해줘"

❌ 나쁜 요청:
"API 만들어줘"
```

## 작업 단위

```
✅ 적절한 크기 (1-2시간):
- API 엔드포인트 1~2개 (+ 테스트)
- 컴포넌트 1~2개 (+ 스토리)
- 기능 모듈 1개 (벡터 계산, 매칭 로직 등)

❌ 너무 큼: "전체 백엔드 만들어줘"
❌ 너무 작음: "변수명 하나 바꿔줘"
```

## 세션 시작 프롬프트 템플릿

```
"DeepSight 개발 시작.
현재 상태: [완료된 작업 목록]
오늘 목표: [작업 목록]
참조: CLAUDE.md"
```

## 검증 요청 프롬프트

```
"전체 검증 수행해줘.
- TypeScript
- ESLint
- 테스트
- 빌드
문제 있으면 수정하고 보고해줘."
```

---

# 📋 진행 상황

> **사용법**: 매 세션 시작 시 이 섹션을 업데이트하여 컨텍스트 유지

## 현재 상태

| 항목      | 값                            |
| --------- | ----------------------------- |
| **Phase** | MVP 개발                      |
| **날짜**  | 2026-02-02                    |
| **목표**  | 2026-02-13 (청창사 신청 마감) |

## 체크리스트

### 기반 구축

- [ ] 프로젝트 초기화 (Next.js, Prisma, TailwindCSS)
- [ ] Prisma 스키마 정의 및 마이그레이션
- [ ] 인증 시스템 (NextAuth)
- [ ] API 기본 구조 (응답 형식, 에러 핸들링)

### 핵심 기능

- [ ] 페르소나 CRUD API
- [ ] 설문 시스템 (질문, 응답)
- [ ] 6D 벡터 계산 로직
- [ ] 페르소나 매칭 로직
- [ ] 추천 API

### UI/UX

- [ ] 랜딩 페이지
- [ ] 설문 테스트 페이지
- [ ] 결과 페이지
- [ ] 대시보드 (기본)

### 테스트

- [ ] 벡터 계산 유닛 테스트
- [ ] API 통합 테스트
- [ ] E2E 플로우 테스트

## 최근 완료

- (없음)

## 진행 중

- 프로젝트 셋업 준비

## 다음 작업

- Next.js 프로젝트 초기화
- Prisma 스키마 생성

---

_이 문서는 Claude Code가 자동으로 참조하며, 모든 개발 작업의 기준입니다._
_매 작업 완료 후 자동 검증과 보고서 출력을 반드시 수행하세요._
_최종 업데이트: 2026년 2월_
