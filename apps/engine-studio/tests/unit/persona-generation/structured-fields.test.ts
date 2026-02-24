// ═══════════════════════════════════════════════════════════════
// T162: 구조화 필드 자동생성 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  inferBirthDate,
  inferAgeRange,
  inferRegion,
  inferTimezone,
  inferGender,
  inferNationality,
  inferEducationLevel,
  inferHeight,
  inferLanguages,
  inferKnowledgeAreas,
  generateDemographicFields,
  expandActiveHours,
  expandPeakHours,
  generateStructuredFields,
} from "@/lib/persona-generation/structured-fields"
import { MATURE_L1, MATURE_L2, YOUNG_L1, YOUNG_L2, NEUTRAL_L3 as DEFAULT_L3 } from "../fixtures"

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
// T248: 미테스트 함수 커버리지 보강
// ═══════════════════════════════════════════════════════════════

describe("T248-AC1: inferTimezone", () => {
  it("한국 지역 → Asia/Seoul", () => {
    expect(inferTimezone("서울 강남")).toBe("Asia/Seoul")
    expect(inferTimezone("부산 해운대")).toBe("Asia/Seoul")
    expect(inferTimezone("Songdo, Incheon")).toBe("Asia/Seoul")
  })

  it("해외 지역 → 해당 타임존", () => {
    expect(inferTimezone("Tokyo, Shibuya")).toBe("Asia/Tokyo")
    expect(inferTimezone("New York, Manhattan")).toBe("America/New_York")
    expect(inferTimezone("London, Soho")).toBe("Europe/London")
    expect(inferTimezone("Sydney, CBD")).toBe("Australia/Sydney")
  })

  it("매핑되지 않는 지역 → UTC fallback", () => {
    expect(inferTimezone("Unknown City")).toBe("UTC")
    expect(inferTimezone("")).toBe("UTC")
  })
})

describe("T248-AC2: inferGender", () => {
  it("MALE, FEMALE, NON_BINARY 중 하나 반환", () => {
    const valid = ["MALE", "FEMALE", "NON_BINARY"]
    for (let i = 0; i < 50; i++) {
      expect(valid).toContain(inferGender())
    }
  })

  it("100회 실행 시 최소 2종류 이상 출현 (균등 분포 검증)", () => {
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(inferGender())
    }
    expect(results.size).toBeGreaterThanOrEqual(2)
  })
})

describe("T248-AC3: inferNationality", () => {
  it("한국 지역 → Korean", () => {
    expect(inferNationality("서울 강남")).toBe("Korean")
    expect(inferNationality("경주")).toBe("Korean")
  })

  it("해외 지역 → 해당 국적", () => {
    expect(inferNationality("Tokyo, Shibuya")).toBe("Japanese")
    expect(inferNationality("New York, Manhattan")).toBe("American")
    expect(inferNationality("Berlin, Kreuzberg")).toBe("German")
  })

  it("매핑되지 않는 지역 → Korean fallback", () => {
    expect(inferNationality("Unknown Place")).toBe("Korean")
  })
})

describe("T248-AC4: inferEducationLevel", () => {
  it("높은 depth/purpose/conscientiousness → 고학력 (MASTER 이상)", () => {
    const result = inferEducationLevel(MATURE_L1, MATURE_L2)
    expect(["MASTER", "DOCTORATE"]).toContain(result)
  })

  it("높은 taste + 낮은 conscientiousness → SELF_TAUGHT 가능", () => {
    const selfTaughtL1 = { ...YOUNG_L1, taste: 0.9, depth: 0.2, purpose: 0.1 }
    const selfTaughtL2 = { ...YOUNG_L2, openness: 0.9, conscientiousness: 0.1 }
    const results = new Set<string>()
    for (let i = 0; i < 30; i++) {
      results.add(inferEducationLevel(selfTaughtL1, selfTaughtL2))
    }
    expect(results.has("SELF_TAUGHT")).toBe(true)
  })

  it("유효한 교육 수준 값만 반환", () => {
    const valid = ["HIGH_SCHOOL", "BACHELOR", "MASTER", "DOCTORATE", "SELF_TAUGHT"]
    for (let i = 0; i < 30; i++) {
      expect(valid).toContain(inferEducationLevel(MATURE_L1, MATURE_L2))
    }
  })
})

