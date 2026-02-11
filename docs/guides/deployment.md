# DeepSight 프로덕션 배포 가이드

## 개요

DeepSight는 두 개의 Next.js 앱으로 구성된 pnpm 모노레포입니다:

- **engine-studio**: AI 엔진 관리 (기본 포트 3000)
- **developer-console**: 개발자 대시보드 (기본 포트 3001)

## 배포 플랫폼

- **Hosting**: Vercel (권장)
- **Database**: Supabase PostgreSQL
- **Cache**: Upstash Redis (선택)

---

## 1. Supabase 설정

### 1.1 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. "New Project" 클릭
3. 설정:
   - Name: `deepsight-production`
   - Region: `Northeast Asia (Seoul)` 권장
   - Password: 강력한 비밀번호 생성 (저장해두기)

### 1.2 Connection String 확인

**Settings > Database > Connection string**

```
# Transaction mode (pgBouncer) - Serverless/Edge용
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# Session mode - Prisma 마이그레이션용
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

### 1.3 API Keys 확인

**Settings > API**

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public
- `SUPABASE_SERVICE_ROLE_KEY`: service_role (비공개)

---

## 2. Vercel 배포

### 2.1 프로젝트 연결

```bash
# Vercel CLI 설치
pnpm add -g vercel

# 로그인
vercel login

# 프로젝트 연결 (각 앱에서 실행)
cd apps/engine-studio && vercel link
cd apps/developer-console && vercel link
```

### 2.2 환경변수 설정

**Vercel Dashboard > Project > Settings > Environment Variables**

#### Engine Studio 필수 환경변수

| Variable                        | Value                         | Environment         |
| ------------------------------- | ----------------------------- | ------------------- |
| `DATABASE_URL`                  | Supabase Transaction URL      | Production, Preview |
| `DIRECT_URL`                    | Supabase Session URL          | Production, Preview |
| `NEXTAUTH_SECRET`               | `openssl rand -base64 32`     | Production, Preview |
| `NEXTAUTH_URL`                  | `https://engine.deepsight.ai` | Production          |
| `NEXT_PUBLIC_APP_URL`           | `https://engine.deepsight.ai` | Production          |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Project URL          | All                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key             | All                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Service Role Key     | Production          |
| `OPENAI_API_KEY`                | OpenAI API Key                | Production          |

#### Developer Console 필수 환경변수

| Variable                        | Value                          | Environment         |
| ------------------------------- | ------------------------------ | ------------------- |
| `NEXT_PUBLIC_APP_URL`           | `https://console.deepsight.ai` | Production          |
| `NEXT_PUBLIC_ENGINE_STUDIO_URL` | `https://engine.deepsight.ai`  | All                 |
| `NEXTAUTH_SECRET`               | (Engine Studio와 동일)         | Production, Preview |
| `NEXTAUTH_URL`                  | `https://console.deepsight.ai` | Production          |

### 2.3 도메인 설정

**Vercel Dashboard > Project > Settings > Domains**

- engine-studio: `engine.deepsight.ai`
- developer-console: `console.deepsight.ai`

---

## 3. Database 마이그레이션

### 3.1 Prisma 스키마 배포

```bash
# 환경변수 로드
cd apps/engine-studio

# 스키마 푸시 (개발)
pnpm prisma db push

# 마이그레이션 생성 (프로덕션)
pnpm prisma migrate dev --name init

# 프로덕션 마이그레이션 적용
pnpm prisma migrate deploy
```

### 3.2 시드 데이터 (선택)

```bash
pnpm prisma db seed
```

---

## 4. 배포 실행

### 4.1 CLI 배포

```bash
# Engine Studio 배포
cd apps/engine-studio
vercel --prod

# Developer Console 배포
cd apps/developer-console
vercel --prod
```

### 4.2 Git 자동 배포

1. GitHub 저장소 연결
2. `main` 브랜치 푸시 → 자동 배포

---

## 5. 환경변수 체크리스트

### Engine Studio

```
✅ DATABASE_URL
✅ DIRECT_URL
✅ NEXTAUTH_SECRET
✅ NEXTAUTH_URL
✅ NEXT_PUBLIC_APP_URL
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ OPENAI_API_KEY (AI 기능용)
⬜ UPSTASH_REDIS_REST_URL (선택)
⬜ UPSTASH_REDIS_REST_TOKEN (선택)
```

### Developer Console

```
✅ NEXT_PUBLIC_APP_URL
✅ NEXT_PUBLIC_ENGINE_STUDIO_URL
✅ NEXTAUTH_SECRET
✅ NEXTAUTH_URL
```

---

## 6. 배포 후 검증

### 6.1 헬스체크

```bash
curl https://engine.deepsight.ai/api/health
curl https://console.deepsight.ai/api/health
```

### 6.2 기능 테스트

1. 로그인 테스트
2. 페르소나 생성/조회
3. API 키 발급
4. 매칭 시뮬레이터

---

## 7. 트러블슈팅

### 데이터베이스 연결 실패

```
Error: Can't reach database server
```

→ `DATABASE_URL`이 Transaction mode (port 6543)인지 확인

### Prisma 마이그레이션 오류

```
Error: P1001: Can't reach database server
```

→ `DIRECT_URL`이 Session mode (port 5432)인지 확인

### NextAuth 오류

```
Error: NEXTAUTH_SECRET is not set
```

→ 환경변수 설정 확인, Vercel에서 Environment Variables 확인

---

## 8. 보안 체크리스트

- [ ] `NEXTAUTH_SECRET` 32자 이상 랜덤 문자열
- [ ] `SUPABASE_SERVICE_ROLE_KEY` Production에만 설정
- [ ] `.env.local` 파일 `.gitignore`에 포함
- [ ] API Rate Limiting 설정
- [ ] CORS 설정 확인

---

## 참고 링크

- [Vercel 환경변수 문서](https://vercel.com/docs/environment-variables)
- [Supabase Prisma 연동](https://supabase.com/docs/guides/integrations/prisma)
- [NextAuth.js 배포](https://next-auth.js.org/deployment)
