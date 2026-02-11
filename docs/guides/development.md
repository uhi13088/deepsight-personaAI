# DeepSight 개발 가이드

> **이 문서는 DeepSight 프로젝트의 상세 개발 가이드입니다.**
> **간결한 규칙은 CLAUDE.md를 참조하세요.**

---

## 프로젝트 개요

| 항목           | 내용                                         |
| -------------- | -------------------------------------------- |
| **프로젝트명** | DeepSight                                    |
| **설명**       | AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼 |
| **핵심 기술**  | 6D 벡터 매칭, LLM 스타일 캐싱, XAI 설명 생성 |
| **목표**       | MVP 개발 (2주) → 베타 서비스 → 상용화        |

---

## 필수 참조 문서

| 문서                           | 경로                                                     | 핵심 용도                |
| ------------------------------ | -------------------------------------------------------- | ------------------------ |
| **엔진 v3 설계서**             | `docs/design/persona-engine-v3.md`                       | 3-Layer 106D+ 아키텍처   |
| **엔진 v3 구현계획서**         | `docs/design/persona-engine-v3-impl.md`                  | Phase 0~9, 타입/함수 명세 |
| **PersonaWorld v3 설계서**     | `docs/design/persona-world-v3.md`                        | 자율 SNS 아키텍처        |
| **PersonaWorld v3 구현계획서** | `docs/design/persona-world-v3-impl.md`                   | PW-Phase 0~5, 43 태스크  |
| **기능정의서 - 엔진스튜디오**  | `docs/specs/engine-studio.md`                            | 페르소나 설정, 벡터 매칭 |
| **기능정의서 - 개발자콘솔**    | `docs/specs/developer-console.md`                        | API 관리, 대시보드 기능  |
| **기능정의서 - 페르소나월드**  | `docs/specs/persona-world.md`                            | AI SNS, 자율 활동 시스템 |
| **UI가이드 - 디자인시스템**    | `docs/specs/persona-world-ui.md`                         | 컴포넌트, 컬러, 모션     |

### 문서 참조 규칙

```
페르소나 기능 개발 → 엔진스튜디오 기능정의서 + 페르소나시스템 설계서
PersonaWorld 기능 개발 → 페르소나월드 기능정의서
PersonaWorld UI 개발 → 페르소나월드 디자인시스템 가이드
API/대시보드 개발 → 개발자콘솔 기능정의서
벡터 매칭 로직 → 페르소나시스템 설계서
UI/UX 개발 → 기능정의서 + 디자인시스템 가이드
수익/과금 기능 → 마케팅 가이드
```

### 문서 충돌 시 우선순위

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
```

---

## 기술 스택

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
  database: PostgreSQL (Supabase)
  cache: Redis (Upstash)
  auth: NextAuth.js v5

AI/ML:
  llm: OpenAI GPT-4 / Claude API
  vector: pgvector (Supabase)
  embedding: OpenAI text-embedding-3-small

Infrastructure:
  hosting: Vercel
  database: Supabase
  storage: Supabase Storage
  monitoring: Vercel Analytics
```

---

## 프로젝트 구조

```
deepsight/
├── apps/
│   ├── engine-studio/           # AI 페르소나 관리
│   └── developer-console/       # API 및 대시보드
├── docs/                        # 기획 문서
├── CLAUDE.md                    # 프로젝트 규칙 (간결)
├── TASK.md                      # 작업 큐
└── .claude/                     # Claude Code 설정
    ├── settings.json
    └── commands/
```

