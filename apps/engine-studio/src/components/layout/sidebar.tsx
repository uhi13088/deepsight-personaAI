"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Home,
  Users,
  Brain,
  FlaskConical,
  Link2,
  Wrench,
  Settings,
  UsersRound,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Beaker,
  LineChart,
  Rocket,
  GitBranch,
  Radio,
  Activity,
  AlertTriangle,
  Database,
  Cpu,
  Shield,
  Globe,
  UserCog,
  KeyRound,
  ScrollText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { useUIStore } from "@/stores/ui-store"
import {
  canAccessPersonaStudio,
  canAccessUserInsight,
  canAccessMatchingLab,
  canAccessSystemIntegration,
  canAccessOperations,
  canAccessGlobalConfig,
  canAccessTeamManagement,
} from "@/stores/auth-store"
import type { UserRole } from "@/types"

interface NavItem {
  title: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
  roles?: UserRole[]
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Persona Studio",
    icon: Users,
    children: [
      { title: "페르소나 목록", href: "/personas", icon: Sparkles },
      { title: "새 페르소나 생성", href: "/personas/create", icon: Users },
      { title: "인큐베이터", href: "/personas/incubator", icon: Beaker },
    ],
  },
  {
    title: "User Insight",
    icon: Brain,
    children: [
      { title: "콜드 스타트 전략", href: "/user-insight/cold-start", icon: Brain },
      { title: "심층 성향 분석", href: "/user-insight/psychometric", icon: Activity },
      { title: "아키타입 관리", href: "/user-insight/archetypes", icon: UsersRound },
    ],
  },
  {
    title: "Matching Lab",
    icon: FlaskConical,
    children: [
      { title: "시뮬레이터", href: "/matching-lab/simulator", icon: FlaskConical },
      { title: "알고리즘 튜닝", href: "/matching-lab/algorithm-tuning", icon: Settings },
      { title: "성과 분석", href: "/matching-lab/performance", icon: LineChart },
    ],
  },
  {
    title: "System Integration",
    icon: Link2,
    children: [
      { title: "배포 파이프라인", href: "/system-integration/deployment", icon: Rocket },
      { title: "버전 관리", href: "/system-integration/versions", icon: GitBranch },
      { title: "이벤트 버스", href: "/system-integration/event-bus", icon: Radio },
    ],
  },
  {
    title: "Operations",
    icon: Wrench,
    children: [
      { title: "시스템 모니터링", href: "/operations/monitoring", icon: Activity },
      { title: "장애 대응", href: "/operations/incidents", icon: AlertTriangle },
      { title: "백업 및 복구", href: "/operations/backup", icon: Database },
    ],
  },
  {
    title: "Global Config",
    icon: Settings,
    children: [
      { title: "모델 설정", href: "/global-config/models", icon: Cpu },
      { title: "안전 필터", href: "/global-config/safety-filters", icon: Shield },
      { title: "API 엔드포인트", href: "/global-config/api-endpoints", icon: Globe },
    ],
  },
  {
    title: "Team & Access",
    icon: UsersRound,
    children: [
      { title: "사용자 관리", href: "/team-access", icon: UserCog },
      { title: "역할 권한", href: "/team-access/permissions", icon: KeyRound },
      { title: "감사 로그", href: "/team-access/audit-logs", icon: ScrollText },
    ],
  },
]

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as UserRole | undefined
  const [isOpen, setIsOpen] = useState(
    item.children?.some((child) => pathname.startsWith(child.href || "")) ?? false
  )

  // 권한 체크
  const canAccess = () => {
    if (!userRole) return false

    switch (item.title) {
      case "Persona Studio":
        return canAccessPersonaStudio(userRole)
      case "User Insight":
        return canAccessUserInsight(userRole)
      case "Matching Lab":
        return canAccessMatchingLab(userRole)
      case "System Integration":
        return canAccessSystemIntegration(userRole)
      case "Operations":
        return canAccessOperations(userRole)
      case "Global Config":
        return canAccessGlobalConfig(userRole)
      case "Team & Access":
        return canAccessTeamManagement(userRole)
      default:
        return true
    }
  }

  if (!canAccess() && depth === 0 && item.title !== "Dashboard") {
    return null
  }

  const isActive = item.href ? pathname === item.href : false
  const hasActiveChild = item.children?.some((child) => pathname.startsWith(child.href || ""))

  if (item.children) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn("h-auto w-full justify-between px-3 py-2", hasActiveChild && "bg-accent")}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.title}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1 pl-4">
          {item.children.map((child) => (
            <NavItemComponent key={child.href} item={child} depth={depth + 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Link href={item.href || "#"}>
      <Button
        variant="ghost"
        className={cn(
          "h-auto w-full justify-start px-3 py-2",
          isActive && "bg-accent text-accent-foreground",
          depth > 0 && "pl-6"
        )}
      >
        <item.icon className="mr-3 h-4 w-4" />
        <span className="text-sm">{item.title}</span>
      </Button>
    </Link>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()

  return (
    <div
      className={cn(
        "bg-card flex flex-col border-r transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-sm font-bold">DS</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Engine Studio</h1>
              <p className="text-muted-foreground text-xs">v3.0</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {!sidebarCollapsed ? (
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavItemComponent key={item.title} item={item} />
            ))}
          </nav>
        ) : (
          <nav className="space-y-2">
            {navigation.map((item) => {
              const href = item.href || item.children?.[0]?.href || "#"
              return (
                <Link key={item.title} href={href}>
                  <Button variant="ghost" size="icon" className="w-full">
                    <item.icon className="h-5 w-5" />
                  </Button>
                </Link>
              )
            })}
          </nav>
        )}
      </ScrollArea>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="border-t p-4">
          <p className="text-muted-foreground text-center text-xs">DeepSight AI Engine Studio</p>
        </div>
      )}
    </div>
  )
}
