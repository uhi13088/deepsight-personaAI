"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Search, Moon, Sun, LogOut, User, Settings, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { useUIStore } from "@/stores/ui-store"
import { USER_ROLE_LABELS } from "@/lib/utils"

// 페이지별 제목 매핑
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "대시보드",
  "/personas": "페르소나 목록",
  "/personas/create": "새 페르소나 생성",
  "/personas/incubator": "인큐베이터 관리",
  "/user-insight/cold-start": "콜드 스타트 전략",
  "/user-insight/psychometric": "심층 성향 분석",
  "/user-insight/archetypes": "아키타입 관리",
  "/matching-lab/simulator": "매칭 시뮬레이터",
  "/matching-lab/algorithm-tuning": "알고리즘 튜닝",
  "/matching-lab/performance": "성과 분석",
  "/system-integration/deployment": "배포 파이프라인",
  "/system-integration/versions": "버전 관리",
  "/system-integration/event-bus": "이벤트 버스 모니터링",
  "/operations/monitoring": "시스템 모니터링",
  "/operations/incidents": "장애 대응",
  "/operations/backup": "백업 및 복구",
  "/global-config/models": "모델 설정",
  "/global-config/safety-filters": "안전 필터",
  "/global-config/api-endpoints": "API 엔드포인트",
  "/team-access": "사용자 관리",
  "/team-access/permissions": "역할 권한",
  "/team-access/audit-logs": "감사 로그",
}

// 알림 데이터 (API 연동 필요)
const notifications: {
  id: string
  type: "info" | "warning" | "success"
  title: string
  message: string
  time: string
  read: boolean
}[] = []

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useUIStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [helpOpen, setHelpOpen] = useState(false)

  const pageTitle = PAGE_TITLES[pathname] || "Engine Studio"
  const unreadCount = notifications.filter((n) => !n.read).length

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      toast.info(`"${searchQuery}" 검색 중...`, {
        description: "검색 기능은 준비 중입니다.",
      })
    }
  }

  const handleHelp = () => {
    setHelpOpen(true)
  }

  return (
    <header className="bg-card flex h-16 items-center justify-between border-b px-6">
      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
      </div>

      {/* Center: Search */}
      <form onSubmit={handleSearch} className="mx-8 hidden max-w-md flex-1 md:flex">
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="페르소나, 설정, 문서 검색..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" onClick={handleHelp}>
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* Help Dialog */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>도움말</DialogTitle>
              <DialogDescription>Engine Studio 사용 가이드</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium">단축키</h4>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>
                    <kbd className="bg-muted rounded px-1">Ctrl + K</kbd> - 검색
                  </li>
                  <li>
                    <kbd className="bg-muted rounded px-1">Ctrl + /</kbd> - 도움말
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">문의</h4>
                <p className="text-muted-foreground text-sm">기술 지원: support@deepsight.ai</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">알림</h3>
              <Button variant="ghost" size="sm">
                모두 읽음
              </Button>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="text-muted-foreground mx-auto h-8 w-8" />
                  <p className="text-muted-foreground mt-2 text-sm">알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-3 ${
                      notification.read ? "bg-background" : "bg-accent"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        variant={
                          notification.type === "warning"
                            ? "warning"
                            : notification.type === "success"
                              ? "success"
                              : "info"
                        }
                        className="mt-0.5"
                      >
                        {notification.type}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{notification.message}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>{getInitials(session?.user?.name || "U")}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-muted-foreground text-xs">
                  {USER_ROLE_LABELS[session?.user?.role || "ANALYST"]}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-muted-foreground text-xs">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              프로필
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