### apps/engine-studio 구조

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 인증 라우트 그룹
│   ├── (dashboard)/          # 대시보드 라우트 그룹
│   └── api/                  # API Routes
│       └── persona-world/    # PersonaWorld API
├── components/               # 컴포넌트
│   ├── ui/                   # shadcn/ui 기본
│   ├── persona-world/        # PersonaWorld 디자인시스템 컴포넌트
│   │   ├── pw-logo.tsx       # PW 로고
│   │   ├── pw-button.tsx     # 그라데이션 버튼
│   │   ├── pw-card.tsx       # 호버 카드
│   │   ├── pw-profile-ring.tsx # 프로필 링
│   │   └── ...
│   ├── common/               # 공통 컴포넌트
│   └── features/             # 기능별 컴포넌트
├── lib/                      # 라이브러리
│   ├── feed/                 # 피드 알고리즘
│   ├── scheduler/            # 자율 활동 스케줄러
│   ├── onboarding/           # 유저 온보딩
│   └── persona-generation/   # 페르소나 자동 생성
├── hooks/                    # 커스텀 훅
├── stores/                   # Zustand 스토어
├── types/                    # 타입 정의
├── constants/                # 상수 정의
└── services/                 # API 서비스
```

---

## 네이밍 컨벤션

### 파일명

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

### 변수/함수명

| 대상            | 규칙                  | 예시                                 |
| --------------- | --------------------- | ------------------------------------ |
| 변수            | camelCase             | `personaList`, `vectorScore`         |
| 함수            | camelCase (동사 시작) | `getPersona()`, `calculateMatch()`   |
| 상수            | UPPER_SNAKE_CASE      | `MAX_DIMENSION`, `DEFAULT_THRESHOLD` |
| 타입/인터페이스 | PascalCase            | `Persona`, `VectorResult`            |
| Enum            | PascalCase            | `PersonaType`, `PlanTier`            |
| Enum 값         | UPPER_SNAKE_CASE      | `EXPLORER`, `ANALYST`                |

### 도메인 용어 통일표

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
| API 키   | `apiKey`         | `apiKeys`         |
| 플랜     | `plan`           | `plans`           |

---

## 데이터베이스 스키마

> Prisma 스키마가 모든 타입 정의의 기준입니다.

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

## 검증 체크리스트

### 타입 안전성

- TypeScript strict 모드 에러 없음
- any 타입 사용 금지 (불가피 시 주석 필수)
- Prisma 스키마와 타입 정의 일치
- API 요청/응답 타입 정의됨

### 코드 품질

- ESLint 에러/경고 0개
- Prettier 포맷팅 적용됨
- console.log 제거 (디버깅용 제외)
- 하드코딩된 값 없음 (상수/환경변수 사용)
- 중복 코드 없음 (DRY 원칙)

### 에러 핸들링

- try-catch 적절히 사용
- API 에러 응답 형식 통일
- 사용자 친화적 에러 메시지
- 에러 로깅 포함

### 보안

- 환경변수로 민감정보 관리
- SQL Injection 방지 (Prisma 사용)
- XSS 방지 (입력값 sanitize)
- API 인증/인가 확인
- Rate Limiting 적용 (API)

### 성능

- N+1 쿼리 없음 (include/select 사용)
- 필요한 필드만 조회 (select)
- 적절한 인덱스 사용
- 불필요한 리렌더링 방지 (React.memo, useMemo)

---

## 테스트 전략

### 테스트 구조

```
tests/
├── unit/                      # 유닛 테스트
│   ├── lib/
│   │   ├── vector/
│   │   └── ai/
│   └── utils/
├── integration/               # 통합 테스트
│   ├── api/
│   └── db/
└── e2e/                       # E2E 테스트 (선택)
    └── flows/
```

### 테스트 작성 규칙

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("모듈/기능명", () => {
  beforeEach(() => {
    // mock 설정, 초기화 등
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("함수/메서드명", () => {
    it("정상 케이스: [기대 동작 설명]", () => {
      // Given (준비)
      // When (실행)
      // Then (검증)
    })

    it("예외 케이스: [에러 상황 설명]", () => {
      // ...
    })
  })
})
```

### 테스트 커버리지 기준

| 영역                           | 최소 커버리지 | 우선순위 |
| ------------------------------ | ------------- | -------- |
| 벡터 계산 로직 (`lib/vector/`) | **90%**       | 필수     |
| AI/LLM 로직 (`lib/ai/`)        | **80%**       | 필수     |
| API 엔드포인트 (`app/api/`)    | **80%**       | 필수     |
| 유틸리티 함수 (`lib/utils/`)   | **70%**       | 권장     |
| 커스텀 훅 (`hooks/`)           | **60%**       | 권장     |
| 컴포넌트 (`components/`)       | **50%**       | 선택     |

---

## API 설계 표준

### RESTful 규칙

```
GET    /api/{resource}              # 목록 조회 (+ 페이지네이션, 필터)
GET    /api/{resource}/:id          # 단일 조회
POST   /api/{resource}              # 생성
PATCH  /api/{resource}/:id          # 부분 수정
PUT    /api/{resource}/:id          # 전체 수정
DELETE /api/{resource}/:id          # 삭제
POST   /api/{resource}/:id/{action} # 커스텀 액션
```

### API 응답 형식

```typescript
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
    code: string
    message: string
    details?: unknown
  }
}
```

### 주요 API 엔드포인트

```
# 인증
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# 페르소나
GET    /api/personas
POST   /api/personas
GET    /api/personas/:id
PATCH  /api/personas/:id
DELETE /api/personas/:id

# 설문
GET    /api/surveys
POST   /api/surveys
GET    /api/surveys/:id
POST   /api/surveys/:id/respond

# 추천
POST   /api/recommendations
GET    /api/recommendations/:sessionId
```

---

## 상수 관리

### 6D 벡터 상수

```typescript
// src/constants/vector.constants.ts

export const VECTOR_DIMENSIONS = 6
export const DIMENSION_NAMES = [
  "depth", // 직관적 ↔ 심층적
  "lens", // 감성적 ↔ 논리적
  "stance", // 수용적 ↔ 비판적
  "scope", // 핵심만 ↔ 디테일
  "taste", // 클래식 ↔ 실험적
  "purpose", // 즐거움 ↔ 유용함
] as const

export const MATCHING_THRESHOLD = 0.7
export const HIGH_MATCH_THRESHOLD = 0.85
export const PERFECT_MATCH_THRESHOLD = 0.95
```

### 플랜 상수

