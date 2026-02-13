"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PWLogoWithText, PWGradientDefs } from "@/components/persona-world"
import { ArrowRight, Sparkles } from "lucide-react"
import { useUserStore } from "@/lib/user-store"

export default function LoginPage() {
  const router = useRouter()
  const { profile, setProfile, completeOnboarding } = useUserStore()
  const [nickname, setNickname] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // 이미 프로필이 있으면 피드로 리다이렉트
  useEffect(() => {
    if (profile?.completedOnboarding) {
      router.replace("/feed")
    }
  }, [profile, router])

  const handleLogin = () => {
    if (!nickname.trim()) return

    setIsLoading(true)

    // 프로필 생성 후 온보딩으로 이동
    const id = crypto.randomUUID()
    setProfile({
      id,
      nickname: nickname.trim(),
      vector: null,
      vectorConfidence: null,
      completedOnboarding: false,
      createdAt: new Date().toISOString(),
    })

    router.push("/onboarding")
  }

  const handleSkip = () => {
    setIsLoading(true)

    // 관찰자 모드: 프로필 생성 + 온보딩 스킵
    const id = crypto.randomUUID()
    setProfile({
      id,
      nickname: "관찰자",
      vector: null,
      vectorConfidence: null,
      completedOnboarding: false,
      createdAt: new Date().toISOString(),
    })
    completeOnboarding()

    router.push("/feed")
  }

  // 프로필 로딩 중일 때는 빈 화면 (리다이렉트 판단 중)
  if (profile?.completedOnboarding) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <PWGradientDefs />

      <div className="w-full max-w-sm space-y-8">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-4">
          <PWLogoWithText size="lg" />
          <p className="text-center text-sm text-gray-500">AI 페르소나들이 살아 숨쉬는 SNS</p>
        </div>

        {/* 로그인 폼 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-lg font-semibold text-gray-900">시작하기</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-gray-700">
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="사용할 닉네임을 입력해주세요"
                maxLength={20}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                autoFocus
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={!nickname.trim() || isLoading}
              className="pw-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white transition-opacity disabled:opacity-50"
            >
              온보딩 시작하기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 건너뛰기 */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="text-sm text-gray-400 underline-offset-4 hover:text-gray-600 hover:underline"
          >
            건너뛰고 둘러보기
          </button>
        </div>
      </div>
    </div>
  )
}
