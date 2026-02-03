"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Database,
  HardDrive,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Settings,
  Trash2,
  Eye,
  MoreHorizontal,
  Shield,
  Lock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// 백업 데이터
interface Backup {
  id: string
  name: string
  type: "full" | "incremental" | "differential"
  status: "completed" | "in_progress" | "failed" | "scheduled"
  size: string
  duration: string
  createdAt: string
  expiresAt: string
  location: "local" | "s3" | "gcs"
}

// Backups - empty by default, will be loaded from API
const BACKUPS: Backup[] = []

// Backup stats - default empty values
const BACKUP_STATS = {
  totalBackups: 0,
  totalSize: "0 GB",
  lastBackup: "-",
  nextBackup: "-",
  successRate: 0,
  retentionDays: 30,
}

// Default backup schedule
const BACKUP_SCHEDULE = {
  fullBackup: { enabled: true, frequency: "daily", time: "03:00" },
  incrementalBackup: { enabled: true, frequency: "6h", time: "매 6시간" },
  retentionFull: 30,
  retentionIncremental: 7,
}

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState("backups")
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [settings, setSettings] = useState(BACKUP_SCHEDULE)
  const [backupTypeFilter, setBackupTypeFilter] = useState("all")
  const [isBackingUp, setIsBackingUp] = useState(false)

  const getStatusBadge = (status: Backup["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">완료</Badge>
      case "in_progress":
        return <Badge className="bg-blue-500">진행중</Badge>
      case "failed":
        return <Badge variant="destructive">실패</Badge>
      case "scheduled":
        return <Badge variant="secondary">예정</Badge>
    }
  }

  const getTypeBadge = (type: Backup["type"]) => {
    switch (type) {
      case "full":
        return <Badge variant="outline">전체</Badge>
      case "incremental":
        return <Badge variant="outline">증분</Badge>
      case "differential":
        return <Badge variant="outline">차등</Badge>
    }
  }

  const getLocationIcon = (location: Backup["location"]) => {
    switch (location) {
      case "local":
        return <HardDrive className="h-4 w-4" />
      case "s3":
        return <Cloud className="h-4 w-4" />
      case "gcs":
        return <Cloud className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Database className="h-6 w-6 text-blue-500" />
            백업 및 복구
          </h2>
          <p className="text-muted-foreground">시스템 데이터 백업을 관리하고 복구합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast.success("새로고침 완료", {
                description: "백업 목록이 갱신되었습니다.",
              })
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button
            disabled={isBackingUp}
            onClick={() => {
              setIsBackingUp(true)
              toast.info("백업 시작", {
                description: "즉시 백업이 시작되었습니다. 완료까지 몇 분 소요될 수 있습니다.",
              })
              setTimeout(() => {
                setIsBackingUp(false)
                toast.success("백업 완료", {
                  description: "백업이 성공적으로 완료되었습니다.",
                })
              }, 3000)
            }}
          >
            <Play className="mr-2 h-4 w-4" />
            즉시 백업
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 백업 수</CardTitle>
            <Database className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{BACKUP_STATS.totalBackups}</div>
            <p className="text-muted-foreground mt-1 text-xs">총 {BACKUP_STATS.totalSize}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">마지막 백업</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15:00</div>
            <p className="text-muted-foreground mt-1 text-xs">{BACKUP_STATS.lastBackup}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">다음 백업</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">21:00</div>
            <p className="text-muted-foreground mt-1 text-xs">{BACKUP_STATS.nextBackup}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">성공률</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{BACKUP_STATS.successRate}%</div>
            <Progress value={BACKUP_STATS.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="backups">백업 목록</TabsTrigger>
          <TabsTrigger value="schedule">스케줄 설정</TabsTrigger>
          <TabsTrigger value="storage">저장소 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>백업 이력</CardTitle>
                  <CardDescription>최근 백업 기록 및 상태</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={backupTypeFilter}
                    onValueChange={(value) => {
                      setBackupTypeFilter(value)
                      toast.info("필터 적용", {
                        description:
                          value === "all"
                            ? "모든 백업을 표시합니다."
                            : `${value === "full" ? "전체" : "증분"} 백업만 표시합니다.`,
                      })
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="full">전체 백업</SelectItem>
                      <SelectItem value="incremental">증분 백업</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {BACKUPS.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Database className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">백업 이력이 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    백업을 실행하면 여기에 이력이 표시됩니다.
                  </p>
                  <Button
                    onClick={() => {
                      setIsBackingUp(true)
                      toast.info("백업 시작", {
                        description: "즉시 백업이 시작되었습니다.",
                      })
                      setTimeout(() => {
                        setIsBackingUp(false)
                        toast.success("백업 완료")
                      }, 3000)
                    }}
                    disabled={isBackingUp}
                  >
                    <Play className="mr-2 h-4 w-4" />첫 백업 실행
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>백업 ID</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>크기</TableHead>
                      <TableHead>소요 시간</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead>저장소</TableHead>
                      <TableHead className="text-right">상태</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {BACKUPS.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-mono text-sm">{backup.id}</TableCell>
                        <TableCell className="font-medium">{backup.name}</TableCell>
                        <TableCell>{getTypeBadge(backup.type)}</TableCell>
                        <TableCell>{backup.size}</TableCell>
                        <TableCell>{backup.duration}</TableCell>
                        <TableCell>{backup.createdAt}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>{getLocationIcon(backup.location)}</TooltipTrigger>
                            <TooltipContent>
                              {backup.location === "s3" ? "AWS S3" : backup.location}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(backup.status)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBackup(backup)
                                  setShowRestoreDialog(true)
                                }}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                복구
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  toast.success("다운로드 시작", {
                                    description: `${backup.name} (${backup.size}) 다운로드를 시작합니다.`,
                                  })
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                다운로드
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  toast.info(`백업 상세정보: ${backup.id}`, {
                                    description: `유형: ${backup.type}, 크기: ${backup.size}, 생성일: ${backup.createdAt}`,
                                  })
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                상세보기
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  toast.error("백업 삭제", {
                                    description: `${backup.name}이(가) 삭제되었습니다.`,
                                  })
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>전체 백업 스케줄</CardTitle>
                <CardDescription>전체 데이터베이스 백업 설정</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>자동 백업 활성화</Label>
                    <p className="text-muted-foreground text-sm">
                      예약된 시간에 자동으로 백업을 수행합니다.
                    </p>
                  </div>
                  <Switch
                    checked={settings.fullBackup.enabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        fullBackup: { ...settings.fullBackup, enabled: checked },
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>백업 주기</Label>
                    <Select
                      value={settings.fullBackup.frequency}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          fullBackup: { ...settings.fullBackup, frequency: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">매일</SelectItem>
                        <SelectItem value="weekly">매주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>백업 시간</Label>
                    <Input
                      type="time"
                      value={settings.fullBackup.time}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          fullBackup: { ...settings.fullBackup, time: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>보존 기간 (일)</Label>
                    <Input
                      type="number"
                      value={settings.retentionFull}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          retentionFull: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>증분 백업 스케줄</CardTitle>
                <CardDescription>변경된 데이터만 백업하는 설정</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>증분 백업 활성화</Label>
                    <p className="text-muted-foreground text-sm">
                      전체 백업 사이에 증분 백업을 수행합니다.
                    </p>
                  </div>
                  <Switch
                    checked={settings.incrementalBackup.enabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        incrementalBackup: { ...settings.incrementalBackup, enabled: checked },
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>백업 주기</Label>
                    <Select
                      value={settings.incrementalBackup.frequency}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          incrementalBackup: { ...settings.incrementalBackup, frequency: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">매시간</SelectItem>
                        <SelectItem value="6h">6시간마다</SelectItem>
                        <SelectItem value="12h">12시간마다</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>보존 기간 (일)</Label>
                    <Input
                      type="number"
                      value={settings.retentionIncremental}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          retentionIncremental: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                toast.success("설정 저장됨", {
                  description: "백업 스케줄 설정이 성공적으로 저장되었습니다.",
                })
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              설정 저장
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  AWS S3
                </CardTitle>
                <CardDescription>기본 백업 저장소</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">상태</span>
                  <Badge className="bg-green-500">연결됨</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">버킷</span>
                  <span className="font-mono text-sm">deepsight-backups</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">리전</span>
                  <span className="text-sm">ap-northeast-2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">사용량</span>
                  <span className="text-sm">892 GB / 2 TB</span>
                </div>
                <Progress value={44.6} className="mt-2" />
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4" />
                  AES-256 암호화 적용
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  로컬 저장소
                </CardTitle>
                <CardDescription>보조 백업 저장소</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">상태</span>
                  <Badge variant="secondary">대기</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">경로</span>
                  <span className="font-mono text-sm">/backup/data</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">사용량</span>
                  <span className="text-sm">0 GB / 500 GB</span>
                </div>
                <Progress value={0} className="mt-2" />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast.success("로컬 백업 활성화", {
                      description: "로컬 저장소가 보조 백업 대상으로 설정되었습니다.",
                    })
                  }}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  로컬 백업 활성화
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>백업 복구</DialogTitle>
            <DialogDescription>
              선택한 백업에서 데이터를 복구합니다. 이 작업은 현재 데이터를 덮어씁니다.
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="py-4">
              <div className="bg-muted/30 space-y-2 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">백업 ID</span>
                  <span className="font-mono">{selectedBackup.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">생성일</span>
                  <span>{selectedBackup.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">크기</span>
                  <span>{selectedBackup.size}</span>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-yellow-500 bg-yellow-500/10 p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-600">주의</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      복구 작업은 되돌릴 수 없습니다. 현재 데이터를 먼저 백업하는 것을 권장합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRestoreDialog(false)
                toast.info("복구 시작됨", {
                  description: `${selectedBackup?.name || "선택된 백업"}에서 복구를 시작합니다. 완료까지 시간이 소요될 수 있습니다.`,
                })
                setTimeout(() => {
                  toast.success("복구 완료", {
                    description: "데이터 복구가 성공적으로 완료되었습니다.",
                  })
                }, 3000)
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              복구 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
