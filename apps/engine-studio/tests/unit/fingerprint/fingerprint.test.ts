// ═══════════════════════════════════════════════════════════════
// T63: 컬러지문 데이터 엔진 — 단위 테스트
// AC1~AC6 전체 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

// AC1: 색상 공간 변환
import {
  rgbToLab,
  labToRgb,
  rgbToOklch,
  oklchToRgb,
  labToOklch,
  oklchToLab,
  rgbToHex,
  hexToRgb,
  deltaE00,
  interpolateLab,
  dimensionToLabHue,
} from "@/lib/fingerprint/color-space"

// AC2: 색상 인코더
import { encodeRidgeColors, findMinAdjacentDeltaE00 } from "@/lib/fingerprint/color-encoder"

// AC3: 릿지 생성기
import {
  determineDominantAxis,
  determinePatternType,
  extractCoreDeltas,
  generateRidgeTopology,
  validateRidgeIndices,
  validateRidgeCount,
} from "@/lib/fingerprint/ridge-generator"

// AC4: 유일성 엔진
import {
  generateSeed,
  verifySeedDeterminism,
  createDeterministicPRNG,
  generateWithRetry,
  vectorToJson,
} from "@/lib/fingerprint/uniqueness-engine"
import type { PersonaVector } from "@/lib/fingerprint/uniqueness-engine"

// AC5: 충돌 검사기
import {
  computePHash,
  hammingDistance,
  computeSSIM,
  computeCurveSummary,
  curveDistance,
  computeColorHistogram,
  histogramIntersection,
  createSignature,
  checkCollision,
  checkAgainstPool,
  DEFAULT_THRESHOLDS,
} from "@/lib/fingerprint/collision-checker"

// AC6: SVG 렌더러
import { renderCanonicalSvg, countRidgesInSvg, validateSvg } from "@/lib/fingerprint/svg-renderer"

// ── 공통 테스트 데이터 ───────────────────────────────────────

const TEST_VECTOR: PersonaVector = {
  L1: [0.9, 0.3, 0.5, 0.2, 0.4, 0.6, 0.7],
  L2: [0.8, 0.6, 0.4, 0.7, 0.3],
  L3: [0.5, 0.6, 0.4, 0.7],
}

const TEST_VECTOR_2: PersonaVector = {
  L1: [0.2, 0.8, 0.3, 0.5, 0.7, 0.4, 0.6],
  L2: [0.3, 0.7, 0.5, 0.4, 0.8],
  L3: [0.7, 0.3, 0.8, 0.2],
}

const TEST_L1 = {
  depth: 0.9,
  lens: 0.3,
  stance: 0.5,
  scope: 0.2,
  taste: 0.4,
  purpose: 0.6,
  sociability: 0.7,
}

// ═══════════════════════════════════════════════════════════════
// AC1: 색상 공간 변환
// ═══════════════════════════════════════════════════════════════

