// ═══════════════════════════════════════════════════════════════
// Auto-Interview 프로토콜
// T54-AC1: 20문항, L1 7+L2 5+L3 4+역설 4
// 스펙 §3.4, 구현계획서 §16.7
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface InterviewQuestion {
  id: string
  targetLayer: "L1" | "L2" | "L3" | "paradox"
  targetDimension: string
  questionText: string
  scoringGuide: {
    lowSignals: string[]
    midSignals: string[]
    highSignals: string[]
  }
}

export interface DimensionScore {
  designed: number
  inferred: number
  delta: number
}

export interface InterviewResult {
  questions: InterviewQuestion[]
  dimensionScores: Record<string, DimensionScore>
  overallSimilarity: number
  verdict: "pass" | "warning" | "fail"
  failedDimensions: string[]
}

export interface InterviewConfig {
  passThreshold: number
  warningThreshold: number
  dimensionFailThreshold: number
}

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  passThreshold: 0.85,
  warningThreshold: 0.7,
  dimensionFailThreshold: 0.15,
}

// ── L1 문항 풀 ──────────────────────────────────────────────

const L1_QUESTIONS: Record<SocialDimension, InterviewQuestion> = {
  depth: {
    id: "L1_depth_01",
    targetLayer: "L1",
    targetDimension: "depth",
    questionText:
      "이 콘텐츠에 대해 얼마나 깊이 분석하시겠습니까? 표면적 감상과 심층 분석 중 어디에 더 가깝나요?",
    scoringGuide: {
      lowSignals: ["간단히", "대충", "느낌만", "직관적으로"],
      midSignals: ["적절히", "어느 정도", "균형 잡힌"],
      highSignals: ["깊이", "구조적", "층위", "분석적으로", "심층"],
    },
  },
  lens: {
    id: "L1_lens_01",
    targetLayer: "L1",
    targetDimension: "lens",
    questionText: "콘텐츠를 평가할 때 감성적 반응과 논리적 분석 중 어디에 더 비중을 두시나요?",
    scoringGuide: {
      lowSignals: ["감정", "느낌", "마음이", "가슴"],
      midSignals: ["둘 다", "균형", "상황에 따라"],
      highSignals: ["논리", "체계", "데이터", "근거"],
    },
  },
  stance: {
    id: "L1_stance_01",
    targetLayer: "L1",
    targetDimension: "stance",
    questionText:
      "작품에 문제가 있다면 어떻게 표현하시겠습니까? 부드럽게 넘어가나요, 날카롭게 지적하나요?",
    scoringGuide: {
      lowSignals: ["좋은 점도", "이해는", "그래도"],
      midSignals: ["장단점을", "균형 있게"],
      highSignals: ["비판", "지적", "문제", "결함"],
    },
  },
  scope: {
    id: "L1_scope_01",
    targetLayer: "L1",
    targetDimension: "scope",
    questionText: "리뷰나 분석을 작성할 때 핵심만 간결하게 쓰나요, 세부 사항까지 꼼꼼히 다루나요?",
    scoringGuide: {
      lowSignals: ["핵심만", "간결하게", "짧게"],
      midSignals: ["적절한 길이", "필요한 만큼"],
      highSignals: ["디테일", "세밀하게", "꼼꼼히", "모든 측면"],
    },
  },
  taste: {
    id: "L1_taste_01",
    targetLayer: "L1",
    targetDimension: "taste",
    questionText: "검증된 클래식 작품과 실험적인 신작 중 어디에 더 끌리시나요?",
    scoringGuide: {
      lowSignals: ["클래식", "검증된", "명작", "전통"],
      midSignals: ["두루", "다양하게", "가리지 않고"],
      highSignals: ["실험적", "새로운", "독특한", "인디"],
    },
  },
  purpose: {
    id: "L1_purpose_01",
    targetLayer: "L1",
    targetDimension: "purpose",
    questionText: "콘텐츠를 소비하는 주된 이유가 무엇인가요? 즐거움인가요, 의미 추구인가요?",
    scoringGuide: {
      lowSignals: ["재미", "킬링타임", "오락", "기분 전환"],
      midSignals: ["둘 다", "때에 따라"],
      highSignals: ["의미", "메시지", "철학", "성찰"],
    },
  },
  sociability: {
    id: "L1_sociability_01",
    targetLayer: "L1",
    targetDimension: "sociability",
    questionText:
      "다른 사람들과 콘텐츠에 대해 이야기하는 것을 좋아하시나요, 혼자 감상하는 것을 선호하나요?",
    scoringGuide: {
      lowSignals: ["혼자", "독립적으로", "개인적"],
      midSignals: ["가끔", "필요할 때"],
      highSignals: ["토론", "공유", "같이", "소통"],
    },
  },
}

// ── L2 문항 풀 ──────────────────────────────────────────────

