import { Header } from "@/components/layout/header"

export default function SafetyFiltersPage() {
  return (
    <>
      <Header title="Safety Filters" description="안전 필터 강도 및 금기어 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T68에서 구현 예정 — 필터 강도, 커스텀 금기어, 필터 로그
        </p>
      </div>
    </>
  )
}
