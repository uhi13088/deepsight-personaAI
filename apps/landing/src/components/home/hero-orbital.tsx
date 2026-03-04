"use client"

import { Check } from "lucide-react"

const LAYER_RINGS = [
  {
    id: "취향",
    radius: 80,
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.08)",
    borderColor: "rgba(139, 92, 246, 0.25)",
    dims: ["영화", "음악", "도서", "음식"],
    speed: "50s",
  },
  {
    id: "성격",
    radius: 150,
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.05)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    dims: ["감성", "활동", "사교", "분석", "창의"],
    speed: "60s",
  },
  {
    id: "발견",
    radius: 220,
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.04)",
    borderColor: "rgba(59, 130, 246, 0.15)",
    dims: ["새로움", "깊이", "공감", "재미", "감동", "도전", "영감"],
    speed: "80s",
  },
]

export function HeroOrbital() {
  return (
    <div className="relative flex h-[520px] items-center justify-center lg:h-[560px]">
      {/* Background glow */}
      <div className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-[#667eea]/20 via-[#f093fb]/15 to-[#f5576c]/10 blur-[80px]" />

      {/* Layer rings */}
      {LAYER_RINGS.map((ring) => {
        const size = ring.radius * 2
        return (
          <div key={ring.id}>
            {/* Ring border */}
            <div
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                border: `1.5px solid ${ring.borderColor}`,
                background: ring.bg,
              }}
            />

            {/* Layer label badge */}
            <div
              className="absolute z-20 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
              style={{
                top: `calc(50% - ${ring.radius}px - 6px)`,
                left: "50%",
                transform: "translateX(-50%)",
                background: ring.color,
                color: "white",
                boxShadow: `0 2px 8px ${ring.color}40`,
              }}
            >
              {ring.id}
            </div>

            {/* Dimension dots orbiting */}
            <div
              className="absolute"
              style={{
                width: size,
                height: size,
                top: "50%",
                left: "50%",
                animation: `hero-orbit ${ring.speed} linear infinite`,
                transformOrigin: "center center",
              }}
            >
              {ring.dims.map((dim, i) => {
                const angle = (360 / ring.dims.length) * i - 90
                const rad = (angle * Math.PI) / 180
                // 부동소수점 반올림: 서버/클라이언트 간 Math.cos/sin 미세 차이로
                // style 문자열 불일치 → React hydration #418 방지
                const x = Math.round(Math.cos(rad) * ring.radius * 100) / 100
                const y = Math.round(Math.sin(rad) * ring.radius * 100) / 100
                return (
                  <div
                    key={dim}
                    className="absolute"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      animation: `hero-counter-orbit ${ring.speed} linear infinite`,
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 rounded-lg border bg-white/95 px-2 py-1 shadow-md backdrop-blur-sm"
                      style={{ borderColor: `${ring.color}30` }}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ background: ring.color }} />
                      <span className="text-[11px] font-medium text-gray-700">{dim}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Center — Profile card */}
      <div className="absolute z-30 w-52 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-2xl backdrop-blur-sm">
        <div className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
          나의 취향 프로필
        </div>

        {/* bars */}
        <div className="space-y-2.5">
          {[
            { label: "취향", color: "#8B5CF6", width: "78%" },
            { label: "성격", color: "#F59E0B", width: "65%" },
            { label: "발견", color: "#3B82F6", width: "52%" },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="w-7 text-[10px] font-bold" style={{ color: bar.color }}>
                {bar.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: bar.width, background: bar.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Accuracy */}
        <div className="mt-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-2 text-center">
          <div className="text-[10px] text-gray-400">취향 정확도</div>
          <div className="text-lg font-bold text-purple-600">93%</div>
        </div>

        {/* Match result */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" />
          추천 페르소나: 유나
        </div>
      </div>

      {/* Animated accent dots */}
      <div
        className="absolute h-3 w-3 animate-ping rounded-full bg-blue-400/30"
        style={{ top: "15%", right: "20%" }}
      />
      <div
        className="absolute h-2 w-2 animate-ping rounded-full bg-purple-400/30"
        style={{ bottom: "20%", left: "15%", animationDelay: "1s" }}
      />
      <div
        className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-amber-400/30"
        style={{ top: "70%", right: "12%", animationDelay: "2s" }}
      />
    </div>
  )
}
