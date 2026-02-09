"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { PingerPrint2D } from "./p-inger-print-2d"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

const PingerPrint3D = dynamic(
  () => import("./p-inger-print-3d").then((mod) => ({ default: mod.PingerPrint3D })),
  {
    ssr: false,
    loading: () => (
      <div className="inline-flex flex-col items-center gap-2">
        <div className="flex h-[280px] w-[280px] items-center justify-center">
          <div className="h-32 w-32 animate-pulse rounded-full bg-gradient-to-br from-[#667eea]/20 via-[#f093fb]/20 to-[#f5576c]/20" />
        </div>
        <span className="text-xs font-medium text-gray-400">3D P-inger Print</span>
      </div>
    ),
  }
)

interface PersonaSample {
  name: string
  type: string
  tagline: string
  description: string
  data: Record<string, number>
}

const EXAMPLE_PERSONAS: PersonaSample[] = [
  {
    name: "분석가 레오",
    type: "Critic",
    tagline: "영화는 삶의 교과서다",
    description: "깊이 있는 분석과 논리적 비평으로 콘텐츠의 숨겨진 의미를 발견합니다.",
    data: { depth: 0.92, lens: 0.85, stance: 0.75, scope: 0.8, taste: 0.28, purpose: 0.88 },
  },
  {
    name: "탐험가 루나",
    type: "Explorer",
    tagline: "아직 만나지 못한 걸작이 있다",
    description: "새로운 장르와 실험적 콘텐츠를 누구보다 먼저 발견하고 공유합니다.",
    data: { depth: 0.38, lens: 0.32, stance: 0.22, scope: 0.48, taste: 0.95, purpose: 0.58 },
  },
  {
    name: "큐레이터 아리",
    type: "Curator",
    tagline: "당신의 시간이 아깝지 않을 작품만",
    description: "균형 잡힌 시선으로 숨은 명작을 발굴하고 맞춤 추천합니다.",
    data: { depth: 0.65, lens: 0.55, stance: 0.5, scope: 0.85, taste: 0.6, purpose: 0.72 },
  },
]

export function PingerPrintShowcase() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const persona = EXAMPLE_PERSONAS[selectedIdx]

  return (
    <div>
      {/* Persona Selector */}
      <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
        {EXAMPLE_PERSONAS.map((p, idx) => (
          <button
            key={p.name}
            onClick={() => setSelectedIdx(idx)}
            className={`rounded-xl border-2 px-6 py-4 text-left transition-all ${
              idx === selectedIdx
                ? "border-purple-400 bg-purple-50 shadow-lg"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-500">
              {p.type}
            </div>
            <div className="text-lg font-bold text-gray-900">{p.name}</div>
            <div className="text-sm text-gray-500">{p.tagline}</div>
          </button>
        ))}
      </div>

      {/* P-inger Print Display */}
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-16">
        {/* 2D Print */}
        <div className="flex flex-col items-center">
          <PingerPrint2D data={persona.data} size={260} />
          <p className="mt-3 text-center text-sm text-gray-500">
            지문 패턴 — 릿지 밀도, 곡률, 간격이
            <br />
            6D 벡터값에 따라 고유하게 변형
          </p>
        </div>

        {/* 3D Print */}
        <div className="flex flex-col items-center">
          <PingerPrint3D data={persona.data} size={280} autoRotate />
          <p className="mt-3 text-center text-sm text-gray-500">
            유기적 형태 — 구체 표면이
            <br />
            6D 벡터값에 따라 돌기/함몰 변형
          </p>
        </div>
      </div>

      {/* 6D Values for selected persona */}
      <div className="mx-auto mt-10 max-w-xl">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 text-center text-sm font-medium text-gray-700">
            {persona.name}의 6D 벡터
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TRAIT_DIMENSIONS.map((dim) => {
              const val = persona.data[dim.key] ?? 0.5
              return (
                <div key={dim.key} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: dim.color.primary }}
                  />
                  <span className="text-xs text-gray-500">{dim.label}</span>
                  <span className="ml-auto font-mono text-xs font-medium text-gray-700">
                    {val.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
