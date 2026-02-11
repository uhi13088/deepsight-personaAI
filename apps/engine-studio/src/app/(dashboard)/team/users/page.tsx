import { Header } from "@/components/layout/header"

export default function UserManagementPage() {
  return (
    <>
      <Header title="User Management" description="팀 사용자 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T69에서 구현 예정 — 사용자 목록, 초대, 비활성화
        </p>
      </div>
    </>
  )
}
