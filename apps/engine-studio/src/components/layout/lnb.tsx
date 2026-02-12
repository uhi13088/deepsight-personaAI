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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

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
    ],
  },
  {
    label: "User Insight",
    icon: Brain,
    basePath: "/user-insight",
    children: [
      { label: "Cold Start Strategy", href: "/user-insight/cold-start" },
      { label: "Psychometric Model", href: "/user-insight/psychometric" },
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
    label: "System Integration",
    icon: Link2,
    basePath: "/system-integration",
    children: [
      { label: "Deployment Pipeline", href: "/system-integration/deployment" },
      { label: "Version Control", href: "/system-integration/versions" },
      { label: "Event Bus Monitor", href: "/system-integration/event-bus" },
    ],
  },
  {
    label: "Operations",
    icon: Wrench,
    basePath: "/operations",
    children: [
      { label: "System Monitoring", href: "/operations/monitoring" },
      { label: "Incident Management", href: "/operations/incidents" },
      { label: "Backup & Recovery", href: "/operations/backup" },
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

const SEPARATOR_INDICES = [1, 4, 6]

export function LNB() {
  const pathname = usePathname()
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

  return (
    <aside className="border-sidebar-border bg-sidebar flex h-screen w-60 flex-col border-r">
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
          ES
        </div>
        <span className="text-sidebar-foreground text-sm font-semibold">Engine Studio</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
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
              ) : (
                <Link
                  href={section.basePath}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    sectionActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{section.label}</span>
                </Link>
              )}

              {hasChildren && expanded && (
                <div className="border-sidebar-border ml-4 mt-0.5 space-y-0.5 border-l pl-2">
                  {section.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block rounded-md px-2 py-1 text-xs transition-colors",
                        isActive(child.href)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center gap-2">
          <div className="bg-muted h-7 w-7 rounded-full" />
          <div className="flex-1 overflow-hidden">
            <p className="text-sidebar-foreground truncate text-xs font-medium">Admin</p>
            <p className="text-sidebar-muted truncate text-[10px]">DeepSight Internal</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
