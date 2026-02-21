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

export interface DemographicFields {
  gender: string
  nationality: string
  educationLevel: string
  languages: string[]
  knowledgeAreas: string[]
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
 * 글로벌 도시 풀 — 페르소나 성격에 따라 지역 분배.
 *
 * sociability 높음 + extraversion 높음 → 대도시 (서울, 도쿄, 뉴욕 등)
 * depth 높음 + taste 낮음 → 전통/역사 도시 (경주, 교토, 피렌체 등)
 * taste 높음 + openness 높음 → 문화 도시 (베를린, 포틀랜드 등)
 * conscientiousness 높음 → 계획/체계적 도시 (싱가포르, 세종 등)
 * 기본 → 다양한 일반 도시
 */
const REGION_POOLS: Record<string, string[]> = {
  metropolitan: [
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
  ],
  cultural: [
    "서울 성수",
    "서울 연남",
    "제주시",
    "Berlin, Kreuzberg",
    "Portland, OR",
    "Melbourne, Fitzroy",
    "Amsterdam, Jordaan",
    "Barcelona, El Born",
    "Taipei, Da'an",
    "Bangkok, Ari",
  ],
  traditional: [
    "경주",
    "전주",
    "강릉",
    "Kyoto",
    "Florence",
    "Prague",
    "Istanbul",
    "Jaipur",
    "Marrakech",
    "Edinburgh",
    "Cusco",
  ],
  planned: [
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
  ],
  general: [
    "서울 종로",
    "대구 중구",
    "광주 동구",
    "Toronto",
    "Vancouver",
    "Paris, Le Marais",
    "Mumbai, Bandra",
    "São Paulo, Vila Madalena",
    "Lagos, Ikoyi",
    "Nairobi, Westlands",
    "Cairo, Zamalek",
    "Ho Chi Minh City, District 1",
  ],
}

/** 지역 → 타임존 매핑 */
const REGION_TIMEZONE_MAP: Record<string, string> = {
  // 한국
  서울: "Asia/Seoul",
  부산: "Asia/Seoul",
  경주: "Asia/Seoul",
  전주: "Asia/Seoul",
  강릉: "Asia/Seoul",
  제주: "Asia/Seoul",
  세종: "Asia/Seoul",
  성남: "Asia/Seoul",
  대전: "Asia/Seoul",
  대구: "Asia/Seoul",
  광주: "Asia/Seoul",
  인천: "Asia/Seoul",
  Songdo: "Asia/Seoul",
  // 일본
  Tokyo: "Asia/Tokyo",
  Osaka: "Asia/Tokyo",
  Kyoto: "Asia/Tokyo",
  // 중국/대만
  Shanghai: "Asia/Shanghai",
  Taipei: "Asia/Taipei",
  // 동남아
  Singapore: "Asia/Singapore",
  Bangkok: "Asia/Bangkok",
  "Ho Chi Minh": "Asia/Ho_Chi_Minh",
  // 남아시아
  Mumbai: "Asia/Kolkata",
  Jaipur: "Asia/Kolkata",
  // 중동
  Dubai: "Asia/Dubai",
  "Abu Dhabi": "Asia/Dubai",
  Istanbul: "Europe/Istanbul",
  Cairo: "Africa/Cairo",
  // 유럽
  London: "Europe/London",
  Paris: "Europe/Paris",
  Berlin: "Europe/Berlin",
  Amsterdam: "Europe/Amsterdam",
  Barcelona: "Europe/Madrid",
  Prague: "Europe/Prague",
  Zurich: "Europe/Zurich",
  Copenhagen: "Europe/Copenhagen",
  Helsinki: "Europe/Helsinki",
  Edinburgh: "Europe/London",
  Florence: "Europe/Rome",
  // 북미
  "New York": "America/New_York",
  Portland: "America/Los_Angeles",
  Toronto: "America/Toronto",
  Vancouver: "America/Vancouver",
  // 남미
  "São Paulo": "America/Sao_Paulo",
  Cusco: "America/Lima",
  // 오세아니아
  Sydney: "Australia/Sydney",
  Melbourne: "Australia/Melbourne",
  Canberra: "Australia/Sydney",
  // 아프리카
  Lagos: "Africa/Lagos",
  Nairobi: "Africa/Nairobi",
  Marrakech: "Africa/Casablanca",
}

export function inferRegion(l1: SocialPersonaVector, l2: CoreTemperamentVector): string {
  const pool = selectRegionPool(l1, l2)
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 지역 문자열에서 타임존을 추론. 첫 번째 매칭 키 사용, fallback: UTC */
export function inferTimezone(region: string): string {
  for (const [key, tz] of Object.entries(REGION_TIMEZONE_MAP)) {
    if (region.includes(key)) return tz
  }
  return "UTC"
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

// ── AC: 인구통계 필드 추론 ────────────────────────────────────

const GENDER_OPTIONS = ["MALE", "FEMALE", "NON_BINARY"] as const

/** 성별 랜덤 배정 (균등 분포, 벡터 무관) */
export function inferGender(): string {
  const r = Math.random()
  if (r < 0.45) return "MALE"
  if (r < 0.9) return "FEMALE"
  return "NON_BINARY"
}

/** 지역에서 국적 추론 */
const REGION_NATIONALITY_MAP: Record<string, string> = {
  서울: "Korean",
  부산: "Korean",
  경주: "Korean",
  전주: "Korean",
  강릉: "Korean",
  제주: "Korean",
  세종: "Korean",
  성남: "Korean",
  대전: "Korean",
  대구: "Korean",
  광주: "Korean",
  인천: "Korean",
  Songdo: "Korean",
  Tokyo: "Japanese",
  Osaka: "Japanese",
  Kyoto: "Japanese",
  Shanghai: "Chinese",
  Taipei: "Taiwanese",
  Singapore: "Singaporean",
  Bangkok: "Thai",
  "Ho Chi Minh": "Vietnamese",
  Mumbai: "Indian",
  Jaipur: "Indian",
  Dubai: "Emirati",
  "Abu Dhabi": "Emirati",
  Istanbul: "Turkish",
  Cairo: "Egyptian",
  London: "British",
  Paris: "French",
  Berlin: "German",
  Amsterdam: "Dutch",
  Barcelona: "Spanish",
  Prague: "Czech",
  Zurich: "Swiss",
  Copenhagen: "Danish",
  Helsinki: "Finnish",
  Edinburgh: "British",
  Florence: "Italian",
  "New York": "American",
  Portland: "American",
  Toronto: "Canadian",
  Vancouver: "Canadian",
  "São Paulo": "Brazilian",
  Cusco: "Peruvian",
  Sydney: "Australian",
  Melbourne: "Australian",
  Canberra: "Australian",
  Lagos: "Nigerian",
  Nairobi: "Kenyan",
  Marrakech: "Moroccan",
}

export function inferNationality(region: string): string {
  for (const [key, nat] of Object.entries(REGION_NATIONALITY_MAP)) {
    if (region.includes(key)) return nat
  }
  return "Korean"
}

/**
 * 벡터 기반 교육 수준 추론.
 * depth + purpose 높으면 → 고학력, taste + openness 높으면 → 자기주도학습 가능
 */
const EDUCATION_LEVELS = ["HIGH_SCHOOL", "BACHELOR", "MASTER", "DOCTORATE", "SELF_TAUGHT"] as const

export function inferEducationLevel(l1: SocialPersonaVector, l2: CoreTemperamentVector): string {
  const academicScore =
    l1.depth * 0.3 + l1.purpose * 0.3 + l2.conscientiousness * 0.2 + l1.lens * 0.2
  const selfTaughtScore = l1.taste * 0.4 + l2.openness * 0.3 + (1 - l2.conscientiousness) * 0.3

  if (selfTaughtScore > 0.7 && academicScore < 0.4) return "SELF_TAUGHT"
  if (academicScore > 0.75) return Math.random() > 0.5 ? "DOCTORATE" : "MASTER"
  if (academicScore > 0.55) return "MASTER"
  if (academicScore > 0.35) return "BACHELOR"
  return "HIGH_SCHOOL"
}

/** 국적에서 주요 언어 추론 + 추가 언어 */
const NATIONALITY_LANGUAGE_MAP: Record<string, string> = {
  Korean: "ko",
  Japanese: "ja",
  Chinese: "zh",
  Taiwanese: "zh",
  Thai: "th",
  Vietnamese: "vi",
  Indian: "hi",
  Singaporean: "en",
  Emirati: "ar",
  Turkish: "tr",
  Egyptian: "ar",
  British: "en",
  French: "fr",
  German: "de",
  Dutch: "nl",
  Spanish: "es",
  Czech: "cs",
  Swiss: "de",
  Danish: "da",
  Finnish: "fi",
  Italian: "it",
  American: "en",
  Canadian: "en",
  Brazilian: "pt",
  Peruvian: "es",
  Australian: "en",
  Nigerian: "en",
  Kenyan: "en",
  Moroccan: "ar",
}

export function inferLanguages(nationality: string, l2: CoreTemperamentVector): string[] {
  const primary = NATIONALITY_LANGUAGE_MAP[nationality] ?? "en"
  const langs = [primary]

  // 영어가 모국어가 아니면 영어 추가 (글로벌 필수)
  if (primary !== "en") langs.push("en")

  // openness 높으면 추가 언어 가능
  if (l2.openness > 0.7 && Math.random() > 0.5) {
    const extras = ["fr", "es", "de", "ja", "ko", "zh"].filter((l) => !langs.includes(l))
    if (extras.length > 0) langs.push(extras[Math.floor(Math.random() * extras.length)])
  }

  return langs
}

/** 벡터 기반 전문 지식 영역 추론 */
const KNOWLEDGE_POOLS: Record<string, string[]> = {
  analytical: ["데이터 분석", "통계학", "연구 방법론", "프로그래밍", "과학"],
  creative: ["문학", "영화학", "예술사", "음악 이론", "디자인"],
  social: ["사회학", "심리학", "커뮤니케이션", "마케팅", "미디어학"],
  philosophical: ["철학", "윤리학", "비교문화", "종교학", "인류학"],
  technical: ["공학", "IT", "경제학", "경영학", "법학"],
}

export function inferKnowledgeAreas(l1: SocialPersonaVector, l2: CoreTemperamentVector): string[] {
  const areas: string[] = []

  if (l1.lens > 0.6 && l1.depth > 0.5) {
    areas.push(pickFromPool(KNOWLEDGE_POOLS.analytical))
  }
  if (l1.lens < 0.4 || l1.taste > 0.6) {
    areas.push(pickFromPool(KNOWLEDGE_POOLS.creative))
  }
  if (l1.sociability > 0.5 || l2.extraversion > 0.5) {
    areas.push(pickFromPool(KNOWLEDGE_POOLS.social))
  }
  if (l1.depth > 0.6 && l1.purpose > 0.5) {
    areas.push(pickFromPool(KNOWLEDGE_POOLS.philosophical))
  }
  if (l2.conscientiousness > 0.6) {
    areas.push(pickFromPool(KNOWLEDGE_POOLS.technical))
  }

  // 최소 2개, 최대 4개 (중복 제거)
  const unique = [...new Set(areas)]
  if (unique.length < 2) {
    const allPools = Object.values(KNOWLEDGE_POOLS).flat()
    while (unique.length < 2) {
      const pick = allPools[Math.floor(Math.random() * allPools.length)]
      if (!unique.includes(pick)) unique.push(pick)
    }
  }
  return unique.slice(0, 4)
}

function pickFromPool(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 인구통계 필드 통합 생성 */
export function generateDemographicFields(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  region: string
): DemographicFields {
  const nationality = inferNationality(region)
  return {
    gender: inferGender(),
    nationality,
    educationLevel: inferEducationLevel(l1, l2),
    languages: inferLanguages(nationality, l2),
    knowledgeAreas: inferKnowledgeAreas(l1, l2),
  }
}

// ── 통합: 전체 구조화 필드 생성 ─────────────────────────────

export function generateStructuredFields(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  activityRange: [number, number],
  peakRange: [number, number]
): StructuredFields {
  const region = inferRegion(l1, l2)
  return {
    birthDate: inferBirthDate(l1, l2),
    region,
    activeHours: expandActiveHours(activityRange),
    peakHours: expandPeakHours(peakRange),
    timezone: inferTimezone(region),
  }
}
