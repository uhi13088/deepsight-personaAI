"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Home, Search, ShoppingBag, Bell, User } from "lucide-react"
import { useUserStore } from "@/lib/user-store"

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
  showBadge?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/feed", icon: Home, label: "홈" },
  { href: "/explore", icon: Search, label: "탐색" },
  { href: "/shop", icon: ShoppingBag, label: "상점" },
  { href: "/notifications", icon: Bell, label: "알림", showBadge: true },
  { href: "/profile", icon: User, label: "프로필" },
]

export function PWBottomNav() {
  const pathname = usePathname()
  const notifications = useUserStore((s) => s.notifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, label, showBadge }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 ${
                isActive ? "" : "text-gray-400"
              }`}
            >
              {isActive ? (
                <Icon className="h-5 w-5" style={{ stroke: "url(#pw-gradient)" }} />
              ) : (
                <Icon className="h-5 w-5" />
              )}
              {showBadge && unreadCount > 0 && (
                <span className="absolute right-1 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className={`text-xs ${isActive ? "pw-text-gradient font-medium" : ""}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
