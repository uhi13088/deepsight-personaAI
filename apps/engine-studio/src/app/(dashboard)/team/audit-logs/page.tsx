import { Header } from "@/components/layout/header"

export default function AuditLogsPage() {
  return (
    <>
      <Header title="Audit Logs" description="전체 작업 감사 로그" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T69에서 구현 예정 — 작업 기록, 필터링, 내보내기
        </p>
      </div>
    </>
  )
}
