"use client"

import * as React from "react"
import Link from "next/link"
import {
  User,
  Bell,
  Shield,
  Key,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Save,
  Camera,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  LogOut,
  Trash2,
  Lock,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// Mock user data
const userData = {
  id: "user_abc123",
  name: "김개발",
  email: "dev@acme.com",
  avatar: null,
  phone: "+82 10-1234-5678",
  company: "Acme Corp",
  timezone: "Asia/Seoul",
  language: "ko",
  twoFactorEnabled: true,
  lastPasswordChange: "2024-12-01T00:00:00Z",
}

const notificationSettings = {
  email: {
    apiAlerts: true,
    usageReports: true,
    billing: true,
    security: true,
    marketing: false,
    productUpdates: true,
  },
  push: {
    apiAlerts: true,
    usageReports: false,
    billing: true,
    security: true,
  },
}

const activeSessions = [
  {
    id: "session_1",
    device: "Chrome on MacOS",
    ip: "203.0.113.42",
    location: "Seoul, South Korea",
    lastActive: "Just now",
    current: true,
  },
  {
    id: "session_2",
    device: "Safari on iPhone",
    ip: "203.0.113.43",
    location: "Seoul, South Korea",
    lastActive: "2 hours ago",
    current: false,
  },
]

export default function SettingsPage() {
  const [name, setName] = React.useState(userData.name)
  const [email, setEmail] = React.useState(userData.email)
  const [phone, setPhone] = React.useState(userData.phone)
  const [company, setCompany] = React.useState(userData.company)
  const [timezone, setTimezone] = React.useState(userData.timezone)
  const [language, setLanguage] = React.useState(userData.language)
  const [emailNotifications, setEmailNotifications] = React.useState(notificationSettings.email)
  const [pushNotifications, setPushNotifications] = React.useState(notificationSettings.push)
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(userData.twoFactorEnabled)

  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = React.useState(false)
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">계정 설정과 환경 설정을 관리하세요</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>프로필 정보를 수정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userData.avatar || undefined} />
                  <AvatarFallback className="text-2xl">
                    {userData.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Camera className="mr-2 h-4 w-4" />
                    Change Avatar
                  </Button>
                  <p className="text-muted-foreground text-xs">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>

              <Separator />

              {/* Profile Form */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="mr-2 animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>언어 및 시간대 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <Globe className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Seoul">Seoul (GMT+9)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (GMT+9)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Los Angeles (GMT-8)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-muted-foreground text-sm">Select your preferred theme</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon">
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Moon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <div>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>이메일로 받을 알림을 설정하세요</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "apiAlerts", label: "API Alerts", description: "API 오류 및 경고 알림" },
                { key: "usageReports", label: "Usage Reports", description: "주간 사용량 리포트" },
                { key: "billing", label: "Billing", description: "결제 및 청구서 관련 알림" },
                { key: "security", label: "Security", description: "보안 관련 중요 알림" },
                {
                  key: "productUpdates",
                  label: "Product Updates",
                  description: "새로운 기능 및 업데이트 소식",
                },
                { key: "marketing", label: "Marketing", description: "프로모션 및 마케팅 이메일" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{item.label}</Label>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                  <Switch
                    checked={emailNotifications[item.key as keyof typeof emailNotifications]}
                    onCheckedChange={(checked) =>
                      setEmailNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <div>
                  <CardTitle>Push Notifications</CardTitle>
                  <CardDescription>브라우저/앱 푸시 알림 설정</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "apiAlerts", label: "API Alerts", description: "API 오류 즉시 알림" },
                { key: "usageReports", label: "Usage Threshold", description: "사용량 한도 경고" },
                { key: "billing", label: "Billing", description: "결제 실패 알림" },
                { key: "security", label: "Security", description: "로그인 시도 알림" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{item.label}</Label>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                  <Switch
                    checked={pushNotifications[item.key as keyof typeof pushNotifications]}
                    onCheckedChange={(checked) =>
                      setPushNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>비밀번호를 변경하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Password</p>
                  <p className="text-muted-foreground text-sm">Last changed: December 1, 2024</p>
                </div>
                <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>계정 보안을 강화하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      twoFactorEnabled ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                    )}
                  >
                    <Shield
                      className={cn(
                        "h-5 w-5",
                        twoFactorEnabled ? "text-green-600" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium">
                      {twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {twoFactorEnabled
                        ? "Your account is protected with two-factor authentication"
                        : "Add an extra layer of security to your account"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={twoFactorEnabled ? "outline" : "default"}
                  onClick={() => setTwoFactorDialogOpen(true)}
                >
                  {twoFactorEnabled ? "Manage" : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>현재 로그인된 기기 목록</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg p-2">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.device}</p>
                        {session.current && (
                          <Badge variant="success" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {session.location} · {session.ip}
                      </p>
                      <p className="text-muted-foreground text-xs">{session.lastActive}</p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" className="w-full">
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>주의: 이 작업은 되돌릴 수 없습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-muted-foreground text-sm">
                    계정과 모든 데이터가 영구적으로 삭제됩니다
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setDeleteAccountDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>새 비밀번호를 입력하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" placeholder="Confirm new password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Dialog */}
      <Dialog open={twoFactorDialogOpen} onOpenChange={setTwoFactorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {twoFactorEnabled ? "2FA 설정을 관리하세요" : "2FA를 활성화하여 계정을 보호하세요"}
            </DialogDescription>
          </DialogHeader>
          {twoFactorEnabled ? (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>2FA Enabled</AlertTitle>
                <AlertDescription>
                  Your account is protected with two-factor authentication.
                </AlertDescription>
              </Alert>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  setTwoFactorEnabled(false)
                  setTwoFactorDialogOpen(false)
                }}
              >
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Authenticator 앱을 사용하여 QR 코드를 스캔하세요.
                </AlertDescription>
              </Alert>
              <div className="bg-muted flex justify-center rounded-lg p-4">
                <div className="flex h-40 w-40 items-center justify-center bg-white">[QR Code]</div>
              </div>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input placeholder="Enter 6-digit code" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTwoFactorDialogOpen(false)}>
              Cancel
            </Button>
            {!twoFactorEnabled && (
              <Button
                onClick={() => {
                  setTwoFactorEnabled(true)
                  setTwoFactorDialogOpen(false)
                }}
              >
                Verify & Enable
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>정말로 계정을 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>이 작업은 되돌릴 수 없습니다</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>모든 API 키가 즉시 비활성화됩니다</li>
                <li>모든 사용 기록이 삭제됩니다</li>
                <li>팀 멤버십이 해제됩니다</li>
              </ul>
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label>확인을 위해 "DELETE"를 입력하세요</Label>
            <Input placeholder="DELETE" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive">Delete My Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
