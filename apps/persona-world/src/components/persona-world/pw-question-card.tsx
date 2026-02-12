"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import type { OnboardingQuestion } from "@/lib/types"

interface PWQuestionCardProps {
  question: OnboardingQuestion
  selectedValue: string | null
  onSelect: (value: string) => void
}

export function PWQuestionCard({ question, selectedValue, onSelect }: PWQuestionCardProps) {
  const [justSelected, setJustSelected] = useState<string | null>(null)

  const handleSelect = (value: string) => {
    setJustSelected(value)
    onSelect(value)
    setTimeout(() => setJustSelected(null), 400)
  }

  if (question.type === "SLIDER") {
    return (
      <PWSliderQuestion question={question} selectedValue={selectedValue} onSelect={onSelect} />
    )
  }

  // MULTIPLE_CHOICE (4지선다)
  const options = (question.options ?? []) as Array<{
    id: string
    label: string
    value: string
    weights?: Record<string, number>
  }>

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selectedValue === option.id
        const isJust = justSelected === option.id

        return (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
              isSelected
                ? "pw-border-gradient border-transparent bg-purple-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${isJust ? "scale-[1.02]" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-sm font-medium leading-relaxed ${
                  isSelected ? "pw-text-gradient" : "text-gray-700"
                }`}
              >
                {option.label}
              </span>
              {isSelected && (
                <div className="pw-gradient flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── 슬라이더 질문 컴포넌트 ──────────────────────────────────

interface PWSliderQuestionProps {
  question: OnboardingQuestion
  selectedValue: string | null
  onSelect: (value: string) => void
}

function PWSliderQuestion({ question, selectedValue, onSelect }: PWSliderQuestionProps) {
  const options = (question.options ?? []) as Array<{
    id: string
    label: string
    value: number
  }>

  const minLabel = options.find((o) => o.id === "min")?.label ?? ""
  const maxLabel = options.find((o) => o.id === "max")?.label ?? ""

  const value = selectedValue ? Number(selectedValue) : 0.5

  return (
    <div className="space-y-6 px-2">
      <div className="relative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => onSelect(e.target.value)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-purple-600"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="pw-text-gradient text-lg font-bold">{Math.round(value * 100)}%</span>
      </div>
    </div>
  )
}
