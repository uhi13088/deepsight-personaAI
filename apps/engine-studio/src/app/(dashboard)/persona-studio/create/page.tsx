"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { StepIndicator } from "@/components/persona/create/step-indicator"
import { Step1BasicInfo } from "@/components/persona/create/step1-basic-info"
import { Step2VectorEditor } from "@/components/persona/create/step2-vector-editor"
import { Step3Prompt } from "@/components/persona/create/step3-prompt"
import { Step4Review } from "@/components/persona/create/step4-review"
import { INITIAL_FORM_STATE } from "@/types/persona-form"
import type { PersonaFormState, BasicInfoFormData, VectorFormData, PromptFormData } from "@/types"

export default function PersonaCreatePage() {
  const [formState, setFormState] = useState<PersonaFormState>(INITIAL_FORM_STATE)

  const goTo = useCallback((step: number) => {
    setFormState((prev) => ({ ...prev, step }))
  }, [])

  const updateBasicInfo = useCallback((basicInfo: BasicInfoFormData) => {
    setFormState((prev) => ({ ...prev, basicInfo }))
  }, [])

  const updateVectors = useCallback((vectors: VectorFormData) => {
    setFormState((prev) => ({ ...prev, vectors }))
  }, [])

  const updatePrompt = useCallback((prompt: PromptFormData) => {
    setFormState((prev) => ({ ...prev, prompt }))
  }, [])

  return (
    <>
      <Header title="Create New Persona" description="4-Step 페르소나 생성 플로우" />

      <div className="space-y-6 p-6">
        {/* Step Indicator */}
        <StepIndicator currentStep={formState.step} />

        {/* Step Content */}
        {formState.step === 0 && (
          <Step1BasicInfo
            data={formState.basicInfo}
            onChange={updateBasicInfo}
            onNext={() => goTo(1)}
          />
        )}

        {formState.step === 1 && (
          <Step2VectorEditor
            data={formState.vectors}
            onChange={updateVectors}
            onPrev={() => goTo(0)}
            onNext={() => goTo(2)}
          />
        )}

        {formState.step === 2 && (
          <Step3Prompt
            data={formState.prompt}
            basicInfo={formState.basicInfo}
            vectors={formState.vectors}
            onChange={updatePrompt}
            onPrev={() => goTo(1)}
            onNext={() => goTo(3)}
          />
        )}

        {formState.step === 3 && <Step4Review formState={formState} onPrev={() => goTo(2)} />}
      </div>
    </>
  )
}
