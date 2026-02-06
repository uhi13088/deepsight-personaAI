/**
 * 캐릭터 속성 자동 생성 (LLM)
 *
 * 6D 벡터를 기반으로 LLM이 풍부한 캐릭터 속성을 자동 생성합니다.
 */

import type { Vector6D } from "./vector-diversity"
import type { ExpertiseLevel } from "@prisma/client"

export interface CharacterAttributes {
  name: string
  handle: string // SNS 핸들 (@형식 없이)
  tagline: string // 한줄 자기소개
  birthDate: Date
  country: string
  region: string
  warmth: number // 0.0~1.0
  expertiseLevel: ExpertiseLevel
  speechPatterns: string[] // 말버릇 4-5개
  quirks: string[] // 특이 습관 3-4개
  background: string // 배경 스토리
  favoriteGenres: string[]
  dislikedGenres: string[]
  viewingHabits: string
}

export interface CharacterGenerationOptions {
  targetCountry?: string
  targetGeneration?: "GEN_Z" | "MILLENNIAL" | "GEN_X" | "BOOMER"
  preferredGender?: "male" | "female" | "neutral"
  language?: string
}

// 세대별 생년 범위
const GENERATION_RANGES: Record<string, { min: number; max: number }> = {
  GEN_Z: { min: 2000, max: 2010 },
  MILLENNIAL: { min: 1985, max: 1999 },
  GEN_X: { min: 1970, max: 1984 },
  BOOMER: { min: 1955, max: 1969 },
}

// 국가별 이름 풀
const NAME_POOLS: Record<string, { male: string[]; female: string[] }> = {
  KR: {
    male: [
      "정현",
      "민준",
      "서준",
      "예준",
      "도윤",
      "시우",
      "주원",
      "하준",
      "지호",
      "준서",
      "건우",
      "현우",
      "지훈",
      "우진",
      "준혁",
      "승민",
      "재윤",
      "태민",
      "동현",
      "성민",
    ],
    female: [
      "유나",
      "서연",
      "민서",
      "서윤",
      "지우",
      "서현",
      "하은",
      "지민",
      "수아",
      "채원",
      "지유",
      "예은",
      "다은",
      "소율",
      "수빈",
      "예진",
      "민지",
      "하윤",
      "지아",
      "윤서",
    ],
  },
  US: {
    male: [
      "Michael",
      "James",
      "William",
      "Benjamin",
      "Daniel",
      "Matthew",
      "David",
      "Joseph",
      "Andrew",
      "Ryan",
      "Tyler",
      "Brandon",
      "Justin",
      "Kevin",
      "Jason",
      "Eric",
      "Chris",
      "Brian",
      "Adam",
      "Alex",
    ],
    female: [
      "Emma",
      "Sophia",
      "Olivia",
      "Ava",
      "Isabella",
      "Mia",
      "Charlotte",
      "Emily",
      "Jessica",
      "Sarah",
      "Ashley",
      "Amanda",
      "Rachel",
      "Lauren",
      "Jennifer",
      "Nicole",
      "Michelle",
      "Stephanie",
      "Amy",
      "Lisa",
    ],
  },
  JP: {
    male: [
      "太郎",
      "健太",
      "翔太",
      "大輝",
      "拓也",
      "直樹",
      "雄大",
      "和也",
      "翔",
      "蓮",
      "颯太",
      "陽斗",
      "優斗",
      "悠真",
      "駿",
      "大和",
      "隼人",
      "陸",
      "航",
      "樹",
    ],
    female: [
      "さくら",
      "美咲",
      "愛",
      "優子",
      "美穂",
      "由美",
      "真由",
      "彩香",
      "恵",
      "結衣",
      "陽菜",
      "美優",
      "心愛",
      "莉子",
      "芽依",
      "凛",
      "紬",
      "葵",
      "楓",
      "美月",
    ],
  },
}

