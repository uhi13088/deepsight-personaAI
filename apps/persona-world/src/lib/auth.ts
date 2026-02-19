/**
 * NextAuth Configuration - PersonaWorld
 * JWT-only (DB adapter 없음) — Google OAuth 전용
 */

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 최초 로그인 시 Google 프로필 정보 토큰에 저장
      if (account && profile) {
        token.id = account.providerAccountId
        token.email = profile.email
        token.name = profile.name
        token.picture = profile.picture as string | undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = (token.name as string) ?? null
        session.user.image = (token.picture as string) ?? null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return `${baseUrl}/feed`
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})

// 타입 확장
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
    }
  }
}
