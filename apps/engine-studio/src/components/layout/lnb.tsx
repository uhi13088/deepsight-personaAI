"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Palette,
  Brain,
  FlaskConical,
  Link2,
  Wrench,
  Settings,
  Users,
  ChevronDown,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Swords,
  LogOut,
  Shield,
} from "lucide-react"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"

interface NavSection {
  label: string
  icon: React.ComponentType<{ className?: string }>
  basePath: string
  children: { label: string; href: string }[]
}

const navSections: NavSection[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    basePath: "/dashboard",
    children: [],
  },
  {
    label: "Persona Studio",
    icon: Palette,
    basePath: "/persona-studio",
    children: [
      { label: "Persona List", href: "/persona-studio/list" },
      { label: "Create New Persona", href: "/persona-studio/create" },
      { label: "Node Editor", href: "/persona-studio/node-editor" },
      { label: "Incubator Dashboard", href: "/persona-studio/incubator" },
      { label: "Golden Samples", href: "/persona-studio/incubator/golden-samples" },
    ],
  },
  {
    label: "User Insight",
    icon: Brain,
    basePath: "/user-insight",
    children: [
      { label: "Cold Start Strategy", href: "/user-insight/cold-start" },
      { label: "Psychometric Simulator", href: "/user-insight/psychometric" },
      { label: "Archetype Manager", href: "/user-insight/archetype" },
    ],
  },
  {
    label: "Matching Lab",
    icon: FlaskConical,
    basePath: "/matching-lab",
    children: [
      { label: "Simulator", href: "/matching-lab/simulator" },
      { label: "Algorithm Tuning", href: "/matching-lab/tuning" },
      { label: "Performance Analytics", href: "/matching-lab/analytics" },
    ],
  },
  {
    label: "Arena",
    icon: Swords,
    basePath: "/arena",
    children: [],
  },
  {
    label: "System Integration",
    icon: Link2,
    basePath: "/system-integration",
    children: [
      { label: "Deployment Pipeline", href: "/system-integration/deployment" },
      { label: "Version Management", href: "/system-integration/versions" },
    ],
  },
  {
    label: "Operations",
    icon: Wrench,
    basePath: "/operations",
    children: [
      { label: "System Monitoring", href: "/operations/monitoring" },
      { label: "LLM Costs", href: "/operations/llm-costs" },
      { label: "Incident Management", href: "/operations/incidents" },
      { label: "Backup & Recovery", href: "/operations/backup" },
    ],
  },
  {
    label: "Security",
    icon: Shield,
    basePath: "/security",
    children: [
      { label: "Dashboard", href: "/security/dashboard" },
      { label: "Quarantine Queue", href: "/security/quarantine" },
      { label: "Kill Switch", href: "/security/kill-switch" },
      { label: "Connectivity", href: "/security/connectivity" },
    ],
  },
  {
    label: "PW Admin",
    icon: Globe,
    basePath: "/persona-world-admin",
    children: [
      { label: "Operations", href: "/persona-world-admin/operations" },
      { label: "Scheduler", href: "/persona-world-admin/scheduler" },
      { label: "Moderation", href: "/persona-world-admin/moderation" },
      { label: "Quality Monitor", href: "/persona-world-admin/quality" },
      { label: "Evolution", href: "/persona-world-admin/evolution" },
      { label: "News Reactions", href: "/persona-world-admin/news" },
      { label: "Shop Management", href: "/persona-world-admin/shop" },
    ],
  },
  {
    label: "Global Config",
    icon: Settings,
    basePath: "/global-config",
    children: [
      { label: "Model Settings", href: "/global-config/model-settings" },
      { label: "Safety Filters", href: "/global-config/safety-filters" },
      { label: "API Endpoints", href: "/global-config/api-endpoints" },
    ],
  },
  {
    label: "Team & Access",
    icon: Users,
    basePath: "/team",
    children: [
      { label: "User Management", href: "/team/users" },
      { label: "Role Permissions", href: "/team/roles" },
      { label: "Audit Logs", href: "/team/audit-logs" },
    ],
  },
]

