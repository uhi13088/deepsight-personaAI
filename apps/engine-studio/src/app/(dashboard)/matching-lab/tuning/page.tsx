import { Header } from "@/components/layout/header"

export default function TuningPage() {
  return (
    <>
      <Header title="Algorithm Tuning" description="매칭 알고리즘 하이퍼파라미터 조정" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T57에서 구현 예정 — 하이퍼파라미터, 가중치 조정, A/B 테스트
        </p>
      </div>
    </>
  )
}
