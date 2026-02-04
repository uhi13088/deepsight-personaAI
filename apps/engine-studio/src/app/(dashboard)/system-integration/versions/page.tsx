"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { versionsService } from "@/services"
import type { Version, Commit, Branch } from "@/services"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Tag,
  Clock,
  User,
  MoreHorizontal,
  Eye,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  FileCode,
  Copy,
} from "lucide-react"

export default function VersionControlPage() {
  const [versions, setVersions] = useState<Version[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false)
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false)
  const [, setSelectedVersion] = useState<Version | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchData = useCallback(async () => {
    try {
      const data = await versionsService.getVersions()
      setVersions(data.versions)
      setCommits(data.commits)
      setBranches(data.branches)
    } catch (error) {
      console.error("Failed to fetch versions:", error)
      toast.error("버전 데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  const [branchFilter, setBranchFilter] = useState("all")
  const [compareBaseVersion, setCompareBaseVersion] = useState("")
  const [compareTargetVersion, setCompareTargetVersion] = useState("")
  const [newTag, setNewTag] = useState({
    tag: "",
    name: "",
    description: "",
    branch: "main",
    commitHash: "",
  })

  const handleViewVersionDetails = (version: Version) => {
    setSelectedVersion(version)
    toast.info(`${version.tag} 상세 정보`, {
      description: version.description,
    })
  }

  const handleDownloadSource = (version: Version) => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: `${version.tag} 소스 다운로드 중...`,
      success: `${version.tag} 소스 다운로드가 완료되었습니다.`,
      error: "다운로드에 실패했습니다.",
    })
  }

  const handleRollback = (version: Version) => {
    toast.warning(`${version.tag} 버전으로 롤백하시겠습니까?`, {
      description: "이 작업은 현재 배포를 되돌립니다.",
      action: {
        label: "롤백",
        onClick: () => {
          toast.promise(versionsService.rollbackVersion(version.id), {
            loading: `${version.tag}로 롤백 중...`,
            success: () => {
              fetchData()
              return `${version.tag}로 롤백이 완료되었습니다.`
            },
            error: "롤백에 실패했습니다.",
          })
        },
      },
    })
  }

  const handleDeleteVersion = (version: Version) => {
    toast.error(`${version.tag} 버전을 삭제하시겠습니까?`, {
      description: "이 작업은 되돌릴 수 없습니다.",
      action: {
        label: "삭제",
        onClick: () => {
          toast.promise(versionsService.deleteVersion(version.id), {
            loading: "버전 삭제 중...",
            success: () => {
              fetchData()
              return `${version.tag} 버전이 삭제되었습니다.`
            },
            error: "버전 삭제에 실패했습니다.",
          })
        },
      },
    })
  }

  const handleCompareVersions = () => {
    if (!compareBaseVersion || !compareTargetVersion) {
      toast.error("비교할 두 버전을 모두 선택해주세요.")
      return
    }
    setIsCompareDialogOpen(false)
    toast.success(`${compareBaseVersion}와 ${compareTargetVersion} 비교`, {
      description: "버전 비교 결과를 불러옵니다.",
    })
  }

  const handleViewCommit = (commit: Commit) => {
    toast.info(`커밋 상세: ${commit.shortHash}`, {
      description: commit.message,
    })
  }

  const handleCreateBranch = () => {
    toast.info("새 브랜치를 생성합니다.", {
      description: "브랜치 이름과 기준 브랜치를 입력하세요.",
    })
  }

  const handleViewBranchCommits = (branch: Branch) => {
    toast.info(`${branch.name} 브랜치 커밋`, {
      description: `최근 커밋: ${branch.lastCommit}`,
    })
  }

  const handleCreatePR = (branch: Branch) => {
    toast.success(`${branch.name} 브랜치에서 PR 생성`, {
      description: "Pull Request 페이지로 이동합니다.",
    })
  }

  const handleMergeBranch = (branch: Branch) => {
    toast.warning(`${branch.name} 브랜치를 main에 병합하시겠습니까?`, {
      action: {
        label: "병합",
        onClick: () => {
          toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
            loading: `${branch.name} 브랜치 병합 중...`,
            success: `${branch.name} 브랜치가 병합되었습니다.`,
            error: "병합에 실패했습니다.",
          })
        },
      },
    })
  }

  const handleDeleteBranch = (branch: Branch) => {
    toast.error(`${branch.name} 브랜치를 삭제하시겠습니까?`, {
      description: "이 작업은 되돌릴 수 없습니다.",
      action: {
        label: "삭제",
        onClick: () => {
          toast.success(`${branch.name} 브랜치가 삭제되었습니다.`)
        },
      },
    })
  }

  const getStatusBadge = (status: Version["status"]) => {
    const config = {
      active: { variant: "outline" as const, className: "border-green-500 text-green-700" },
      deprecated: { variant: "secondary" as const, className: "text-yellow-700" },
      archived: { variant: "secondary" as const, className: "text-gray-500" },
    }
    return (
      <Badge variant={config[status].variant} className={config[status].className}>
        {status === "active" ? "활성" : status === "deprecated" ? "지원 종료 예정" : "보관됨"}
      </Badge>
    )
  }

  const getEnvironmentBadge = (env: Version["environment"]) => {
    if (!env) return null
    const colors: Record<string, string> = {
      production: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      staging: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      development: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    }
    return <Badge className={colors[env]}>{env}</Badge>
  }

  const handleCreateTag = async () => {
    if (!newTag.tag || !newTag.name) {
      toast.error("태그와 릴리즈 이름을 입력해주세요.")
      return
    }
    toast.promise(
      versionsService.createVersion({
        tag: newTag.tag,
        name: newTag.name,
        description: newTag.description,
        branch: newTag.branch,
        commitHash: newTag.commitHash || undefined,
      }),
      {
        loading: "릴리즈 생성 중...",
        success: () => {
          fetchData()
          setIsCreateTagDialogOpen(false)
          setNewTag({ tag: "", name: "", description: "", branch: "main", commitHash: "" })
          return `${newTag.tag} 릴리즈가 생성되었습니다.`
        },
        error: "릴리즈 생성에 실패했습니다.",
      }
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("클립보드에 복사되었습니다.", {
      description: text,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">버전 관리</h1>
          <p className="text-muted-foreground">릴리즈 버전, 커밋 이력 및 브랜치 관리</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <GitMerge className="mr-2 h-4 w-4" />
                버전 비교
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>버전 비교</DialogTitle>
                <DialogDescription>두 버전 간의 변경사항을 비교합니다.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>기준 버전</Label>
                  <Select value={compareBaseVersion} onValueChange={setCompareBaseVersion}>
                    <SelectTrigger>
                      <SelectValue placeholder="버전 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.tag}>
                          {v.tag} - {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>비교 버전</Label>
                  <Select value={compareTargetVersion} onValueChange={setCompareTargetVersion}>
                    <SelectTrigger>
                      <SelectValue placeholder="버전 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.tag}>
                          {v.tag} - {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCompareDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCompareVersions}>비교하기</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Tag className="mr-2 h-4 w-4" />새 릴리즈
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>새 릴리즈 생성</DialogTitle>
                <DialogDescription>새 버전 태그를 생성합니다.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>태그</Label>
                    <Input
                      placeholder="v2.5.0"
                      value={newTag.tag}
                      onChange={(e) => setNewTag({ ...newTag, tag: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>브랜치</Label>
                    <Select
                      value={newTag.branch}
                      onValueChange={(v) => setNewTag({ ...newTag, branch: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.name} value={b.name}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>릴리즈 이름</Label>
                  <Input
                    placeholder="Feature Release"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>설명</Label>
                  <Textarea
                    placeholder="이 릴리즈에 포함된 변경사항..."
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>커밋 해시 (선택)</Label>
                  <Input
                    placeholder="특정 커밋 지정 (비워두면 최신 커밋)"
                    value={newTag.commitHash}
                    onChange={(e) => setNewTag({ ...newTag, commitHash: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateTagDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateTag}>릴리즈 생성</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="releases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="releases">릴리즈</TabsTrigger>
          <TabsTrigger value="commits">커밋</TabsTrigger>
          <TabsTrigger value="branches">브랜치</TabsTrigger>
        </TabsList>

        {/* 릴리즈 탭 */}
        <TabsContent value="releases" className="space-y-4">
          {/* 검색 */}
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="버전 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="deprecated">지원 종료 예정</SelectItem>
                <SelectItem value="archived">보관됨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 버전 목록 */}
          <div className="space-y-4">
            {versions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Tag className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-semibold">릴리즈가 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-center text-sm">
                    새 릴리즈를 생성하면 여기에 표시됩니다
                  </p>
                  <Button onClick={() => setIsCreateTagDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />새 릴리즈 생성
                  </Button>
                </CardContent>
              </Card>
            ) : (
              versions
                .filter((v) => v.tag.includes(searchQuery) || v.name.includes(searchQuery))
                .map((version) => (
                  <Card key={version.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Tag className="text-primary h-5 w-5" />
                            <CardTitle className="text-xl">{version.tag}</CardTitle>
                            {getStatusBadge(version.status)}
                            {getEnvironmentBadge(version.environment)}
                          </div>
                          <CardDescription className="text-base">{version.name}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewVersionDetails(version)}>
                              <Eye className="mr-2 h-4 w-4" />
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadSource(version)}>
                              <Download className="mr-2 h-4 w-4" />
                              소스 다운로드
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRollback(version)}>
                              <RotateCcw className="mr-2 h-4 w-4" />이 버전으로 롤백
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteVersion(version)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 text-sm">{version.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <GitBranch className="h-4 w-4" />
                          {version.branch}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <GitCommit className="h-4 w-4" />
                          <button
                            onClick={() => copyToClipboard(version.commitHash)}
                            className="hover:text-foreground"
                          >
                            {version.commitHash.substring(0, 7)}
                          </button>
                          <Copy
                            className="hover:text-foreground h-3 w-3 cursor-pointer"
                            onClick={() => copyToClipboard(version.commitHash)}
                          />
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {version.createdBy}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(version.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">+{version.changes.added}</span>
                          <span className="text-yellow-600">~{version.changes.modified}</span>
                          <span className="text-red-600">-{version.changes.deleted}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {version.components.map((comp) => (
                            <Badge key={comp} variant="outline" className="text-xs">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        {/* 커밋 탭 */}
        <TabsContent value="commits" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>최근 커밋</CardTitle>
                  <CardDescription>저장소 커밋 이력</CardDescription>
                </div>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="브랜치" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {commits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <GitCommit className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-semibold">커밋 이력이 없습니다</h3>
                  <p className="text-muted-foreground text-center text-sm">
                    저장소가 연동되면 커밋 이력이 표시됩니다
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commits.map((commit) => (
                    <div
                      key={commit.hash}
                      className="hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
                    >
                      <GitCommit className="text-muted-foreground mt-0.5 h-5 w-5" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="truncate font-medium">{commit.message}</span>
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(commit.hash)}
                              className="bg-muted hover:bg-muted/80 rounded px-1.5 py-0.5 font-mono text-xs"
                            >
                              {commit.shortHash}
                            </button>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <GitBranch className="mr-1 h-3 w-3" />
                            {commit.branch}
                          </Badge>
                          <span>{commit.author}</span>
                          <span>{new Date(commit.date).toLocaleString("ko-KR")}</span>
                          <span className="flex items-center gap-1">
                            <FileCode className="h-3 w-3" />
                            {commit.filesChanged} files
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleViewCommit(commit)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 브랜치 탭 */}
        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>브랜치</CardTitle>
                  <CardDescription>활성 브랜치 목록</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCreateBranch}>
                  <Plus className="mr-2 h-4 w-4" />새 브랜치
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <GitBranch className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-semibold">브랜치가 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-center text-sm">
                    저장소가 연동되면 브랜치 목록이 표시됩니다
                  </p>
                  <Button variant="outline" onClick={handleCreateBranch}>
                    <Plus className="mr-2 h-4 w-4" />새 브랜치 생성
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>브랜치</TableHead>
                      <TableHead>최근 커밋</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>업데이트</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GitBranch className="text-muted-foreground h-4 w-4" />
                            <span className="font-medium">{branch.name}</span>
                            {branch.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                default
                              </Badge>
                            )}
                            {branch.isProtected && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                protected
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate text-sm">
                          {branch.lastCommit}
                        </TableCell>
                        <TableCell>{branch.author}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(branch.lastCommitDate).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell>
                          {branch.aheadBehind.ahead > 0 && (
                            <span className="mr-2 text-sm text-green-600">
                              +{branch.aheadBehind.ahead} ahead
                            </span>
                          )}
                          {branch.aheadBehind.behind > 0 && (
                            <span className="text-sm text-red-600">
                              -{branch.aheadBehind.behind} behind
                            </span>
                          )}
                          {branch.aheadBehind.ahead === 0 && branch.aheadBehind.behind === 0 && (
                            <span className="text-muted-foreground text-sm">up to date</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewBranchCommits(branch)}>
                                <Eye className="mr-2 h-4 w-4" />
                                커밋 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCreatePR(branch)}>
                                <GitPullRequest className="mr-2 h-4 w-4" />
                                PR 생성
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMergeBranch(branch)}>
                                <GitMerge className="mr-2 h-4 w-4" />
                                Merge
                              </DropdownMenuItem>
                              {!branch.isProtected && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteBranch(branch)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    삭제
                                  </DropdownMenuItem>
                                </>
                              )}
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
      </Tabs>
    </div>
  )
}
