import { Header } from "@/components/layout/header"

export default function SimulatorPage() {
  return (
    <>
      <Header title="Matching Simulator" description="페르소나↔유저 매칭 시뮬레이션" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T57에서 구현 예정 — 3-Tier 매칭, 가상 유저 생성, 결과 시각화
        </p>
      </div>
    </>
  )
}
