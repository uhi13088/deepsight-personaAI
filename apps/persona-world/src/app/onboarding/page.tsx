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
import { ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Coins, Link2, Target } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type {
  OnboardingQuestion,
  OnboardingAnswer,
  AdaptiveQuestionWithMeta,
  AdaptiveProgress,
  AdaptiveAnswerResponse,
} from "@/lib/types"
import { getProfileLevelByPhase, PHASE_CREDITS } from "@/lib/profile-level"

// ── Phase 설정 ──────────────────────────────────────────────

const PHASE_INFO = [
  {
    phase: 1 as const,
    title: "Phase 1: 취향 탐색",
    subtitle: "나만의 콘텐츠 스타일 찾기",
    description: "콘텐츠를 접하는 당신만의 스타일을 파악해볼게요",
    emoji: "🌱",
    estimatedTime: "~80초",
  },
  {
    phase: 2 as const,
    title: "Phase 2: 깊이 탐색",
    subtitle: "숨겨진 취향 발견하기",
    description: "취향의 패턴을 분석해 더 정확한 매칭을 찾아볼게요",
    emoji: "⭐",
    estimatedTime: "~80초",
  },
  {
    phase: 3 as const,
    title: "Phase 3: 정밀 분석",
    subtitle: "나도 몰랐던 내 모습 발견하기",
    description: "의외의 취향 패턴을 찾아 최고 수준의 매칭을 완성해볼게요",
    emoji: "💎",
    estimatedTime: "~80초",
  },
]

// ── 적응형 질문 → OnboardingQuestion 변환 ───────────────────

function adaptiveToOnboardingQuestion(q: AdaptiveQuestionWithMeta): OnboardingQuestion {
  return {
    id: q.id,
    order: 0,
    text: q.text,
    type: q.type as OnboardingQuestion["type"],
    options: q.options.map((o) => ({ id: o.key, label: o.label, value: o.key })),
    targetDimensions: q.focusDimensions,
  }
}

// ── 적응형 온보딩 크레딧 ───────────────────────────────────
const ADAPTIVE_CREDITS = 450 // Phase 1+2+3 합산 (100+150+200)

// ── 온보딩 플로우 상태 ──────────────────────────────────────

type FlowStep = "intro" | "questions" | "preview" | "complete"
type OnboardingMode = "adaptive" | "phase"

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
  const searchParams = useSearchParams()
  const { onboarding } = useUserStore()

  // 모드 선택: ?mode=phase → 기존 Phase 방식, 기본값 = adaptive
  const mode: OnboardingMode = searchParams.get("mode") === "phase" ? "phase" : "adaptive"

  // 적응형 모드 (Phase 3 미완료 시) → 별도 컴포넌트
  if (mode === "adaptive" && !onboarding.completedPhases.includes(3)) {
    return <AdaptiveOnboardingFlow />
  }

  // Phase 기반 모드 (기존 호환)
  return <PhaseOnboardingFlow />
}

