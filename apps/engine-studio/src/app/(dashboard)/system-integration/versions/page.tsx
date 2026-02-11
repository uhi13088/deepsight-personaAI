import { Header } from "@/components/layout/header"

export default function VersionsPage() {
  return (
    <>
      <Header title="Version Control" description="알고리즘 버전 관리 및 롤백" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T66에서 구현 예정 — 버전 정책, 저장소, Diff, 롤백
        </p>
      </div>
    </>
  )
}
