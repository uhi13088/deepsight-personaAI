"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Save, Plus, X } from "lucide-react"

interface ShopItemData {
  id: string
  itemKey: string
  name: string
  description: string
  price: number
  priceLabel: string | null
  category: string
  emoji: string
  repeatable: boolean
  tag: string | null
  isActive: boolean
  sortOrder: number
}

export default function ShopManagementPage() {
  const [items, setItems] = useState<ShopItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edited, setEdited] = useState<Map<string, Partial<ShopItemData>>>(new Map())
  const [showAdd, setShowAdd] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/shop")
      const json = (await res.json()) as {
        success: boolean
        data?: ShopItemData[]
        error?: { message: string }
      }
      if (json.success && json.data) {
        setItems(json.data)
      } else {
        setError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  function updateField(id: string, field: keyof ShopItemData, value: unknown) {
    setEdited((prev) => {
      const next = new Map(prev)
      const existing = next.get(id) ?? {}
      next.set(id, { ...existing, id, [field]: value })
      return next
    })
  }

  function hasChanges() {
    return edited.size > 0
  }

  async function handleSave() {
    if (!hasChanges()) return
    setSaving(true)
    setError(null)
    try {
      const updates = Array.from(edited.values()).map((e) => ({ id: e.id!, ...e }))
      const res = await fetch("/api/internal/persona-world-admin/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updates }),
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) throw new Error(json.error?.message ?? "저장 실패")
      setEdited(new Map())
      void fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd(form: {
    itemKey: string
    name: string
    description: string
    price: number
    category: string
    emoji: string
    repeatable: boolean
  }) {
    try {
      const res = await fetch("/api/internal/persona-world-admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) throw new Error(json.error?.message ?? "추가 실패")
      setShowAdd(false)
      void fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
    }
  }

  function getTagBadge(tag: string | null) {
    if (!tag) return null
    switch (tag) {
      case "NEW":
        return <Badge className="bg-blue-500/20 text-blue-600">NEW</Badge>
      case "HOT":
        return <Badge className="bg-red-500/20 text-red-600">HOT</Badge>
      case "SOON":
        return <Badge className="bg-gray-500/20 text-gray-500">SOON</Badge>
      default:
        return <Badge variant="secondary">{tag}</Badge>
    }
  }

  function getCategoryLabel(cat: string) {
    return cat === "persona" ? "페르소나" : "프로필 꾸미기"
  }

  function getDisplayValue(item: ShopItemData, field: keyof ShopItemData) {
    const editValue = edited.get(item.id)?.[field]
    return editValue !== undefined ? editValue : item[field]
  }

  if (loading) {
    return (
      <>
        <Header title="Shop Management" description="PW 상점 아이템 가격 · 활성화 · 태그 관리" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </>
    )
  }

  const personaItems = items.filter((i) => i.category === "persona")
  const profileItems = items.filter((i) => i.category === "profile")

  return (
    <>
      <Header title="Shop Management" description="PW 상점 아이템 가격 · 활성화 · 태그 관리" />

      <div className="space-y-6 p-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">총 {items.length}개 아이템</span>
            {hasChanges() && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                미저장 변경 {edited.size}건
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3 w-3" />
              아이템 추가
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges()}>
              {saving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              저장
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Add Item Form */}
        {showAdd && <AddItemForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

        {/* Persona Category */}
        <ItemTable
          title="페르소나"
          items={personaItems}
          getDisplayValue={getDisplayValue}
          getTagBadge={getTagBadge}
          getCategoryLabel={getCategoryLabel}
          updateField={updateField}
        />

        {/* Profile Category */}
        <ItemTable
          title="프로필 꾸미기"
          items={profileItems}
          getDisplayValue={getDisplayValue}
          getTagBadge={getTagBadge}
          getCategoryLabel={getCategoryLabel}
          updateField={updateField}
        />
      </div>
    </>
  )
}

// ── 아이템 테이블 ───────────────────────────────────────────────

function ItemTable({
  title,
  items,
  getDisplayValue,
  getTagBadge,
  getCategoryLabel,
  updateField,
}: {
  title: string
  items: ShopItemData[]
  getDisplayValue: (item: ShopItemData, field: keyof ShopItemData) => unknown
  getTagBadge: (tag: string | null) => React.ReactNode
  getCategoryLabel: (cat: string) => string
  updateField: (id: string, field: keyof ShopItemData, value: unknown) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="border-border rounded-lg border">
      <div className="border-border border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-border divide-y">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-3">
            {/* Emoji + Name */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="text-lg">{item.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{item.name}</span>
                  {getTagBadge(getDisplayValue(item, "tag") as string | null)}
                  <Badge variant="outline" className="text-[10px]">
                    {getCategoryLabel(item.category)}
                  </Badge>
                  {item.repeatable && (
                    <Badge variant="outline" className="text-[10px]">
                      반복
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-xs">{item.description}</p>
                <p className="text-muted-foreground text-[10px]">key: {item.itemKey}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="border-border bg-background w-20 rounded border px-2 py-1 text-right text-sm"
                value={getDisplayValue(item, "price") as number}
                onChange={(e) => updateField(item.id, "price", parseInt(e.target.value) || 0)}
                min={0}
              />
              <span className="text-muted-foreground text-xs">코인</span>
            </div>

            {/* Tag */}
            <select
              className="border-border bg-background rounded border px-2 py-1 text-xs"
              value={(getDisplayValue(item, "tag") as string) || ""}
              onChange={(e) => updateField(item.id, "tag", e.target.value || null)}
            >
              <option value="">태그 없음</option>
              <option value="NEW">NEW</option>
              <option value="HOT">HOT</option>
              <option value="SOON">SOON</option>
            </select>

            {/* Active toggle */}
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={getDisplayValue(item, "isActive") as boolean}
                onChange={(e) => updateField(item.id, "isActive", e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-xs">활성</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 아이템 추가 폼 ──────────────────────────────────────────────

function AddItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (form: {
    itemKey: string
    name: string
    description: string
    price: number
    category: string
    emoji: string
    repeatable: boolean
  }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    itemKey: "",
    name: "",
    description: "",
    price: 0,
    category: "persona",
    emoji: "🎁",
    repeatable: false,
  })

  return (
    <div className="border-border rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">새 아이템 추가</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">아이템 키 (고유)</label>
          <input
            className="border-border bg-background w-full rounded border px-3 py-1.5 text-sm"
            placeholder="new_item_key"
            value={form.itemKey}
            onChange={(e) => setForm({ ...form, itemKey: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">이름</label>
          <input
            className="border-border bg-background w-full rounded border px-3 py-1.5 text-sm"
            placeholder="아이템 이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium">설명</label>
          <input
            className="border-border bg-background w-full rounded border px-3 py-1.5 text-sm"
            placeholder="아이템 설명"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">가격 (코인)</label>
          <input
            type="number"
            className="border-border bg-background w-full rounded border px-3 py-1.5 text-sm"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">카테고리</label>
          <select
            className="border-border bg-background w-full rounded border px-3 py-1.5 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="persona">페르소나</option>
            <option value="profile">프로필 꾸미기</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">이모지</label>
          <input
            className="border-border bg-background w-full rounded border px-3 py-1.5 text-sm"
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 pb-1.5">
            <input
              type="checkbox"
              checked={form.repeatable}
              onChange={(e) => setForm({ ...form, repeatable: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">반복 구매 가능</span>
          </label>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={() => onAdd(form)} disabled={!form.itemKey || !form.name}>
          <Plus className="mr-1 h-3 w-3" />
          추가
        </Button>
      </div>
    </div>
  )
}