function PhaseOnboardingFlow() {
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

// ── 적응형 온보딩 플로우 ────────────────────────────────────

type AdaptiveStep = "intro" | "questions" | "complete"

function AdaptiveOnboardingFlow() {
  const router = useRouter()
  const { profile, setProfile, completeOnboarding, completePhase } = useUserStore()

  // 플로우 상태
  const [step, setStep] = useState<AdaptiveStep>("intro")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 적응형 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestionWithMeta | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [progress, setProgress] = useState<AdaptiveProgress>({
    answered: 0,
    estimatedTotal: 24,
    estimatedRemaining: 24,
    convergencePercent: 0,
    uncertainDimensions: [],
  })

  // 완료 결과
  const [result, setResult] = useState<AdaptiveAnswerResponse["result"] | null>(null)

  // 이탈 경고
  const [showExitWarning, setShowExitWarning] = useState(false)

  // 게이미피케이션
  const [showMilestone, setShowMilestone] = useState(false)
  const [milestoneText, setMilestoneText] = useState("")

  // 마일스톤 체크
  const checkMilestone = useCallback((answered: number, convergence: number) => {
    let text = ""
    if (answered === 10) {
      text = "절반 가까이 왔어요! 벡터가 선명해지고 있어요"
    } else if (answered === 20) {
      text = "거의 다 왔어요! 정밀한 프로필이 완성되고 있어요"
    } else if (convergence >= 70 && answered >= 15) {
      text = "당신의 취향 패턴이 뚜렷하게 드러나고 있어요"
    }
    if (text) {
      setMilestoneText(text)
      setShowMilestone(true)
      setTimeout(() => setShowMilestone(false), 2500)
    }
  }, [])

  // 적응형 온보딩 시작
  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
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

      const data = await clientApi.startAdaptiveOnboarding(userId)
      setSessionId(data.sessionId)
      setCurrentQuestion(data.firstQuestion)
      setProgress({
        answered: 0,
        estimatedTotal: data.totalEstimated,
        estimatedRemaining: data.totalEstimated,
        convergencePercent: 0,
        uncertainDimensions: [],
      })
      setStep("questions")
    } catch {
      setError("시작에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  // 답변 제출
  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion || !selectedAnswer) return

    setLoading(true)
    setError(null)
    try {
      const data = await clientApi.submitAdaptiveAnswer(
        sessionId,
        currentQuestion.id,
        selectedAnswer
      )

      setProgress(data.progress)
      setSelectedAnswer(null)

      if (data.completed && data.result) {
        // 완료 처리
        setResult(data.result)

        // 스토어 업데이트: 모든 Phase를 완료로 표시
        completePhase(1, 100, "BASIC")
        completePhase(2, 150, "STANDARD")
        completePhase(3, 200, "ADVANCED")

        setStep("complete")
      } else if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion)
        checkMilestone(data.progress.answered, data.progress.convergencePercent)
      }
    } catch {
      setError("답변 제출에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  // 이탈 처리
  const handleExit = () => {
    if (step === "questions" && progress.answered > 0) {
      setShowExitWarning(true)
    } else {
      completeOnboarding()
      router.push("/feed")
    }
  }

  const confirmExit = () => {
    setShowExitWarning(false)
    completeOnboarding()
    router.push("/feed")
  }

  // 완료 → 피드 이동
  const handleFinish = () => {
    completeOnboarding()
    router.push("/feed")
  }

  // ── 진행률 계산 ──────────────────────────────────────────
  const progressPercent =
    progress.estimatedTotal > 0
      ? Math.round((progress.answered / progress.estimatedTotal) * 100)
      : 0

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <PWLogoWithText size="sm" />
          <div className="flex items-center gap-3">
            <button onClick={handleExit} className="text-sm text-gray-400 hover:text-gray-600">
              {step === "intro" ? "건너뛰기" : "나중에"}
            </button>
          </div>
        </div>
      </header>

      {/* 적응형 진행 바 */}
      {step === "questions" && (
        <div className="relative h-1.5 w-full bg-gray-100">
          <div
            className="pw-gradient h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
          {/* 수렴도 인디케이터 */}
          {progress.convergencePercent >= 50 && (
            <div
              className="absolute top-0 h-full bg-green-400/30 transition-all duration-500"
              style={{ width: `${progress.convergencePercent}%` }}
            />
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
        {/* ── INTRO ── */}
        {step === "intro" && (
          <div className="w-full max-w-md text-center">
            <div className="mb-4 inline-flex rounded-full bg-purple-100 p-4">
              <Target className="h-10 w-10 text-purple-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">맞춤형 취향 분석</h1>
            <p className="mb-1 text-sm font-medium text-purple-600">
              당신에게 딱 맞는 질문으로 취향을 파악해요
            </p>
            <p className="mb-6 text-sm text-gray-500">
              답변에 따라 질문이 달라지며, 더 정확한 프로필을 만들어드려요
            </p>
            <div className="mb-8 flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                <span>⏱️</span> ~3분
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                <span>📝</span> 20~28문항
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs text-purple-600">
                <Coins className="h-3 w-3" /> +{ADAPTIVE_CREDITS} 코인
              </span>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <PWButton onClick={handleStart} icon={ArrowRight} className="px-8" disabled={loading}>
              {loading ? "준비 중..." : "시작하기"}
            </PWButton>

            {/* Phase 모드 대안 링크 */}
            <p className="mt-6 text-xs text-gray-400">
              <button
                onClick={() => router.replace("/onboarding?mode=phase")}
                className="underline hover:text-gray-600"
              >
                단계별로 나누어 진행하고 싶다면
              </button>
            </p>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {step === "questions" && (
          <div className="w-full max-w-md">
            {loading && !currentQuestion ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <PWSpinner size="md" />
                <p className="text-sm text-gray-500">질문을 준비하는 중...</p>
              </div>
            ) : currentQuestion ? (
              <>
                {/* 진행 상태 */}
                <div className="mb-6">
                  <div className="mb-1 flex justify-between text-xs text-gray-400">
                    <span>맞춤형 분석</span>
                    <span>
                      {progress.answered + 1} / ~{progress.estimatedTotal}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="pw-gradient h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {/* 수렴 정보 */}
                  {progress.convergencePercent > 0 && (
                    <div className="mt-1 text-right text-xs text-purple-400">
                      분석 정확도 {Math.round(progress.convergencePercent)}%
                    </div>
                  )}
                </div>

                {/* 마일스톤 피드백 */}
                {showMilestone && (
                  <div className="mb-4 animate-pulse rounded-lg bg-purple-50 p-3 text-center text-sm font-medium text-purple-700">
                    {milestoneText}
                  </div>
                )}

                {/* 에러 메시지 */}
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* 질문 */}
                <div className="mb-6 text-center">
                  <div className="mb-3 inline-flex rounded-full bg-purple-50 p-2.5">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">{currentQuestion.text}</h1>
                </div>

                {/* 질문 카드 */}
                <PWQuestionCard
                  question={adaptiveToOnboardingQuestion(currentQuestion)}
                  selectedValue={selectedAnswer}
                  onSelect={setSelectedAnswer}
                />
              </>
            ) : null}
          </div>
        )}

        {/* ── COMPLETE ── */}
        {step === "complete" && (
          <div className="w-full max-w-md text-center">
            <div className="mb-4 text-4xl">🎉</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">분석 완료!</h1>
            <p className="mb-2 text-sm text-gray-500">
              {result?.totalQuestions ?? progress.answered}개 질문으로 정밀한 프로필이 완성되었어요
            </p>
            <p className="mb-4 text-sm text-gray-500">+{ADAPTIVE_CREDITS} 코인 획득!</p>
            <PWProfileLevelBadge level="ADVANCED" />

            {/* 수렴 결과 요약 */}
            {result && (
              <div className="mx-auto mt-6 max-w-xs rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-medium text-gray-600">프로필 정확도</p>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="pw-gradient h-full transition-all"
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {Math.round(result.confidence * 100)}%
                </p>
              </div>
            )}

            <PWButton onClick={handleFinish} icon={ArrowRight} className="mt-6">
              PersonaWorld 시작하기
            </PWButton>
          </div>
        )}
      </main>

      {/* Footer: 질문 네비게이션 (적응형) */}
      {step === "questions" && currentQuestion && (
        <footer className="border-t border-gray-100 px-6 py-4">
          <div className="mx-auto flex max-w-md items-center justify-end">
            <PWButton
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer || loading}
              icon={ArrowRight}
              className={!selectedAnswer ? "opacity-50" : ""}
            >
              {loading ? "분석 중..." : "다음"}
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
              <h3 className="text-lg font-bold text-gray-900">분석을 중단할까요?</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              지금까지의 진행({progress.answered}문항)이 초기화됩니다. 나중에 다시 시작할 수 있어요.
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