```typescript
// src/constants/plan.constants.ts

export const PLAN_LIMITS = {
  FREE: { personas: 3, apiCalls: 1000 },
  STARTER: { personas: 10, apiCalls: 10000 },
  PRO: { personas: -1, apiCalls: 100000 },
  ENTERPRISE: { personas: -1, apiCalls: -1 },
} as const

export const PLAN_PRICES = {
  FREE: 0,
  STARTER: 49,
  PRO: 199,
  ENTERPRISE: null,
} as const
```

---

## 환경변수

### 앱별 포트 설정

| 앱                | 포트 | URL                   |
| ----------------- | ---- | --------------------- |
| Landing           | 3000 | http://localhost:3000 |
| Engine Studio     | 3001 | http://localhost:3001 |
| Developer Console | 3002 | http://localhost:3002 |
| PersonaWorld      | 3003 | http://localhost:3003 |

### 앱 간 연동 구조

```
┌─────────────────┐     API 호출      ┌─────────────────┐
│  PersonaWorld   │ ───────────────▶  │  Engine Studio  │
│   (port 3003)   │                   │   (port 3001)   │
└─────────────────┘                   └─────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│    Landing      │                   │ Developer       │
│   (port 3000)   │                   │ Console (3002)  │
└─────────────────┘                   └─────────────────┘
```

### Engine Studio (.env.local)

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3001"

# AI
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NEXT_PUBLIC_DEVELOPER_CONSOLE_URL="http://localhost:3002"

# Feature Flags
NEXT_PUBLIC_USE_MOCK_DATA="true"
FEATURE_DEMO_MODE="true"
```

### PersonaWorld (.env.local)

```env
# Engine Studio API 연동 (필수)
NEXT_PUBLIC_ENGINE_API_URL="http://localhost:3001"
```

### Developer Console (.env.local)

```env
# Engine Studio API 연동
NEXT_PUBLIC_APP_URL="http://localhost:3001"

# Billing (선택)
TOSS_CLIENT_KEY="..."
TOSS_SECRET_KEY="..."
```

### Landing (.env.local)

```env
# 각 앱 URL (CTA 버튼용)
NEXT_PUBLIC_ENGINE_STUDIO_URL="http://localhost:3001"
NEXT_PUBLIC_PERSONA_WORLD_URL="http://localhost:3003"
NEXT_PUBLIC_DEVELOPER_CONSOLE_URL="http://localhost:3002"
NEXT_PUBLIC_CONTACT_EMAIL="contact@deepsight.ai"
```

### 프로덕션 환경변수 예시

```env
# Engine Studio
NEXT_PUBLIC_APP_URL="https://engine.deepsight.ai"
NEXT_PUBLIC_DEVELOPER_CONSOLE_URL="https://console.deepsight.ai"

# PersonaWorld
NEXT_PUBLIC_ENGINE_API_URL="https://engine.deepsight.ai"

# Landing
NEXT_PUBLIC_ENGINE_STUDIO_URL="https://engine.deepsight.ai"
NEXT_PUBLIC_PERSONA_WORLD_URL="https://persona.deepsight.ai"
NEXT_PUBLIC_DEVELOPER_CONSOLE_URL="https://console.deepsight.ai"
```

---

## 프로덕션 배포

### 배포 플랫폼

- **Hosting**: Vercel (권장)
- **Database**: Supabase PostgreSQL
- **Cache**: Upstash Redis (선택)

### Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. "New Project" 클릭 → Region: `Northeast Asia (Seoul)` 권장

**Connection String** (Settings > Database > Connection string):

```
# Transaction mode (pgBouncer) - Serverless/Edge용
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# Session mode - Prisma 마이그레이션용
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

### Vercel 배포

```bash
# Vercel CLI 설치 및 로그인
pnpm add -g vercel && vercel login

# 각 앱에서 프로젝트 연결
cd apps/engine-studio && vercel link
cd apps/developer-console && vercel link
```

**도메인 설정** (Vercel Dashboard > Project > Settings > Domains):

- engine-studio: `engine.deepsight.ai`
- developer-console: `console.deepsight.ai`

### Database 마이그레이션

```bash
cd apps/engine-studio

# 스키마 푸시 (개발)
pnpm prisma db push

# 프로덕션 마이그레이션
pnpm prisma migrate dev --name init
pnpm prisma migrate deploy
```

### 배포 후 검증

```bash
curl https://engine.deepsight.ai/api/health
curl https://console.deepsight.ai/api/health
```

1. 로그인 테스트
2. 페르소나 생성/조회
3. API 키 발급
4. 매칭 시뮬레이터

### 보안 체크리스트

- [ ] `NEXTAUTH_SECRET` 32자 이상 랜덤 문자열
- [ ] `SUPABASE_SERVICE_ROLE_KEY` Production에만 설정
- [ ] `.env.local` 파일 `.gitignore`에 포함
- [ ] API Rate Limiting 설정
- [ ] CORS 설정 확인

---

_이 문서는 DeepSight 프로젝트의 상세 개발 가이드입니다._
_간결한 규칙은 CLAUDE.md를 참조하세요._
