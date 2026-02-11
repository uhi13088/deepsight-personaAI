import { Header } from "@/components/layout/header"

export default function PsychometricPage() {
  return (
    <>
      <Header title="Psychometric Model" description="심층 성향 분석 모델" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T56에서 구현 예정 — 심리학 모델, 반전 매칭 탐지
        </p>
      </div>
    </>
  )
}
