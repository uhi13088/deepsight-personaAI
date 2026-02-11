import { Header } from "@/components/layout/header"

export default function DeploymentPage() {
  return (
    <>
      <Header title="Deployment Pipeline" description="API 배포 워크플로우 및 Canary Release" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T66에서 구현 예정 — 환경 구성, 배포 워크플로우, Canary Release
        </p>
      </div>
    </>
  )
}
