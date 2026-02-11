import { Header } from "@/components/layout/header"

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" description="시스템 상태, 매칭 성과, 최근 활동" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Active Personas" value="—" />
          <DashboardCard title="Matching Rate" value="—" />
          <DashboardCard title="API Latency" value="—" />
          <DashboardCard title="System Health" value="—" />
        </div>
      </div>
    </>
  )
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
