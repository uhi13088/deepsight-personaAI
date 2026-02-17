"use client"

import { useState, useCallback } from "react"
import { PWButton } from "./pw-button"
import { PWCard } from "./pw-card"
import { PWSpinner } from "./pw-spinner"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { ExternalLink, Upload, Check, AlertCircle } from "lucide-react"

// ── 플랫폼 정보 ─────────────────────────────────────────────

interface PlatformInfo {
  id: string
  label: string
  description: string
  method: "oauth" | "upload"
  color: string
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: "youtube",
    label: "YouTube",
    description: "구독·좋아요 영상으로 취향 분석",
    method: "oauth",
    color: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  {
    id: "spotify",
    label: "Spotify",
    description: "음악 취향으로 감성·성향 분석",
    method: "oauth",
    color: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "포스팅 스타일로 표현 방식 분석",
    method: "oauth",
    color: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  },
  {
    id: "twitter",
    label: "Twitter",
    description: "트윗·좋아요로 관심사·성향 분석",
    method: "oauth",
    color: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  },
  {
    id: "netflix",
    label: "Netflix",
    description: "시청 기록 업로드로 콘텐츠 취향 분석",
    method: "upload",
    color: "bg-red-600/10 text-red-300 border-red-600/30",
  },
  {
    id: "letterboxd",
    label: "Letterboxd",
    description: "영화 기록 업로드로 영화 취향 분석",
    method: "upload",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  },
]

// ── 컴포넌트 ─────────────────────────────────────────────────

interface PWSnsConnectProps {
  /** 콤팩트 모드 (온보딩 내 인라인) */
  compact?: boolean
  /** 연결 완료 시 콜백 */
  onConnected?: (platform: string, profileLevel: string) => void
}

export function PWSnsConnect({ compact = false, onConnected }: PWSnsConnectProps) {
  const { profile } = useUserStore()
  const userId = profile?.id ?? ""

  const [connecting, setConnecting] = useState<string | null>(null)
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // OAuth 시작
  const handleOAuthConnect = useCallback(
    async (platformId: string) => {
      if (!userId) {
        setError("로그인이 필요합니다")
        return
      }

      setConnecting(platformId)
      setError(null)

      try {
        const result = await clientApi.startSnsAuth(userId, platformId)

        if (result.method === "oauth" && result.authUrl) {
          // OAuth 팝업/리다이렉트
          window.location.href = result.authUrl
        } else if (result.method === "upload") {
          // 업로드 방식 — 파일 선택 트리거
          setConnecting(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "연결에 실패했습니다")
        setConnecting(null)
      }
    },
    [userId]
  )

  // 파일 업로드 (Netflix/Letterboxd)
  const handleFileUpload = useCallback(
    async (platformId: string, file: File) => {
      if (!userId) {
        setError("로그인이 필요합니다")
        return
      }

      setConnecting(platformId)
      setError(null)

      try {
        const text = await file.text()
        let parsedData: Record<string, unknown>

        if (file.name.endsWith(".json")) {
          parsedData = JSON.parse(text)
        } else {
          // CSV 파싱 (간단)
          const lines = text.split("\n")
          const headers = lines[0]?.split(",").map((h) => h.trim()) ?? []
          const rows = lines.slice(1).map((line) => {
            const values = line.split(",").map((v) => v.trim())
            const row: Record<string, string> = {}
            headers.forEach((h, i) => {
              row[h] = values[i] ?? ""
            })
            return row
          })

          if (platformId === "netflix") {
            parsedData = { viewingHistory: rows }
          } else {
            parsedData = { watchedFilms: rows }
          }
        }

        const result = await clientApi.uploadSnsData(userId, platformId, parsedData)

        setConnected((prev) => new Set([...prev, platformId]))
        setConnecting(null)
        onConnected?.(platformId, result.profileLevel)
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드에 실패했습니다")
        setConnecting(null)
      }
    },
    [userId, onConnected]
  )

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">SNS 연동</h3>
          <p className="mt-1 text-sm text-white/60">
            SNS를 연동하면 취향을 자동으로 분석해 더 정확한 페르소나 매칭이 가능해요
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-3"}>
        {PLATFORMS.map((platform) => {
          const isConnected = connected.has(platform.id)
          const isConnecting = connecting === platform.id

          return (
            <PlatformCard
              key={platform.id}
              platform={platform}
              compact={compact}
              isConnected={isConnected}
              isConnecting={isConnecting}
              onOAuthConnect={handleOAuthConnect}
              onFileUpload={handleFileUpload}
            />
          )
        })}
      </div>

      {connected.size > 0 && (
        <p className="text-center text-sm text-white/50">{connected.size}개 플랫폼 연동 완료</p>
      )}
    </div>
  )
}

// ── 플랫폼 카드 ──────────────────────────────────────────────

function PlatformCard({
  platform,
  compact,
  isConnected,
  isConnecting,
  onOAuthConnect,
  onFileUpload,
}: {
  platform: PlatformInfo
  compact: boolean
  isConnected: boolean
  isConnecting: boolean
  onOAuthConnect: (id: string) => void
  onFileUpload: (id: string, file: File) => void
}) {
  const handleClick = () => {
    if (isConnected || isConnecting) return

    if (platform.method === "upload") {
      // 파일 선택 다이얼로그
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".csv,.json"
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) onFileUpload(platform.id, file)
      }
      input.click()
      return
    }

    onOAuthConnect(platform.id)
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isConnected || isConnecting}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
          isConnected
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : `${platform.color} hover:opacity-80`
        } ${isConnecting ? "opacity-50" : ""} disabled:cursor-not-allowed`}
      >
        {isConnecting ? (
          <PWSpinner size="sm" />
        ) : isConnected ? (
          <Check className="h-4 w-4" />
        ) : platform.method === "upload" ? (
          <Upload className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        <span className="font-medium">{platform.label}</span>
      </button>
    )
  }

  return (
    <PWCard className="!p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${platform.color}`}
            >
              {platform.label}
            </span>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-xs text-green-400">
                <Check className="h-3 w-3" /> 연동됨
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-white/50">{platform.description}</p>
        </div>

        <PWButton
          size="sm"
          variant={isConnected ? "ghost" : "outline"}
          onClick={handleClick}
          disabled={isConnected || isConnecting}
          className="ml-3 shrink-0"
        >
          {isConnecting ? (
            <PWSpinner size="sm" />
          ) : isConnected ? (
            "완료"
          ) : platform.method === "upload" ? (
            <>
              <Upload className="mr-1 h-3 w-3" />
              업로드
            </>
          ) : (
            <>
              <ExternalLink className="mr-1 h-3 w-3" />
              연동
            </>
          )}
        </PWButton>
      </div>
    </PWCard>
  )
}
