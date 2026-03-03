"use client"

import { useState, useMemo, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { calculateVFinal, vFinalToVector } from "@/lib/vector/v-final"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
} from "@/types"
import type { PersonaData } from "./persona-metadata-form"

// ── Dimension labels ────────────────────────────────────────

const L1_LABELS: Record<string, [string, string]> = {
  depth: ["직관적", "심층적"],
  lens: ["감성적", "논리적"],
  stance: ["수용적", "비판적"],
  scope: ["핵심", "디테일"],
  taste: ["클래식", "실험적"],
  purpose: ["오락", "의미추구"],
  sociability: ["내향", "외향"],
}

const L2_LABELS: Record<string, string> = {
  openness: "개방성",
  conscientiousness: "성실성",
  extraversion: "외향성",
  agreeableness: "우호성",
  neuroticism: "신경성",
}

const L3_LABELS: Record<string, string> = {
  lack: "결핍",
  moralCompass: "도덕 나침반",
  volatility: "변동성",
  growthArc: "성장 궤적",
}

const L1_DIMS: { key: SocialDimension; label: string; low: string; high: string }[] = [
  { key: "depth", label: "분석 깊이", low: "직관적", high: "심층적" },
  { key: "lens", label: "판단 렌즈", low: "감성", high: "논리" },
  { key: "stance", label: "평가 태도", low: "수용적", high: "비판적" },
  { key: "scope", label: "관심 범위", low: "간결", high: "세밀" },
  { key: "taste", label: "취향 성향", low: "클래식", high: "실험적" },
  { key: "purpose", label: "소비 목적", low: "오락", high: "의미" },
  { key: "sociability", label: "사회적 성향", low: "독립적", high: "사교적" },
]

// ── Memory Tab types ────────────────────────────────────────

type MemorySubTab = "activity" | "consumption" | "interaction" | "relationship"

const MEMORY_SUB_TABS: { key: MemorySubTab; label: string }[] = [
  { key: "activity", label: "활동" },
  { key: "consumption", label: "소비" },
  { key: "interaction", label: "대화" },
  { key: "relationship", label: "관계" },
]

interface MemoryData {
  tab: string
  state: {
    mood: number
    energy: number
    socialBattery: number
    paradoxTension: number
    narrativeTension: number
    updatedAt: string
  } | null
  stats: {
    activityCount: number
    consumptionCount: number
    sessionCount: number
    relationshipCount: number
    totalMemories: number
  }
  activities?: Array<{
    id: string
    activityType: string
    targetId: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }>
  consumptions?: Array<{
    id: string
    contentType: string
    title: string
    impression: string
    rating: number | null
    emotionalImpact: number
    tags: string[]
    source: string
    consumedAt: string
  }>
  interactions?: Array<{
    id: string
    totalTurns: number
    avgPressure: number | null
    dominantTopic: string | null
    startedAt: string
    endedAt: string | null
  }>
  relationships?: Array<{
    id: string
    otherPersonaId: string
    otherPersonaName: string
    warmth: number
    tension: number
    frequency: number
    depth: number
    attraction: number
    stage: string
    type: string
    peakStage: string
    momentum: number
    milestones: Array<{ type: string; occurredAt: string; qualityDelta: number }>
    lastInteractionAt: string | null
  }>
}

// ── Vectors Tab ─────────────────────────────────────────────

