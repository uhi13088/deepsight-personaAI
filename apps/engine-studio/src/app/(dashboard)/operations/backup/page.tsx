import { Header } from "@/components/layout/header"

export default function BackupPage() {
  return (
    <>
      <Header title="Backup & Recovery" description="백업 정책, 재해복구 계획" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T67에서 구현 예정 — 백업 대상, 모니터링, DR 계획
        </p>
      </div>
    </>
  )
}