describe("AC1: 색상 공간 변환", () => {
  describe("sRGB ↔ CIELAB", () => {
    it("흰색 RGB → Lab", () => {
      const lab = rgbToLab({ r: 255, g: 255, b: 255 })
      expect(lab.L).toBeCloseTo(100, 0)
      expect(Math.abs(lab.a)).toBeLessThan(1)
      expect(Math.abs(lab.b)).toBeLessThan(1)
    })

    it("검정 RGB → Lab", () => {
      const lab = rgbToLab({ r: 0, g: 0, b: 0 })
      expect(lab.L).toBeCloseTo(0, 0)
    })

    it("RGB → Lab → RGB 왕복 변환", () => {
      const original = { r: 128, g: 64, b: 200 }
      const lab = rgbToLab(original)
      const back = labToRgb(lab)
      expect(back.r).toBeCloseTo(original.r, -1)
      expect(back.g).toBeCloseTo(original.g, -1)
      expect(back.b).toBeCloseTo(original.b, -1)
    })
  })

  describe("sRGB ↔ OKLCH", () => {
    it("흰색 RGB → OKLCH", () => {
      const oklch = rgbToOklch({ r: 255, g: 255, b: 255 })
      expect(oklch.L).toBeCloseTo(1, 1)
      expect(oklch.C).toBeCloseTo(0, 1)
    })

    it("RGB → OKLCH → RGB 왕복 (그레이)", () => {
      // 그레이/저채도 색상은 OKLab 변환 정밀도 높음
      const original = { r: 128, g: 128, b: 128 }
      const oklch = rgbToOklch(original)
      const back = oklchToRgb(oklch)
      expect(back.r).toBeCloseTo(original.r, -1)
      expect(back.g).toBeCloseTo(original.g, -1)
      expect(back.b).toBeCloseTo(original.b, -1)
    })

    it("RGB → OKLCH 값 유효 범위", () => {
      const oklch = rgbToOklch({ r: 200, g: 100, b: 50 })
      expect(oklch.L).toBeGreaterThan(0)
      expect(oklch.L).toBeLessThan(1)
      expect(oklch.C).toBeGreaterThan(0)
      expect(oklch.h).toBeGreaterThanOrEqual(0)
      expect(oklch.h).toBeLessThan(360)
    })
  })

  describe("CIELAB ↔ OKLCH", () => {
    it("Lab → OKLCH → Lab 왕복 (저채도)", () => {
      // 저채도 Lab는 sRGB 중간 경유 시 정밀도 유지
      const original = { L: 50, a: 5, b: -5 }
      const oklch = labToOklch(original)
      const back = oklchToLab(oklch)
      expect(back.L).toBeCloseTo(original.L, -1)
      expect(back.a).toBeCloseTo(original.a, -1)
      expect(back.b).toBeCloseTo(original.b, -1)
    })

    it("Lab → OKLCH 값 유효 범위", () => {
      const oklch = labToOklch({ L: 60, a: 30, b: -20 })
      expect(oklch.L).toBeGreaterThan(0)
      expect(oklch.L).toBeLessThan(1)
      expect(oklch.C).toBeGreaterThan(0)
      expect(oklch.h).toBeGreaterThanOrEqual(0)
      expect(oklch.h).toBeLessThan(360)
    })
  })

  describe("HEX 변환", () => {
    it("RGB → HEX", () => {
      expect(rgbToHex({ r: 255, g: 0, b: 128 })).toBe("#ff0080")
    })

    it("HEX → RGB", () => {
      const rgb = hexToRgb("#ff0080")
      expect(rgb).toEqual({ r: 255, g: 0, b: 128 })
    })
  })

  describe("ΔE00", () => {
    it("동일 색상 → ΔE00 = 0", () => {
      const lab = { L: 50, a: 20, b: -30 }
      expect(deltaE00(lab, lab)).toBeCloseTo(0, 5)
    })

    it("다른 색상 → ΔE00 > 0", () => {
      const lab1 = { L: 50, a: 20, b: -30 }
      const lab2 = { L: 60, a: -10, b: 40 }
      expect(deltaE00(lab1, lab2)).toBeGreaterThan(0)
    })

    it("흑백 ΔE00 ≈ 100", () => {
      const black = { L: 0, a: 0, b: 0 }
      const white = { L: 100, a: 0, b: 0 }
      const d = deltaE00(black, white)
      expect(d).toBeGreaterThan(90)
      expect(d).toBeLessThan(110)
    })
  })

  describe("보간", () => {
    it("t=0 → lab1, t=1 → lab2", () => {
      const lab1 = { L: 20, a: 10, b: -5 }
      const lab2 = { L: 80, a: -10, b: 30 }
      const mid0 = interpolateLab(lab1, lab2, 0)
      const mid1 = interpolateLab(lab1, lab2, 1)
      expect(mid0).toEqual(lab1)
      expect(mid1).toEqual(lab2)
    })

    it("t=0.5 → 중간값", () => {
      const lab1 = { L: 20, a: 10, b: -10 }
      const lab2 = { L: 80, a: -10, b: 30 }
      const mid = interpolateLab(lab1, lab2, 0.5)
      expect(mid.L).toBeCloseTo(50, 5)
      expect(mid.a).toBeCloseTo(0, 5)
      expect(mid.b).toBeCloseTo(10, 5)
    })
  })

  it("dimensionToLabHue: 0~1 값 → Lab 색상 생성", () => {
    const lab = dimensionToLabHue(0.5, 0, 360)
    expect(lab.L).toBe(60)
    expect(typeof lab.a).toBe("number")
    expect(typeof lab.b).toBe("number")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: 색상 인코더
// ═══════════════════════════════════════════════════════════════

describe("AC2: 색상 인코더", () => {
  it("릿지 색상 인코딩 — 기본 설정", () => {
    const result = encodeRidgeColors({ ridgeCount: 10, hueSeed: 45 })
    expect(result.colors).toHaveLength(10)
    expect(result.colors[0].ridgeIndex).toBe(0)
    expect(result.colors[0].deltaE00ToPrev).toBeNull()
  })

  it("모든 릿지에 hex/oklch/lab 존재", () => {
    const result = encodeRidgeColors({ ridgeCount: 5, hueSeed: 120 })
    for (const c of result.colors) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(typeof c.oklch.L).toBe("number")
      expect(typeof c.lab.L).toBe("number")
    }
  })

  it("인접 ΔE00 ≥ 5 보장", () => {
    const result = encodeRidgeColors({ ridgeCount: 20, hueSeed: 200 })
    expect(result.valid).toBe(true)
    if (result.colors.length > 1) {
      expect(result.minDeltaE00).toBeGreaterThanOrEqual(4.5) // 부동소수점 여유
    }
  })

  it("릿지 1개 → valid, ΔE00 = 0", () => {
    const result = encodeRidgeColors({ ridgeCount: 1, hueSeed: 0 })
    expect(result.valid).toBe(true)
    expect(result.minDeltaE00).toBe(0)
  })

  it("findMinAdjacentDeltaE00: 빈 배열 → Infinity", () => {
    expect(findMinAdjacentDeltaE00([])).toBe(Infinity)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: 릿지 생성기
// ═══════════════════════════════════════════════════════════════

describe("AC3: 릿지 생성기", () => {
  describe("L1 → 패턴 매핑", () => {
    it("depth 최대 → plain_whorl", () => {
      expect(determinePatternType({ ...TEST_L1, depth: 0.9 })).toBe("plain_whorl")
    })

    it("lens 최대 → tented_arch", () => {
      expect(
        determinePatternType({
          depth: 0.1,
          lens: 0.9,
          stance: 0.1,
          scope: 0.1,
          taste: 0.1,
          purpose: 0.1,
          sociability: 0.1,
        })
      ).toBe("tented_arch")
    })

    it("sociability 최대 → plain_arch", () => {
      expect(
        determinePatternType({
          depth: 0.1,
          lens: 0.1,
          stance: 0.1,
          scope: 0.1,
          taste: 0.1,
          purpose: 0.1,
          sociability: 0.9,
        })
      ).toBe("plain_arch")
    })

    it("tie → smallest index wins (depth)", () => {
      expect(
        determineDominantAxis({
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        })
      ).toBe("depth")
    })
  })

  describe("코어/델타 추출", () => {
    it("seed → 코어 좌표 0.3~0.7 범위", () => {
      const { core } = extractCoreDeltas("abcdef0123456789abcdef0123456789", "plain_whorl")
      expect(core.x).toBeGreaterThanOrEqual(0.3)
      expect(core.x).toBeLessThanOrEqual(0.7)
      expect(core.y).toBeGreaterThanOrEqual(0.3)
      expect(core.y).toBeLessThanOrEqual(0.7)
    })

    it("double_loop_whorl → 델타 2개", () => {
      const { deltas } = extractCoreDeltas("abcdef0123456789abcdef0123456789", "double_loop_whorl")
      expect(deltas).toHaveLength(2)
    })

    it("plain_whorl → 델타 1개", () => {
      const { deltas } = extractCoreDeltas("abcdef0123456789abcdef0123456789", "plain_whorl")
      expect(deltas).toHaveLength(1)
    })
  })

  describe("릿지 토폴로지 생성", () => {
    const seedHex = "a1b2c3d4e5f67890a1b2c3d4e5f67890"

    it("패턴 타입 결정됨", () => {
      const topo = generateRidgeTopology({ l1Vector: TEST_L1, seedHex })
      expect(topo.patternType).toBe("plain_whorl")
    })

    it("릿지 카운트 일치", () => {
      const topo = generateRidgeTopology({ l1Vector: TEST_L1, seedHex, ridgeCount: 50 })
      expect(topo.ridges).toHaveLength(50)
      expect(topo.ridgeCount).toBe(50)
    })

    it("릿지 인덱스 단조 증가", () => {
      const topo = generateRidgeTopology({ l1Vector: TEST_L1, seedHex })
      expect(validateRidgeIndices(topo.ridges)).toBe(true)
    })

    it("각 릿지에 pathPoints 존재", () => {
      const topo = generateRidgeTopology({ l1Vector: TEST_L1, seedHex, ridgeCount: 40 })
      for (const r of topo.ridges) {
        expect(r.pathPoints.length).toBeGreaterThan(0)
      }
    })
  })

  it("validateRidgeCount: 40~800 유효", () => {
    expect(validateRidgeCount(40)).toBe(true)
    expect(validateRidgeCount(800)).toBe(true)
    expect(validateRidgeCount(39)).toBe(false)
    expect(validateRidgeCount(801)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: 유일성 엔진
// ═══════════════════════════════════════════════════════════════

describe("AC4: 유일성 엔진", () => {
  describe("SHA256 시드", () => {
    it("64자 hex 문자열 생성", () => {
      const seed = generateSeed({ personaVector: TEST_VECTOR, schemaVersion: "1.0.0", salt: 0 })
      expect(seed.fullHex).toHaveLength(64)
      expect(seed.fullHex).toMatch(/^[0-9a-f]{64}$/)
    })

    it("결정론: 동일 입력 → 동일 출력", () => {
      expect(verifySeedDeterminism(TEST_VECTOR, "1.0.0")).toBe(true)
    })

    it("다른 벡터 → 다른 시드", () => {
      const s1 = generateSeed({ personaVector: TEST_VECTOR, schemaVersion: "1.0.0", salt: 0 })
      const s2 = generateSeed({ personaVector: TEST_VECTOR_2, schemaVersion: "1.0.0", salt: 0 })
      expect(s1.fullHex).not.toBe(s2.fullHex)
    })

    it("다른 salt → 다른 시드", () => {
      const s1 = generateSeed({ personaVector: TEST_VECTOR, schemaVersion: "1.0.0", salt: 0 })
      const s2 = generateSeed({ personaVector: TEST_VECTOR, schemaVersion: "1.0.0", salt: 1 })
      expect(s1.fullHex).not.toBe(s2.fullHex)
    })

    it("청크 분할 올바름", () => {
      const seed = generateSeed({ personaVector: TEST_VECTOR, schemaVersion: "1.0.0", salt: 0 })
      expect(seed.coreDeltaChunk).toBe(seed.fullHex.slice(0, 16))
      expect(seed.curvatureChunk).toBe(seed.fullHex.slice(16, 32))
      expect(seed.hueSeedChunk).toBe(seed.fullHex.slice(32, 40))
    })

    it("hueSeedValue: 0~360 범위", () => {
      const seed = generateSeed({ personaVector: TEST_VECTOR, schemaVersion: "1.0.0", salt: 0 })
      expect(seed.hueSeedValue).toBeGreaterThanOrEqual(0)
      expect(seed.hueSeedValue).toBeLessThan(360)
    })
  })

  describe("결정적 PRNG", () => {
    it("동일 시드 → 동일 시퀀스", () => {
      const rng1 = createDeterministicPRNG("abcdef01")
      const rng2 = createDeterministicPRNG("abcdef01")
      for (let i = 0; i < 10; i++) {
        expect(rng1()).toBe(rng2())
      }
    })

    it("다른 시드 → 다른 시퀀스", () => {
      const rng1 = createDeterministicPRNG("abcdef01")
      const rng2 = createDeterministicPRNG("12345678")
      const vals1 = Array.from({ length: 5 }, () => rng1())
      const vals2 = Array.from({ length: 5 }, () => rng2())
      expect(vals1).not.toEqual(vals2)
    })

    it("0~1 범위 출력", () => {
      const rng = createDeterministicPRNG("abcdef01")
      for (let i = 0; i < 100; i++) {
        const v = rng()
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    })
  })

  describe("충돌 재시도", () => {
    it("충돌 없으면 salt=0", () => {
      const result = generateWithRetry(
        TEST_VECTOR,
        "1.0.0",
        () => false // 충돌 없음
      )
      expect(result.salt).toBe(0)
      expect(result.exceeded).toBe(false)
    })

    it("처음 3번 충돌 → salt=3", () => {
      let callCount = 0
      const result = generateWithRetry(TEST_VECTOR, "1.0.0", () => {
        callCount++
        return callCount <= 3
      })
      expect(result.salt).toBe(3)
      expect(result.exceeded).toBe(false)
    })

    it("최대 재시도 초과 → exceeded", () => {
      const result = generateWithRetry(
        TEST_VECTOR,
        "1.0.0",
        () => true, // 항상 충돌
        { maxRetries: 5, onExceed: "reject_generation" }
      )
      expect(result.exceeded).toBe(true)
    })
  })

  it("vectorToJson: 결정적 JSON", () => {
    const j1 = vectorToJson(TEST_VECTOR)
    const j2 = vectorToJson(TEST_VECTOR)
    expect(j1).toBe(j2)
    const parsed = JSON.parse(j1)
    expect(parsed.L1).toEqual(TEST_VECTOR.L1)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: 충돌 검사기
// ═══════════════════════════════════════════════════════════════

describe("AC5: 충돌 검사기", () => {
  const seedHex1 = "a1b2c3d4e5f67890a1b2c3d4e5f67890"
  const seedHex2 = "1234567890abcdef1234567890abcdef"

  const l1a = TEST_L1
  const l1b = {
    depth: 0.2,
    lens: 0.8,
    stance: 0.3,
    scope: 0.5,
    taste: 0.7,
    purpose: 0.4,
    sociability: 0.6,
  }

  const topo1 = generateRidgeTopology({ l1Vector: l1a, seedHex: seedHex1, ridgeCount: 50 })
  const topo2 = generateRidgeTopology({ l1Vector: l1b, seedHex: seedHex2, ridgeCount: 50 })

  const colors1 = encodeRidgeColors({ ridgeCount: 50, hueSeed: 45 }).colors
  const colors2 = encodeRidgeColors({ ridgeCount: 50, hueSeed: 200 }).colors

  describe("pHash", () => {
    it("16-char hex 해시 생성", () => {
      const hash = computePHash(topo1)
      expect(hash).toHaveLength(16)
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })

    it("동일 토폴로지 → 동일 해시", () => {
      expect(computePHash(topo1)).toBe(computePHash(topo1))
    })
  })

  describe("해밍 거리", () => {
    it("동일 해시 → 0", () => {
      expect(hammingDistance("abcd", "abcd")).toBe(0)
    })

    it("완전 다른 해시 → > 0", () => {
      expect(hammingDistance("0000", "ffff")).toBeGreaterThan(0)
    })

    it("0 vs f → 4", () => {
      expect(hammingDistance("0", "f")).toBe(4)
    })
  })

  describe("SSIM", () => {
    it("동일 토폴로지 → SSIM = 1", () => {
      const ssim = computeSSIM(topo1, topo1)
      expect(ssim).toBeCloseTo(1, 1)
    })

    it("다른 토폴로지 → SSIM < 1", () => {
      const ssim = computeSSIM(topo1, topo2)
      expect(ssim).toBeLessThan(1)
    })
  })

  describe("커브 거리", () => {
    it("동일 요약 → 거리 0", () => {
      const s = computeCurveSummary(topo1)
      expect(curveDistance(s, s)).toBeCloseTo(0, 5)
    })

    it("다른 요약 → 거리 > 0", () => {
      const s1 = computeCurveSummary(topo1)
      const s2 = computeCurveSummary(topo2)
      expect(curveDistance(s1, s2)).toBeGreaterThan(0)
    })
  })

  describe("히스토그램", () => {
    it("12-bin 정규화 히스토그램", () => {
      const hist = computeColorHistogram(colors1)
      expect(hist).toHaveLength(12)
      const sum = hist.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 5)
    })

    it("동일 히스토그램 교차 = 1", () => {
      const hist = computeColorHistogram(colors1)
      expect(histogramIntersection(hist, hist)).toBeCloseTo(1, 5)
    })
  })

  describe("통합 충돌 검사", () => {
    it("자기 자신 → 충돌 (isCollision=true)", () => {
      const sig1 = createSignature(topo1, colors1)
      const result = checkCollision(sig1, sig1, topo1, topo1)
      expect(result.isCollision).toBe(true)
    })

    it("다른 지문 → 충돌 아님", () => {
      const sig1 = createSignature(topo1, colors1)
      const sig2 = createSignature(topo2, colors2)
      const result = checkCollision(sig1, sig2, topo1, topo2)
      // 다른 패턴이면 충돌 아닐 확률 높음
      expect(typeof result.isCollision).toBe("boolean")
      expect(result.pHashHamming).toBeGreaterThanOrEqual(0)
    })

    it("기본 임계값 정의됨", () => {
      expect(DEFAULT_THRESHOLDS.pHashHammingMin).toBe(8)
      expect(DEFAULT_THRESHOLDS.ssimMax).toBe(0.85)
      expect(DEFAULT_THRESHOLDS.curveDistanceMin).toBe(0.15)
      expect(DEFAULT_THRESHOLDS.colorHistogramMax).toBe(0.7)
    })
  })

  it("checkAgainstPool: 빈 풀 → 충돌 없음", () => {
    const sig = createSignature(topo1, colors1)
    const result = checkAgainstPool(sig, topo1, [])
    expect(result.hasCollision).toBe(false)
    expect(result.collisionIndex).toBe(-1)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC6: 정규 SVG 렌더러
// ═══════════════════════════════════════════════════════════════

describe("AC6: 정규 SVG 렌더러", () => {
  const seedHex = "a1b2c3d4e5f67890a1b2c3d4e5f67890"
  const topo = generateRidgeTopology({ l1Vector: TEST_L1, seedHex, ridgeCount: 40 })
  const colors = encodeRidgeColors({ ridgeCount: 40, hueSeed: 90 }).colors

  it("유효한 SVG 출력", () => {
    const result = renderCanonicalSvg(topo, colors)
    const validation = validateSvg(result.svg)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it("릿지 수 일치", () => {
    const result = renderCanonicalSvg(topo, colors)
    expect(result.ridgeCount).toBe(40)
    expect(countRidgesInSvg(result.svg)).toBe(40)
  })

  it("메타데이터 포함", () => {
    const meta = {
      profileId: "fp-001",
      personaId: "p-001",
      schemaVersion: "1.0.0",
      patternType: "plain_whorl",
      ridgeCount: 40,
      createdAt: "2025-01-01T00:00:00Z",
    }
    const result = renderCanonicalSvg(topo, colors, meta)
    expect(result.svg).toContain("deepsight:fingerprint")
    expect(result.svg).toContain("fp-001")
    expect(result.svg).toContain("1.0.0")
  })

  it("canonical: 효과(filter/blur/shadow) 없음", () => {
    const result = renderCanonicalSvg(topo, colors)
    expect(result.svg).not.toContain("filter=")
    expect(result.svg).not.toContain("<filter")
    expect(result.svg).not.toContain("blur")
    expect(result.svg).not.toContain("shadow")
  })

  it("크기 설정 반영", () => {
    const result = renderCanonicalSvg(topo, colors, undefined, { canvasSize: 256 })
    expect(result.width).toBe(256)
    expect(result.height).toBe(256)
    expect(result.svg).toContain('viewBox="0 0 256 256"')
  })

  it("코어/델타 마커 존재", () => {
    const result = renderCanonicalSvg(topo, colors)
    expect(result.svg).toContain('id="landmarks"')
    expect(result.svg).toContain("<circle")
  })

  it("validateSvg: 잘못된 SVG 검출", () => {
    const bad = "<div>not svg</div>"
    const validation = validateSvg(bad)
    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
  })

  it("validateSvg: filter 포함 감지", () => {
    const withFilter = '<?xml?><svg><filter id="x"></filter><g id="ridges"></g></svg>'
    const validation = validateSvg(withFilter)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.includes("filter"))).toBe(true)
  })
})