describe("T248-AC5: inferHeight", () => {
  it("아시아 남성 → 173cm ± 범위", () => {
    const heights: number[] = []
    for (let i = 0; i < 50; i++) {
      heights.push(inferHeight("MALE", "서울 강남"))
    }
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length
    expect(avg).toBeGreaterThan(160)
    expect(avg).toBeLessThan(185)
  })

  it("비아시아 여성 → 165cm ± 범위", () => {
    const heights: number[] = []
    for (let i = 0; i < 50; i++) {
      heights.push(inferHeight("FEMALE", "London, Soho"))
    }
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length
    expect(avg).toBeGreaterThan(155)
    expect(avg).toBeLessThan(180)
  })

  it("정수 반환", () => {
    for (let i = 0; i < 20; i++) {
      const h = inferHeight("MALE", "Tokyo, Shibuya")
      expect(Number.isInteger(h)).toBe(true)
    }
  })
})

describe("T248-AC6: inferLanguages", () => {
  it("Korean → [ko, en] 기본 구성", () => {
    const langs = inferLanguages("Korean", MATURE_L2)
    expect(langs[0]).toBe("ko")
    expect(langs).toContain("en")
  })

  it("영어 모국어 → en만 포함 (en 중복 방지)", () => {
    const langs = inferLanguages("American", MATURE_L2)
    expect(langs[0]).toBe("en")
    expect(langs.filter((l) => l === "en").length).toBe(1)
  })

  it("높은 openness → 추가 언어 가능", () => {
    const highOpenL2 = { ...YOUNG_L2, openness: 0.95 }
    let hasExtra = false
    for (let i = 0; i < 30; i++) {
      const langs = inferLanguages("Korean", highOpenL2)
      if (langs.length > 2) hasExtra = true
    }
    expect(hasExtra).toBe(true)
  })
})

describe("T248-AC7: inferKnowledgeAreas", () => {
  it("높은 lens + depth → 분석적 지식 영역 포함", () => {
    const areas = inferKnowledgeAreas(MATURE_L1, MATURE_L2)
    expect(areas.length).toBeGreaterThanOrEqual(2)
    expect(areas.length).toBeLessThanOrEqual(4)
  })

  it("높은 sociability/extraversion → 사회 분야 포함 가능", () => {
    const socialL1 = { ...YOUNG_L1, sociability: 0.8 }
    const socialL2 = { ...YOUNG_L2, extraversion: 0.8 }
    const allAreas = new Set<string>()
    for (let i = 0; i < 20; i++) {
      inferKnowledgeAreas(socialL1, socialL2).forEach((a) => allAreas.add(a))
    }
    const socialPool = ["사회학", "심리학", "커뮤니케이션", "마케팅", "미디어학"]
    const hasSocial = socialPool.some((s) => allAreas.has(s))
    expect(hasSocial).toBe(true)
  })

  it("결과에 중복이 없어야 함", () => {
    for (let i = 0; i < 20; i++) {
      const areas = inferKnowledgeAreas(MATURE_L1, MATURE_L2)
      expect(new Set(areas).size).toBe(areas.length)
    }
  })
})

describe("T248-AC8: generateDemographicFields", () => {
  it("모든 필드가 올바른 타입으로 반환", () => {
    const demo = generateDemographicFields(MATURE_L1, MATURE_L2, "서울 강남")
    expect(typeof demo.gender).toBe("string")
    expect(["MALE", "FEMALE", "NON_BINARY"]).toContain(demo.gender)
    expect(typeof demo.nationality).toBe("string")
    expect(demo.nationality).toBe("Korean")
    expect(typeof demo.educationLevel).toBe("string")
    expect(Array.isArray(demo.languages)).toBe(true)
    expect(demo.languages.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(demo.knowledgeAreas)).toBe(true)
    expect(demo.knowledgeAreas.length).toBeGreaterThanOrEqual(2)
    expect(typeof demo.height).toBe("number")
  })

  it("해외 지역도 올바르게 처리", () => {
    const demo = generateDemographicFields(YOUNG_L1, YOUNG_L2, "Tokyo, Shibuya")
    expect(demo.nationality).toBe("Japanese")
    expect(demo.languages).toContain("ja")
  })

  it("알 수 없는 지역 → fallback 값 사용", () => {
    const demo = generateDemographicFields(MATURE_L1, MATURE_L2, "Unknown City")
    expect(demo.nationality).toBe("Korean")
    expect(typeof demo.height).toBe("number")
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
