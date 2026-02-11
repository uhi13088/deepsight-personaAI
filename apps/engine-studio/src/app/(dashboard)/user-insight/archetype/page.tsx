import { Header } from "@/components/layout/header"

export default function ArchetypePage() {
  return (
    <>
      <Header title="Archetype Manager" description="유저 아키타입 분류 및 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T56에서 구현 예정 — 아키타입 정의, 분류 로직, 관리 UI
        </p>
      </div>
    </>
  )
}
