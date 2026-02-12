"use client"

import { useEffect, useState } from "react"
import { Wand2, FileText, MessageSquare, Pen, Users, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildAllPrompts, PROMPT_PRESETS, applyPreset } from "@/lib/prompt-builder"
import { testPrompt } from "@/lib/prompt-tester"
import { validateStep3 } from "@/types/persona-form"
import type { PromptFormData, BasicInfoFormData, VectorFormData } from "@/types"
import type { PromptType, PromptSet } from "@/lib/prompt-builder"
import type { PromptTestResult } from "@/lib/prompt-tester"

interface Step3Props {
  data: PromptFormData
  basicInfo: BasicInfoFormData
  vectors: VectorFormData
  onChange: (data: PromptFormData) => void
  onPrev: () => void
  onNext: () => void
}

const TABS: { key: PromptType; label: string; icon: typeof FileText; required?: boolean }[] = [
  { key: "base", label: "기본", icon: FileText, required: true },
  { key: "review", label: "리뷰", icon: Pen },
  { key: "post", label: "포스트", icon: FileText },
  { key: "comment", label: "댓글", icon: MessageSquare },
  { key: "interaction", label: "대화", icon: Users },
]

const PROMPT_FIELD_MAP: Record<PromptType, keyof PromptFormData> = {
  base: "basePrompt",
  review: "reviewPrompt",
  post: "postPrompt",
  comment: "commentPrompt",
  interaction: "interactionPrompt",
}

export function Step3Prompt({ data, basicInfo, vectors, onChange, onPrev, onNext }: Step3Props) {
  const [activeTab, setActiveTab] = useState<PromptType>("base")
  const [testResult, setTestResult] = useState<PromptTestResult | null>(null)
  const validation = validateStep3(data)

  const generateAllPrompts = () => {
    const prompts: PromptSet = buildAllPrompts({
      name: basicInfo.name || "페르소나",
      role: basicInfo.role,
      expertise: basicInfo.expertise,
      l1: vectors.l1,
      l2: vectors.l2,
      l3: vectors.l3,
    })
    onChange({
      ...data,
      basePrompt: prompts.base,
      reviewPrompt: prompts.review,
      postPrompt: prompts.post,
      commentPrompt: prompts.comment,
      interactionPrompt: prompts.interaction,
    })
  }

  const generateSinglePrompt = () => {
    const prompts = buildAllPrompts({
      name: basicInfo.name || "페르소나",
      role: basicInfo.role,
      expertise: basicInfo.expertise,
      l1: vectors.l1,
      l2: vectors.l2,
      l3: vectors.l3,
    })
    const field = PROMPT_FIELD_MAP[activeTab]
    onChange({ ...data, [field]: prompts[activeTab] })
  }

  // Auto-generate on first mount if empty
  useEffect(() => {
    if (!data.basePrompt) {
      generateAllPrompts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApplyPreset = (presetId: string) => {
    const currentSet: PromptSet = {
      base: data.basePrompt,
      review: data.reviewPrompt,
      post: data.postPrompt,
      comment: data.commentPrompt,
      interaction: data.interactionPrompt,
    }
    const applied = applyPreset(currentSet, presetId)
    onChange({
      ...data,
      basePrompt: applied.base,
      reviewPrompt: applied.review,
      postPrompt: applied.post,
      commentPrompt: applied.comment,
      interactionPrompt: applied.interaction,
    })
  }

  const handleTestPrompt = () => {
    const field = PROMPT_FIELD_MAP[activeTab]
    const currentPrompt = data[field]
    if (typeof currentPrompt === "string" && currentPrompt.length > 0) {
      const result = testPrompt(currentPrompt, vectors.l1)
      setTestResult(result)
    }
  }

  const currentField = PROMPT_FIELD_MAP[activeTab]
  const currentValue = (data[currentField] ?? "") as string

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Step 3: 프롬프트 엔지니어링</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          벡터 기반으로 5종 프롬프트를 자동 생성하고, 프리셋 적용 및 직접 수정할 수 있습니다.
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={generateAllPrompts}>
          <Wand2 className="mr-1 h-3.5 w-3.5" />
          전체 재생성
        </Button>
        <Button variant="outline" size="sm" onClick={generateSinglePrompt}>
          <Wand2 className="mr-1 h-3.5 w-3.5" />
          현재 탭 재생성
        </Button>
        <Button variant="outline" size="sm" onClick={handleTestPrompt}>
          <FlaskConical className="mr-1 h-3.5 w-3.5" />
          품질 테스트
        </Button>
        <span className="text-muted-foreground text-xs">v{data.promptVersion}</span>
      </div>

      {/* Preset selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium">프리셋 적용</label>
        <div className="flex flex-wrap gap-2">
          {PROMPT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              className="bg-muted hover:bg-accent rounded-md px-3 py-1 text-xs transition-colors"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-border flex border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setTestResult(null)
              }}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-primary text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.required && <span className="text-destructive text-xs">*</span>}
            </button>
          )
        })}
      </div>

      {/* Prompt Editor */}
      <div className="space-y-2">
        <textarea
          value={currentValue}
          onChange={(e) => onChange({ ...data, [currentField]: e.target.value })}
          rows={18}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
          placeholder={`${TABS.find((t) => t.key === activeTab)?.label} 프롬프트...`}
        />
        <div className="flex items-center justify-between">
          <div>
            {activeTab === "base" && validation.errors.basePrompt && (
              <p className="text-destructive text-xs">{validation.errors.basePrompt}</p>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{currentValue.length}자</p>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">품질 테스트 결과</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ScoreCard label="종합 점수" value={testResult.overallScore} />
            <ScoreCard label="구조 점수" value={testResult.structureScore} />
            <ScoreCard label="일관성 점수" value={testResult.consistencyScore} />
            <ScoreCard
              label="톤"
              text={
                testResult.toneAnalysis.dominantTone === "logical"
                  ? "논리적"
                  : testResult.toneAnalysis.dominantTone === "emotional"
                    ? "감성적"
                    : "균형"
              }
            />
          </div>
          {testResult.prohibitedWords.length > 0 && (
            <div className="text-destructive text-xs">
              금지어 감지: {testResult.prohibitedWords.map((pw) => pw.word).join(", ")}
            </div>
          )}
          <div className="text-muted-foreground text-xs">
            길이: {testResult.lengthAnalysis.totalChars}자, {testResult.lengthAnalysis.totalLines}
            줄, {testResult.lengthAnalysis.sectionCount}개 섹션
          </div>
        </div>
      )}

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

function ScoreCard({ label, value, text }: { label: string; value?: number; text?: string }) {
  const displayValue = text ?? `${value ?? 0}`
  const colorClass =
    value !== undefined
      ? value >= 80
        ? "text-green-500"
        : value >= 60
          ? "text-yellow-500"
          : "text-red-500"
      : "text-foreground"

  return (
    <div className="space-y-1 rounded-md border p-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`text-lg font-bold ${colorClass}`}>{displayValue}</div>
    </div>
  )
}
