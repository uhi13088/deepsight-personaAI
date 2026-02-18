# Google OAuth 회원가입 구현 계획

## 범위

| 앱                    | 작업              | 설명                                      |
| --------------------- | ----------------- | ----------------------------------------- |
| **Developer Console** | Google OAuth 연동 | 기존 UI 버튼 → 백엔드 연결 + 회원가입 API |
| **Persona World**     | Google OAuth 신규 | 인증 시스템 전체 구축                     |
| **Engine Studio**     | 제외              | 별도 자체 등록 시스템 (추후)              |

## 환경변수 (사용자 설정 필요)

각 앱의 `.env.local`에 아래 변수가 필요합니다:

```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3001  # (콘솔) 또는 3002 (PW)
```

---

## Phase 1: Developer Console — Google OAuth 활성화

### 1-1. `auth.ts` — Google Provider 추가

- `next-auth/providers/google` import + providers 배열에 추가
- signIn 콜백: OAuth 로그인 시 User 자동 생성 (기존 이메일 → Account 연결)
- JWT 콜백: Google 프로필 (name, image) 토큰에 추가

### 1-2. `register/page.tsx` — OAuth 실제 연결

- `handleOAuthRegister`의 setTimeout 제거 → `signIn("google")` 실제 호출

### 1-3. `api/auth/register/route.ts` (신규)

- 이메일 회원가입 POST API
- 검증: 이름 필수, 이메일 형식+중복, 비밀번호 강도
- bcrypt 해싱 → User 생성 → 성공 응답 (로그인은 클라이언트에서 signIn 호출)

### 1-4. `register/page.tsx` — 이메일 가입 연결

- handleSubmit에서 `/api/auth/register` POST → 성공 시 signIn("credentials")

---

## Phase 2: Persona World — Google OAuth 신규 구축

**아키텍처 결정: JWT-only NextAuth (DB 없음)**

- PW는 Prisma/DB가 없으므로 JWT 세션만 사용
- Google 프로필(이름/이메일/이미지)은 JWT 토큰에 저장
- 기존 Zustand 로컬 스토어(좋아요, 팔로우 등) 그대로 유지
- Google 로그인 성공 → Zustand 프로필 자동 생성/동기화

### 2-1. 의존성 추가

```
pnpm --filter persona-world add next-auth@^5.0.0-beta.25
```

### 2-2. `lib/auth.ts` (신규)

- Google provider + JWT 전략 (adapter 없음)
- JWT 콜백: sub(Google ID), email, name, image 저장
- pages: signIn → "/"

### 2-3. `api/auth/[...nextauth]/route.ts` (신규)

- NextAuth 핸들러 re-export

### 2-4. `components/auth-provider.tsx` (신규)

- SessionProvider 래퍼

### 2-5. `layout.tsx` 수정

- AuthProvider 추가

### 2-6. `page.tsx` 수정 (로그인 페이지)

- "Google로 시작하기" 버튼 추가 (기존 닉네임 입력 위에)
- Google 로그인 후 → 세션에서 프로필 자동 생성 → 온보딩/피드 이동
- 기존 닉네임 입력 (관찰자 모드) 유지

### 2-7. `lib/user-store.ts` 수정

- `setProfileFromSession()` 추가: NextAuth 세션 → Zustand 프로필 생성
- 닉네임 = Google 이름, id = Google sub

---

## 검증

- Developer Console: `pnpm --filter developer-console build` PASS
- Persona World: `pnpm --filter persona-world build` PASS
- 런타임 Google OAuth 테스트는 환경변수 설정 후 수동 확인 필요
