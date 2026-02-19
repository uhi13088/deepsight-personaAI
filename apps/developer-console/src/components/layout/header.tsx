"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Bell,
  ChevronDown,
  FileText,
  HelpCircle,
  Key,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Webhook,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuthStore } from "@/store/auth-store"
import { useUIStore } from "@/store/ui-store"
import { useNotificationStore } from "@/store/notification-store"
import { cn, formatRelativeTime } from "@/lib/utils"

interface SearchResult {
  type: "api_key" | "log" | "webhook" | "doc"
  id: string
  title: string
  description: string
  url: string
}

export function Header() {
  const router = useRouter()
  const { user, organization, organizations, switchOrganization, logout } = useAuthStore()
  const { theme, setTheme, setSidebarMobileOpen } = useUIStore()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [helpOpen, setHelpOpen] = React.useState(false)
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounced search
  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        if (data.success) {
          setSearchResults(data.data.results)
          setSearchOpen(true)
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false)
    setSearchQuery("")
    router.push(result.url)
  }

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "api_key":
        return <Key className="h-4 w-4" />
      case "webhook":
        return <Webhook className="h-4 w-4" />
      case "log":
        return <History className="h-4 w-4" />
      case "doc":
        return <FileText className="h-4 w-4" />
    }
  }

  const handleHelp = () => {
    setHelpOpen(true)
  }

  const displayName = user?.name || user?.email || "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="bg-background sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Search */}
      <Popover open={searchOpen && searchResults.length > 0} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search API keys, logs, docs..."
              className="bg-muted/50 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
            {isSearching && (
              <div className="absolute right-2.5 top-2.5">
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="max-h-[300px] overflow-auto">
            {searchResults.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                className="hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <div className="text-muted-foreground">{getResultIcon(result.type)}</div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{result.title}</p>
                  <p className="text-muted-foreground truncate text-xs">{result.description}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {result.type.replace("_", " ")}
                </Badge>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        {/* Organization Switcher */}
        {organizations.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <div className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded text-xs font-medium">
                  {organization?.name?.[0] || "O"}
                </div>
                <span className="hidden max-w-[120px] truncate md:inline-block">
                  {organization?.name || "Select Org"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  className={cn("gap-2", org.id === organization?.id && "bg-accent")}
                >
                  <div className="bg-muted flex h-6 w-6 items-center justify-center rounded text-xs font-medium">
                    {org.name[0]}
                  </div>
                  <span className="flex-1 truncate">{org.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {org.plan}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" onClick={handleHelp}>
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>

        {/* Help Dialog */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Help</DialogTitle>
              <DialogDescription>Developer Console User Guide</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium">Keyboard Shortcuts</h4>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>
                    <kbd className="bg-muted rounded px-1">Ctrl + K</kbd> - Search
                  </li>
                  <li>
                    <kbd className="bg-muted rounded px-1">Ctrl + /</kbd> - Help
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Support</h4>
                <p className="text-muted-foreground text-sm">
                  Technical support: support@deepsight.ai
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary h-auto p-0 text-xs"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="text-muted-foreground mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "hover:bg-muted/50 flex cursor-pointer gap-3 border-b p-4 last:border-0",
                      !notification.read && "bg-muted/30"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        notification.type === "error" && "bg-destructive",
                        notification.type === "usage" && "bg-yellow-500",
                        notification.type === "security" && "bg-red-500",
                        notification.type === "billing" && "bg-green-500",
                        notification.type === "system" && "bg-blue-500"
                      )}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {notification.message}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link
                href="/notifications"
                className="text-muted-foreground hover:bg-muted hover:text-foreground block w-full rounded-md p-2 text-center text-sm"
              >
                View all notifications
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden h-4 w-4 md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer gap-2"
              onClick={async () => {
                logout()
                if ("caches" in window) {
                  const cacheNames = await caches.keys()
                  await Promise.all(cacheNames.map((name) => caches.delete(name)))
                }
                localStorage.clear()
                sessionStorage.clear()
                await signOut({ callbackUrl: "/login" })
              }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
