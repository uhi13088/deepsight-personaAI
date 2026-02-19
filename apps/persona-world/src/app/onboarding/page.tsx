"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import {
  PWLogoWithText,
  PWButton,
  PWCard,
  PWSpinner,
  PWQuestionCard,
  PWMatchingPreview,
  PWProfileLevelBadge,
  PWSnsConnect,
} from "@/components/persona-world"
import { ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Coins, Link2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type { OnboardingQuestion, OnboardingAnswer } from "@/lib/types"
import { getProfileLevelByPhase, PHASE_CREDITS } from "@/lib/profile-level"

// ── Phase 설정 ──────────────────────────────────────────────

const PHASE_INFO = [
  {
    phase: 1 as const,
    title: "Phase 1: 취향 탐색",
    subtitle: "L1 사회적 가면 분석",
    description: "콘텐츠를 접하는 당신만의 스타일을 파악해볼게요",
    emoji: "🌱",
    estimatedTime: "~80초",
  },
  {
    phase: 2 as const,
    title: "Phase 2: 깊이 탐색",
    subtitle: "교차 차원 분석",
    description: "취향의 교차 패턴을 분석해 더 정확한 매칭을 찾아볼게요",
    emoji: "⭐",
    estimatedTime: "~80초",
  },
  {
    phase: 3 as const,
    title: "Phase 3: 정밀 분석",
    subtitle: "심층 교차검증 + 역설 감지",
    description: "숨겨진 역설 패턴을 찾아 최고 수준의 매칭을 완성해볼게요",
    emoji: "💎",
    estimatedTime: "~80초",
  },
]

// ── 온보딩 플로우 상태 ──────────────────────────────────────

type FlowStep = "intro" | "questions" | "preview" | "complete"

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <PWSpinner size="md" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    onboarding,
    startPhase,
    savePhaseAnswers,
    completePhase,
    completeOnboarding,
    resetCurrentPhase,
    profile,
    setProfile,
  } = useUserStore()

  // 플로우 상태
  const [flowStep, setFlowStep] = useState<FlowStep>("intro")
  const [activePhase, setActivePhase] = useState<1 | 2 | 3>(1)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)

  // 질문 데이터
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // 이탈 경고
  const [showExitWarning, setShowExitWarning] = useState(false)

  // SNS 연결 상태
  const [snsConnectedPlatform, setSnsConnectedPlatform] = useState<string | null>(null)
  const [snsError, setSnsError] = useState<string | null>(null)

  // 게이미피케이션 피드백
  const [showMidpoint, setShowMidpoint] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [earnedCredits, setEarnedCredits] = useState(0)

  // SNS OAuth 콜백 결과 처리
  useEffect(() => {
    const connected = searchParams.get("sns_connected")
    const error = searchParams.get("sns_error")
    if (connected) {
      setSnsConnectedPlatform(connected)
    }
    if (error) {
      setSnsError(decodeURIComponent(error))
    }
  }, [searchParams])

  // 재진입: 이전 Phase 완료 후 시작
  useEffect(() => {
    const completed = onboarding.completedPhases
    if (completed.includes(3)) {
      setFlowStep("complete")
    } else if (completed.includes(2)) {
      setActivePhase(3)
    } else if (completed.includes(1)) {
      setActivePhase(2)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 질문 로드
  const loadQuestions = useCallback(async (phase: 1 | 2 | 3) => {
    setLoading(true)
    try {
      const data = await clientApi.getOnboardingQuestions(phase)
      setQuestions(data.questions)
      setAnswers({})
      setCurrentQuestionIdx(0)
    } catch {
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Phase 시작
  const handleStartPhase = async () => {
    startPhase(activePhase)
    setFlowStep("questions")
    await loadQuestions(activePhase)
  }

  // 답변 선택
  const handleAnswer = (value: string) => {
    const q = questions[currentQuestionIdx]
    if (!q) return
    setAnswers((prev) => ({ ...prev, [q.id]: value }))
  }

  // 다음 문항
  const handleNext = async () => {
    // 게이미피케이션: 절반 지점
    if (currentQuestionIdx === 3 && !showMidpoint) {
      setShowMidpoint(true)
      setTimeout(() => setShowMidpoint(false), 2000)
    }

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1)
    } else {
      // Phase 완료: API 제출
      await handlePhaseComplete()
    }
  }

  // 이전 문항
  const handleBack = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1)
    }
  }

  // Phase 완료 처리
  const handlePhaseComplete = async () => {
    setLoading(true)
    try {
      // 프로필이 없으면 자동 생성 (온보딩이 프로필 생성 과정)
      let userId = profile?.id
      if (!userId) {
        userId = crypto.randomUUID()
        setProfile({
          id: userId,
          nickname: "관찰자",
          vector: null,
          vectorConfidence: null,
          completedOnboarding: false,
          createdAt: new Date().toISOString(),
        })
      }
      const answerPayload: OnboardingAnswer[] = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          value,
        })
      )

      // API 제출
      const result = await clientApi.submitOnboardingAnswers(userId, activePhase, answerPayload)

      // 스토어 업데이트
      savePhaseAnswers(activePhase, answerPayload)
      const level = getProfileLevelByPhase(activePhase)
      completePhase(activePhase, result.creditsAwarded, level)

      // 크레딧 피드백
      setEarnedCredits(result.creditsAwarded)
      setShowCredits(true)
      setTimeout(() => setShowCredits(false), 2500)

      // 프리뷰로 전환
      setFlowStep("preview")
    } catch {
      // API 실패 시에도 로컬 저장 후 프리뷰 표시
      const answerPayload: OnboardingAnswer[] = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          value,
        })
      )
      savePhaseAnswers(activePhase, answerPayload)
      const level = getProfileLevelByPhase(activePhase)
      completePhase(activePhase, PHASE_CREDITS[activePhase] ?? 0, level)
      setFlowStep("preview")
    } finally {
      setLoading(false)
    }
  }

  // 다음 Phase로 진행
  const handleContinueToNextPhase = () => {
    const next = (activePhase + 1) as 1 | 2 | 3
    if (next <= 3) {
      setActivePhase(next)
      setFlowStep("intro")
    }
  }

  // 온보딩 완료 → 피드 이동
  const handleFinish = () => {
    completeOnboarding()
    setFlowStep("complete")
    router.push("/feed")
  }

  // 이탈 시도
  const handleExit = () => {
    if (flowStep === "questions" && Object.keys(answers).length > 0) {
      setShowExitWarning(true)
    } else {
      completeOnboarding()
      router.push("/feed")
    }
  }

  // 이탈 확정
  const confirmExit = () => {
    resetCurrentPhase()
    setShowExitWarning(false)
    completeOnboarding()
    router.push("/feed")
  }

  // ── 전체 진행률 계산 ──────────────────────────────────────

  const completedCount = onboarding.completedPhases.length * 8
  const currentProgress = flowStep === "questions" ? currentQuestionIdx + 1 : 0
  const totalProgress = completedCount + currentProgress
  const overallPercent = Math.round((totalProgress / 24) * 100)

  // ── 렌더링 ────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <PWLogoWithText size="sm" />
          <div className="flex items-center gap-3">
            {onboarding.creditsBalance > 0 && (
              <span className="flex items-center gap-1 text-xs text-purple-600">
                <Coins className="h-3.5 w-3.5" />
                {onboarding.creditsBalance}
              </span>
            )}
            <button onClick={handleExit} className="text-sm text-gray-400 hover:text-gray-600">
              {flowStep === "intro" ? "건너뛰기" : "나중에"}
            </button>
          </div>
        </div>
      </header>

      {/* 전체 진행 바 */}
      <div className="relative h-1.5 w-full bg-gray-100">
        <div
          className="pw-gradient h-full transition-all duration-500"
          style={{ width: `${overallPercent}%` }}
        />
        {/* Phase 구분선 */}
        <div className="absolute inset-y-0 left-1/3 w-px bg-gray-300" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-gray-300" />
      </div>

      {/* Phase 진행 표시 */}
      <div className="border-b border-gray-50 px-6 py-2">
        <div className="mx-auto flex max-w-md justify-between">
          {PHASE_INFO.map((p) => {
            const isCompleted = onboarding.completedPhases.includes(p.phase)
            const isActive = activePhase === p.phase && flowStep !== "complete"
            return (
              <div
                key={p.phase}
                className={`flex items-center gap-1 text-xs ${
                  isCompleted
                    ? "font-medium text-green-600"
                    : isActive
                      ? "font-medium text-purple-600"
                      : "text-gray-400"
                }`}
              >
                <span>{p.emoji}</span>
                <span>Phase {p.phase}</span>
                {isCompleted && <span className="text-green-500">✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
        {/* ── INTRO ── */}
        {flowStep === "intro" && (
          <div className="w-full max-w-md">
            {/* SNS 연결 성공/에러 알림 */}
            {snsConnectedPlatform && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
                {snsConnectedPlatform} 연동 완료! 취향 분석이 반영되었어요
              </div>
            )}
            {snsError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                SNS 연동 실패: {snsError}
              </div>
            )}

            <PhaseIntro info={PHASE_INFO[activePhase - 1]} onStart={handleStartPhase} />

            {/* Phase 1일 때만 SNS 연동 옵션 표시 */}
            {activePhase === 1 && (
              <div className="mt-8">
                <div className="relative mb-4 flex items-center">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="mx-3 flex-shrink-0 text-xs text-gray-400">또는</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-900">SNS로 빠르게 시작</span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600">
                      10초
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-gray-500">
                    SNS 데이터를 분석해서 취향을 자동으로 파악해요
                  </p>
                  <PWSnsConnect
                    compact
                    onConnected={(platform, level) => {
                      setSnsConnectedPlatform(platform)
                    }}
                  />
                </div>

                <p className="mt-3 text-center text-xs text-gray-400">
                  나중에 설정 &gt; 프로필 강화에서 추가할 수 있어요
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {flowStep === "questions" && (
          <div className="w-full max-w-md">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <PWSpinner size="md" />
                <p className="text-sm text-gray-500">질문을 불러오는 중...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500">질문 데이터를 불러올 수 없습니다</p>
                <PWButton onClick={() => loadQuestions(activePhase)} className="mt-4">
                  다시 시도
                </PWButton>
              </div>
            ) : (
              <>
                {/* Phase 내 진행 바 */}
                <div className="mb-6">
                  <div className="mb-1 flex justify-between text-xs text-gray-400">
                    <span>Phase {activePhase}</span>
                    <span>
                      {currentQuestionIdx + 1} / {questions.length}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="pw-gradient h-full transition-all duration-300"
                      style={{
                        width: `${((currentQuestionIdx + 1) / questions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 게이미피케이션 피드백 */}
                {showMidpoint && (
                  <div className="mb-4 animate-pulse rounded-lg bg-purple-50 p-3 text-center text-sm font-medium text-purple-700">
                    절반 완료! 조금만 더 파이팅 해볼게요 💪
                  </div>
                )}

                {/* 크레딧 획득 피드백 */}
                {showCredits && (
                  <div className="mb-4 animate-bounce rounded-lg bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-700">
                    +{earnedCredits} 코인 획득!
                  </div>
                )}

                {/* 질문 */}
                <div className="mb-6 text-center">
                  <div className="mb-3 inline-flex rounded-full bg-purple-50 p-2.5">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {questions[currentQuestionIdx]?.text}
                  </h1>
                </div>

                {/* 질문 카드 */}
                <PWQuestionCard
                  question={questions[currentQuestionIdx]}
                  selectedValue={answers[questions[currentQuestionIdx]?.id] ?? null}
                  onSelect={handleAnswer}
                />
              </>
            )}
          </div>
        )}

        {/* ── PREVIEW ── */}
        {flowStep === "preview" && (
          <PWMatchingPreview
            phase={activePhase}
            userId={profile?.id ?? "anonymous"}
            onContinue={handleContinueToNextPhase}
            onFinish={handleFinish}
          />
        )}

        {/* ── COMPLETE ── */}
        {flowStep === "complete" && (
          <div className="w-full max-w-md text-center">
            <div className="mb-4 text-4xl">🎉</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">온보딩 완료!</h1>
            <p className="mb-4 text-sm text-gray-500">
              총 {onboarding.creditsBalance}코인을 획득했어요
            </p>
            <PWProfileLevelBadge level={onboarding.profileLevel} />
            <PWButton onClick={() => router.push("/feed")} icon={ArrowRight} className="mt-6">
              PersonaWorld 시작하기
            </PWButton>
          </div>
        )}
      </main>

      {/* Footer: 질문 네비게이션 */}
      {flowStep === "questions" && questions.length > 0 && (
        <footer className="border-t border-gray-100 px-6 py-4">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentQuestionIdx === 0}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                currentQuestionIdx === 0 ? "text-gray-300" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              이전
            </button>

            <PWButton
              onClick={handleNext}
              disabled={!answers[questions[currentQuestionIdx]?.id]}
              icon={ArrowRight}
              className={!answers[questions[currentQuestionIdx]?.id] ? "opacity-50" : ""}
            >
              {currentQuestionIdx === questions.length - 1 ? "완료" : "다음"}
            </PWButton>
          </div>
        </footer>
      )}

      {/* 이탈 경고 다이얼로그 */}
      {showExitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <PWCard className="w-full max-w-sm p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">온보딩을 중단할까요?</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              현재 Phase의 진행이 초기화됩니다. 완료된 Phase의 데이터는 보존됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                계속하기
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600"
              >
                나가기
              </button>
            </div>
          </PWCard>
        </div>
      )}
    </div>
  )
}

// ── Phase 인트로 화면 ──────────────────────────────────────

function PhaseIntro({ info, onStart }: { info: (typeof PHASE_INFO)[number]; onStart: () => void }) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-4 text-5xl">{info.emoji}</div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{info.title}</h1>
      <p className="mb-1 text-sm font-medium text-purple-600">{info.subtitle}</p>
      <p className="mb-6 text-sm text-gray-500">{info.description}</p>
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-xs text-gray-500">
        <span>⏱️ 예상 시간: {info.estimatedTime}</span>
        <span>·</span>
        <span>8문항</span>
      </div>
      <div>
        <PWButton onClick={onStart} icon={ArrowRight} className="px-8">
          시작하기
        </PWButton>
      </div>
    </div>
  )
}