const SEPARATOR_INDICES = [1, 5, 9]

const LNB_COLLAPSED_KEY = "lnb-collapsed"

export function LNB() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCollapsed(localStorage.getItem(LNB_COLLAPSED_KEY) === "true")
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(LNB_COLLAPSED_KEY, String(next))
      return next
    })
  }

  const handleLogout = useCallback(async () => {
    // 브라우저 캐시 초기화
    if ("caches" in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
    // localStorage/sessionStorage 정리
    localStorage.clear()
    sessionStorage.clear()
    // NextAuth signOut + 로그인 페이지로 이동
    await signOut({ callbackUrl: "/login" })
  }, [])

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const section of navSections) {
      if (pathname.startsWith(section.basePath)) {
        initial.add(section.basePath)
      }
    }
    return initial
  })

  function toggleSection(basePath: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(basePath)) {
        next.delete(basePath)
      } else {
        next.add(basePath)
      }
      return next
    })
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  /**
   * 자식 메뉴 중 가장 구체적인(경로가 긴) 매칭 하나만 active 처리.
   * /persona-studio/incubator 와 /persona-studio/incubator/golden-samples 가
   * 동시에 active 되는 버그 방지.
   */
  function getActiveChildHref(children: { href: string }[]): string | null {
    let best: string | null = null
    for (const child of children) {
      if (pathname === child.href || pathname.startsWith(child.href + "/")) {
        if (!best || child.href.length > best.length) {
          best = child.href
        }
      }
    }
    return best
  }

  return (
    <aside
      className={cn(
        "border-sidebar-border bg-sidebar flex h-screen flex-col border-r transition-[width] duration-200",
        collapsed ? "w-14" : "w-60"
      )}
    >
      {/* Header */}
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-3">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
          ES
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground truncate text-sm font-semibold">
            Engine Studio
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        {navSections.map((section, index) => {
          const Icon = section.icon
          const sectionActive = isActive(section.basePath)
          const expanded = expandedSections.has(section.basePath)
          const hasChildren = section.children.length > 0

          return (
            <div key={section.basePath}>
              {SEPARATOR_INDICES.includes(index) && (
                <div className="border-sidebar-border mx-2 my-2 border-t" />
              )}

              {hasChildren ? (
                collapsed ? (
                  <Link
                    href={section.children[0].href}
                    className={cn(
                      "flex items-center justify-center rounded-md p-1.5 transition-colors",
                      sectionActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    title={section.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleSection(section.basePath)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      sectionActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>
                )
              ) : (
                <Link
                  href={section.basePath}
                  className={cn(
                    "flex items-center rounded-md transition-colors",
                    collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5 text-sm",
                    sectionActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? section.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{section.label}</span>}
                </Link>
              )}

              {hasChildren && expanded && !collapsed && (
                <div className="border-sidebar-border ml-4 mt-0.5 space-y-0.5 border-l pl-2">
                  {(() => {
                    const activeHref = getActiveChildHref(section.children)
                    return section.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-md px-2 py-1 text-xs transition-colors",
                          child.href === activeHref
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-sidebar-border space-y-2 border-t p-2">
        {/* Version */}
        <div
          className={cn(
            "text-sidebar-muted flex items-center px-2 py-1 text-[10px]",
            collapsed ? "justify-center" : "gap-1.5"
          )}
        >
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          {!collapsed && <span>Engine Studio v4.0</span>}
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center rounded-md px-2 py-1.5 text-xs transition-colors",
              collapsed ? "justify-center" : "gap-2"
            )}
            title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Moon className="h-3.5 w-3.5 shrink-0" />
            )}
            {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs transition-colors"
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-2">접기</span>
            </>
          )}
        </button>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className={cn(
            "text-sidebar-muted flex w-full items-center rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-red-500/10 hover:text-red-500",
            collapsed ? "justify-center" : "gap-2"
          )}
          title="로그아웃"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}
