"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, X, Copy, Check } from "lucide-react"

// ── Types ────────────────────────────────────────────────

interface CouponData {
  id: string
  code: string
  type: "MANUAL" | "WELCOME" | "REFERRAL"
  coinAmount: number
  description: string | null
  maxRedemptions: number
  usedCount: number
  isActive: boolean
  expiresAt: string | null
  createdBy: string | null
  createdAt: string
}

interface CreateForm {
  code: string
  autoGenerate: boolean
  prefix: string
  type: CouponData["type"]
  coinAmount: number
  description: string
  maxRedemptions: number
  expiresAt: string
}

const INITIAL_FORM: CreateForm = {
  code: "",
  autoGenerate: false,
  prefix: "",
  type: "MANUAL",
  coinAmount: 100,
  description: "",
  maxRedemptions: 1,
  expiresAt: "",
}

// ── Page ─────────────────────────────────────────────────

export default function CouponManagementPage() {
  const [coupons, setCoupons] = useState<CouponData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CreateForm>(INITIAL_FORM)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>("")
  const [filterActive, setFilterActive] = useState<string>("")
  const [search, setSearch] = useState("")

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType) params.set("type", filterType)
      if (filterActive) params.set("isActive", filterActive)
      if (search) params.set("search", search)
      params.set("limit", "100")

      const res = await fetch(`/api/internal/persona-world-admin/coupons?${params.toString()}`)
      const json = (await res.json()) as {
        success: boolean
        data?: { coupons: CouponData[]; total: number }
        error?: { message: string }
      }
      if (json.success && json.data) {
        setCoupons(json.data.coupons)
        setTotal(json.data.total)
      } else {
        setError(json.error?.message ?? "조회 실패")
      }
    } catch {
      setError("네트워크 오류")
    } finally {
      setLoading(false)
    }
  }, [filterType, filterActive, search])

  useEffect(() => {
    void fetchCoupons()
  }, [fetchCoupons])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        coinAmount: form.coinAmount,
        description: form.description || undefined,
        maxRedemptions: form.maxRedemptions,
        expiresAt: form.expiresAt || null,
      }
      if (form.autoGenerate) {
        body.autoGenerate = true
        if (form.prefix) body.prefix = form.prefix
      } else {
        body.code = form.code
      }

      const res = await fetch("/api/internal/persona-world-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as {
        success: boolean
        error?: { message: string }
      }
      if (json.success) {
        setShowCreate(false)
        setForm(INITIAL_FORM)
        void fetchCoupons()
      } else {
        setError(json.error?.message ?? "생성 실패")
      }
    } catch {
      setError("네트워크 오류")
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(coupon: CouponData) {
    try {
      const res = await fetch("/api/internal/persona-world-admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      })
      const json = (await res.json()) as { success: boolean }
      if (json.success) {
        void fetchCoupons()
      }
    } catch {
      setError("상태 변경 실패")
    }
  }

  function copyCode(code: string, id: string) {
    void navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <Header title="Coupon Management" description="프로모션 쿠폰 생성 및 관리" />

      {error && (
        <div className="bg-destructive/10 text-destructive rounded border border-red-200 p-3 text-sm dark:border-red-800">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            닫기
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border-border bg-background rounded border px-2 py-1 text-sm"
        >
          <option value="">전체 타입</option>
          <option value="MANUAL">MANUAL</option>
          <option value="WELCOME">WELCOME</option>
          <option value="REFERRAL">REFERRAL</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="border-border bg-background rounded border px-2 py-1 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
        <input
          type="text"
          placeholder="코드/설명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-border bg-background rounded border px-2 py-1 text-sm"
        />
        <span className="text-muted-foreground ml-auto text-sm">총 {total}개</span>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
          {showCreate ? "취소" : "새 쿠폰"}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-muted/50 border-border space-y-3 rounded border p-4">
          <h3 className="text-sm font-semibold">쿠폰 생성</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-xs">코드 생성 방식</label>
              <div className="mt-1 flex gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={!form.autoGenerate}
                    onChange={() => setForm({ ...form, autoGenerate: false })}
                  />
                  수동 입력
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={form.autoGenerate}
                    onChange={() => setForm({ ...form, autoGenerate: true })}
                  />
                  자동 생성
                </label>
              </div>
            </div>
            <div>
              {form.autoGenerate ? (
                <>
                  <label className="text-muted-foreground text-xs">접두사 (선택)</label>
                  <input
                    type="text"
                    value={form.prefix}
                    onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                    placeholder="예: EVENT"
                    className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
                  />
                </>
              ) : (
                <>
                  <label className="text-muted-foreground text-xs">쿠폰 코드</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="예: WELCOME100"
                    className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm uppercase"
                  />
                </>
              )}
            </div>
            <div>
              <label className="text-muted-foreground text-xs">타입</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CouponData["type"] })}
                className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              >
                <option value="MANUAL">MANUAL</option>
                <option value="WELCOME">WELCOME</option>
                <option value="REFERRAL">REFERRAL</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs">지급 코인</label>
              <input
                type="number"
                value={form.coinAmount}
                onChange={(e) => setForm({ ...form, coinAmount: Number(e.target.value) })}
                min={1}
                className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs">최대 사용 횟수</label>
              <input
                type="number"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) })}
                min={1}
                className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs">만료일 (선택)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-muted-foreground text-xs">설명 (선택)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="관리자 메모"
                className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              생성
            </Button>
          </div>
        </div>
      )}

      {/* Coupon Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          등록된 쿠폰이 없습니다
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="pb-2 pr-3">코드</th>
                <th className="pb-2 pr-3">타입</th>
                <th className="pb-2 pr-3">코인</th>
                <th className="pb-2 pr-3">사용/한도</th>
                <th className="pb-2 pr-3">만료일</th>
                <th className="pb-2 pr-3">상태</th>
                <th className="pb-2 pr-3">설명</th>
                <th className="pb-2">액션</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-muted/50 border-b">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {c.code}
                      </code>
                      <button
                        onClick={() => copyCode(c.code, c.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="복사"
                      >
                        {copiedId === c.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <TypeBadge type={c.type} />
                  </td>
                  <td className="py-2 pr-3 font-medium">{c.coinAmount.toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <span className={c.usedCount >= c.maxRedemptions ? "text-red-500" : ""}>
                      {c.usedCount}/{c.maxRedemptions}
                    </span>
                  </td>
                  <td className="text-muted-foreground py-2 pr-3">
                    {c.expiresAt ? formatDate(c.expiresAt) : "무기한"}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">
                      {c.isActive ? "활성" : "비활성"}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground max-w-[200px] truncate py-2 pr-3">
                    {c.description ?? "-"}
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant={c.isActive ? "destructive" : "outline"}
                      onClick={() => handleToggleActive(c)}
                      className="text-xs"
                    >
                      {c.isActive ? "비활성화" : "활성화"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────

function TypeBadge({ type }: { type: CouponData["type"] }) {
  const colors: Record<string, string> = {
    MANUAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    WELCOME: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    REFERRAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  }
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[type] ?? ""}`}
    >
      {type}
    </span>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const expired = d < now
  const formatted = d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return expired ? `${formatted} (만료)` : formatted
}
