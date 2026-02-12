// ═══════════════════════════════════════════════════════════════
// T64: 컬러지문 UI — 단위 테스트
// AC1~AC4 유틸리티 + 데이터 흐름 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  getAxisAngle,
  polarToCartesian,
  paradoxToColor,
  pressureToWeights,
  l1ToArray,
  l2ToArray,
  l3ToArray,
  smoothRadarPath,
  L1_KEYS,
  L2_KEYS,
  L3_KEYS,
  L1_COLORS,
  L2_COLORS,
  L3_COLORS,
  L1_LABELS,
  L2_LABELS,
  L3_LABELS,
} from "@/components/charts/fingerprint-types"
import type { L1Vector, L2Vector, L3Vector } from "@/components/charts/fingerprint-types"

import { convertV2ToL1 } from "@/components/charts/fingerprint-compat"

// ── 테스트 데이터 ────────────────────────────────────────────

const TEST_L1: L1Vector = {
  depth: 0.8,
  lens: 0.3,
  stance: 0.5,
  scope: 0.2,
  taste: 0.4,
  purpose: 0.6,
  sociability: 0.7,
}

const TEST_L2: L2Vector = {
  openness: 0.6,
  conscientiousness: 0.7,
  extraversion: 0.4,
  agreeableness: 0.5,
  neuroticism: 0.3,
}

const TEST_L3: L3Vector = {
  lack: 0.4,
  moralCompass: 0.6,
  volatility: 0.5,
  growthArc: 0.7,
}

// ═══════════════════════════════════════════════════════════════
// 공통 유틸리티
// ═══════════════════════════════════════════════════════════════

