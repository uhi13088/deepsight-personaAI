"use client"

import { BarChart3, Users, Zap, MessageSquare, Check } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface VectorDimension {
  id: string
  name: string
  label: string
  low: string
  high: string
  icon: LucideIcon
  color: string
}

interface HeroOrbitalProps {
  dimensions: VectorDimension[]
}

export function HeroOrbital({ dimensions }: HeroOrbitalProps) {
  return (
    <div className="relative flex h-[500px] items-center justify-center">
      {/* Orbital paths */}
      <div className="ds-orbit-path h-[280px] w-[280px] opacity-50" />
      <div className="ds-orbit-path h-[400px] w-[400px] opacity-30" />
      <div className="ds-orbit-path h-[520px] w-[520px] opacity-20" />

      {/* Inner orbit */}
      <div className="ds-orbit ds-orbit-medium h-[280px] w-[280px]">
        {dimensions.slice(0, 3).map((dim, idx) => (
          <div
            key={dim.id}
            className="ds-counter-rotate-medium absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${idx * 120}deg) translateX(140px) rotate(-${idx * 120}deg)`,
            }}
          >
            <div
              className={`ds-orbit-icon flex h-12 w-12 items-center justify-center bg-gradient-to-br ${dim.color}`}
            >
              <dim.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Middle orbit */}
      <div className="ds-orbit ds-orbit-slow-reverse h-[400px] w-[400px]">
        {dimensions.slice(3, 6).map((dim, idx) => (
          <div
            key={dim.id}
            className="ds-counter-rotate-reverse absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${idx * 120 + 60}deg) translateX(200px) rotate(-${idx * 120 + 60}deg)`,
            }}
          >
            <div
              className={`ds-orbit-icon flex h-14 w-14 items-center justify-center bg-gradient-to-br ${dim.color}`}
            >
              <dim.icon className="h-7 w-7 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Outer orbit */}
      <div className="ds-orbit ds-orbit-slow h-[520px] w-[520px]">
        {[BarChart3, Users, Zap, MessageSquare].map((Icon, idx) => (
          <div
            key={idx}
            className="ds-counter-rotate absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${idx * 90 + 45}deg) translateX(260px) rotate(-${idx * 90 + 45}deg)`,
            }}
          >
            <div className="ds-orbit-icon flex h-10 w-10 items-center justify-center">
              <Icon className="h-5 w-5 text-[#667eea]" />
            </div>
          </div>
        ))}
      </div>

      {/* Center card */}
      <div className="absolute z-10 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-2xl backdrop-blur-sm">
        <div className="mb-3 text-sm font-medium text-gray-500">Your Vector Profile</div>
        <div className="space-y-2">
          {dimensions.slice(0, 3).map((dim, idx) => (
            <div key={dim.id} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br ${dim.color}`}
              >
                <dim.icon className="h-3 w-3 text-white" />
              </div>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${dim.color}`}
                  style={{ width: `${40 + idx * 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-700">
          <Check className="h-3 w-3" />
          도플갱어: 유나 (92%)
        </div>
      </div>

      {/* Glow effects */}
      <div className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f093fb] opacity-20 blur-3xl" />
    </div>
  )
}
