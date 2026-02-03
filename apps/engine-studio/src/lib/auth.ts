/**
 * NextAuth Configuration - Production Ready
 * 실제 DB와 연동된 인증 시스템
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { z } from "zod"
import bcrypt from "bcryptjs"
import type { UserRole } from "@/types"
import { prisma } from "@/lib/prisma"
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
  adapter: PrismaAdapter(prisma),
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

          // 비활성 계정 체크
          if (!user.isActive) {
            console.warn(`[Auth] Inactive account: ${email.substring(0, 3)}***`)
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

      // 토큰 갱신 시 DB에서 사용자 정보 확인
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true },
        })
        if (dbUser && dbUser.isActive) {
          token.role = dbUser.role
        }
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
    async signIn({ user, account }) {
      // OAuth 로그인 시 사용자 역할 설정
      if (account?.provider !== "credentials" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (!existingUser) {
          // 새 OAuth 사용자는 ANALYST 역할로 생성됨
        }
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