describe("fingerprint-types 유틸리티", () => {
  describe("getAxisAngle", () => {
    it("첫 번째 축 → -π/2 (12시 방향)", () => {
      const angle = getAxisAngle(0, 7)
      expect(angle).toBeCloseTo(-Math.PI / 2, 5)
    })

    it("각도는 2π 범위", () => {
      const a1 = getAxisAngle(0, 4)
      const a2 = getAxisAngle(3, 4)
      expect(a2 - a1).toBeCloseTo((3 / 4) * Math.PI * 2, 5)
    })
  })

  describe("polarToCartesian", () => {
    it("각도 0, 반지름 100 → (cx+100, cy)", () => {
      const pt = polarToCartesian(150, 150, 100, 0)
      expect(pt.x).toBeCloseTo(250, 5)
      expect(pt.y).toBeCloseTo(150, 5)
    })

    it("각도 π/2, 반지름 50 → (cx, cy+50)", () => {
      const pt = polarToCartesian(100, 100, 50, Math.PI / 2)
      expect(pt.x).toBeCloseTo(100, 3)
      expect(pt.y).toBeCloseTo(150, 3)
    })

    it("반지름 0 → 중심점", () => {
      const pt = polarToCartesian(200, 200, 0, Math.PI)
      expect(pt.x).toBeCloseTo(200, 5)
      expect(pt.y).toBeCloseTo(200, 5)
    })
  })

  describe("paradoxToColor", () => {
    it("0 → green", () => {
      expect(paradoxToColor(0)).toBe("#22C55E")
    })

    it("0.5 → yellow", () => {
      expect(paradoxToColor(0.5)).toBe("#EAB308")
    })

    it("1 → red", () => {
      expect(paradoxToColor(1)).toBe("#EF4444")
    })

    it("0.2 → green (≤0.3)", () => {
      expect(paradoxToColor(0.2)).toBe("#22C55E")
    })

    it("0.8 → red (>0.6)", () => {
      expect(paradoxToColor(0.8)).toBe("#EF4444")
    })
  })

  describe("pressureToWeights", () => {
    it("pressure=0 → l1 최대, l2/l3 최소", () => {
      const w = pressureToWeights(0)
      expect(w.l1).toBeCloseTo(1.0, 1) // (1-0)*0.7+0.3 = 1.0
      expect(w.l2).toBeCloseTo(0.15, 1) // 0*0.7*0.7+0.15 = 0.15
      expect(w.l3).toBeCloseTo(0.05, 1) // 0*0.3*0.5+0.05 = 0.05
    })

    it("pressure=1 → l1 줄고, l2/l3 늘어남", () => {
      const w = pressureToWeights(1)
      expect(w.l1).toBeLessThan(pressureToWeights(0).l1)
      expect(w.l2).toBeGreaterThan(pressureToWeights(0).l2)
      expect(w.l3).toBeGreaterThan(pressureToWeights(0).l3)
    })

    it("압력 0~1 범위 클램핑", () => {
      const wNeg = pressureToWeights(-0.5)
      const w0 = pressureToWeights(0)
      expect(wNeg.l1).toBe(w0.l1)

      const wOver = pressureToWeights(1.5)
      const w1 = pressureToWeights(1)
      expect(wOver.l1).toBe(w1.l1)
    })
  })

  describe("벡터 배열 변환", () => {
    it("l1ToArray: 7개 값", () => {
      const arr = l1ToArray(TEST_L1)
      expect(arr).toHaveLength(7)
      expect(arr[0]).toBe(0.8) // depth
      expect(arr[6]).toBe(0.7) // sociability
    })

    it("l2ToArray: 5개 값", () => {
      const arr = l2ToArray(TEST_L2)
      expect(arr).toHaveLength(5)
      expect(arr[0]).toBe(0.6) // openness
    })

    it("l3ToArray: 4개 값", () => {
      const arr = l3ToArray(TEST_L3)
      expect(arr).toHaveLength(4)
      expect(arr[3]).toBe(0.7) // growthArc
    })
  })

  describe("smoothRadarPath", () => {
    it("2개 미만 점 → M/L 경로", () => {
      const path = smoothRadarPath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ])
      expect(path).toContain("M 0.00 0.00")
      expect(path).toContain("L 10.00 10.00")
    })

    it("3개 이상 점 → C(cubic bezier) 경로", () => {
      const path = smoothRadarPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ])
      expect(path).toContain("C ")
      expect(path).toContain("Z") // 닫힌 경로
    })

    it("closed=false → Z 없음", () => {
      const path = smoothRadarPath(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        false
      )
      expect(path).not.toContain("Z")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 색상 상수
// ═══════════════════════════════════════════════════════════════

describe("색상 상수", () => {
  it("L1 색상: 7개 차원 모두 존재", () => {
    for (const key of L1_KEYS) {
      expect(L1_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("L2 색상: 5개 차원 모두 존재", () => {
    for (const key of L2_KEYS) {
      expect(L2_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("L3 색상: 4개 차원 모두 존재", () => {
    for (const key of L3_KEYS) {
      expect(L3_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("L1 레이블: 7개 모두 한글", () => {
    for (const key of L1_KEYS) {
      expect(L1_LABELS[key]).toBeTruthy()
      expect(typeof L1_LABELS[key]).toBe("string")
    }
  })

  it("L2 레이블: 5개 모두 존재", () => {
    for (const key of L2_KEYS) {
      expect(L2_LABELS[key]).toBeTruthy()
    }
  })

  it("L3 레이블: 4개 모두 존재", () => {
    for (const key of L3_KEYS) {
      expect(L3_LABELS[key]).toBeTruthy()
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 키 배열
// ═══════════════════════════════════════════════════════════════

describe("키 배열", () => {
  it("L1_KEYS: 7개", () => {
    expect(L1_KEYS).toHaveLength(7)
    expect(L1_KEYS).toContain("depth")
    expect(L1_KEYS).toContain("sociability")
  })

  it("L2_KEYS: 5개", () => {
    expect(L2_KEYS).toHaveLength(5)
    expect(L2_KEYS).toContain("openness")
    expect(L2_KEYS).toContain("neuroticism")
  })

  it("L3_KEYS: 4개", () => {
    expect(L3_KEYS).toHaveLength(4)
    expect(L3_KEYS).toContain("lack")
    expect(L3_KEYS).toContain("growthArc")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: v2→v3 호환성 래퍼
// ═══════════════════════════════════════════════════════════════

describe("AC4: v2→v3 호환성", () => {
  describe("convertV2ToL1", () => {
    it("직접 키 매핑", () => {
      const data = {
        depth: 0.9,
        lens: 0.3,
        stance: 0.5,
        scope: 0.2,
        taste: 0.4,
        purpose: 0.6,
        sociability: 0.7,
      }
      const l1 = convertV2ToL1(data)
      expect(l1.depth).toBe(0.9)
      expect(l1.lens).toBe(0.3)
      expect(l1.sociability).toBe(0.7)
    })

    it("별칭 키 매핑", () => {
      const data = { analysisDepth: 0.8, judgmentLens: 0.4 }
      const l1 = convertV2ToL1(data)
      expect(l1.depth).toBe(0.8)
      expect(l1.lens).toBe(0.4)
    })

    it("누락된 키 → 기본값 0.5", () => {
      const data = { depth: 0.9 }
      const l1 = convertV2ToL1(data)
      expect(l1.depth).toBe(0.9)
      expect(l1.lens).toBe(0.5) // 기본값
      expect(l1.sociability).toBe(0.5)
    })

    it("0~1 범위 클램핑", () => {
      const data = { depth: 1.5, lens: -0.3 }
      const l1 = convertV2ToL1(data)
      expect(l1.depth).toBe(1)
      expect(l1.lens).toBe(0)
    })

    it("알 수 없는 키 무시", () => {
      const data = { unknown: 0.9, depth: 0.3 }
      const l1 = convertV2ToL1(data)
      expect(l1.depth).toBe(0.3)
      // unknown은 무시됨
    })

    it("빈 객체 → 모두 기본값", () => {
      const l1 = convertV2ToL1({})
      expect(l1.depth).toBe(0.5)
      expect(l1.lens).toBe(0.5)
      expect(l1.stance).toBe(0.5)
      expect(l1.scope).toBe(0.5)
      expect(l1.taste).toBe(0.5)
      expect(l1.purpose).toBe(0.5)
      expect(l1.sociability).toBe(0.5)
    })
  })
})
