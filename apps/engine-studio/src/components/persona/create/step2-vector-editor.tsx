"use client"

import { useState, useMemo } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ARCHETYPE_LABELS } from "@/constants/v3/interpretation-tables"
import { calculateExtendedParadoxScore, calculateL1L2ParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateVFinal, vFinalToVector } from "@/lib/vector/v-final"
import type {
  VectorFormData,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@/types"

// ── Dimension Definitions ───────────────────────────────────
const L1_DIMS: { key: SocialDimension; label: string; low: string; high: string }[] = [
  { key: "depth", label: "분석 깊이", low: "직관적", high: "심층적" },
  { key: "lens", label: "판단 렌즈", low: "감성", high: "논리" },
  { key: "stance", label: "평가 태도", low: "수용적", high: "비판적" },
  { key: "scope", label: "관심 범위", low: "간결", high: "세밀" },
  { key: "taste", label: "취향 성향", low: "클래식", high: "실험적" },
  { key: "purpose", label: "소비 목적", low: "오락", high: "의미" },
  { key: "sociability", label: "사회적 성향", low: "독립적", high: "사교적" },
]

const L2_DIMS: { key: TemperamentDimension; label: string; low: string; high: string }[] = [
  { key: "openness", label: "개방성 (O)", low: "보수적", high: "개방적" },
  { key: "conscientiousness", label: "성실성 (C)", low: "즉흥적", high: "원칙적" },
  { key: "extraversion", label: "외향성 (E)", low: "내향적", high: "외향적" },
  { key: "agreeableness", label: "친화성 (A)", low: "경쟁적", high: "협조적" },
  { key: "neuroticism", label: "신경성 (N)", low: "안정", high: "불안정" },
]

const L3_DIMS: { key: NarrativeDimension; label: string; low: string; high: string }[] = [
  { key: "lack", label: "결핍", low: "충족", high: "결핍" },
  { key: "moralCompass", label: "도덕 나침반", low: "유연", high: "엄격" },
  { key: "volatility", label: "변동성", low: "안정", high: "폭발적" },
  { key: "growthArc", label: "성장 아크", low: "정체", high: "성장" },
]

// ── Archetype Presets ───────────────────────────────────────
const ARCHETYPE_PRESETS: Record<
  string,
  { l1: SocialPersonaVector; l2: CoreTemperamentVector; l3: NarrativeDriveVector }
> = {
  "ironic-philosopher": {
    l1: {
      depth: 0.85,
      lens: 0.9,
      stance: 0.75,
      scope: 0.8,
      taste: 0.35,
      purpose: 0.7,
      sociability: 0.3,
    },
    l2: {
      openness: 0.75,
      conscientiousness: 0.6,
      extraversion: 0.35,
      agreeableness: 0.45,
      neuroticism: 0.7,
    },
    l3: { lack: 0.65, moralCompass: 0.55, volatility: 0.5, growthArc: 0.6 },
  },
  "wounded-critic": {
    l1: {
      depth: 0.8,
      lens: 0.7,
      stance: 0.85,
      scope: 0.75,
      taste: 0.4,
      purpose: 0.65,
      sociability: 0.25,
    },
    l2: {
      openness: 0.5,
      conscientiousness: 0.7,
      extraversion: 0.25,
      agreeableness: 0.3,
      neuroticism: 0.8,
    },
    l3: { lack: 0.75, moralCompass: 0.6, volatility: 0.65, growthArc: 0.45 },
  },
  "social-introvert": {
    l1: {
      depth: 0.6,
      lens: 0.5,
      stance: 0.4,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.8,
    },
    l2: {
      openness: 0.6,
      conscientiousness: 0.5,
      extraversion: 0.25,
      agreeableness: 0.7,
      neuroticism: 0.5,
    },
    l3: { lack: 0.4, moralCompass: 0.5, volatility: 0.3, growthArc: 0.55 },
  },
  "lazy-perfectionist": {
    l1: {
      depth: 0.7,
      lens: 0.6,
      stance: 0.5,
      scope: 0.85,
      taste: 0.4,
      purpose: 0.5,
      sociability: 0.4,
    },
    l2: {
      openness: 0.4,
      conscientiousness: 0.85,
      extraversion: 0.35,
      agreeableness: 0.5,
      neuroticism: 0.55,
    },
    l3: { lack: 0.5, moralCompass: 0.65, volatility: 0.35, growthArc: 0.5 },
  },
  "conservative-hipster": {
    l1: {
      depth: 0.55,
      lens: 0.5,
      stance: 0.45,
      scope: 0.5,
      taste: 0.85,
      purpose: 0.4,
      sociability: 0.55,
    },
    l2: {
      openness: 0.3,
      conscientiousness: 0.6,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.4,
    },
    l3: { lack: 0.45, moralCompass: 0.55, volatility: 0.3, growthArc: 0.5 },
  },
  "empathetic-arguer": {
    l1: {
      depth: 0.75,
      lens: 0.8,
      stance: 0.7,
      scope: 0.65,
      taste: 0.5,
      purpose: 0.75,
      sociability: 0.6,
    },
    l2: {
      openness: 0.65,
      conscientiousness: 0.55,
      extraversion: 0.6,
      agreeableness: 0.8,
      neuroticism: 0.45,
    },
    l3: { lack: 0.35, moralCompass: 0.7, volatility: 0.4, growthArc: 0.65 },
  },
  "free-guardian": {
    l1: {
      depth: 0.5,
      lens: 0.4,
      stance: 0.3,
      scope: 0.7,
      taste: 0.6,
      purpose: 0.35,
      sociability: 0.65,
    },
    l2: {
      openness: 0.7,
      conscientiousness: 0.75,
      extraversion: 0.55,
      agreeableness: 0.65,
      neuroticism: 0.3,
    },
    l3: { lack: 0.3, moralCompass: 0.6, volatility: 0.25, growthArc: 0.55 },
  },
  "quiet-enthusiast": {
    l1: {
      depth: 0.65,
      lens: 0.55,
      stance: 0.35,
      scope: 0.6,
      taste: 0.7,
      purpose: 0.6,
      sociability: 0.2,
    },
    l2: {
      openness: 0.8,
      conscientiousness: 0.5,
      extraversion: 0.2,
      agreeableness: 0.6,
      neuroticism: 0.45,
    },
    l3: { lack: 0.55, moralCompass: 0.45, volatility: 0.35, growthArc: 0.7 },
  },
  "emotional-pragmatist": {
    l1: {
      depth: 0.6,
      lens: 0.3,
      stance: 0.4,
      scope: 0.55,
      taste: 0.45,
      purpose: 0.55,
      sociability: 0.5,
    },
    l2: {
      openness: 0.5,
      conscientiousness: 0.7,
      extraversion: 0.45,
      agreeableness: 0.55,
      neuroticism: 0.6,
    },
    l3: { lack: 0.4, moralCompass: 0.55, volatility: 0.45, growthArc: 0.6 },
  },
  "dangerous-mentor": {
    l1: {
      depth: 0.85,
      lens: 0.75,
      stance: 0.7,
      scope: 0.8,
      taste: 0.5,
      purpose: 0.85,
      sociability: 0.35,
    },
    l2: {
      openness: 0.6,
      conscientiousness: 0.65,
      extraversion: 0.3,
      agreeableness: 0.25,
      neuroticism: 0.55,
    },
    l3: { lack: 0.7, moralCompass: 0.75, volatility: 0.5, growthArc: 0.4 },
  },
  "volatile-intellectual": {
    l1: {
      depth: 0.9,
      lens: 0.85,
      stance: 0.8,
      scope: 0.85,
      taste: 0.45,
      purpose: 0.7,
      sociability: 0.3,
    },
    l2: {
      openness: 0.7,
      conscientiousness: 0.55,
      extraversion: 0.35,
      agreeableness: 0.3,
      neuroticism: 0.85,
    },
    l3: { lack: 0.6, moralCompass: 0.5, volatility: 0.85, growthArc: 0.5 },
  },
  "growing-cynic": {
    l1: {
      depth: 0.7,
      lens: 0.65,
      stance: 0.8,
      scope: 0.6,
      taste: 0.35,
      purpose: 0.6,
      sociability: 0.3,
    },
    l2: {
      openness: 0.45,
      conscientiousness: 0.5,
      extraversion: 0.3,
      agreeableness: 0.35,
      neuroticism: 0.6,
    },
    l3: { lack: 0.55, moralCompass: 0.5, volatility: 0.45, growthArc: 0.75 },
  },
}

// ── Component ───────────────────────────────────────────────
interface Step2Props {
  data: VectorFormData
  onChange: (data: VectorFormData) => void
  onPrev: () => void
  onNext: () => void
}

type ActiveTab = "l1" | "l2" | "l3" | "archetype" | "preview" | "vfinal"

export function Step2VectorEditor({ data, onChange, onPrev, onNext }: Step2Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("l1")

  // Computed scores
  const paradoxProfile = useMemo(() => {
    const crossAxisProfile = calculateCrossAxisProfile(data.l1, data.l2, data.l3)
    return calculateExtendedParadoxScore(data.l1, data.l2, data.l3, crossAxisProfile)
  }, [data.l1, data.l2, data.l3])

  const l1l2Paradox = useMemo(() => calculateL1L2ParadoxScore(data.l1, data.l2), [data.l1, data.l2])

  const updateL1 = (key: SocialDimension, value: number) => {
    onChange({ ...data, l1: { ...data.l1, [key]: value }, archetypeId: null })
  }

  const updateL2 = (key: TemperamentDimension, value: number) => {
    onChange({ ...data, l2: { ...data.l2, [key]: value }, archetypeId: null })
  }

  const updateL3 = (key: NarrativeDimension, value: number) => {
    onChange({ ...data, l3: { ...data.l3, [key]: value }, archetypeId: null })
  }

  const applyArchetype = (id: string) => {
    const preset = ARCHETYPE_PRESETS[id]
    if (!preset) return
    onChange({ l1: { ...preset.l1 }, l2: { ...preset.l2 }, l3: { ...preset.l3 }, archetypeId: id })
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "l1", label: "L1 Social (7D)" },
    { key: "l2", label: "L2 OCEAN (5D)" },
    { key: "l3", label: "L3 Narrative (4D)" },
    { key: "archetype", label: "아키타입" },
    { key: "vfinal", label: "V_Final 시뮬레이터" },
    { key: "preview", label: "미리보기" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Step 2: 벡터 설계</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          3-Layer 106D+ 벡터를 설계하세요. 아키타입을 선택하거나 직접 조정할 수 있습니다.
        </p>
      </div>

      {/* Paradox Score Badge */}
      <div className="border-border flex items-center gap-4 rounded-lg border p-3">
        <div>
          <span className="text-xs font-medium">Extended Paradox Score</span>
          <p className="text-2xl font-bold">{(paradoxProfile.overall * 100).toFixed(0)}%</p>
        </div>
        <div className="text-muted-foreground text-xs">
          <p>L1↔L2: {(paradoxProfile.l1l2 * 100).toFixed(0)}%</p>
          <p>L1↔L3: {(paradoxProfile.l1l3 * 100).toFixed(0)}%</p>
          <p>L2↔L3: {(paradoxProfile.l2l3 * 100).toFixed(0)}%</p>
        </div>
        <div className="text-muted-foreground text-xs">
          <p>Dimensionality: {(paradoxProfile.dimensionality * 100).toFixed(0)}%</p>
          <p>Dominant: {paradoxProfile.dominant.layer}</p>
        </div>
        {data.archetypeId && (
          <Badge variant="info" className="ml-auto">
            <Sparkles className="mr-1 h-3 w-3" />
            {ARCHETYPE_LABELS[data.archetypeId]}
          </Badge>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-border flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "text-primary border-primary border-b-2"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "l1" && (
          <VectorSliders
            dimensions={L1_DIMS}
            values={data.l1 as unknown as Record<string, number>}
            onValueChange={(key, val) => updateL1(key as SocialDimension, val)}
          />
        )}
        {activeTab === "l2" && (
          <VectorSliders
            dimensions={L2_DIMS}
            values={data.l2 as unknown as Record<string, number>}
            onValueChange={(key, val) => updateL2(key as TemperamentDimension, val)}
          />
        )}
        {activeTab === "l3" && (
          <VectorSliders
            dimensions={L3_DIMS}
            values={data.l3 as unknown as Record<string, number>}
            onValueChange={(key, val) => updateL3(key as NarrativeDimension, val)}
          />
        )}
        {activeTab === "archetype" && (
          <ArchetypeSelector selectedId={data.archetypeId} onSelect={applyArchetype} />
        )}
        {activeTab === "vfinal" && <VFinalSimulator l1={data.l1} l2={data.l2} l3={data.l3} />}
        {activeTab === "preview" && (
          <VectorPreview
            l1={data.l1 as unknown as Record<string, number>}
            l2={data.l2 as unknown as Record<string, number>}
            paradoxProfile={paradoxProfile}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
        <Button onClick={onNext}>다음: 프롬프트</Button>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function VectorSliders({
  dimensions,
  values,
  onValueChange,
}: {
  dimensions: { key: string; label: string; low: string; high: string }[]
  values: Record<string, number>
  onValueChange: (key: string, value: number) => void
}) {
  const getValue = (key: string): number => values[key] ?? 0.5

  return (
    <div className="space-y-4">
      {dimensions.map((dim) => (
        <div key={dim.key}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium">{dim.label}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {getValue(dim.key).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-14 text-[10px]">{dim.low}</span>
            <Slider
              value={[getValue(dim.key)]}
              onValueChange={([v]) => onValueChange(dim.key, Math.round(v * 100) / 100)}
              min={0}
              max={1}
              step={0.01}
              className="flex-1"
            />
            <span className="text-muted-foreground w-14 text-right text-[10px]">{dim.high}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ArchetypeSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.entries(ARCHETYPE_LABELS).map(([id, label]) => (
        <button
          key={id}
          className={`rounded-lg border p-3 text-left transition-all ${
            selectedId === id
              ? "border-primary bg-primary/5 ring-primary/30 ring-1"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => onSelect(id)}
        >
          <Sparkles
            className={`mb-1 h-4 w-4 ${selectedId === id ? "text-primary" : "text-muted-foreground"}`}
          />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">{id}</p>
        </button>
      ))}
    </div>
  )
}

interface VectorPreviewProps {
  l1: Record<string, number>
  l2: Record<string, number>
  paradoxProfile: ReturnType<typeof calculateExtendedParadoxScore>
}

function VectorPreview({ l1, l2, paradoxProfile }: VectorPreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">L1 Social Persona</h4>
        <div className="grid grid-cols-7 gap-2">
          {L1_DIMS.map((dim) => {
            const v = l1[dim.key] ?? 0.5
            return (
              <div key={dim.key} className="text-center">
                <div
                  className="bg-primary/20 mx-auto mb-1 w-6 rounded-sm"
                  style={{ height: `${v * 60 + 8}px` }}
                />
                <span className="text-[9px]">{dim.label.slice(0, 2)}</span>
                <p className="text-muted-foreground font-mono text-[9px]">{v.toFixed(1)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">L2 OCEAN</h4>
        <div className="grid grid-cols-5 gap-2">
          {L2_DIMS.map((dim) => {
            const v = l2[dim.key] ?? 0.5
            return (
              <div key={dim.key} className="text-center">
                <div
                  className="mx-auto mb-1 w-6 rounded-sm bg-blue-500/20"
                  style={{ height: `${v * 60 + 8}px` }}
                />
                <span className="text-[9px]">{dim.key[0].toUpperCase()}</span>
                <p className="text-muted-foreground font-mono text-[9px]">{v.toFixed(1)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">Paradox Profile</h4>
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            EPS Overall:{" "}
            <span className="text-foreground font-mono">{paradoxProfile.overall.toFixed(3)}</span>
          </p>
          <p>
            Dimensionality:{" "}
            <span className="text-foreground font-mono">
              {paradoxProfile.dimensionality.toFixed(3)}
            </span>
          </p>
          <p>
            Dominant Layer:{" "}
            <span className="text-foreground font-mono">{paradoxProfile.dominant.layer}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── V_Final Simulator ───────────────────────────────────────

function VFinalSimulator({
  l1,
  l2,
  l3,
}: {
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
}) {
  const [pressure, setPressure] = useState(0.5)

  const vFinalResult = useMemo(() => {
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
    return calculateCrossAxisProfile(l1, l2, l3)
  }, [l1, l2, l3])

  return (
    <div className="space-y-6">
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
        <p className="text-muted-foreground mt-1 text-xs">
          압력이 높을수록 L2(본성)와 L3(욕망)가 더 강하게 드러납니다.
        </p>
      </div>

      {/* Layer Contribution */}
      {vFinalResult && (
        <div className="border-border rounded-lg border p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">레이어 기여도</h4>
          <div className="flex gap-3">
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
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">V_Final 결과 (7D)</h4>
          <div className="space-y-2">
            {L1_DIMS.map((dim) => {
              const original = l1[dim.key]
              const final = vFinalVector[dim.key]
              const delta = final - original
              return (
                <div key={dim.key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium">{dim.label}</span>
                  <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
                    {/* Original L1 marker */}
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-blue-300"
                      style={{ left: `${original * 100}%` }}
                    />
                    {/* V_Final bar */}
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
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">
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