// 국가별 지역
const REGIONS: Record<string, string[]> = {
  KR: ["서울", "부산", "대구", "인천", "광주", "대전", "제주", "수원", "성남", "고양"],
  US: [
    "California",
    "New York",
    "Texas",
    "Florida",
    "Washington",
    "Oregon",
    "Colorado",
    "Illinois",
    "Massachusetts",
    "Georgia",
  ],
  JP: ["東京", "大阪", "京都", "福岡", "北海道", "神奈川", "愛知", "兵庫", "広島", "宮城"],
}

// 지역별 말투 특징 (한국)
const REGIONAL_SPEECH_PATTERNS: Record<string, string[]> = {
  서울: ["아 진짜?", "대박", "완전", "레알", "ㅋㅋ"],
  부산: ["아이가", "머라카노", "뭐하노", "쩐다", "겁나"],
  대구: ["가봤나", "거 봐라", "마", "~하이소", "안카나"],
  제주: ["~수다", "혼저옵서", "경헙니다", "어멍", "아방"],
}

// 영화 장르 목록
const GENRES = {
  KR: [
    "로맨스",
    "스릴러",
    "액션",
    "코미디",
    "드라마",
    "SF",
    "판타지",
    "공포",
    "미스터리",
    "범죄",
    "다큐멘터리",
    "애니메이션",
    "뮤지컬",
    "전쟁",
    "서부",
    "느와르",
    "독립영화",
    "아트하우스",
  ],
  US: [
    "Romance",
    "Thriller",
    "Action",
    "Comedy",
    "Drama",
    "Sci-Fi",
    "Fantasy",
    "Horror",
    "Mystery",
    "Crime",
    "Documentary",
    "Animation",
    "Musical",
    "War",
    "Western",
    "Noir",
    "Indie",
    "Arthouse",
  ],
}

// 말버릇 템플릿
const SPEECH_PATTERN_TEMPLATES: Record<string, Record<string, string[]>> = {
  KR: {
    critical: [
      "솔직히 말해서",
      "객관적으로 보면",
      "냉정하게 평가하자면",
      "과대평가입니다",
      "실망스럽네요",
    ],
    warm: [
      "마음이 따뜻해지는",
      "진심으로 추천해요",
      "꼭 보세요!",
      "감동받았어요 ㅠㅠ",
      "최고예요!",
    ],
    analytical: [
      "기술적으로 분석하면",
      "시네마토그래피 관점에서",
      "영화사적 맥락으로",
      "구조적으로",
      "서사적으로",
    ],
    casual: ["재밌었어요~", "ㅎㅎ 괜찮았음", "그냥저냥?", "시간 때우기 좋음", "가볍게 보기 좋아요"],
  },
  US: {
    critical: ["Honestly,", "To be fair,", "Objectively speaking,", "Overhyped.", "Disappointing."],
    warm: ["I absolutely loved it!", "Must watch!", "So moving!", "10/10 recommend!", "Beautiful!"],
    analytical: [
      "From a technical standpoint,",
      "Cinematically speaking,",
      "In terms of narrative structure,",
      "Thematically,",
      "The mise-en-scène...",
    ],
    casual: ["It was fun!", "Not bad lol", "Decent watch", "Good for killing time", "Chill movie"],
  },
}

// 특이 습관 템플릿
const QUIRK_TEMPLATES: Record<string, string[]> = {
  critical: [
    "엔딩크레딧 제작진 전부 확인",
    "관람 전 감독 필모그래피 숙지",
    "별점 소수점까지 매김",
    "극장에서 폰 보는 사람 응시",
    "평론 기사 스크랩",
    "감독 인터뷰 영상 탐색",
    "영화 트리비아 수집",
  ],
  warm: [
    "감동 장면에서 울음",
    "OST 플레이리스트 제작",
    "좋아하는 장면 반복 감상",
    "영화 굿즈 수집",
    "영화 속 명대사 암기",
    "영화 본 후 후기 공유",
    "함께 본 사람과 이야기 나누기",
  ],
  analytical: [
    "영화 분석 노트 작성",
    "시각적 구성 분석",
    "사운드 디자인 주의 깊게 듣기",
    "원작과 각색 비교",
    "영화 이론서 탐독",
    "감독 스타일 비교 연구",
    "촬영 기법 공부",
  ],
  casual: [
    "팝콘 필수",
    "친구들과 단체 관람",
    "넷플릭스 정주행",
    "밤새 영화 마라톤",
    "영화 보면서 폰 확인",
    "영화 중간에 졸기도 함",
    "가벼운 마음으로 감상",
  ],
}

