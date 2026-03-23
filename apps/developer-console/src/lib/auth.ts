/**
 * NextAuth Configuration - Developer Console
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { SESSION_CONFIG, SECURITY_CONFIG } from "@/config/app.config"

// Ensure auth URL has https:// protocol — Vercel may set values without it
function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `https://${url}`
}

if (process.env.AUTH_URL) {
  process.env.AUTH_URL = ensureProtocol(process.env.AUTH_URL)
} else if (process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = ensureProtocol(process.env.NEXTAUTH_URL)
} else if (process.env.VERCEL_URL) {
  process.env.AUTH_URL = `https://${process.env.VERCEL_URL}`
}

// ============================================================================
// 입력 검증 스키마
// ============================================================================

const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요").max(254),
  password: z
    .string()
    .min(
      SECURITY_CONFIG.passwordMinLength,
      `비밀번호는 최소 ${SECURITY_CONFIG.passwordMinLength}자 이상이어야 합니다`
    )
    .max(
      SECURITY_CONFIG.passwordMaxLength,
      `비밀번호는 최대 ${SECURITY_CONFIG.passwordMaxLength}자까지 가능합니다`
    ),
})

// ============================================================================
// 비밀번호 유틸리티
// ============================================================================

/**
 * 비밀번호 해싱
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// ============================================================================
// NextAuth 설정
// ============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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

          // 사용자 조회
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          })

          if (!user) {
            // 타이밍 공격 방지를 위한 더미 해싱
            await bcrypt.hash("dummy-password", 12)
            console.warn(`[Auth] User not found: ${email.substring(0, 3)}***`)
            return null
          }

          // 비밀번호가 없는 경우 (OAuth 전용 계정)
          if (!user.password) {
            console.warn(`[Auth] No password set: ${email.substring(0, 3)}***`)
            return null
          }

          // 비밀번호 검증
          const isValid = await verifyPassword(password, user.password)
          if (!isValid) {
            console.warn(`[Auth] Invalid password: ${email.substring(0, 3)}***`)
            return null
          }

          // 마지막 로그인 시간 업데이트
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          console.info(`[Auth] Login success: ${email.substring(0, 3)}***`)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("[Auth] Authorization error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // OAuth 로그인: User 자동 생성 + Account 연결
      if (account?.provider === "google" && user.email) {
        try {
          const email = user.email.toLowerCase()
          let dbUser = await prisma.user.findUnique({ where: { email } })

          if (!dbUser) {
            // 신규 사용자 생성
            dbUser = await prisma.user.create({
              data: {
                email,
                name: user.name ?? null,
                image: user.image ?? null,
                emailVerified: new Date(),
                lastLoginAt: new Date(),
              },
            })
            console.info(`[Auth] OAuth new user created: ${email.substring(0, 3)}***`)
          } else {
            // 기존 사용자 업데이트
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                lastLoginAt: new Date(),
                image: user.image ?? dbUser.image,
                emailVerified: dbUser.emailVerified ?? new Date(),
              },
            })
          }

          // Account 연결 (없으면 생성)
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          })

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                accessToken: account.access_token ?? null,
                refreshToken: account.refresh_token ?? null,
                expiresAt: account.expires_at ?? null,
                tokenType: account.token_type ?? null,
                scope: account.scope ?? null,
                idToken: account.id_token ?? null,
              },
            })
          }

          // JWT에서 사용할 DB user ID 설정
          user.id = dbUser.id
        } catch (error) {
          console.error("[Auth] OAuth signIn error:", error)
          return false
        }
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      // OAuth 최초 로그인 시 provider 정보 저장
      if (account) {
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // 오픈 리다이렉트 방지
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_CONFIG.maxAge,
    updateAge: SESSION_CONFIG.updateAge,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
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
  trustHost: true,
})

// ============================================================================
// 타입 확장
// ============================================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image?: string | null
    }
  }
}
