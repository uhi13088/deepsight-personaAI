"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PERSONA_ROLES, EXPERTISE_OPTIONS, validateStep1 } from "@/types/persona-form"
import type { BasicInfoFormData, PersonaRoleValue, StepValidation } from "@/types"

interface Step1Props {
  data: BasicInfoFormData
  onChange: (data: BasicInfoFormData) => void
  onNext: () => void
}

export function Step1BasicInfo({ data, onChange, onNext }: Step1Props) {
  const validation: StepValidation = validateStep1(data)

  const update = (partial: Partial<BasicInfoFormData>) => {
    onChange({ ...data, ...partial })
  }

  const toggleExpertise = (item: string) => {
    const next = data.expertise.includes(item)
      ? data.expertise.filter((e) => e !== item)
      : [...data.expertise, item]
    update({ expertise: next })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Step 1: 기본 정보</h2>
        <p className="text-muted-foreground mt-1 text-sm">페르소나의 기본 정보를 입력하세요.</p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          이름 <span className="text-destructive">*</span>
        </label>
        <Input
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="페르소나 이름 (2~30자)"
          maxLength={30}
        />
        {validation.errors.name && (
          <p className="text-destructive text-xs">{validation.errors.name}</p>
        )}
        <p className="text-muted-foreground text-xs">{data.name.length}/30</p>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          역할 <span className="text-destructive">*</span>
        </label>
        <Select value={data.role} onValueChange={(v) => update({ role: v as PersonaRoleValue })}>
          <SelectTrigger>
            <SelectValue placeholder="역할 선택" />
          </SelectTrigger>
          <SelectContent>
            {PERSONA_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label} — {role.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expertise */}
      <div className="space-y-2">
        <label className="text-sm font-medium">전문분야</label>
        <div className="flex flex-wrap gap-1.5">
          {EXPERTISE_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                data.expertise.includes(item)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={() => toggleExpertise(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">설명</label>
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="페르소나 설명 (선택, 최대 100자)"
          maxLength={100}
          rows={2}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
        />
        {validation.errors.description && (
          <p className="text-destructive text-xs">{validation.errors.description}</p>
        )}
        <p className="text-muted-foreground text-xs">{data.description.length}/100</p>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!validation.valid}>
          다음: 벡터 설계
        </Button>
      </div>
    </div>
  )
}