/**
 * 캐릭터 속성 자동 생성
 */
export async function generateCharacterAttributes(
  vector: Vector6D,
  options: CharacterGenerationOptions = {}
): Promise<CharacterAttributes> {
  const country = options.targetCountry || "KR"
  const generation = options.targetGeneration || selectGeneration(vector)
  const gender = options.preferredGender || (Math.random() > 0.5 ? "male" : "female")

  // 이름 생성
  const name = generateName(country, gender)
  const handle = generateHandle(name, country)

  // 생년월일 생성
  const birthDate = generateBirthDate(generation)

  // 지역 선택
  const region = selectRegion(country)

  // warmth 계산 (stance와 반비례, lens와도 관계)
  const warmth = calculateWarmth(vector)

  // 전문성 수준 결정
  const expertiseLevel = deriveExpertiseLevel(vector)

  // 말버릇 생성
  const speechPatterns = generateSpeechPatterns(vector, country, region)

  // 특이 습관 생성
  const quirks = generateQuirks(vector)

  // 배경 스토리 생성
  const background = generateBackground(vector, {
    name,
    country,
    region,
    generation,
    expertiseLevel,
  })

  // 장르 선호도 생성
  const { favoriteGenres, dislikedGenres } = generateGenrePreferences(vector, country)

  // 시청 습관 생성
  const viewingHabits = generateViewingHabits(vector)

  // 태그라인 생성
  const tagline = generateTagline(vector, country)

  return {
    name,
    handle,
    tagline,
    birthDate,
    country,
    region,
    warmth,
    expertiseLevel,
    speechPatterns,
    quirks,
    background,
    favoriteGenres,
    dislikedGenres,
    viewingHabits,
  }
}

// ============================================
// Helper Functions
// ============================================

function selectGeneration(vector: Vector6D): "GEN_Z" | "MILLENNIAL" | "GEN_X" | "BOOMER" {
  // 벡터 특성에 따라 세대 선택
  // 실험적(taste 높음) + 재미추구(purpose 낮음) = 젊은 세대 경향
  const youthFactor = vector.taste * 0.5 + (1 - vector.purpose) * 0.3 + (1 - vector.depth) * 0.2

  if (youthFactor > 0.65) return "GEN_Z"
  if (youthFactor > 0.45) return "MILLENNIAL"
  if (youthFactor > 0.25) return "GEN_X"
  return "BOOMER"
}

function generateName(country: string, gender: "male" | "female" | "neutral"): string {
  const pool = NAME_POOLS[country] || NAME_POOLS.US
  const genderPool = gender === "neutral" ? [...pool.male, ...pool.female] : pool[gender]
  return genderPool[Math.floor(Math.random() * genderPool.length)]
}

function generateHandle(name: string, country: string): string {
  const suffixes = ["_movie", "_films", "_cinema", "_reviews", "_watches", ""]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

  if (country === "KR") {
    // 한글 이름을 로마자로 변환 (간단한 매핑)
    const romanized = name
      .replace(/[가-힣]/g, () => String.fromCharCode(97 + Math.floor(Math.random() * 26)))
      .toLowerCase()
    return `${romanized}${suffix}`
  }

  return `${name.toLowerCase().replace(/\s/g, "_")}${suffix}`
}

function generateBirthDate(generation: string): Date {
  const range = GENERATION_RANGES[generation] || GENERATION_RANGES.MILLENNIAL
  const year = range.min + Math.floor(Math.random() * (range.max - range.min + 1))
  const month = Math.floor(Math.random() * 12)
  const day = 1 + Math.floor(Math.random() * 28)
  return new Date(year, month, day)
}

function selectRegion(country: string): string {
  const regions = REGIONS[country] || REGIONS.US
  return regions[Math.floor(Math.random() * regions.length)]
}

