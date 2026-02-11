"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { label: "기본 정보", description: "이름, 역할, 전문분야" },
  { label: "벡터 설계", description: "3-Layer 106D+ 벡터" },
  { label: "프롬프트", description: "프롬프트 엔지니어링" },
  { label: "리뷰 & 저장", description: "최종 확인 및 저장" },
]

interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <div className={cn("h-px w-8", isCompleted ? "bg-primary" : "bg-border")} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-primary/30 ring-offset-background ring-2 ring-offset-2",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
