"use client"

import { Bell, Search, X } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

// ── 검색 대상 페이지 ─────────────────────────────────────────

interface SearchItem {
  label: string
  href: string
  section: string
}

const SEARCH_ITEMS: SearchItem[] = [
  { label: "Dashboard", href: "/dashboard", section: "Dashboard" },
  { label: "Persona List", href: "/persona-studio/list", section: "Persona Studio" },
  { label: "Create New Persona", href: "/persona-studio/create", section: "Persona Studio" },
  { label: "Node Editor", href: "/persona-studio/node-editor", section: "Persona Studio" },
  { label: "Incubator Dashboard", href: "/persona-studio/incubator", section: "Persona Studio" },
  {
    label: "Golden Samples",
    href: "/persona-studio/incubator/golden-samples",
    section: "Persona Studio",
  },
  { label: "Cold Start Strategy", href: "/user-insight/cold-start", section: "User Insight" },
  {
    label: "Psychometric Simulator",
    href: "/user-insight/psychometric",
    section: "User Insight",
  },
  { label: "Archetype Manager", href: "/user-insight/archetype", section: "User Insight" },
  { label: "Simulator", href: "/matching-lab/simulator", section: "Matching Lab" },
  { label: "Algorithm Tuning", href: "/matching-lab/tuning", section: "Matching Lab" },
  { label: "Performance Analytics", href: "/matching-lab/analytics", section: "Matching Lab" },
  { label: "Arena", href: "/arena", section: "Arena" },
  {
    label: "Deployment Pipeline",
    href: "/system-integration/deployment",
    section: "System Integration",
  },
  {
    label: "Version Management",
    href: "/system-integration/versions",
    section: "System Integration",
  },
  { label: "System Monitoring", href: "/operations/monitoring", section: "Operations" },
  { label: "LLM Costs", href: "/operations/llm-costs", section: "Operations" },
  { label: "Incident Management", href: "/operations/incidents", section: "Operations" },
  { label: "Backup & Recovery", href: "/operations/backup", section: "Operations" },
  { label: "Security Dashboard", href: "/security/dashboard", section: "Security" },
  { label: "Quarantine Queue", href: "/security/quarantine", section: "Security" },
  { label: "Kill Switch", href: "/security/kill-switch", section: "Security" },
  { label: "Connectivity", href: "/security/connectivity", section: "Security" },
  { label: "Operations", href: "/persona-world-admin/operations", section: "PW Admin" },
  { label: "Moderation", href: "/persona-world-admin/moderation", section: "PW Admin" },
  { label: "Quality Monitor", href: "/persona-world-admin/quality", section: "PW Admin" },
  { label: "Evolution", href: "/persona-world-admin/evolution", section: "PW Admin" },
  { label: "News Reactions", href: "/persona-world-admin/news", section: "PW Admin" },
  { label: "Model Settings", href: "/global-config/model-settings", section: "Global Config" },
  { label: "Safety Filters", href: "/global-config/safety-filters", section: "Global Config" },
  { label: "API Endpoints", href: "/global-config/api-endpoints", section: "Global Config" },
  { label: "User Management", href: "/team/users", section: "Team & Access" },
  { label: "Role Permissions", href: "/team/roles", section: "Team & Access" },
  { label: "Audit Logs", href: "/team/audit-logs", section: "Team & Access" },
]

// ── 알림 타입 ────────────────────────────────────────────────

interface Notification {
  id: string
  level: "info" | "warning" | "critical"
  title: string
  message: string
  createdAt: string
  read: boolean
}

// ── Header ───────────────────────────────────────────────────

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // 알림 로드
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/internal/notifications")
        const json = (await res.json()) as {
          success: boolean
          data?: { notifications: Notification[] }
        }
        if (json.success && json.data) {
          setNotifications(json.data.notifications)
        }
      } catch {
        // ignore — API may not exist yet
      }
    }
    loadNotifications()
    const interval = setInterval(loadNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Cmd+K 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      <header className="border-border flex h-14 items-center justify-between border-b px-6">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* 검색 버튼 */}
          <button
            onClick={() => setSearchOpen(true)}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">검색</span>
            <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* 알림 버튼 */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground relative rounded-md p-1.5 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <NotificationDropdown
                notifications={notifications}
                onClose={() => setNotifOpen(false)}
                onMarkRead={(id) =>
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, read: true } : n))
                  )
                }
                onMarkAllRead={() =>
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                }
              />
            )}
          </div>
        </div>
      </header>

      {/* 검색 Command Palette */}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </>
  )
}

// ── Search Palette ───────────────────────────────────────────

function SearchPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? SEARCH_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.section.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_ITEMS

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const navigate = useCallback(
    (href: string) => {
      router.push(href)
      onClose()
    },
    [router, onClose]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].href)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="bg-popover border-border relative w-full max-w-lg rounded-xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="border-border flex items-center gap-2 border-b px-4 py-3">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="페이지 검색..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 결과 목록 */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              검색 결과가 없습니다
            </p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground text-xs">{item.section}</span>
              </button>
            ))
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="border-border text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-[10px]">
          <span>↑↓ 이동</span>
          <span>↵ 선택</span>
          <span>esc 닫기</span>
        </div>
      </div>
    </div>
  )
}

// ── Notification Dropdown ────────────────────────────────────

function NotificationDropdown({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: Notification[]
  onClose: () => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const levelColors = {
    info: "bg-blue-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  }

  return (
    <div
      ref={ref}
      className="bg-popover border-border absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border shadow-xl"
    >
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-semibold">알림</span>
        {notifications.some((n) => !n.read) && (
          <button onClick={onMarkAllRead} className="text-muted-foreground text-xs hover:underline">
            모두 읽음
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-xs">알림이 없습니다</p>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => onMarkRead(notif.id)}
              className={`hover:bg-accent/50 flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${
                !notif.read ? "bg-accent/20" : ""
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${levelColors[notif.level]}`}
              />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium">{notif.title}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{notif.message}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  {formatRelativeTime(notif.createdAt)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