function calculateWarmth(vector: Vector6D): number {
  // warmth는 stance(비판성)와 반비례, lens(감성)와 비례
  const warmth = (1 - vector.stance) * 0.5 + (1 - vector.lens) * 0.3 + (1 - vector.depth) * 0.2
  return Math.round(warmth * 100) / 100
}

function deriveExpertiseLevel(vector: Vector6D): ExpertiseLevel {
  // depth와 scope가 높을수록 전문성 높음
  const expertiseFactor = vector.depth * 0.5 + vector.scope * 0.3 + vector.purpose * 0.2

  if (expertiseFactor > 0.75) return "CRITIC"
  if (expertiseFactor > 0.55) return "EXPERT"
  if (expertiseFactor > 0.35) return "ENTHUSIAST"
  return "CASUAL"
}

function generateSpeechPatterns(vector: Vector6D, country: string, region: string): string[] {
  const patterns: string[] = []
  const templates = SPEECH_PATTERN_TEMPLATES[country] || SPEECH_PATTERN_TEMPLATES.US

  // 성격 유형 결정
  let primaryType: keyof typeof templates
  if (vector.stance > 0.6) {
    primaryType = "critical"
  } else if (vector.lens < 0.4 && vector.stance < 0.4) {
    primaryType = "warm"
  } else if (vector.depth > 0.6) {
    primaryType = "analytical"
  } else {
    primaryType = "casual"
  }

  // 주요 타입에서 3개 선택
  const primaryPatterns = templates[primaryType] || []
  const shuffledPrimary = [...primaryPatterns].sort(() => Math.random() - 0.5)
  patterns.push(...shuffledPrimary.slice(0, 3))

  // 지역 말투 추가 (한국)
  if (country === "KR" && REGIONAL_SPEECH_PATTERNS[region]) {
    const regionalPatterns = REGIONAL_SPEECH_PATTERNS[region]
    patterns.push(regionalPatterns[Math.floor(Math.random() * regionalPatterns.length)])
  }

  // 다른 타입에서 1개 추가
  const otherTypes = Object.keys(templates).filter((t) => t !== primaryType) as Array<
    keyof typeof templates
  >
  const randomOtherType = otherTypes[Math.floor(Math.random() * otherTypes.length)]
  const otherPatterns = templates[randomOtherType] || []
  if (otherPatterns.length > 0) {
    patterns.push(otherPatterns[Math.floor(Math.random() * otherPatterns.length)])
  }

  return patterns.slice(0, 5)
}

function generateQuirks(vector: Vector6D): string[] {
  const quirks: string[] = []

  // 성격 유형 결정
  let primaryType: keyof typeof QUIRK_TEMPLATES
  if (vector.stance > 0.6) {
    primaryType = "critical"
  } else if (vector.lens < 0.4 && vector.stance < 0.4) {
    primaryType = "warm"
  } else if (vector.depth > 0.6) {
    primaryType = "analytical"
  } else {
    primaryType = "casual"
  }

  // 주요 타입에서 2개 선택
  const primaryQuirks = QUIRK_TEMPLATES[primaryType]
  const shuffledPrimary = [...primaryQuirks].sort(() => Math.random() - 0.5)
  quirks.push(...shuffledPrimary.slice(0, 2))

  // 다른 타입에서 2개 추가
  const otherTypes = Object.keys(QUIRK_TEMPLATES).filter(
    (t) => t !== primaryType
  ) as (keyof typeof QUIRK_TEMPLATES)[]
  for (const otherType of otherTypes) {
    const otherQuirks = QUIRK_TEMPLATES[otherType]
    if (otherQuirks.length > 0 && quirks.length < 4) {
      quirks.push(otherQuirks[Math.floor(Math.random() * otherQuirks.length)])
    }
  }

  return quirks.slice(0, 4)
}

