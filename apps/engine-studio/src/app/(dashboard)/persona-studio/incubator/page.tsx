import { Header } from "@/components/layout/header"

export default function IncubatorPage() {
  return (
    <>
      <Header title="Incubator Dashboard" description="Daily Batch 워크플로우 및 자가발전 시스템" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T62에서 구현 예정 — Daily Batch, 자가발전, Golden Sample
        </p>
      </div>
    </>
  )
}
