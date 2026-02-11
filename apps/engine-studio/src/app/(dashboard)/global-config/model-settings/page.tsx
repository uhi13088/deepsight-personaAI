import { Header } from "@/components/layout/header"

export default function ModelSettingsPage() {
  return (
    <>
      <Header title="Model Settings" description="LLM 모델 선택 및 비용 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T68에서 구현 예정 — 모델 선택, 라우팅 규칙, 비용 대시보드
        </p>
      </div>
    </>
  )
}
