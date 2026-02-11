import { Header } from "@/components/layout/header"

export default function RolePermissionsPage() {
  return (
    <>
      <Header title="Role Permissions" description="역할별 권한 관리" />
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          T69에서 구현 예정 — Admin/AI Engineer/Content Manager/Analyst 4종
        </p>
      </div>
    </>
  )
}