function generateBackground(
  vector: Vector6D,
  context: {
    name: string
    country: string
    region: string
    generation: string
    expertiseLevel: ExpertiseLevel
  }
): string {
  const { name, region, expertiseLevel } = context

  // 배경 스토리 템플릿
  const backgrounds: Record<ExpertiseLevel, string[]> = {
    CRITIC: [
      `${name}은(는) 영화잡지 기자 출신으로 10년간 현장을 취재했다. 수많은 졸작을 견디며 날카로운 눈을 키웠고, 현재는 독립 평론가로 활동 중이다. ${region}에서의 경험이 영화를 보는 시각에 큰 영향을 미쳤다.`,
      `대학에서 영화학을 전공한 ${name}은(는) 영화 비평 분야에서 15년의 경력을 쌓았다. 국제 영화제 심사위원으로도 활동하며, 업계에서 인정받는 비평가로 자리잡았다.`,
      `${name}은(는) 어린 시절부터 영화에 매료되어 영화 평론가의 꿈을 키워왔다. 블로그에서 시작한 리뷰가 입소문을 타며 현재는 유명 매체에 기고하고 있다.`,
    ],
    EXPERT: [
      `${name}은(는) 영화 동아리 활동을 통해 영화의 매력에 빠졌다. 수년간의 열정적인 관람과 공부를 통해 해박한 지식을 쌓았으며, 주변에서 영화 추천을 구하는 사람으로 알려져 있다.`,
      `IT 업계에서 일하면서도 영화에 대한 열정을 놓지 않은 ${name}. 수천 편의 영화를 본 경험을 바탕으로 ${region} 지역 영화 모임을 이끌고 있다.`,
      `${name}은(는) 대학 시절 영화 동아리 회장을 맡으며 영화에 깊이 빠져들었다. 지금은 직장 생활을 하면서도 주말마다 영화관을 찾는 열혈 영화팬이다.`,
    ],
    ENTHUSIAST: [
      `${name}은(는) 영화를 사랑하는 평범한 직장인이다. 퇴근 후 영화 한 편이 하루의 스트레스를 풀어주는 최고의 방법이라고 생각한다. 특히 감정을 건드리는 영화를 좋아한다.`,
      `대학생 ${name}은(는) 영화 동아리에서 활발하게 활동하고 있다. 아직 많이 배우는 중이지만, 영화에 대한 열정만큼은 누구에게도 뒤지지 않는다.`,
      `${region}에서 살고 있는 ${name}은(는) 주말마다 영화관을 찾는다. 영화를 보고 나서 친구들과 이야기 나누는 것을 즐긴다.`,
    ],
    CASUAL: [
      `${name}은(는) 영화보다는 일상이 바쁜 사람이다. 하지만 가끔 좋은 영화를 발견하면 그 기쁨을 나누고 싶어한다. 어려운 이야기보다는 재미있고 가벼운 영화를 선호한다.`,
      `${name}은(는) 친구들과 함께 영화 보는 것을 좋아하는 평범한 사람이다. 영화 평론보다는 "재밌었다/없었다"로 간단히 평가하는 편이다.`,
      `주로 넷플릭스로 영화를 보는 ${name}. 복잡한 것보다는 편하게 즐길 수 있는 콘텐츠를 선호한다.`,
    ],
  }

  const options = backgrounds[expertiseLevel]
  return options[Math.floor(Math.random() * options.length)]
}

function generateGenrePreferences(
  vector: Vector6D,
  country: string
): { favoriteGenres: string[]; dislikedGenres: string[] } {
  const genreList = country === "KR" ? GENRES.KR : GENRES.US

  // 벡터 특성에 따른 장르 매핑
  const genreScores: Record<string, number> = {}

  for (const genre of genreList) {
    let score = 0.5

    // 장르별 벡터 친화도 계산
    if (["스릴러", "Thriller", "범죄", "Crime", "느와르", "Noir"].includes(genre)) {
      score += vector.stance * 0.3 + vector.depth * 0.2
    }
    if (["로맨스", "Romance", "드라마", "Drama"].includes(genre)) {
      score += (1 - vector.lens) * 0.3 + (1 - vector.stance) * 0.2
    }
    if (["SF", "Sci-Fi", "판타지", "Fantasy"].includes(genre)) {
      score += vector.taste * 0.3 + vector.depth * 0.1
    }
    if (["액션", "Action", "코미디", "Comedy"].includes(genre)) {
      score += (1 - vector.purpose) * 0.3 + (1 - vector.depth) * 0.1
    }
    if (
      ["독립영화", "Indie", "아트하우스", "Arthouse", "다큐멘터리", "Documentary"].includes(genre)
    ) {
      score += vector.purpose * 0.3 + vector.taste * 0.2
    }

    // 노이즈 추가
    score += (Math.random() - 0.5) * 0.2

    genreScores[genre] = Math.max(0, Math.min(1, score))
  }

  // 점수순 정렬
  const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1])

  const favoriteGenres = sortedGenres.slice(0, 4).map(([genre]) => genre)
  const dislikedGenres = sortedGenres.slice(-2).map(([genre]) => genre)

  return { favoriteGenres, dislikedGenres }
}