export function VectorsTab({ data }: { data: PersonaData }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Layer 1: Social Persona (7D)</h3>
        <div className="space-y-2">
          {data.vectors.l1 &&
            Object.entries(data.vectors.l1).map(([key, val]) => {
              const labels = L1_LABELS[key]
              return (
                <DimensionBar
                  key={key}
                  label={key}
                  value={val}
                  lowLabel={labels?.[0]}
                  highLabel={labels?.[1]}
                />
              )
            })}
          {!data.vectors.l1 && <p className="text-muted-foreground text-xs">(벡터 없음)</p>}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Layer 2: Core Temperament (5D OCEAN)</h3>
        <div className="space-y-2">
          {data.vectors.l2 &&
            Object.entries(data.vectors.l2).map(([key, val]) => (
              <DimensionBar key={key} label={L2_LABELS[key] ?? key} value={val} />
            ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Layer 3: Narrative Drive (4D)</h3>
        <div className="space-y-2">
          {data.vectors.l3 &&
            Object.entries(data.vectors.l3).map(([key, val]) => (
              <DimensionBar key={key} label={L3_LABELS[key] ?? key} value={val} />
            ))}
        </div>
      </section>
    </div>
  )
}

// ── Memory Tab ──────────────────────────────────────────────

export function MemoryTab({ personaId }: { personaId: string }) {
  const [subTab, setSubTab] = useState<MemorySubTab>("activity")
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMemory = useCallback(
    async (tab: MemorySubTab) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/internal/personas/${personaId}/memories?tab=${tab}`)
        const result = await res.json()
        if (result.success) setMemoryData(result.data)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    },
    [personaId]
  )

  // 초기 로드 + 탭 전환 시 재조회
  useMemo(() => {
    fetchMemory(subTab)
  }, [subTab, fetchMemory])

  return (
    <div className="space-y-6">
      {/* 상태 게이지 (AC3) */}
      {memoryData?.state && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">현재 상태</h3>
          <div className="grid grid-cols-5 gap-3">
            <StateGauge label="기분" value={memoryData.state.mood} color="bg-yellow-500" />
            <StateGauge label="에너지" value={memoryData.state.energy} color="bg-green-500" />
            <StateGauge
              label="사회적 배터리"
              value={memoryData.state.socialBattery}
              color="bg-blue-500"
            />
            <StateGauge
              label="역설 긴장"
              value={memoryData.state.paradoxTension}
              color="bg-red-500"
            />
            <StateGauge
              label="서사 긴장"
              value={memoryData.state.narrativeTension}
              color="bg-purple-500"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            마지막 갱신: {new Date(memoryData.state.updatedAt).toLocaleString("ko-KR")}
          </p>
        </section>
      )}

      {/* 기억 통계 (AC4) */}
      {memoryData?.stats && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">기억 통계</h3>
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="활동" count={memoryData.stats.activityCount} />
            <StatCard label="소비" count={memoryData.stats.consumptionCount} />
            <StatCard label="대화" count={memoryData.stats.sessionCount} />
            <StatCard label="관계" count={memoryData.stats.relationshipCount} />
          </div>
          <p className="text-muted-foreground text-xs">
            총 기억: {memoryData.stats.totalMemories}개
          </p>
        </section>
      )}

      {/* 서브탭 */}
      <div className="border-border flex gap-1 border-b">
        {MEMORY_SUB_TABS.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === t.key
                ? "text-primary border-primary border-b-2"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSubTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 서브탭 내용 */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {subTab === "activity" && (
            <MemoryList
              items={memoryData?.activities ?? []}
              renderItem={(item) => (
                <div
                  key={item.id}
                  className="border-border flex items-center justify-between border-b py-2 last:border-0"
                >
                  <div>
                    <span className="text-xs font-medium">{item.activityType}</span>
                    {item.targetId && (
                      <span className="text-muted-foreground ml-2 text-xs">{item.targetId}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(item.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              )}
              emptyMessage="활동 기록이 없습니다."
            />
          )}

          {subTab === "consumption" && (
            <MemoryList
              items={memoryData?.consumptions ?? []}
              renderItem={(item) => (
                <div key={item.id} className="border-border border-b py-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mr-2 text-[10px]">
                        {item.contentType}
                      </Badge>
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    {item.rating !== null && (
                      <span className="text-xs font-medium">{(item.rating * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{item.impression}</p>
                  {item.tags.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              emptyMessage="소비 기록이 없습니다."
            />
          )}

          {subTab === "interaction" && (
            <MemoryList
              items={memoryData?.interactions ?? []}
              renderItem={(item) => (
                <div key={item.id} className="border-border border-b py-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {item.dominantTopic ?? "대화"} ({item.totalTurns}턴)
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(item.startedAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  {item.avgPressure !== null && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      평균 압력: {(item.avgPressure * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              )}
              emptyMessage="대화 기록이 없습니다."
            />
          )}

          {subTab === "relationship" && (
            <MemoryList
              items={memoryData?.relationships ?? []}
              renderItem={(item) => (
                <div key={item.id} className="border-border border-b py-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.otherPersonaName}</span>
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {item.type}
                      </span>
                      <span className="text-muted-foreground text-[10px]">{item.stage}</span>
                    </div>
                    {item.lastInteractionAt && (
                      <span className="text-muted-foreground text-xs">
                        {new Date(item.lastInteractionAt).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 grid grid-cols-5 gap-2">
                    <MiniGauge label="친밀도" value={item.warmth} />
                    <MiniGauge label="긴장도" value={item.tension} />
                    <MiniGauge label="빈도" value={item.frequency} />
                    <MiniGauge label="깊이" value={item.depth} />
                    <MiniGauge label="호감도" value={item.attraction} />
                  </div>
                  {item.milestones.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.milestones.map((m, i) => (
                        <span
                          key={i}
                          className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                        >
                          {m.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              emptyMessage="관계 기록이 없습니다."
            />
          )}
        </>
      )}
    </div>
  )
}

// ── Pressure Tab (V_Final Simulator) ────────────────────────

export function PressureTab({ data }: { data: PersonaData }) {
  const [pressure, setPressure] = useState(0.5)

  const l1 = data.vectors.l1 as SocialPersonaVector | null
  const l2 = data.vectors.l2 as CoreTemperamentVector | null
  const l3 = data.vectors.l3 as NarrativeDriveVector | null

  const vFinalResult = useMemo(() => {
    if (!l1 || !l2 || !l3) return null
    try {
      return calculateVFinal(l1, l2, l3, pressure)
    } catch {
      return null
    }
  }, [l1, l2, l3, pressure])

  const vFinalVector = useMemo(() => {
    if (!vFinalResult) return null
    return vFinalToVector(vFinalResult)
  }, [vFinalResult])

  const crossAxisProfile = useMemo(() => {
    if (!l1 || !l2 || !l3) return null
    return calculateCrossAxisProfile(l1, l2, l3)
  }, [l1, l2, l3])

  if (!l1 || !l2 || !l3) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        벡터 데이터가 없어 V_Final 시뮬레이션을 실행할 수 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-border rounded-lg border bg-blue-500/5 p-4">
        <p className="mb-1 text-xs font-medium">V_Final 시뮬레이터</p>
        <p className="text-muted-foreground text-xs">
          상황 압력(Pressure)에 따라 페르소나의 실제 행동 벡터가 어떻게 변화하는지 시뮬레이션합니다.
          압력이 높을수록 L2(본성)와 L3(욕망)가 L1(가면) 위로 드러납니다.
        </p>
      </div>

      {/* Pressure Slider */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">상황 압력 (Pressure)</span>
          <span className="font-mono text-sm font-bold">{pressure.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px]">평온 (0.0)</span>
          <Slider
            value={[pressure]}
            onValueChange={([v]) => setPressure(Math.round(v * 100) / 100)}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-muted-foreground text-[10px]">위기 (1.0)</span>
        </div>
      </div>

      {/* Layer Contribution */}
      {vFinalResult && (
        <div className="border-border rounded-lg border p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider">레이어 기여도</h4>
          <div className="flex gap-4">
            <ContributionBar
              label="L1 (가면)"
              weight={vFinalResult.layerContributions.l1Weight}
              color="bg-blue-500"
            />
            <ContributionBar
              label="L2 (본성)"
              weight={vFinalResult.layerContributions.l2Weight}
              color="bg-green-500"
            />
            <ContributionBar
              label="L3 (욕망)"
              weight={vFinalResult.layerContributions.l3Weight}
              color="bg-purple-500"
            />
          </div>
        </div>
      )}

      {/* V_Final Result */}
      {vFinalVector && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider">V_Final 결과 (7D)</h4>
          <div className="space-y-2">
            {L1_DIMS.map((dim) => {
              const original = l1[dim.key]
              const final = vFinalVector[dim.key]
              const delta = final - original
              return (
                <div key={dim.key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium">{dim.label}</span>
                  <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-blue-300"
                      style={{ left: `${original * 100}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
                      style={{ width: `${final * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-xs">
                    {final.toFixed(2)}
                  </span>
                  <span
                    className={`w-12 shrink-0 text-right font-mono text-[10px] ${
                      delta > 0.01
                        ? "text-green-500"
                        : delta < -0.01
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cross-Axis Summary */}
      {crossAxisProfile && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider">
            교차축 프로필 ({crossAxisProfile.axes.length}축)
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="border-border rounded border p-2 text-center">
              <p className="text-muted-foreground text-[10px]">Paradox 축</p>
              <p className="text-lg font-bold">{crossAxisProfile.summary.paradoxCount}</p>
            </div>
            <div className="border-border rounded border p-2 text-center">
              <p className="text-muted-foreground text-[10px]">Reinforcing 축</p>
              <p className="text-lg font-bold">{crossAxisProfile.summary.reinforcingCount}</p>
            </div>
            <div className="border-border rounded border p-2 text-center">
              <p className="text-muted-foreground text-[10px]">Character Complexity</p>
              <p className="text-lg font-bold">
                {(crossAxisProfile.summary.characterComplexity * 100).toFixed(0)}%
              </p>
            </div>
            <div className="border-border rounded border p-2 text-center">
              <p className="text-muted-foreground text-[10px]">Modulating Intensity</p>
              <p className="text-lg font-bold">
                {(crossAxisProfile.summary.modulatingIntensity * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared helper components ────────────────────────────────

function DimensionBar({
  label,
  value,
  lowLabel,
  highLabel,
}: {
  label: string
  value: number
  lowLabel?: string
  highLabel?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium">{label}</span>
      <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs">{value.toFixed(2)}</span>
      {lowLabel && highLabel && (
        <span className="text-muted-foreground w-16 shrink-0 text-[10px]">
          {value >= 0.5 ? highLabel : lowLabel}
        </span>
      )}
    </div>
  )
}

function ContributionBar({
  label,
  weight,
  color,
}: {
  label: string
  weight: number
  color: string
}) {
  return (
    <div className="flex-1 text-center">
      <div className="bg-muted mx-auto h-16 w-6 overflow-hidden rounded">
        <div
          className={`${color} w-full rounded`}
          style={{ height: `${weight * 100}%`, marginTop: `${(1 - weight) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] font-medium">{label}</p>
      <p className="text-muted-foreground font-mono text-[10px]">{(weight * 100).toFixed(0)}%</p>
    </div>
  )
}

function StateGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="text-center">
      <div className="bg-muted relative mx-auto h-2 w-full overflow-hidden rounded-full">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs font-medium">{pct}%</p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  )
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="border-border rounded-lg border p-3 text-center">
      <p className="text-lg font-semibold">{count}</p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  )
}

function MiniGauge({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-[10px]">{label}</span>
        <span className="text-[10px] font-medium">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="bg-muted mt-0.5 h-1 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  )
}

function MemoryList<T>({
  items,
  renderItem,
  emptyMessage,
}: {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  emptyMessage: string
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
  }
  return <div>{items.map(renderItem)}</div>
}
