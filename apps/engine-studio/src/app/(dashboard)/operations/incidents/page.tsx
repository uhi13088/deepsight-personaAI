import { Header } from "@/components/layout/header"

export default function IncidentsPage() {
  return (
    <>
      <Header title="Incident Management" description="장애 탐지, 대응, 사후 분석" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T67에서 구현 예정 — 장애 등급, 탐지, 워크플로우, Post-mortem
        </p>
      </div>
    </>
  )
}
