import { Header } from "@/components/layout/header"

export default function PersonaCreatePage() {
  return (
    <>
      <Header title="Create New Persona" description="4-Step 페르소나 생성 플로우" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T49에서 구현 예정 — 기본 정보 → 벡터 에디터 → 프롬프트 → 리뷰
        </p>
      </div>
    </>
  )
}
