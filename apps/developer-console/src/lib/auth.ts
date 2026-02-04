/**
 * NextAuth Configuration - Developer Console
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { SESSION_CONFIG, SECURITY_CONFIG } from "@/config/app.config"

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
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
    async signIn() {
      return true
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
