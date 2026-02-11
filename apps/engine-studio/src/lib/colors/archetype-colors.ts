// ═══════════════════════════════════════════════════════════════
// Archetype Colors — 12 아키타입 고유 색상
// 설계서 §12, §8.4 기준
// ═══════════════════════════════════════════════════════════════

export interface ArchetypeColor {
  id: string
  primary: string
  bg: string
  accent: string
}

export const ARCHETYPE_COLORS: ArchetypeColor[] = [
  { id: "ironic-philosopher", primary: "#6366F1", bg: "#EEF2FF", accent: "#818CF8" },
  { id: "wounded-critic", primary: "#EC4899", bg: "#FDF2F8", accent: "#F472B6" },
  { id: "social-introvert", primary: "#0EA5E9", bg: "#F0F9FF", accent: "#38BDF8" },
  { id: "lazy-perfectionist", primary: "#F97316", bg: "#FFF7ED", accent: "#FB923C" },
  { id: "conservative-hipster", primary: "#A855F7", bg: "#FAF5FF", accent: "#C084FC" },
  { id: "empathetic-debater", primary: "#1E293B", bg: "#F8FAFC", accent: "#475569" },
  { id: "free-guardian", primary: "#84CC16", bg: "#F7FEE7", accent: "#A3E635" },
  { id: "quiet-passionate", primary: "#EAB308", bg: "#FEFCE8", accent: "#FACC15" },
  { id: "emotional-pragmatist", primary: "#14B8A6", bg: "#F0FDFA", accent: "#2DD4BF" },
  { id: "dangerous-mentor", primary: "#F43F5E", bg: "#FFF1F2", accent: "#FB7185" },
  { id: "explosive-intellectual", primary: "#7C3AED", bg: "#F5F3FF", accent: "#A78BFA" },
  { id: "growing-cynic", primary: "#D946EF", bg: "#FDF4FF", accent: "#E879F9" },
]

// ── id → color 빠른 조회 ────────────────────────────────────
export const ARCHETYPE_COLOR_MAP: Record<string, ArchetypeColor> = Object.fromEntries(
  ARCHETYPE_COLORS.map((c) => [c.id, c])
)
