"use client"

import { useState, useMemo } from "react"
import { Sparkles, BookOpen, MessageCircle, Zap, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { generateAllQualitativeDimensions } from "@/lib/qualitative"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  BackstoryDimension,
  VoiceProfile,
  PressureContext,
  ZeitgeistProfile,
  PersonaArchetype,
} from "@/types"

// ── 타입 ──────────────────────────────────────────────────────

export interface QualitativeData {
  backstory: BackstoryDimension
  voice: VoiceProfile
  pressure: PressureContext
  zeitgeist: ZeitgeistProfile
}

interface QualitativeEditorProps {
  data: QualitativeData | null
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  archetype?: PersonaArchetype
  onChange: (data: QualitativeData) => void
}

type TabId = "backstory" | "voice" | "pressure" | "zeitgeist"

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "backstory", label: "배경 서사", icon: BookOpen },
  { id: "voice", label: "보이스", icon: MessageCircle },
  { id: "pressure", label: "압박 반응", icon: Zap },
  { id: "zeitgeist", label: "시대 감수성", icon: Globe },
]

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export function QualitativeEditor({
  data,
  l1,
  l2,
  l3,
  archetype,
  onChange,
}: QualitativeEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("backstory")

  // 자동 생성
  const handleGenerate = () => {
    const generated = generateAllQualitativeDimensions(l1, l2, l3, archetype)
    onChange(generated)
  }

  // 데이터 없으면 생성 유도
  if (!data) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground text-sm">
          벡터 기반으로 정성적 차원(배경, 보이스, 압박 반응, 시대 감수성)을 생성합니다.
        </p>
        <Button onClick={handleGenerate}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          정성적 차원 자동 생성
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">정성적 차원</h3>
        <Button variant="outline" size="sm" onClick={handleGenerate}>
          <Sparkles className="mr-1 h-3 w-3" />
          재생성
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === "backstory" && (
        <BackstoryTab data={data.backstory} onChange={(b) => onChange({ ...data, backstory: b })} />
      )}
      {activeTab === "voice" && (
        <VoiceTab data={data.voice} onChange={(v) => onChange({ ...data, voice: v })} />
      )}
      {activeTab === "pressure" && (
        <PressureTab data={data.pressure} onChange={(p) => onChange({ ...data, pressure: p })} />
      )}
      {activeTab === "zeitgeist" && (
        <ZeitgeistTab data={data.zeitgeist} onChange={(z) => onChange({ ...data, zeitgeist: z })} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 탭 컴포넌트들
// ═══════════════════════════════════════════════════════════════

// ── Backstory Tab ─────────────────────────────────────────────

function BackstoryTab({
  data,
  onChange,
}: {
  data: BackstoryDimension
  onChange: (d: BackstoryDimension) => void
}) {
  return (
    <div className="space-y-4">
      <TextAreaField
        label="출신 서사 (Origin)"
        value={data.origin}
        onChange={(v) => onChange({ ...data, origin: v })}
        rows={3}
        placeholder="캐릭터의 출신 배경과 형성 과정..."
      />
      <TextAreaField
        label="형성적 경험 (Formative Experience)"
        value={data.formativeExperience}
        onChange={(v) => onChange({ ...data, formativeExperience: v })}
        rows={3}
        placeholder="캐릭터를 만든 결정적 경험..."
      />
      <TextAreaField
        label="내면 갈등 (Inner Conflict)"
        value={data.innerConflict}
        onChange={(v) => onChange({ ...data, innerConflict: v })}
        rows={2}
        placeholder="캐릭터의 핵심 내면 갈등..."
      />
      <TextAreaField
        label="자기 서사 (Self Narrative)"
        value={data.selfNarrative}
        onChange={(v) => onChange({ ...data, selfNarrative: v })}
        rows={2}
        placeholder="캐릭터가 스스로를 설명하는 방식..."
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">NLP 키워드</label>
        <div className="flex flex-wrap gap-1">
          {data.nlpKeywords.map((kw, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Voice Tab ─────────────────────────────────────────────────

function VoiceTab({ data, onChange }: { data: VoiceProfile; onChange: (d: VoiceProfile) => void }) {
  return (
    <div className="space-y-4">
      <TextAreaField
        label="말투 스타일 (Speech Style)"
        value={data.speechStyle}
        onChange={(v) => onChange({ ...data, speechStyle: v })}
        rows={2}
        placeholder="캐릭터의 기본 말투와 문체..."
      />
      <ListField
        label="습관적 표현 (Habitual Expressions)"
        items={data.habitualExpressions}
        onChange={(items) => onChange({ ...data, habitualExpressions: items })}
      />
      <ListField
        label="물리적 매너리즘 (Physical Mannerisms)"
        items={data.physicalMannerisms}
        onChange={(items) => onChange({ ...data, physicalMannerisms: items })}
      />
      <ListField
        label="무의식적 행동 (Unconscious Behaviors)"
        items={data.unconsciousBehaviors}
        onChange={(items) => onChange({ ...data, unconsciousBehaviors: items })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">감정 활성화 임계값</label>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(data.activationThresholds).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className="text-xs font-medium">{key}</div>
              <div className="text-muted-foreground text-xs">
                {typeof val === "number" ? val.toFixed(2) : val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Pressure Tab ──────────────────────────────────────────────

function PressureTab({
  data,
  onChange,
}: {
  data: PressureContext
  onChange: (d: PressureContext) => void
}) {
  return (
    <div className="space-y-4">
      <TextAreaField
        label="스트레스 반응 (Stress Response)"
        value={data.stressResponse}
        onChange={(v) => onChange({ ...data, stressResponse: v })}
        rows={2}
        placeholder="압박 상황에서의 반응 패턴..."
      />
      <TextAreaField
        label="컴포트 존 (Comfort Zone)"
        value={data.comfortZone}
        onChange={(v) => onChange({ ...data, comfortZone: v })}
        rows={2}
        placeholder="안정감을 느끼는 상황..."
      />
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-600">
          상황적 트리거 ({data.situationalTriggers.length}개)
        </label>
        <div className="space-y-2">
          {data.situationalTriggers.map((trigger, i) => (
            <div key={i} className="rounded-md border border-gray-200 bg-gray-50 p-2">
              <div className="text-xs font-medium">{trigger.condition}</div>
              <div className="text-muted-foreground mt-1 flex gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {trigger.affectedLayer}.{trigger.affectedDimension}
                </Badge>
                <Badge
                  variant={trigger.effect === "boost" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {trigger.effect === "boost"
                    ? "강화"
                    : trigger.effect === "suppress"
                      ? "억제"
                      : "대체"}
                </Badge>
                <span>강도: {trigger.magnitude.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Zeitgeist Tab ─────────────────────────────────────────────

function ZeitgeistTab({
  data,
  onChange,
}: {
  data: ZeitgeistProfile
  onChange: (d: ZeitgeistProfile) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          사회적 인식도: {data.socialAwareness.toFixed(2)}
        </label>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500"
            style={{ width: `${data.socialAwareness * 100}%` }}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          트렌드 민감도: {data.trendSensitivity.toFixed(2)}
        </label>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-purple-500"
            style={{ width: `${data.trendSensitivity * 100}%` }}
          />
        </div>
      </div>
      <ListField
        label="문화적 레퍼런스 (Cultural References)"
        items={data.culturalReferences}
        onChange={(items) => onChange({ ...data, culturalReferences: items })}
      />
      <ListField
        label="세대적 마커 (Generational Markers)"
        items={data.generationalMarkers}
        onChange={(items) => onChange({ ...data, generationalMarkers: items })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 공통 서브 컴포넌트
// ═══════════════════════════════════════════════════════════════

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-2 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
        placeholder={placeholder}
      />
    </div>
  )
}

function ListField({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <input
            key={i}
            value={item}
            onChange={(e) => {
              const newItems = [...items]
              newItems[i] = e.target.value
              onChange(newItems)
            }}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
          />
        ))}
      </div>
    </div>
  )
}
