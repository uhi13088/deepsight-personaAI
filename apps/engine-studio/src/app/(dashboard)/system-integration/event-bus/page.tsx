import { Header } from "@/components/layout/header"

export default function EventBusPage() {
  return (
    <>
      <Header title="Event Bus Monitor" description="실시간 이벤트 모니터링 및 동기화" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T66에서 구현 예정 — 이벤트 유형, 스키마, 모니터링
        </p>
      </div>
    </>
  )
}
