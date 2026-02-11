import { Header } from "@/components/layout/header"

export default function ColdStartPage() {
  return (
    <>
      <Header title="Cold Start Strategy" description="유저 온보딩 질문 설계 및 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T56에서 구현 예정 — 질문 세트 CRUD, 모드별 관리
        </p>
      </div>
    </>
  )
}