const L2_QUESTIONS: Record<TemperamentDimension, InterviewQuestion> = {
  openness: {
    id: "L2_openness_01",
    targetLayer: "L2",
    targetDimension: "openness",
    questionText: "새로운 장르나 형식의 콘텐츠를 시도하는 것에 대해 어떻게 생각하시나요?",
    scoringGuide: {
      lowSignals: ["익숙한", "검증된", "기존"],
      midSignals: ["가끔", "열려 있지만"],
      highSignals: ["환영", "좋아해", "새로운 것", "도전"],
    },
  },
  conscientiousness: {
    id: "L2_conscientiousness_01",
    targetLayer: "L2",
    targetDimension: "conscientiousness",
    questionText:
      "콘텐츠를 평가할 때 체계적인 기준을 적용하나요, 즉흥적으로 느끼는 대로 평가하나요?",
    scoringGuide: {
      lowSignals: ["즉흥", "느낌대로", "그때그때"],
      midSignals: ["어느 정도", "기준이 있지만"],
      highSignals: ["체계적", "기준", "원칙", "일관된"],
    },
  },
  extraversion: {
    id: "L2_extraversion_01",
    targetLayer: "L2",
    targetDimension: "extraversion",
    questionText: "대화에서 먼저 의견을 제시하는 편인가요, 경청하고 반응하는 편인가요?",
    scoringGuide: {
      lowSignals: ["경청", "듣는", "조용히"],
      midSignals: ["상황에 따라", "때때로"],
      highSignals: ["먼저", "적극적으로", "주도"],
    },
  },
  agreeableness: {
    id: "L2_agreeableness_01",
    targetLayer: "L2",
    targetDimension: "agreeableness",
    questionText: "의견이 다른 사람과 대화할 때 어떻게 대응하시나요?",
    scoringGuide: {
      lowSignals: ["반박", "지적", "틀렸다"],
      midSignals: ["존중하되", "다른 관점"],
      highSignals: ["이해", "공감", "수용", "맞을 수도"],
    },
  },
  neuroticism: {
    id: "L2_neuroticism_01",
    targetLayer: "L2",
    targetDimension: "neuroticism",
    questionText: "부정적인 반응이나 비판을 받았을 때 어떤 감정이 드나요?",
    scoringGuide: {
      lowSignals: ["괜찮", "무덤덤", "상관없", "담담"],
      midSignals: ["약간", "잠시"],
      highSignals: ["불안", "걱정", "민감", "힘든"],
    },
  },
}

// ── L3 문항 풀 ──────────────────────────────────────────────

const L3_QUESTIONS: Record<NarrativeDimension, InterviewQuestion> = {
  lack: {
    id: "L3_lack_01",
    targetLayer: "L3",
    targetDimension: "lack",
    questionText: "현재 콘텐츠 생활에서 부족하다고 느끼는 것이 있나요?",
    scoringGuide: {
      lowSignals: ["만족", "충분", "부족함 없"],
      midSignals: ["약간", "때때로"],
      highSignals: ["결핍", "부족", "갈망", "원하는"],
    },
  },
  moralCompass: {
    id: "L3_moralCompass_01",
    targetLayer: "L3",
    targetDimension: "moralCompass",
    questionText: "콘텐츠에서 도덕적으로 문제가 있는 표현을 접하면 어떻게 반응하시나요?",
    scoringGuide: {
      lowSignals: ["상관없", "작품이니까", "자유"],
      midSignals: ["불편하지만", "이해는 하지만"],
      highSignals: ["용납 불가", "도덕적", "기준", "엄격"],
    },
  },
  volatility: {
    id: "L3_volatility_01",
    targetLayer: "L3",
    targetDimension: "volatility",
    questionText: "감정이나 의견이 갑자기 변할 때가 있나요?",
    scoringGuide: {
      lowSignals: ["일관", "변하지 않", "안정"],
      midSignals: ["가끔", "큰 계기가 있으면"],
      highSignals: ["갑자기", "확 바뀌", "예측 불가", "폭발"],
    },
  },
  growthArc: {
    id: "L3_growthArc_01",
    targetLayer: "L3",
    targetDimension: "growthArc",
    questionText: "시간이 지나면서 자신의 취향이나 관점이 변화하고 있다고 느끼나요?",
    scoringGuide: {
      lowSignals: ["변하지 않", "그대로", "일관"],
      midSignals: ["서서히", "조금씩"],
      highSignals: ["성장", "변화", "발전", "넓어지"],
    },
  },
}

// ── Paradox 문항 풀 ──────────────────────────────────────────

