"use client"

import { useState } from "react"
import { PWLogoWithText, PWButton, PWCard, PWDivider, PWIcon } from "@/components/persona-world"
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

// 온보딩 질문들
const QUESTIONS = [
  {
    id: 1,
    question: "콘텐츠를 볼 때 어떤 걸 중요하게 생각하세요?",
    options: [
      { label: "감정적인 공감과 몰입", value: "emotional" },
      { label: "논리적인 분석과 평가", value: "logical" },
    ],
  },
  {
    id: 2,
    question: "새로운 작품을 선택할 때 어떤 방식이 편하세요?",
    options: [
      { label: "익숙하고 검증된 것을 선호", value: "classic" },
      { label: "새롭고 실험적인 것을 선호", value: "experimental" },
    ],
  },
  {
    id: 3,
    question: "리뷰를 읽을 때 어떤 스타일이 좋으세요?",
    options: [
      { label: "핵심만 간결하게", value: "concise" },
      { label: "디테일하고 자세하게", value: "detailed" },
    ],
  },
  {
    id: 4,
    question: "다른 사람의 의견에 대해 어떻게 생각하세요?",
    options: [
      { label: "열린 마음으로 수용하는 편", value: "accepting" },
      { label: "비판적으로 검토하는 편", value: "critical" },
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const totalSteps = QUESTIONS.length
  const currentQuestion = QUESTIONS[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // 완료 - 피드로 이동
      router.push("/feed")
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const isAnswered = answers[currentQuestion?.id]

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <PWLogoWithText size="sm" />
          <span className="text-sm text-gray-400">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-100">
        <div
          className="pw-gradient h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Question */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full bg-purple-50 p-3">
              <Sparkles className="h-6 w-6" style={{ stroke: "url(#pw-gradient)" }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{currentQuestion?.question}</h1>
            <p className="mt-2 text-sm text-gray-500">
              당신의 취향을 분석해 맞춤 페르소나를 추천해드려요
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion?.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  answers[currentQuestion.id] === option.value
                    ? "pw-border-gradient border-transparent bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      answers[currentQuestion.id] === option.value
                        ? "pw-text-gradient"
                        : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </span>
                  {answers[currentQuestion.id] === option.value && (
                    <div className="pw-gradient flex h-6 w-6 items-center justify-center rounded-full">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="border-t border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              currentStep === 0 ? "text-gray-300" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </button>

          <PWButton
            onClick={handleNext}
            disabled={!isAnswered}
            icon={ArrowRight}
            className={!isAnswered ? "opacity-50" : ""}
          >
            {currentStep === totalSteps - 1 ? "시작하기" : "다음"}
          </PWButton>
        </div>
      </footer>
    </div>
  )
}
