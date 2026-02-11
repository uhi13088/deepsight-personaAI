import { Header } from "@/components/layout/header"

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Performance Analytics" description="매칭 성과 분석 및 리포트" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T58에서 구현 예정 — KPI 대시보드, 세그먼트 분석, 이상 탐지
        </p>
      </div>
    </>
  )
}
