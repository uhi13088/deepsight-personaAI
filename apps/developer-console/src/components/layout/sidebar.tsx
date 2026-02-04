"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Key,
  BarChart3,
  ScrollText,
  CreditCard,
  Webhook,
  BookOpen,
  PlayCircle,
  Users,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useUIStore } from "@/store/ui-store"

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: { title: string; href: string }[]
  badge?: string
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
]

const managementNavItems: NavItem[] = [
  {
    title: "API Keys",
    icon: Key,
    children: [
      { title: "Key 목록", href: "/api-keys" },
      { title: "새 Key 생성", href: "/api-keys/new" },
    ],
  },
  {
    title: "Usage",
    icon: BarChart3,
    href: "/usage",
  },
  {
    title: "Logs",
    icon: ScrollText,
    href: "/logs",
  },
]

const billingNavItems: NavItem[] = [
  {
    title: "Billing",
    icon: CreditCard,
    children: [
      { title: "현재 플랜", href: "/billing" },
      { title: "결제 수단", href: "/billing/payment-methods" },
      { title: "청구서", href: "/billing/invoices" },
    ],
  },
  {
    title: "Webhooks",
    icon: Webhook,
    badge: "v2.0",
    children: [
      { title: "Webhook 목록", href: "/webhooks" },
      { title: "이벤트 로그", href: "/webhooks/events" },
    ],
  },
]

const docsNavItems: NavItem[] = [
  {
    title: "Documentation",
    icon: BookOpen,
    children: [
      { title: "시작하기", href: "/docs/getting-started" },
      { title: "API Reference", href: "/docs/api-reference" },
      { title: "SDK 가이드", href: "/docs/sdk" },
      { title: "샘플 코드", href: "/docs/examples" },
    ],
  },
  {
    title: "Playground",
    href: "/playground",
    icon: PlayCircle,
  },
]

const settingsNavItems: NavItem[] = [
  {
    title: "Team",
    icon: Users,
    children: [
      { title: "팀원 관리", href: "/team" },
      { title: "권한 설정", href: "/team/roles" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      { title: "계정 설정", href: "/settings" },
      { title: "알림 설정", href: "/settings/notifications" },
      { title: "보안 설정", href: "/settings/security" },
    ],
  },
  {
    title: "Support",
    icon: HelpCircle,
    children: [
      { title: "문의하기", href: "/support" },
      { title: "FAQ", href: "/support/faq" },
      { title: "커뮤니티", href: "/support/community" },
    ],
  },
]

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)

  const isActive = item.href
    ? pathname === item.href
    : item.children?.some(
        (child) => pathname === child.href || pathname.startsWith(child.href + "/")
      )

  React.useEffect(() => {
    if (isActive && item.children) {
      setIsOpen(true)
    }
  }, [isActive, item.children])

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="bg-primary/10 text-primary ml-auto rounded px-1.5 py-0.5 text-xs font-medium">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  if (collapsed) {
    return (
      <div className="group relative">
        <button
          className={cn(
            "flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
        </button>
        <div className="absolute left-full top-0 z-50 ml-2 hidden group-hover:block">
          <div className="bg-popover min-w-[160px] rounded-lg border p-2 shadow-lg">
            <div className="text-muted-foreground mb-1 px-2 py-1 text-xs font-semibold">
              {item.title}
            </div>
            {item.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm",
                  pathname === child.href ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                {child.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.title}</span>
          {item.badge && (
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
              {item.badge}
            </span>
          )}
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-1">
        {item.children?.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === child.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {child.title}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavSection({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <NavItemComponent key={item.title} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <div
      className={cn(
        "bg-background relative flex h-full flex-col border-r transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-14 items-center border-b px-4",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg font-bold">
              D
            </div>
            <span className="font-semibold">DeepSight</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-4">
          <NavSection items={mainNavItems} collapsed={sidebarCollapsed} />

          <Separator />

          <NavSection items={managementNavItems} collapsed={sidebarCollapsed} />

          <Separator />

          <NavSection items={billingNavItems} collapsed={sidebarCollapsed} />

          <Separator />

          <NavSection items={docsNavItems} collapsed={sidebarCollapsed} />

          <Separator />

          <NavSection items={settingsNavItems} collapsed={sidebarCollapsed} />
        </div>
      </ScrollArea>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="border-t p-4">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs font-medium">Current Plan</div>
            <div className="text-primary text-sm font-semibold">Free</div>
            <Link
              href="/billing"
              className="text-muted-foreground hover:text-primary mt-2 block text-xs"
            >
              Upgrade to Pro →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
