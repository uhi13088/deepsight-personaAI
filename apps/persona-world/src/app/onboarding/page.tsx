"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PWLogoWithText,
  PWButton,
  PWCard,
  PWSpinner,
  PWQuestionCard,
  PWMatchingPreview,
  PWProfileLevelBadge,
} from "@/components/persona-world"
import { ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Coins } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type { OnboardingQuestion, OnboardingAnswer } from "@/lib/types"
import { getProfileLevelByPhase, PHASE_CREDITS } from "@/lib/profile-level"

// ── Phase 설정 ──────────────────────────────────────────────

const PHASE_INFO = [
  {
    phase: 1 as const,
    title: "Phase 1: \uCDE8\uD5A5 \uD0D0\uC0C9",
    subtitle: "L1 \uC0AC\uD68C\uC801 \uAC00\uBA74 \uBD84\uC11D",
    description:
      "\uCF58\uD150\uCE20\uB97C \uC811\uD558\uB294 \uB2F9\uC2E0\uB9CC\uC758 \uC2A4\uD0C0\uC77C\uC744 \uD30C\uC545\uD574\uBCFC\uAC8C\uC694",
    emoji: "\uD83C\uDF31",
    estimatedTime: "~80\uCD08",
  },
  {
    phase: 2 as const,
    title: "Phase 2: \uAE4A\uC774 \uD0D0\uC0C9",
    subtitle: "\uAD50\uCC28 \uCC28\uC6D0 \uBD84\uC11D",
    description:
      "\uCDE8\uD5A5\uC758 \uAD50\uCC28 \uD328\uD134\uC744 \uBD84\uC11D\uD574 \uB354 \uC815\uD655\uD55C \uB9E4\uCE6D\uC744 \uCC3E\uC544\uBCFC\uAC8C\uC694",
    emoji: "\u2B50",
    estimatedTime: "~80\uCD08",
  },
  {
    phase: 3 as const,
    title: "Phase 3: \uC815\uBC00 \uBD84\uC11D",
    subtitle: "\uC2EC\uCE35 \uAD50\uCC28\uAC80\uC99D + \uC5ED\uC124 \uAC10\uC9C0",
    description:
      "\uC228\uACA8\uC9C4 \uC5ED\uC124 \uD328\uD134\uC744 \uCC3E\uC544 \uCD5C\uACE0 \uC218\uC900\uC758 \uB9E4\uCE6D\uC744 \uC644\uC131\uD574\uBCFC\uAC8C\uC694",
    emoji: "\uD83D\uDC8E",
    estimatedTime: "~80\uCD08",
  },
]

// ── 온보딩 플로우 상태 ──────────────────────────────────────

type FlowStep = "intro" | "questions" | "preview" | "complete"

export default function OnboardingPage() {
  const router = useRouter()
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

  // 게이미피케이션 피드백
  const [showMidpoint, setShowMidpoint] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [earnedCredits, setEarnedCredits] = useState(0)

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
              {flowStep === "intro" ? "\uAC74\uB108\uB6F0\uAE30" : "\uB098\uC911\uC5D0"}
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
                {isCompleted && <span className="text-green-500">\u2713</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        {/* ── INTRO ── */}
        {flowStep === "intro" && (
          <PhaseIntro info={PHASE_INFO[activePhase - 1]} onStart={handleStartPhase} />
        )}

        {/* ── QUESTIONS ── */}
        {flowStep === "questions" && (
          <div className="w-full max-w-md">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <PWSpinner size="md" />
                <p className="text-sm text-gray-500">
                  \uC9C8\uBB38\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...
                </p>
              </div>
            ) : questions.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500">
                  \uC9C8\uBB38 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218
                  \uC5C6\uC2B5\uB2C8\uB2E4
                </p>
                <PWButton onClick={() => loadQuestions(activePhase)} className="mt-4">
                  \uB2E4\uC2DC \uC2DC\uB3C4
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
                    \uC808\uBC18 \uC644\uB8CC! \uC870\uAE08\uB9CC \uB354 \uD30C\uC774\uD305
                    \uD574\uBCFC\uAC8C\uC694 \uD83D\uDCAA
                  </div>
                )}

                {/* 크레딧 획득 피드백 */}
                {showCredits && (
                  <div className="mb-4 animate-bounce rounded-lg bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-700">
                    +{earnedCredits} \uCF54\uC778 \uD68D\uB4DD!
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
            <div className="mb-4 text-4xl">\uD83C\uDF89</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              \uC628\uBCF4\uB529 \uC644\uB8CC!
            </h1>
            <p className="mb-4 text-sm text-gray-500">
              \uCD1D {onboarding.creditsBalance}\uCF54\uC778\uC744 \uD68D\uB4DD\uD588\uC5B4\uC694
            </p>
            <PWProfileLevelBadge level={onboarding.profileLevel} />
            <PWButton onClick={() => router.push("/feed")} icon={ArrowRight} className="mt-6">
              PersonaWorld \uC2DC\uC791\uD558\uAE30
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
              \uC774\uC804
            </button>

            <PWButton
              onClick={handleNext}
              disabled={!answers[questions[currentQuestionIdx]?.id]}
              icon={ArrowRight}
              className={!answers[questions[currentQuestionIdx]?.id] ? "opacity-50" : ""}
            >
              {currentQuestionIdx === questions.length - 1 ? "\uC644\uB8CC" : "\uB2E4\uC74C"}
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
              <h3 className="text-lg font-bold text-gray-900">
                \uC628\uBCF4\uB529\uC744 \uC911\uB2E8\uD560\uAE4C\uC694?
              </h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              \uD604\uC7AC Phase\uC758 \uC9C4\uD589\uC774 \uCD08\uAE30\uD654\uB429\uB2C8\uB2E4.
              \uC644\uB8CC\uB41C Phase\uC758 \uB370\uC774\uD130\uB294
              \uBCF4\uC874\uB429\uB2C8\uB2E4.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                \uACC4\uC18D\uD558\uAE30
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600"
              >
                \uB098\uAC00\uAE30
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
        <span>\u23F1\uFE0F \uC608\uC0C1 \uC2DC\uAC04: {info.estimatedTime}</span>
        <span>\u00B7</span>
        <span>8\uBB38\uD56D</span>
      </div>
      <div>
        <PWButton onClick={onStart} icon={ArrowRight} className="px-8">
          \uC2DC\uC791\uD558\uAE30
        </PWButton>
      </div>
    </div>
  )
}
