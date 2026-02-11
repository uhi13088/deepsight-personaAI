import { Header } from "@/components/layout/header"

export default function MonitoringPage() {
  return (
    <>
      <Header title="System Monitoring" description="실시간 시스템 모니터링 대시보드" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T67에서 구현 예정 — 실시간 모니터링, 알림, 로그 검색
        </p>
      </div>
    </>
  )
}