const PARADOX_QUESTIONS: InterviewQuestion[] = [
  {
    id: "PX_l1l2_01",
    targetLayer: "paradox",
    targetDimension: "l1l2",
    questionText: "외면적으로 보이는 당신과 내면의 당신 사이에 모순이 있다고 느끼시나요?",
    scoringGuide: {
      lowSignals: ["일관", "같다", "모순 없"],
      midSignals: ["약간", "때때로"],
      highSignals: ["다르다", "모순", "갈등", "괴리"],
    },
  },
  {
    id: "PX_l1l3_01",
    targetLayer: "paradox",
    targetDimension: "l1l3",
    questionText: "평소 행동 방식과 내면의 동기 사이에 긴장이 있나요?",
    scoringGuide: {
      lowSignals: ["자연스러운", "일치", "편안"],
      midSignals: ["가끔", "인식하고 있"],
      highSignals: ["긴장", "갈등", "숨기고", "어긋나"],
    },
  },
  {
    id: "PX_l2l3_01",
    targetLayer: "paradox",
    targetDimension: "l2l3",
    questionText: "성격적 기질과 삶의 서사 사이에 충돌을 느끼시나요?",
    scoringGuide: {
      lowSignals: ["조화", "어울린다", "자연스러운"],
      midSignals: ["가끔 충돌", "대부분 괜찮"],
      highSignals: ["충돌", "모순", "역설", "복잡"],
    },
  },
  {
    id: "PX_overall_01",
    targetLayer: "paradox",
    targetDimension: "overall",
    questionText: "자신의 성격에서 가장 흥미로운 모순이 있다면 무엇인가요?",
    scoringGuide: {
      lowSignals: ["모순 없", "단순", "명확"],
      midSignals: ["약간의", "소소한"],
      highSignals: ["깊은 모순", "복잡", "다층적", "역설적"],
    },
  },
]

// ── 문항 생성 ───────────────────────────────────────────────

export function generateInterviewQuestions(): InterviewQuestion[] {
  const questions: InterviewQuestion[] = []

  // L1: 7 questions
  const l1Dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  for (const dim of l1Dims) {
    questions.push(L1_QUESTIONS[dim])
  }

  // L2: 5 questions
  const l2Dims: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]
  for (const dim of l2Dims) {
    questions.push(L2_QUESTIONS[dim])
  }

  // L3: 4 questions
  const l3Dims: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]
  for (const dim of l3Dims) {
    questions.push(L3_QUESTIONS[dim])
  }

  // Paradox: 4 questions
  questions.push(...PARADOX_QUESTIONS)

  return questions
}

// ── 응답 → 점수 추론 (규칙 기반) ──────────────────────────

export function inferScoreFromResponse(question: InterviewQuestion, response: string): number {
  const lower = response.toLowerCase()
  const { lowSignals, midSignals, highSignals } = question.scoringGuide

  let lowCount = 0
  let midCount = 0
  let highCount = 0

  for (const signal of lowSignals) {
    if (lower.includes(signal)) lowCount++
  }
  for (const signal of midSignals) {
    if (lower.includes(signal)) midCount++
  }
  for (const signal of highSignals) {
    if (lower.includes(signal)) highCount++
  }

  const total = lowCount + midCount + highCount
  if (total === 0) return 0.5 // default to mid

  const weightedSum = lowCount * 0.2 + midCount * 0.5 + highCount * 0.8
  return Math.round((weightedSum / total) * 100) / 100
}

// ── 차원별 점수 비교 ────────────────────────────────────────

export function compareDimensionScores(
  designedL1: SocialPersonaVector,
  designedL2: CoreTemperamentVector,
  designedL3: NarrativeDriveVector,
  inferredScores: Record<string, number>
): Record<string, DimensionScore> {
  const result: Record<string, DimensionScore> = {}

  // L1
  const l1Map: Record<string, number> = {
    depth: designedL1.depth,
    lens: designedL1.lens,
    stance: designedL1.stance,
    scope: designedL1.scope,
    taste: designedL1.taste,
    purpose: designedL1.purpose,
    sociability: designedL1.sociability,
  }

  // L2
  const l2Map: Record<string, number> = {
    openness: designedL2.openness,
    conscientiousness: designedL2.conscientiousness,
    extraversion: designedL2.extraversion,
    agreeableness: designedL2.agreeableness,
    neuroticism: designedL2.neuroticism,
  }

  // L3
  const l3Map: Record<string, number> = {
    lack: designedL3.lack,
    moralCompass: designedL3.moralCompass,
    volatility: designedL3.volatility,
    growthArc: designedL3.growthArc,
  }

  const allDesigned = { ...l1Map, ...l2Map, ...l3Map }

  for (const [dim, designed] of Object.entries(allDesigned)) {
    const inferred = inferredScores[dim] ?? 0.5
    result[dim] = {
      designed,
      inferred,
      delta: Math.round(Math.abs(designed - inferred) * 100) / 100,
    }
  }

  return result
}

// ── 종합 결과 계산 ──────────────────────────────────────────

export function evaluateInterview(
  dimensionScores: Record<string, DimensionScore>,
  config: InterviewConfig = DEFAULT_INTERVIEW_CONFIG
): Omit<InterviewResult, "questions"> {
  const deltas = Object.values(dimensionScores).map((s) => s.delta)
  const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length
  const overallSimilarity = Math.round((1 - avgDelta) * 100) / 100

  const failedDimensions = Object.entries(dimensionScores)
    .filter(([, s]) => s.delta >= config.dimensionFailThreshold)
    .map(([dim]) => dim)

  let verdict: InterviewResult["verdict"]
  if (overallSimilarity >= config.passThreshold) {
    verdict = "pass"
  } else if (overallSimilarity >= config.warningThreshold) {
    verdict = "warning"
  } else {
    verdict = "fail"
  }

  return {
    dimensionScores,
    overallSimilarity,
    verdict,
    failedDimensions,
  }
}
