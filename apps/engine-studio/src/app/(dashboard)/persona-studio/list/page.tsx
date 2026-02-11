import { Header } from "@/components/layout/header"

export default function PersonaListPage() {
  return (
    <>
      <Header title="Persona List" description="페르소나 목록 조회 및 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T48에서 구현 예정 — 카드 그리드, 필터링, 페이지네이션
        </p>
      </div>
    </>
  )
}
