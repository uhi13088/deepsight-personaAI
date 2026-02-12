import { describe, it, expect } from "vitest"
import {
  PROFILE_LEVELS,
  getProfileLevelConfig,
  getProfileLevelByPhase,
  PHASE_CREDITS,
  getTotalCredits,
} from "../profile-level"
import type { ProfileLevel } from "../profile-level"

describe("profile-level: 프로필 등급 시스템", () => {
  // ── PROFILE_LEVELS 설정 검증 ───────────────────────────────

  it("4개 등급 존재 (BASIC/STANDARD/ADVANCED/PREMIUM)", () => {
    const levels = Object.keys(PROFILE_LEVELS) as ProfileLevel[]
    expect(levels).toHaveLength(4)
    expect(levels).toContain("BASIC")
    expect(levels).toContain("STANDARD")
    expect(levels).toContain("ADVANCED")
    expect(levels).toContain("PREMIUM")
  })

  it("각 등급에 필수 필드 존재", () => {
    for (const config of Object.values(PROFILE_LEVELS)) {
      expect(config.level).toBeDefined()
      expect(config.label).toBeDefined()
      expect(config.emoji).toBeDefined()
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(config.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(config.minPhase).toBeGreaterThanOrEqual(1)
      expect(config.confidence).toBeGreaterThan(0)
      expect(config.confidence).toBeLessThanOrEqual(1)
    }
  })

  it("등급별 confidence 오름차순", () => {
    expect(PROFILE_LEVELS.BASIC.confidence).toBeLessThan(PROFILE_LEVELS.STANDARD.confidence)
    expect(PROFILE_LEVELS.STANDARD.confidence).toBeLessThan(PROFILE_LEVELS.ADVANCED.confidence)
    expect(PROFILE_LEVELS.ADVANCED.confidence).toBeLessThan(PROFILE_LEVELS.PREMIUM.confidence)
  })

  // ── getProfileLevelConfig ──────────────────────────────────

  it("getProfileLevelConfig 올바른 설정 반환", () => {
    const basic = getProfileLevelConfig("BASIC")
    expect(basic.label).toBe("기본 프로필")
    expect(basic.minPhase).toBe(1)

    const advanced = getProfileLevelConfig("ADVANCED")
    expect(advanced.label).toBe("정밀 프로필")
    expect(advanced.minPhase).toBe(3)
  })

  // ── getProfileLevelByPhase ─────────────────────────────────

  it("Phase 1 완료 → BASIC", () => {
    expect(getProfileLevelByPhase(1)).toBe("BASIC")
  })

  it("Phase 2 완료 → STANDARD", () => {
    expect(getProfileLevelByPhase(2)).toBe("STANDARD")
  })

  it("Phase 3 완료 → ADVANCED", () => {
    expect(getProfileLevelByPhase(3)).toBe("ADVANCED")
  })

  it("Phase 0 → BASIC (기본값)", () => {
    expect(getProfileLevelByPhase(0)).toBe("BASIC")
  })

  // ── PHASE_CREDITS ──────────────────────────────────────────

  it("Phase 1 = 100, Phase 2 = 150, Phase 3 = 200", () => {
    expect(PHASE_CREDITS[1]).toBe(100)
    expect(PHASE_CREDITS[2]).toBe(150)
    expect(PHASE_CREDITS[3]).toBe(200)
  })

  // ── getTotalCredits ────────────────────────────────────────

  it("전체 Phase 완료 시 총 450 코인", () => {
    expect(getTotalCredits(3)).toBe(450)
  })

  it("Phase 1만 완료 시 100 코인", () => {
    expect(getTotalCredits(1)).toBe(100)
  })

  it("Phase 2까지 완료 시 250 코인", () => {
    expect(getTotalCredits(2)).toBe(250)
  })

  it("Phase 0 = 0 코인", () => {
    expect(getTotalCredits(0)).toBe(0)
  })
})
