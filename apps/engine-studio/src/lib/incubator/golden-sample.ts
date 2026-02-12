// ═══════════════════════════════════════════════════════════════
// Golden Sample 관리 + 확장 전략
// T62-AC5: 초기 골든 샘플, 자동 확장, 품질 메트릭
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD"

export interface GoldenSample {
  id: string
  contentTitle: string
  genre: string
  testQuestion: string
  expectedReactions: Record<string, string> // 성향별 예상 응답
  difficultyLevel: DifficultyLevel
  validationDimensions: string[] // 검증할 차원
  version: number
  isActive: boolean
}

export interface GoldenSampleConfig {
  poolSize: number
  samplesPerTest: number
  passThreshold: number
}

export interface GoldenSampleMetrics {
  totalSamples: number
  activeSamples: number
  avgPassRate: number // 페르소나 통과율
  dimensionCoverage: Record<string, number> // 차원별 커버리지
  lastExpansionDate: Date | null
  nextExpansionTarget: number // 다음 확장 필요 페르소나 수
}

// ── 초기 골든 샘플 (5-10개) ──────────────────────────────────

export const INITIAL_GOLDEN_SAMPLES: GoldenSample[] = [
  {
    id: "gs-001",
    contentTitle: "기생충",
    genre: "드라마/스릴러",
    testQuestion: "'기생충'에서 가장 인상적인 장면을 하나 꼽고 이유를 설명해주세요.",
    expectedReactions: {
      "high-depth": "계단 시퀀스의 상징성과 계층 구조에 대한 깊은 분석",
      "high-stance": "기택 가족의 도덕적 모호성에 대한 비판적 시각",
      "high-purpose": "사회적 불평등에 대한 메시지와 현실 반영",
      "low-depth": "비 오는 날 밤 장면이 스릴 넘쳤어요",
    },
    difficultyLevel: "MEDIUM",
    validationDimensions: ["depth", "stance", "purpose"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-002",
    contentTitle: "인터스텔라",
    genre: "SF",
    testQuestion: "'인터스텔라'의 과학적 요소와 감성적 요소 중 어디에 더 끌렸나요?",
    expectedReactions: {
      "high-lens": "블랙홀의 시간 지연 현상과 킵 손의 물리학에 대한 분석",
      "low-lens": "아버지와 딸의 관계, 사랑이 시공간을 넘는다는 감성",
      "high-depth": "상대성 이론의 5차원 해석과 영화적 표현의 정합성",
    },
    difficultyLevel: "MEDIUM",
    validationDimensions: ["lens", "depth", "purpose"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-003",
    contentTitle: "극한직업",
    genre: "코미디",
    testQuestion: "'극한직업'에서 가장 웃겼던 장면과 그 이유를 알려주세요.",
    expectedReactions: {
      "low-purpose": "치킨집 씬이 정말 웃겼어요, 순수한 코미디의 재미!",
      "high-stance": "마약 수사와 치킨집 병행의 비현실성이 오히려 풍자적",
      "high-lens": "코미디 안에 숨겨진 한국 직장 문화 풍자",
    },
    difficultyLevel: "EASY",
    validationDimensions: ["lens", "purpose", "stance"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-004",
    contentTitle: "곡성",
    genre: "공포/미스터리",
    testQuestion: "'곡성'의 결말을 어떻게 해석하시나요?",
    expectedReactions: {
      "high-depth": "다중 해석 가능성과 종교적 상징체계에 대한 심층 분석",
      "high-taste": "기존 공포 장르의 문법을 해체하는 실험적 서사 구조",
      "high-stance": "모호한 결말에 대한 비판과 열린 해석의 장단점",
    },
    difficultyLevel: "HARD",
    validationDimensions: ["depth", "stance", "taste"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-005",
    contentTitle: "범죄도시",
    genre: "액션",
    testQuestion: "'범죄도시' 시리즈의 매력이 뭐라고 생각하시나요?",
    expectedReactions: {
      "low-depth": "마동석의 액션 그 자체가 시원하고 통쾌해요!",
      "high-scope": "각 시리즈별 액션 안무의 차이점과 진화 과정",
      "high-purpose": "한국 범죄 영화의 장르적 성공 요인 분석",
    },
    difficultyLevel: "EASY",
    validationDimensions: ["depth", "scope", "purpose"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-006",
    contentTitle: "올드보이",
    genre: "스릴러",
    testQuestion: "'올드보이'의 복수극이 관객에게 주는 감정적 임팩트에 대해 이야기해주세요.",
    expectedReactions: {
      "high-taste": "파격적 결말이 장르 영화의 새로운 가능성을 제시",
      "high-stance": "도덕적 판단이 불가능한 캐릭터들의 회색 지대",
      "high-depth": "15년 감금의 심리적 변화와 복선 구조 분석",
    },
    difficultyLevel: "HARD",
    validationDimensions: ["taste", "stance", "depth"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-007",
    contentTitle: "건축학개론",
    genre: "로맨스",
    testQuestion: "'건축학개론'에서 가장 공감됐던 순간이 있다면?",
    expectedReactions: {
      "low-lens": "첫사랑의 설렘과 아련함에 대한 감성적 공감",
      "high-scope": "90년대 대학가 소품, 음악, 공간 디테일에 대한 주목",
      "high-purpose": "시간과 기억의 의미에 대한 성찰",
    },
    difficultyLevel: "EASY",
    validationDimensions: ["lens", "purpose", "scope"],
    version: 1,
    isActive: true,
  },
  {
    id: "gs-008",
    contentTitle: "1987",
    genre: "역사/드라마",
    testQuestion: "'1987'이 현재 관객에게 어떤 의미를 가진다고 생각하시나요?",
    expectedReactions: {
      "high-purpose": "민주화 운동의 역사적 의미와 현재에 대한 깊은 성찰",
      "high-depth": "실화 기반 서사에서의 역사적 맥락과 인물 분석",
      "high-stance": "영화의 정치적 입장에 대한 비판적 시각",
    },
    difficultyLevel: "MEDIUM",
    validationDimensions: ["purpose", "depth", "stance"],
    version: 1,
    isActive: true,
  },
]

// ── 자동 확장 전략 ────────────────────────────────────────────

export function getGoldenSampleConfig(activePersonaCount: number): GoldenSampleConfig {
  if (activePersonaCount < 100) {
    return { poolSize: 10, samplesPerTest: 1, passThreshold: 0.9 }
  }
  if (activePersonaCount < 500) {
    return { poolSize: 30, samplesPerTest: 2, passThreshold: 0.92 }
  }
  if (activePersonaCount < 1000) {
    return { poolSize: 100, samplesPerTest: 3, passThreshold: 0.9 }
  }
  return { poolSize: 200, samplesPerTest: 5, passThreshold: 0.92 }
}

export function shouldExpandGoldenSamples(
  activePersonaCount: number,
  currentPoolSize: number
): { shouldExpand: boolean; targetPoolSize: number; expansionCount: number } {
  const config = getGoldenSampleConfig(activePersonaCount)
  const shouldExpand = currentPoolSize < config.poolSize
  return {
    shouldExpand,
    targetPoolSize: config.poolSize,
    expansionCount: Math.max(0, config.poolSize - currentPoolSize),
  }
}

// ── 품질 메트릭 계산 ──────────────────────────────────────────

export function calculateGoldenSampleMetrics(
  samples: GoldenSample[],
  passRates: Map<string, number> // sampleId → passRate
): GoldenSampleMetrics {
  const activeSamples = samples.filter((s) => s.isActive)
  const rates = activeSamples.map((s) => passRates.get(s.id) ?? 0).filter((r) => r > 0)

  const avgPassRate =
    rates.length > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100 : 0

  // 차원별 커버리지
  const dimCount: Record<string, number> = {}
  for (const s of activeSamples) {
    for (const dim of s.validationDimensions) {
      dimCount[dim] = (dimCount[dim] ?? 0) + 1
    }
  }
  const totalActive = activeSamples.length || 1
  const dimensionCoverage: Record<string, number> = {}
  for (const [dim, count] of Object.entries(dimCount)) {
    dimensionCoverage[dim] = Math.round((count / totalActive) * 100) / 100
  }

  return {
    totalSamples: samples.length,
    activeSamples: activeSamples.length,
    avgPassRate,
    dimensionCoverage,
    lastExpansionDate: null,
    nextExpansionTarget: 100,
  }
}
