import { Header } from "@/components/layout/header"

export default function ApiEndpointsPage() {
  return (
    <>
      <Header title="API Endpoints" description="내부/외부 API 엔드포인트 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T68에서 구현 예정 — API 관리, Rate Limiting, 버전 관리
        </p>
      </div>
    </>
  )
}