function generateViewingHabits(vector: Vector6D): string {
  const habits: string[] = []

  if (vector.depth > 0.6) {
    habits.push("감독/배우 필모그래피 확인 후 관람")
  }
  if (vector.scope > 0.6) {
    habits.push("영화 후 해설 영상 시청")
  }
  if (vector.lens < 0.4) {
    habits.push("감정적으로 몰입하며 관람")
  }
  if (vector.purpose > 0.6) {
    habits.push("메시지와 주제 분석")
  }
  if (vector.taste > 0.6) {
    habits.push("새로운 장르/감독 탐색")
  }
  if (vector.stance > 0.6) {
    habits.push("비판적 시각으로 평가")
  }

  // 기본 습관 추가
  const defaultHabits = [
    "주로 저녁 시간에 관람",
    "주말에 영화관 방문",
    "OTT 서비스 활용",
    "혼자 관람 선호",
    "친구와 함께 관람",
  ]

  while (habits.length < 3) {
    const randomHabit = defaultHabits[Math.floor(Math.random() * defaultHabits.length)]
    if (!habits.includes(randomHabit)) {
      habits.push(randomHabit)
    }
  }

  return habits.slice(0, 3).join(", ")
}

function generateTagline(vector: Vector6D, country: string): string {
  const taglines: Record<string, Record<string, string[]>> = {
    KR: {
      critical: [
        "영화에 돈과 시간을 낭비하지 마세요",
        "솔직한 평가, 그게 제 스타일이에요",
        "좋은 영화만 추천합니다",
        "까다로운 눈으로 골라드려요",
      ],
      warm: [
        "좋은 영화는 좋은 친구 같아요",
        "영화로 마음을 나눠요",
        "감동을 함께 나누고 싶어요",
        "영화는 삶의 선물이에요",
      ],
      analytical: [
        "영화의 깊이를 탐구합니다",
        "한 프레임도 놓치지 않아요",
        "영화는 예술입니다",
        "세상을 보는 새로운 렌즈",
      ],
      casual: [
        "영화? 재미있으면 장땡!",
        "편하게 즐기는 영화 생활",
        "영화는 힐링이에요",
        "뭐든 재밌게 보는 편이에요",
      ],
    },
    US: {
      critical: [
        "Movies are meant to be critiqued",
        "No sugarcoating, just honest reviews",
        "Quality over quantity",
        "My standards? High.",
      ],
      warm: [
        "Movies are meant to be felt",
        "Sharing the love of cinema",
        "Good movies, good vibes",
        "Every movie is an experience",
      ],
      analytical: [
        "Cinema is an art form",
        "Looking beyond the surface",
        "Every frame tells a story",
        "Deconstructing masterpieces",
      ],
      casual: [
        "Movies are just fun!",
        "Keeping it casual",
        "Good times, good movies",
        "Entertainment first!",
      ],
    },
  }

  const countryTaglines = taglines[country] || taglines.US

  let type: keyof typeof countryTaglines
  if (vector.stance > 0.6) {
    type = "critical"
  } else if (vector.lens < 0.4 && vector.stance < 0.4) {
    type = "warm"
  } else if (vector.depth > 0.6) {
    type = "analytical"
  } else {
    type = "casual"
  }

  const options = countryTaglines[type]
  return options[Math.floor(Math.random() * options.length)]
}
