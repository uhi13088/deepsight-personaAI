"use client"

import { useEffect } from "react"
import { Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildPrompt } from "@/lib/prompt-builder"
import { validateStep3 } from "@/types/persona-form"
import type { PromptFormData, BasicInfoFormData, VectorFormData } from "@/types"

interface Step3Props {
  data: PromptFormData
  basicInfo: BasicInfoFormData
  vectors: VectorFormData
  onChange: (data: PromptFormData) => void
  onPrev: () => void
  onNext: () => void
}

export function Step3Prompt({ data, basicInfo, vectors, onChange, onPrev, onNext }: Step3Props) {
  const validation = validateStep3(data)

  const generatePrompt = () => {
    const prompt = buildPrompt({
      name: basicInfo.name || "페르소나",
      role: basicInfo.role,
      expertise: basicInfo.expertise,
      l1: vectors.l1,
      l2: vectors.l2,
      l3: vectors.l3,
    })
    onChange({ ...data, basePrompt: prompt })
  }

  // Auto-generate on first mount if empty
  useEffect(() => {
    if (!data.basePrompt) {
      generatePrompt()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Step 3: 프롬프트 엔지니어링</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          벡터 기반으로 자동 생성된 프롬프트를 확인하고 수정하세요.
        </p>
      </div>

      {/* Auto-generate button */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={generatePrompt}>
          <Wand2 className="mr-1 h-3.5 w-3.5" />
          벡터 기반 재생성
        </Button>
        <span className="text-muted-foreground text-xs">v{data.promptVersion}</span>
      </div>

      {/* Prompt Editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          시스템 프롬프트 <span className="text-destructive">*</span>
        </label>
        <textarea
          value={data.basePrompt}
          onChange={(e) => onChange({ ...data, basePrompt: e.target.value })}
          rows={20}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
          placeholder="페르소나 시스템 프롬프트..."
        />
        {validation.errors.basePrompt && (
          <p className="text-destructive text-xs">{validation.errors.basePrompt}</p>
        )}
        <p className="text-muted-foreground text-xs">{data.basePrompt.length}자</p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
        <Button onClick={onNext} disabled={!validation.valid}>
          다음: 리뷰
        </Button>
      </div>
    </div>
  )
}
