// ═══════════════════════════════════════════════════════════════
// T162: 구조화 필드 자동생성 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  inferBirthDate,
  inferAgeRange,
  inferRegion,
  expandActiveHours,
  expandPeakHours,
  generateStructuredFields,
} from "@/lib/persona-generation/structured-fields"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── Fixtures ────────────────────────────────────────────────

const MATURE_L1: SocialPersonaVector = {
  depth: 0.85,
  lens: 0.8,
  stance: 0.7,
  scope: 0.75,
  taste: 0.2,
  purpose: 0.85,
  sociability: 0.3,
}
const MATURE_L2: CoreTemperamentVector = {
  openness: 0.4,
  conscientiousness: 0.85,
  extraversion: 0.3,
  agreeableness: 0.5,
  neuroticism: 0.4,
}

const YOUNG_L1: SocialPersonaVector = {
  depth: 0.3,
  lens: 0.3,
  stance: 0.3,
  scope: 0.4,
  taste: 0.9,
  purpose: 0.2,
  sociability: 0.85,
}
const YOUNG_L2: CoreTemperamentVector = {
  openness: 0.85,
  conscientiousness: 0.2,
  extraversion: 0.8,
  agreeableness: 0.7,
  neuroticism: 0.3,
}

const DEFAULT_L3: NarrativeDriveVector = {
  lack: 0.5,
  moralCompass: 0.5,
  volatility: 0.4,
  growthArc: 0.5,
}

// ═══════════════════════════════════════════════════════════════
// AC1: birthDate 추론
// ═══════════════════════════════════════════════════════════════

