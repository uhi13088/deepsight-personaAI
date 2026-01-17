import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { z } from "zod"
import type { UserRole } from "@/types"

// 임시 사용자 데이터 (실제로는 DB에서 조회)
const MOCK_USERS = [
  {
    id: "1",
    email: "admin@deepsight.ai",
    password: "admin123",
    name: "관리자",
    role: "ADMIN" as UserRole,
    image: null,
  },
  {
    id: "2",
    email: "engineer@deepsight.ai",
    password: "engineer123",
    name: "AI 엔지니어",
    role: "AI_ENGINEER" as UserRole,
    image: null,
  },
  {
    id: "3",
    email: "content@deepsight.ai",
    password: "content123",
    name: "콘텐츠 매니저",
    role: "CONTENT_MANAGER" as UserRole,
    image: null,
  },
  {
    id: "4",
    email: "analyst@deepsight.ai",
    password: "analyst123",
    name: "분석가",
    role: "ANALYST" as UserRole,
    image: null,
  },
]

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

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
          const { email, password } = loginSchema.parse(credentials)

          // Mock 인증 (실제로는 DB 조회)
          const user = MOCK_USERS.find(
            (u) => u.email === email && u.password === password
          )

          if (!user) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch {
          return null
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: UserRole }).role || "ANALYST"
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
      // 로그인 후 대시보드로 리다이렉트
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
    maxAge: 24 * 60 * 60, // 24시간
  },
  secret: process.env.NEXTAUTH_SECRET,
})

// 타입 확장
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

