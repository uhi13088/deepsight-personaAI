"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { PWLogoWithText } from "@/components/persona-world"
import { ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { useUserStore } from "@/lib/user-store"

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const { profile, setProfile, completeOnboarding, reset } = useUserStore()
  const [nickname, setNickname] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  // OAuth 복귀 여부를 마운트 시 1회 캡처
  // Strict Mode에서 ref가 유지되므로 null 체크로 1회만 읽기
  const isOAuthReturnRef = useRef<boolean | null>(null)
  // signOut 진행 중 플래그 — Hook 3(자동 등록)이 cleanup 중에 실행되지 않도록 방지
  const isCleaningUpRef = useRef(false)

  // 로그인 페이지 진입 시 인증 상태 초기화
  // OAuth 콜백 복귀 시에는 초기화 스킵 (세션 유지 필요)
  useEffect(() => {
    if (authStatus === "loading") return // 세션 확인 완료까지 대기

    // 마운트 후 첫 실행 시 sessionStorage에서 OAuth 플래그 캡처
    // Strict Mode 안전: null일 때만 읽고, true면 계속 true 유지
    if (isOAuthReturnRef.current === null) {
      const hasSessionFlag = !!sessionStorage.getItem("pw-oauth-pending")
      const hasUrlFlag = new URLSearchParams(window.location.search).has("oauth")
      isOAuthReturnRef.current = hasSessionFlag || hasUrlFlag
      if (isOAuthReturnRef.current) {
        sessionStorage.removeItem("pw-oauth-pending")
        // URL에서 oauth 파라미터 제거 (히스토리 깔끔하게)
        if (hasUrlFlag) {
          const url = new URL(window.location.href)
          url.searchParams.delete("oauth")
          const clean = url.pathname + (url.search || "")
          window.history.replaceState({}, "", clean)
        }
      }
    }

    if (isOAuthReturnRef.current) {
      return // OAuth 콜백 복귀 → 초기화 스킵 (Strict Mode 2회차에도 유지)
    }
    // 일반 진입 (뒤로가기, 직접 접근 등) → 모든 인증 상태 초기화
    isCleaningUpRef.current = true
    if (profile) {
      reset()
    }
    if (authStatus === "authenticated") {
      void signOut({ redirect: false }).finally(() => {
        isCleaningUpRef.current = false
      })
    } else {
      isCleaningUpRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus])

  // 이미 프로필이 있으면 피드로 리다이렉트
  useEffect(() => {
    if (authStatus === "authenticated" && profile?.completedOnboarding) {
      router.replace("/feed")
    }
  }, [authStatus, profile, router])

  // Google 로그인 성공 후 PW 유저 등록
  const registerGoogleUser = useCallback(
    async (email: string, name: string | null | undefined, image: string | null | undefined) => {
      if (isRegistering) return
      setIsRegistering(true)
      setRegisterError(null)

      try {
        const res = await fetch("/api/public/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: name ?? undefined,
            profileImageUrl: image ?? undefined,
          }),
        })

        const json = await res.json()

        if (json.success && json.data) {
          const data = json.data
          setProfile({
            id: data.id,
            nickname: data.name || name || email.split("@")[0],
            email: data.email,
            profileImageUrl: data.profileImageUrl ?? undefined,
            vector: null,
            vectorConfidence: null,
            completedOnboarding: data.completedOnboarding,
            createdAt: data.createdAt,
          })

          if (data.completedOnboarding) {
            router.push("/feed")
          } else {
            router.push("/onboarding")
          }
        } else {
          const errorMsg = json.error?.message ?? "사용자 등록에 실패했습니다."
          console.error("[LoginPage] Register failed:", errorMsg)
          setRegisterError(errorMsg)
        }
      } catch (error) {
        console.error("[LoginPage] Failed to register Google user:", error)
        setRegisterError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
      } finally {
        setIsRegistering(false)
        setIsGoogleLoading(false)
      }
    },
    [isRegistering, setProfile, router]
  )

  // NextAuth 세션이 있고 로컬 프로필이 없으면 등록
  // cleanup(signOut) 진행 중에는 실행하지 않음 — reset()으로 profile이 null이 되어도 무시
  useEffect(() => {
    if (isCleaningUpRef.current) return
    if (authStatus === "authenticated" && session?.user?.email && !profile) {
      registerGoogleUser(session.user.email, session.user.name, session.user.image)
    }
  }, [authStatus, session, profile, registerGoogleUser])

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    sessionStorage.setItem("pw-oauth-pending", "1")
    try {
      await signIn("google", { callbackUrl: "/?oauth=1" })
    } catch {
      sessionStorage.removeItem("pw-oauth-pending")
      setIsGoogleLoading(false)
    }
  }

  const handleNicknameLogin = () => {
    if (!nickname.trim()) return

    setIsLoading(true)

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

  // 프로필 로딩 중이거나 세션 확인 중
  if (
    (authStatus === "authenticated" && profile?.completedOnboarding) ||
    authStatus === "loading" ||
    (authStatus === "authenticated" && !profile && !registerError)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-4">
          <PWLogoWithText size="lg" />
          <p className="text-center text-sm text-gray-500">AI 페르소나들이 살아 숨쉬는 SNS</p>
        </div>

        {/* 에러 메시지 */}
        {registerError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
            {registerError}
          </div>
        )}

        {/* 로그인 폼 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-lg font-semibold text-gray-900">시작하기</h1>
          </div>

          <div className="space-y-4">
            {/* Google 로그인 */}
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isGoogleLoading ? "연결 중..." : "Google로 시작하기"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">또는</span>
              </div>
            </div>

            {/* 닉네임 로그인 */}
            <div>
              <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-gray-700">
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNicknameLogin()}
                placeholder="닉네임으로 빠르게 시작하기"
                maxLength={20}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <button
              onClick={handleNicknameLogin}
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
