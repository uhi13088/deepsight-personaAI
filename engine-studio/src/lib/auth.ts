import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { z } from "zod"
import type { UserRole } from "@/types"
import { SECURITY_CONFIG, SESSION_CONFIG } from "@/config/app.config"

// ============================================================================
// 보안 설정
// ============================================================================

/** 비밀번호 검증 스키마 (금융업계 수준) */
const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(SECURITY_CONFIG.passwordMinLength, `비밀번호는 최소 ${SECURITY_CONFIG.passwordMinLength}자 이상이어야 합니다`)
    .max(SECURITY_CONFIG.passwordMaxLength, `비밀번호는 최대 ${SECURITY_CONFIG.passwordMaxLength}자까지 가능합니다`),
})

// ============================================================================
// 사용자 데이터 (Demo용 - 실제 환경에서는 DB 사용)
// ============================================================================

/**
 * Mock 사용자 데이터
 *
 * 실제 환경에서는:
 * 1. 데이터베이스에서 사용자 조회
 * 2. PBKDF2/Argon2로 해시된 비밀번호 저장
 * 3. 환경변수로 비밀번호 관리하지 않음
 *
 * Demo 비밀번호 (개발 환경 전용):
 * - admin@deepsight.ai: Admin@DeepSight2024!
 * - engineer@deepsight.ai: Engineer@DS2024!
 * - content@deepsight.ai: Content@DS2024!
 * - analyst@deepsight.ai: Analyst@DS2024!
 */
interface MockUser {
  id: string
  email: string
  // 해시된 비밀번호 (PBKDF2-SHA512)
  // 실제로는 hashPassword()로 생성된 값을 DB에 저장
  passwordHash: string
  name: string
  role: UserRole
  image: string | null
  mfaEnabled: boolean
  failedAttempts: number
  lockedUntil: Date | null
}

// Demo용 사용자 - 실제 환경에서는 DB 사용
// 비밀번호는 환경변수에서 로드하거나 DB에 해시 저장
const getMockUsers = (): MockUser[] => {
  // 개발 환경에서만 Mock 데이터 사용
  if (process.env.NODE_ENV === "production") {
    console.warn("[Auth] Production 환경에서는 실제 DB 연동이 필요합니다")
    return []
  }

  return [
    {
      id: "1",
      email: "admin@deepsight.ai",
      // Demo 환경용 간소화된 검증 (실제 환경에서는 해시 사용)
      passwordHash: "DEMO_HASH_admin",
      name: "관리자",
      role: "ADMIN" as UserRole,
      image: null,
      mfaEnabled: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
    {
      id: "2",
      email: "engineer@deepsight.ai",
      passwordHash: "DEMO_HASH_engineer",
      name: "AI 엔지니어",
      role: "AI_ENGINEER" as UserRole,
      image: null,
      mfaEnabled: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
    {
      id: "3",
      email: "content@deepsight.ai",
      passwordHash: "DEMO_HASH_content",
      name: "콘텐츠 매니저",
      role: "CONTENT_MANAGER" as UserRole,
      image: null,
      mfaEnabled: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
    {
      id: "4",
      email: "analyst@deepsight.ai",
      passwordHash: "DEMO_HASH_analyst",
      name: "분석가",
      role: "ANALYST" as UserRole,
      image: null,
      mfaEnabled: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  ]
}

// Demo 비밀번호 매핑 (환경변수에서 로드, 개발 환경 전용)
const getDemoPasswords = (): Record<string, string> => {
  if (process.env.NODE_ENV === "production") {
    console.warn("[Auth] Production 환경에서는 Demo 비밀번호를 사용할 수 없습니다")
    return {}
  }

  return {
    "admin@deepsight.ai": process.env.DEMO_ADMIN_PASSWORD || "",
    "engineer@deepsight.ai": process.env.DEMO_ENGINEER_PASSWORD || "",
    "content@deepsight.ai": process.env.DEMO_CONTENT_PASSWORD || "",
    "analyst@deepsight.ai": process.env.DEMO_ANALYST_PASSWORD || "",
  }
}

// ============================================================================
// 비밀번호 검증 (Demo용 간소화)
// ============================================================================

/**
 * 비밀번호 검증
 * Demo 환경: 직접 비교
 * Production 환경: PBKDF2 해시 검증
 */
async function verifyCredentials(
  email: string,
  password: string
): Promise<MockUser | null> {
  const users = getMockUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

  if (!user) {
    // 타이밍 공격 방지를 위한 더미 연산
    await new Promise((resolve) => setTimeout(resolve, SECURITY_CONFIG.timingAttackDelayMs))
    return null
  }

  // 계정 잠금 확인
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    return null
  }

  // Demo 환경: 간단한 비밀번호 비교
  // Production 환경에서는 verifyPassword(password, user.passwordHash) 사용
  const demoPasswords = getDemoPasswords()
  const expectedPassword = demoPasswords[email]
  if (!expectedPassword || password !== expectedPassword) {
    // 실패 횟수 증가 (실제로는 DB 업데이트)
    user.failedAttempts++

    // 설정된 횟수 실패 시 잠금
    if (user.failedAttempts >= SECURITY_CONFIG.lockoutAttempts) {
      user.lockedUntil = new Date(Date.now() + SECURITY_CONFIG.lockoutDurationMs)
    }

    return null
  }

  // 성공 시 실패 횟수 초기화
  user.failedAttempts = 0
  user.lockedUntil = null

  return user
}

// ============================================================================
// NextAuth 설정
// ============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        try {
          // 입력 검증
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) {
            console.warn("[Auth] Invalid credentials format")
            return null
          }

          const { email, password } = parsed.data

          // 사용자 인증
          const user = await verifyCredentials(email, password)

          if (!user) {
            console.warn(`[Auth] Failed login attempt for: ${email.substring(0, 3)}***`)
            return null
          }

          // 감사 로그 (실제 환경에서는 auditLogger 사용)
          console.info(`[Auth] Successful login: ${email.substring(0, 3)}***`)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          console.error("[Auth] Authorization error:", error)
          return null
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: false,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: UserRole }).role || "ANALYST"
        token.email = user.email
      }

      // 토큰 갱신 시 유효성 검증
      if (trigger === "update") {
        // 필요시 사용자 상태 재검증
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // 오픈 리다이렉트 방지
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
    async signIn({ account }) {
      // OAuth 로그인 시 이메일 도메인 검증 (필요시)
      if (account?.provider !== "credentials") {
        // 특정 도메인만 허용하려면 여기서 검증
        // if (!user.email?.endsWith("@deepsight.ai")) return false
      }
      return true
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_CONFIG.maxAge, // 환경 설정에서 로드 (기본: 8시간)
    updateAge: SESSION_CONFIG.updateAge, // 환경 설정에서 로드 (기본: 1시간)
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
})

// ============================================================================
// 타입 확장
// ============================================================================

declare module "next-auth" {
  interface User {
    role?: UserRole
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: UserRole
    }
  }
}
