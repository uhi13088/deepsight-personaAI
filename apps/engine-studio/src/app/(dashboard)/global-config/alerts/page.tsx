"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bell,
  Mail,
  MessageSquare,
  Shield,
  DollarSign,
  Sparkles,
  Activity,
  Send,
} from "lucide-react"

interface AlertSettings {
  slack: { enabled: boolean; webhookUrl: string }
  email: { enabled: boolean; recipients: string[] }
  categories: {
    security: boolean
    cost: boolean
    quality: boolean
    system: boolean
  }
}

const DEFAULT_SETTINGS: AlertSettings = {
  slack: { enabled: false, webhookUrl: "" },
  email: { enabled: false, recipients: [] },
  categories: { security: true, cost: true, quality: true, system: true },
}

const CATEGORY_META = [
  { key: "security" as const, label: "보안", icon: Shield, description: "Trust Score, 격리 건수" },
  { key: "cost" as const, label: "비용", icon: DollarSign, description: "일일 비용, 캐시 히트율" },
  {
    key: "quality" as const,
    label: "품질",
    icon: Sparkles,
    description: "인터뷰 점수, Voice Drift",
  },
  { key: "system" as const, label: "시스템", icon: Activity, description: "에러율, 응답시간" },
]

export default function AlertSettingsPage() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS)
  const [newEmail, setNewEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 설정 로드
  useEffect(() => {
    fetch("/api/internal/settings/alerts")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data)
        }
      })
      .catch(() => {})
  }, [])

  // 저장
  const handleSave = useCallback(async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/internal/settings/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "설정이 저장되었습니다." })
      } else {
        setMessage({ type: "error", text: data.error?.message ?? "저장 실패" })
      }
    } catch {
      setMessage({ type: "error", text: "네트워크 오류" })
    }
    setSaving(false)
  }, [settings])

  // 테스트 알림 전송
  const handleTest = useCallback(async (channel: "slack" | "email") => {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/internal/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, severity: "info" }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: `${channel} 테스트 알림이 전송되었습니다.` })
      } else {
        setMessage({ type: "error", text: `전송 실패: ${data.error?.message ?? "unknown"}` })
      }
    } catch {
      setMessage({ type: "error", text: "네트워크 오류" })
    }
    setTesting(false)
  }, [])

  // 이메일 추가
  const addEmail = useCallback(() => {
    const email = newEmail.trim()
    if (email && !settings.email.recipients.includes(email)) {
      setSettings((prev) => ({
        ...prev,
        email: { ...prev.email, recipients: [...prev.email.recipients, email] },
      }))
      setNewEmail("")
    }
  }, [newEmail, settings.email.recipients])

  // 이메일 삭제
  const removeEmail = useCallback((email: string) => {
    setSettings((prev) => ({
      ...prev,
      email: { ...prev.email, recipients: prev.email.recipients.filter((e) => e !== email) },
    }))
  }, [])

  return (
    <>
      <Header title="Alert Settings" description="알림 채널 설정 및 카테고리별 ON/OFF" />

      <div className="space-y-6 p-6">
        {/* Status Message */}
        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "border border-green-500/20 bg-green-500/10 text-green-400"
                : "border border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Slack Channel */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-medium text-zinc-100">Slack</h3>
              <Badge variant={settings.slack.enabled ? "default" : "secondary"}>
                {settings.slack.enabled ? "활성" : "비활성"}
              </Badge>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={settings.slack.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    slack: { ...prev.slack, enabled: e.target.checked },
                  }))
                }
                className="rounded border-zinc-600"
              />
              <span className="text-sm text-zinc-400">활성화</span>
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-zinc-400">Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings.slack.webhookUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    slack: { ...prev.slack, webhookUrl: e.target.value },
                  }))
                }
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest("slack")}
                disabled={testing || !settings.slack.webhookUrl}
              >
                <Send className="mr-1 h-4 w-4" />
                테스트
              </Button>
            </div>
          </div>
        </section>

        {/* Email Channel */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-medium text-zinc-100">Email</h3>
              <Badge variant={settings.email.enabled ? "default" : "secondary"}>
                {settings.email.enabled ? "활성" : "비활성"}
              </Badge>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={settings.email.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    email: { ...prev.email, enabled: e.target.checked },
                  }))
                }
                className="rounded border-zinc-600"
              />
              <span className="text-sm text-zinc-400">활성화</span>
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-zinc-400">수신자 목록</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                placeholder="admin@example.com"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              <Button variant="outline" size="sm" onClick={addEmail}>
                추가
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest("email")}
                disabled={testing || settings.email.recipients.length === 0}
              >
                <Send className="mr-1 h-4 w-4" />
                테스트
              </Button>
            </div>
            {settings.email.recipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {settings.email.recipients.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="flex cursor-pointer items-center gap-1 hover:bg-red-500/20"
                    onClick={() => removeEmail(email)}
                  >
                    {email}
                    <span className="ml-1 text-red-400">&times;</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Category Toggles */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-medium text-zinc-100">알림 카테고리</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CATEGORY_META.map(({ key, label, icon: Icon, description }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 p-4 transition-colors hover:border-zinc-600"
              >
                <input
                  type="checkbox"
                  checked={settings.categories[key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      categories: { ...prev.categories, [key]: e.target.checked },
                    }))
                  }
                  className="rounded border-zinc-600"
                />
                <Icon className="h-5 w-5 text-zinc-400" />
                <div>
                  <div className="text-sm font-medium text-zinc-200">{label}</div>
                  <div className="text-xs text-zinc-500">{description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "설정 저장"}
          </Button>
        </div>
      </div>
    </>
  )
}
