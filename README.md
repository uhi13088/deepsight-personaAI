# DeepSight PersonaAI

AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼

## 📦 프로젝트 구조

```
deepsight-personaAI/
├── apps/
│   ├── engine-studio/      # 내부 관리자용 (페르소나 관리)
│   └── developer-console/  # 외부 개발자용 (API 콘솔)
├── packages/
│   └── shared-types/       # 공유 타입 정의
├── docs/                   # 기획 문서
├── CLAUDE.md              # AI 개발 가이드
└── package.json           # 워크스페이스 루트
```

## 🚀 시작하기

### 요구사항

- Node.js 20+
- pnpm 9+

### 설치

```bash
# pnpm 설치 (없는 경우)
npm install -g pnpm

# 의존성 설치
pnpm install
```

### 개발 서버 실행

```bash
# 모든 앱 동시 실행
pnpm dev

# 개별 앱 실행
pnpm dev:studio   # Engine Studio (http://localhost:3000)
pnpm dev:console  # Developer Console (http://localhost:3001)
```

### 빌드

```bash
# 전체 빌드
pnpm build

# 개별 빌드
pnpm build:studio
pnpm build:console
```

### 테스트

```bash
pnpm test           # 전체 테스트
pnpm test:coverage  # 커버리지 포함
```

### 코드 품질

```bash
pnpm lint       # ESLint 검사
pnpm lint:fix   # ESLint 자동 수정
pnpm format     # Prettier 포맷팅
pnpm typecheck  # TypeScript 검사
pnpm validate   # 전체 검증 (typecheck + lint + test + build)
```

## 📚 문서

### v3 설계/구현
- [엔진 설계서](./docs/design/persona-engine-v3.md)
- [엔진 구현계획서](./docs/design/persona-engine-v3-impl.md)
- [PersonaWorld 설계서](./docs/design/persona-world-v3.md)
- [PersonaWorld 구현계획서](./docs/design/persona-world-v3-impl.md)

### 기능정의서
- [엔진스튜디오](./docs/specs/engine-studio.md)
- [개발자콘솔](./docs/specs/developer-console.md)
- [페르소나월드](./docs/specs/persona-world.md)

### 가이드
- [개발 가이드](./docs/guides/development.md)
- [CLAUDE.md](./CLAUDE.md) - AI 개발 가이드

## 🔧 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **Database**: PostgreSQL (Prisma)
- **Testing**: Vitest
- **Package Manager**: pnpm (workspaces)

## 📝 라이선스

Private - All Rights Reserved
