"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useEffect } from "react"
import { useUserStore } from "@/lib/user-store"

/**
 * 세션이 인증되어 있지만 Zustand 스토어에 profile이 없는 경우
 * (localStorage 초기화, 새 기기 등) 자동으로 프로필을 복원.
 */
function ProfileRestorer() {
  const { data: session, status } = useSession()
  const { profile, setProfile } = useUserStore()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email || profile?.id) return

    fetch("/api/public/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        name: session.user.name ?? undefined,
        profileImageUrl: session.user.image ?? undefined,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const data = json.data
          setProfile({
            id: data.id,
            nickname: data.name || session.user?.name || data.email.split("@")[0],
            email: data.email,
            profileImageUrl: data.profileImageUrl ?? undefined,
            vector: null,
            vectorConfidence: null,
            completedOnboarding: data.completedOnboarding,
            createdAt: data.createdAt,
          })
        }
      })
      .catch(() => {
        // 복원 실패 시 무시 (로그인 페이지에서 재시도)
      })
  }, [status, session, profile, setProfile])

  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProfileRestorer />
      {children}
    </SessionProvider>
  )
}
