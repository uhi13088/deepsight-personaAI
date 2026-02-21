// ═══════════════════════════════════════════════════════════════
// T162: 구조화 필드 자동생성 — birthDate / region / activeHours
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 타입 ────────────────────────────────────────────────────

export interface StructuredFields {
  birthDate: Date
  region: string
  activeHours: number[] // e.g. [9, 12, 15, 18, 21]
  peakHours: number[] // e.g. [21, 22]
  timezone: string
}

// ── AC1: birthDate 추론 ─────────────────────────────────────

/**
 * 벡터 기반 나이대 추론 → 랜덤 birthDate 생성.
 *
 * purpose(의미추구) + conscientiousness(체계성) 높으면 → 30~45세
 * taste(실험성) + openness(개방성) 높으면 → 20~30세
 * depth(분석깊이) + lens(논리성) 높으면 → 35~50세
 * 기본: 25~40세
 */
export function inferBirthDate(l1: SocialPersonaVector, l2: CoreTemperamentVector): Date {
  const ageRange = inferAgeRange(l1, l2)
  const age = ageRange[0] + Math.floor(Math.random() * (ageRange[1] - ageRange[0] + 1))

  const now = new Date()
  const birthYear = now.getFullYear() - age
  // 월/일은 1~12, 1~28 랜덤 (윤년 안전)
  const month = Math.floor(Math.random() * 12)
  const day = 1 + Math.floor(Math.random() * 28)

  return new Date(birthYear, month, day)
}

export function inferAgeRange(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector
): [number, number] {
  const matureScore = l1.purpose * 0.3 + l2.conscientiousness * 0.3 + l1.depth * 0.2 + l1.lens * 0.2
  const youthScore = l1.taste * 0.4 + l2.openness * 0.3 + l1.sociability * 0.3

  if (matureScore > 0.7 && youthScore < 0.4) return [38, 52]
  if (matureScore > 0.6) return [32, 45]
  if (youthScore > 0.7 && matureScore < 0.4) return [19, 28]
  if (youthScore > 0.5) return [22, 33]
  return [25, 40]
}

// ── AC2: region 자동 매핑 ───────────────────────────────────

/**
 * 벡터 기반 지역 추론.
 * 한국 도시 중심 — 페르소나 성격에 따라 지역 분배.
 *
 * sociability 높음 + extraversion 높음 → 대도시 (서울 강남/홍대)
 * depth 높음 + taste 낮음 → 전통 도시 (경주, 전주)
 * taste 높음 + openness 높음 → 문화 도시 (서울 성수/연남)
 * conscientiousness 높음 → 계획도시 (세종, 분당)
 * 기본 → 서울 일반
 */
const REGION_POOLS: Record<string, string[]> = {
  metropolitan: ["서울 강남", "서울 마포", "서울 성동", "부산 해운대", "인천 송도"],
  cultural: ["서울 성수", "서울 연남", "서울 이태원", "부산 전포", "제주시"],
  traditional: ["경주", "전주", "강릉", "여수", "통영"],
  planned: ["세종", "성남 분당", "수원 영통", "대전 유성", "고양 일산"],
  general: ["서울 종로", "서울 영등포", "서울 관악", "대구 중구", "광주 동구"],
}

export function inferRegion(l1: SocialPersonaVector, l2: CoreTemperamentVector): string {
  const pool = selectRegionPool(l1, l2)
  return pool[Math.floor(Math.random() * pool.length)]
}

function selectRegionPool(l1: SocialPersonaVector, l2: CoreTemperamentVector): string[] {
  const socialScore = l1.sociability * 0.5 + l2.extraversion * 0.5
  const culturalScore = l1.taste * 0.5 + l2.openness * 0.5
  const traditionalScore = l1.depth * 0.4 + (1 - l1.taste) * 0.3 + l2.conscientiousness * 0.3
  const plannedScore = l2.conscientiousness * 0.6 + l1.purpose * 0.4

  const scores = [
    { pool: "metropolitan", score: socialScore },
    { pool: "cultural", score: culturalScore },
    { pool: "traditional", score: traditionalScore },
    { pool: "planned", score: plannedScore },
  ].sort((a, b) => b.score - a.score)

  // 최고 점수가 0.6 이상이면 해당 풀, 아니면 일반
  if (scores[0].score >= 0.6) {
    return REGION_POOLS[scores[0].pool]
  }
  return REGION_POOLS.general
}

// ── AC3: activeHours / peakHours 배열 생성 ──────────────────

/**
 * inferActivitySettings()의 [start, end] 범위를 DB의 Int[] 배열로 변환.
 * 예: [8, 22] → [8, 10, 12, 14, 16, 18, 20, 22] (2시간 간격)
 * 예: [12, 2] → [12, 14, 16, 18, 20, 22, 0, 2] (자정 넘김)
 */
export function expandActiveHours(range: [number, number]): number[] {
  const [start, end] = range
  const hours: number[] = []

  if (start <= end) {
    // 같은 날: 8→22
    for (let h = start; h <= end; h += 2) {
      hours.push(h % 24)
    }
  } else {
    // 자정 넘김: 12→2 = 12,14,16,...,22,0,2
    for (let h = start; h < 24; h += 2) {
      hours.push(h)
    }
    for (let h = 0; h <= end; h += 2) {
      hours.push(h)
    }
  }

  return hours
}

/**
 * peakHours 범위를 DB의 Int[] 배열로 변환.
 * 예: [21, 1] → [21, 22, 23, 0, 1] (1시간 간격)
 */
export function expandPeakHours(range: [number, number]): number[] {
  const [start, end] = range
  const hours: number[] = []

  if (start <= end) {
    for (let h = start; h <= end; h++) {
      hours.push(h)
    }
  } else {
    for (let h = start; h < 24; h++) {
      hours.push(h)
    }
    for (let h = 0; h <= end; h++) {
      hours.push(h)
    }
  }

  return hours
}

// ── 통합: 전체 구조화 필드 생성 ─────────────────────────────

export function generateStructuredFields(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  activityRange: [number, number],
  peakRange: [number, number]
): StructuredFields {
  return {
    birthDate: inferBirthDate(l1, l2),
    region: inferRegion(l1, l2),
    activeHours: expandActiveHours(activityRange),
    peakHours: expandPeakHours(peakRange),
    timezone: "Asia/Seoul",
  }
}
