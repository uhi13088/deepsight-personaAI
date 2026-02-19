/**
 * NextAuth Configuration - Engine Studio
 * Google OAuth 전용 + 초대제 (허용된 이메일만 로그인 가능)
 */

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"

// ============================================================================
// 초대제: 허용된 이메일 목록
// 환경변수 ALLOWED_EMAILS에 쉼표로 구분하여 설정
// 예: ALLOWED_EMAILS=admin@deepsight.com,dev@deepsight.com
// ============================================================================

function getAllowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS?.trim()
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
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
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return false
      }

      const email = user.email.toLowerCase()

      // 초대제: 허용된 이메일만 로그인 가능
      const allowedEmails = getAllowedEmails()
      console.info(
        `[Auth] Login attempt: ${email.substring(0, 3)}***, allowed list size: ${allowedEmails.size}`
      )
      if (allowedEmails.size > 0 && !allowedEmails.has(email)) {
        console.warn(`[Auth] Blocked non-invited email: ${email.substring(0, 3)}***`)
        return "/login?error=AccessDenied"
      }

      try {
        // DB에 사용자 upsert
        let dbUser = await prisma.user.findUnique({ where: { email } })

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? null,
              image: user.image ?? null,
              lastLoginAt: new Date(),
            },
          })
          console.info(`[Auth] New user created: ${email.substring(0, 3)}***`)
        } else {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              lastLoginAt: new Date(),
              image: user.image ?? dbUser.image,
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
        console.error("[Auth] OAuth signIn DB error:", error)
        return "/login?error=DatabaseError"
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
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
    maxAge: 30 * 24 * 60 * 60, // 30일
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
