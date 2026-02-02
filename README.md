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

- [기능정의서 - 엔진스튜디오](./docs/[기능정의서]%20DeepSight_엔진스튜디오.md)
- [기능정의서 - 개발자콘솔](./docs/[기능정의서]%20DeepSight_개발자콘솔.md)
- [마케팅 가이드](./docs/[가이드]%20DeepSight_마케팅%20및%20가격%20전략%20가이드.md)
- [개발 가이드](./docs/[개발가이드]%20DeepSight_클로드코드.md)
- [CLAUDE.md](./CLAUDE.md) - AI 자동 개발 가이드

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