describe("T162-AC1: birthDate 추론", () => {
  it("inferAgeRange — 성숙 벡터(높은 purpose/conscientiousness)는 높은 나이대", () => {
    const [min, max] = inferAgeRange(MATURE_L1, MATURE_L2)
    expect(min).toBeGreaterThanOrEqual(32)
    expect(max).toBeLessThanOrEqual(52)
  })

  it("inferAgeRange — 젊은 벡터(높은 taste/openness)는 낮은 나이대", () => {
    const [min, max] = inferAgeRange(YOUNG_L1, YOUNG_L2)
    expect(min).toBeLessThanOrEqual(25)
    expect(max).toBeLessThanOrEqual(33)
  })

  it("inferBirthDate — 유효한 Date 객체 반환", () => {
    const date = inferBirthDate(MATURE_L1, MATURE_L2)
    expect(date).toBeInstanceOf(Date)
    expect(date.getFullYear()).toBeGreaterThan(1970)
    expect(date.getFullYear()).toBeLessThanOrEqual(new Date().getFullYear())
  })

  it("inferBirthDate — 나이가 추론된 범위 내에 있어야 함", () => {
    const [minAge, maxAge] = inferAgeRange(MATURE_L1, MATURE_L2)
    const date = inferBirthDate(MATURE_L1, MATURE_L2)
    const now = new Date()
    const age = now.getFullYear() - date.getFullYear()
    expect(age).toBeGreaterThanOrEqual(minAge)
    expect(age).toBeLessThanOrEqual(maxAge + 1) // +1 for month boundary
  })

  it("inferBirthDate — 월은 0~11, 일은 1~28 범위", () => {
    for (let i = 0; i < 20; i++) {
      const date = inferBirthDate(YOUNG_L1, YOUNG_L2)
      expect(date.getMonth()).toBeGreaterThanOrEqual(0)
      expect(date.getMonth()).toBeLessThanOrEqual(11)
      expect(date.getDate()).toBeGreaterThanOrEqual(1)
      expect(date.getDate()).toBeLessThanOrEqual(28)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: region 자동 매핑
// ═══════════════════════════════════════════════════════════════

describe("T162-AC2: region 자동 매핑", () => {
  it("inferRegion — 비어있지 않은 문자열 반환", () => {
    const region = inferRegion(MATURE_L1, MATURE_L2)
    expect(region).toBeTruthy()
    expect(typeof region).toBe("string")
  })

  it("inferRegion — 높은 sociability/extraversion → 대도시 지역", () => {
    const socialL1 = { ...YOUNG_L1, sociability: 0.9 }
    const socialL2 = { ...YOUNG_L2, extraversion: 0.9 }
    const metro = [
      "서울 강남",
      "서울 마포",
      "부산 해운대",
      "Tokyo, Shibuya",
      "Tokyo, Minato",
      "Osaka, Umeda",
      "New York, Manhattan",
      "London, Soho",
      "Shanghai, Pudong",
      "Singapore, Central",
      "Sydney, CBD",
    ]

    // 10번 생성, 절반 이상이 대도시여야 함
    let metroCount = 0
    for (let i = 0; i < 20; i++) {
      const region = inferRegion(socialL1, socialL2)
      if (metro.includes(region)) metroCount++
    }
    expect(metroCount).toBeGreaterThan(5)
  })

  it("inferRegion — 높은 conscientiousness/purpose → 계획도시 지역", () => {
    const plannedL1 = { ...MATURE_L1, purpose: 0.9, taste: 0.1, sociability: 0.2, depth: 0.3 }
    const plannedL2 = { ...MATURE_L2, conscientiousness: 0.95, extraversion: 0.2, openness: 0.2 }
    const planned = [
      "세종",
      "성남 분당",
      "대전 유성",
      "Singapore, Jurong",
      "Dubai, Downtown",
      "Zurich",
      "Copenhagen",
      "Helsinki",
      "Canberra",
      "Abu Dhabi",
      "Songdo, Incheon",
    ]

    let plannedCount = 0
    for (let i = 0; i < 20; i++) {
      const region = inferRegion(plannedL1, plannedL2)
      if (planned.includes(region)) plannedCount++
    }
    expect(plannedCount).toBeGreaterThan(5)
  })

  it("inferRegion — 다양한 지역 생성 (동일 입력 반복 시)", () => {
    const regions = new Set<string>()
    for (let i = 0; i < 30; i++) {
      regions.add(inferRegion(MATURE_L1, MATURE_L2))
    }
    // 같은 풀에서 최소 2개 이상 지역이 나와야 함
    expect(regions.size).toBeGreaterThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: activeHours / peakHours 배열 생성
// ═══════════════════════════════════════════════════════════════

describe("T162-AC3: activeHours/peakHours 배열", () => {
  it("expandActiveHours([8, 22]) — 같은 날 범위", () => {
    const hours = expandActiveHours([8, 22])
    expect(hours).toEqual([8, 10, 12, 14, 16, 18, 20, 22])
  })

  it("expandActiveHours([12, 2]) — 자정 넘김", () => {
    const hours = expandActiveHours([12, 2])
    expect(hours).toEqual([12, 14, 16, 18, 20, 22, 0, 2])
  })

  it("expandPeakHours([21, 1]) — 자정 넘김", () => {
    const hours = expandPeakHours([21, 1])
    expect(hours).toEqual([21, 22, 23, 0, 1])
  })

  it("expandPeakHours([19, 23]) — 같은 날", () => {
    const hours = expandPeakHours([19, 23])
    expect(hours).toEqual([19, 20, 21, 22, 23])
  })

  it("expandPeakHours([22, 2]) — 자정 넘김", () => {
    const hours = expandPeakHours([22, 2])
    expect(hours).toEqual([22, 23, 0, 1, 2])
  })

  it("모든 반환 값은 0~23 범위의 정수", () => {
    const active = expandActiveHours([12, 2])
    const peak = expandPeakHours([22, 2])
    for (const h of [...active, ...peak]) {
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(23)
      expect(Number.isInteger(h)).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합: generateStructuredFields
// ═══════════════════════════════════════════════════════════════

describe("T162: generateStructuredFields 통합", () => {
  it("모든 필드가 올바른 타입으로 반환되어야 함", () => {
    const fields = generateStructuredFields(MATURE_L1, MATURE_L2, DEFAULT_L3, [8, 22], [21, 1])

    expect(fields.birthDate).toBeInstanceOf(Date)
    expect(typeof fields.region).toBe("string")
    expect(fields.region.length).toBeGreaterThan(0)
    expect(Array.isArray(fields.activeHours)).toBe(true)
    expect(fields.activeHours.length).toBeGreaterThan(0)
    expect(Array.isArray(fields.peakHours)).toBe(true)
    expect(fields.peakHours.length).toBeGreaterThan(0)
    expect(typeof fields.timezone).toBe("string")
    expect(fields.timezone.length).toBeGreaterThan(0)
  })

  it("activeHours와 peakHours는 입력 범위에 기반해야 함", () => {
    const fields = generateStructuredFields(
      YOUNG_L1,
      YOUNG_L2,
      DEFAULT_L3,
      [12, 2], // 저녁형
      [22, 2] // 심야 피크
    )

    expect(fields.activeHours).toContain(12)
    expect(fields.activeHours).toContain(0) // 자정 넘김
    expect(fields.peakHours).toContain(22)
    expect(fields.peakHours).toContain(0) // 자정 넘김
  })
})
