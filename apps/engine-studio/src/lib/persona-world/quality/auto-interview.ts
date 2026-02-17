// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Auto-Interview PW Extension (Phase 6-B)
// 운영 설계서 §9.2 — PW 전용 인터뷰 (20문항, 적응적 스케줄링)
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export interface PWInterviewQuestion {
  id: string
  layer: "L1" | "L2" | "L3" | "cross"
  dimension: string
  questionText: string
  contextType: "post_tone" | "comment_response" | "growth" | "paradox" | "general"
}

export interface PWInterviewJudgment {
  questionId: string
  score: number // 0.0 ~ 1.0
  verdict: "pass" | "warning" | "fail"
  reason: string
}

export interface PWInterviewResult {
  personaId: string
  questions: PWInterviewQuestion[]
  judgments: PWInterviewJudgment[]
  overallScore: number
  verdict: "pass" | "warning" | "fail"
  failedDimensions: string[]
  executedAt: Date
  tokenUsage: { input: number; output: number }
}

export interface InterviewScheduleConfig {
  defaultSampleRatio: number // 전체 페르소나 대비 일일 샘플링 비율
  gradeIntervals: Record<string, number> // PIS 등급별 인터뷰 주기 (일)
}

export const DEFAULT_SCHEDULE_CONFIG: InterviewScheduleConfig = {
  defaultSampleRatio: 0.2, // 20%
  gradeIntervals: {
    EXCELLENT: 14, // 2주
    GOOD: 7, // 1주
    WARNING: 3, // 3일
    CRITICAL: 1, // 매일
    QUARANTINE: 1, // 매일
  },
}

// ── 판정 기준 ──────────────────────────────────────────────────

const VERDICT_THRESHOLDS = {
  pass: 0.85,
  warning: 0.7,
} as const

// ── PW 전용 인터뷰 문항 (Golden Sample) ──────────────────────

const PW_GOLDEN_QUESTIONS: PWInterviewQuestion[] = [
  // L1 Social (7)
  {
    id: "pw-l1-01",
    layer: "L1",
    dimension: "stance",
    questionText: "논쟁적인 포스트에 대해 댓글을 달 때, 어떤 입장을 취하겠습니까?",
    contextType: "post_tone",
  },
  {
    id: "pw-l1-02",
    layer: "L1",
    dimension: "depth",
    questionText: "짧은 밈 포스트와 심층 분석 포스트 중 어느 쪽에 더 끌리시나요?",
    contextType: "general",
  },
  {
    id: "pw-l1-03",
    layer: "L1",
    dimension: "lens",
    questionText: "감동적인 포스트를 읽었을 때, 감정적 공감 vs 구조적 분석 중 어떻게 반응하나요?",
    contextType: "comment_response",
  },
  {
    id: "pw-l1-04",
    layer: "L1",
    dimension: "sociability",
    questionText: "새로운 페르소나가 말을 걸어왔습니다. 어떻게 반응하시겠어요?",
    contextType: "comment_response",
  },
  {
    id: "pw-l1-05",
    layer: "L1",
    dimension: "scope",
    questionText: "포스트를 작성할 때 핵심만 간결하게 쓰나요, 상세하게 풀어서 쓰나요?",
    contextType: "post_tone",
  },
  {
    id: "pw-l1-06",
    layer: "L1",
    dimension: "taste",
    questionText: "트렌딩 콘텐츠와 니치한 콘텐츠 중 어떤 것에 대해 더 포스팅하고 싶나요?",
    contextType: "general",
  },
  {
    id: "pw-l1-07",
    layer: "L1",
    dimension: "purpose",
    questionText: "SNS 활동의 주된 목적이 무엇인가요? 즐거움, 정보 공유, 자기 표현?",
    contextType: "general",
  },
  // L2 OCEAN (5)
  {
    id: "pw-l2-01",
    layer: "L2",
    dimension: "agreeableness",
    questionText: "의견이 대립하는 댓글에 어떻게 대응하시겠습니까?",
    contextType: "comment_response",
  },
  {
    id: "pw-l2-02",
    layer: "L2",
    dimension: "openness",
    questionText: "전혀 관심 없던 분야의 포스트를 추천받았을 때 어떤 반응이세요?",
    contextType: "general",
  },
  {
    id: "pw-l2-03",
    layer: "L2",
    dimension: "conscientiousness",
    questionText: "포스트에 사실 오류가 있다는 지적을 받았습니다. 어떻게 처리하나요?",
    contextType: "post_tone",
  },
  {
    id: "pw-l2-04",
    layer: "L2",
    dimension: "extraversion",
    questionText: "타임라인이 조용할 때 먼저 포스트를 올리나요, 누군가 올릴 때까지 기다리나요?",
    contextType: "general",
  },
  {
    id: "pw-l2-05",
    layer: "L2",
    dimension: "neuroticism",
    questionText: "작성한 포스트에 비판적인 댓글이 달렸을 때 어떤 감정이 드나요?",
    contextType: "comment_response",
  },
  // L3 Narrative (4)
  {
    id: "pw-l3-01",
    layer: "L3",
    dimension: "lack",
    questionText: "현재 SNS 활동에서 부족하거나 아쉬운 것이 있다면 무엇인가요?",
    contextType: "general",
  },
  {
    id: "pw-l3-02",
    layer: "L3",
    dimension: "moralCompass",
    questionText: "도덕적으로 문제가 있는 포스트를 보았을 때 어떻게 반응하시나요?",
    contextType: "comment_response",
  },
  {
    id: "pw-l3-03",
    layer: "L3",
    dimension: "volatility",
    questionText: "갑자기 의견이나 태도를 바꿀 때가 있나요? 그런 경우 어떻게 표현하나요?",
    contextType: "growth",
  },
  {
    id: "pw-l3-04",
    layer: "L3",
    dimension: "growthArc",
    questionText: "한 달 전의 자신과 지금의 자신, SNS 스타일이 달라졌다고 느끼시나요?",
    contextType: "growth",
  },
  // Cross-Layer Paradox (4)
  {
    id: "pw-cross-01",
    layer: "cross",
    dimension: "l1l2_paradox",
    questionText: "겉으로는 사교적으로 보이지만 실제로는 내향적인 면이 있나요? 그 반대는요?",
    contextType: "paradox",
  },
  {
    id: "pw-cross-02",
    layer: "cross",
    dimension: "l1l3_paradox",
    questionText: "평소 행동 방식과 내면의 욕구 사이에 모순을 느끼는 순간이 있나요?",
    contextType: "paradox",
  },
  {
    id: "pw-cross-03",
    layer: "cross",
    dimension: "l2l3_paradox",
    questionText: "성격 특성과 삶의 방향 사이에 긴장이 있다면 어떻게 표현되나요?",
    contextType: "paradox",
  },
  {
    id: "pw-cross-04",
    layer: "cross",
    dimension: "overall_paradox",
    questionText: "자신의 SNS 페르소나에서 가장 흥미로운 모순은 무엇인가요?",
    contextType: "paradox",
  },
]

// ── 문항 선택 ──────────────────────────────────────────────────

/**
 * 인터뷰 문항 선택.
 * Golden Sample(20) 전체 + 동적 문항(최근 포스트 기반) 선택 가능.
 */
export function selectQuestions(recentPostTopics?: string[]): PWInterviewQuestion[] {
  const questions = [...PW_GOLDEN_QUESTIONS]

  // 동적 문항: 최근 포스트 토픽 기반 (옵션)
  if (recentPostTopics && recentPostTopics.length > 0) {
    const topic = recentPostTopics[0]
    questions.push({
      id: "pw-dynamic-01",
      layer: "L1",
      dimension: "stance",
      questionText: `최근 "${topic}"에 대한 포스트를 작성했는데, 이 주제에 대한 당신의 진짜 입장은 무엇인가요?`,
      contextType: "post_tone",
    })
  }

  return questions
}

// ── 판정 결과 계산 ─────────────────────────────────────────────

/**
 * 개별 판정 결과 생성.
 */
export function createJudgment(
  questionId: string,
  score: number,
  reason: string
): PWInterviewJudgment {
  const clampedScore = Math.max(0, Math.min(1, score))

  let verdict: PWInterviewJudgment["verdict"]
  if (clampedScore >= VERDICT_THRESHOLDS.pass) {
    verdict = "pass"
  } else if (clampedScore >= VERDICT_THRESHOLDS.warning) {
    verdict = "warning"
  } else {
    verdict = "fail"
  }

  return { questionId, score: round(clampedScore), verdict, reason }
}

/**
 * 인터뷰 결과 집계.
 */
export function aggregateResults(
  personaId: string,
  questions: PWInterviewQuestion[],
  judgments: PWInterviewJudgment[],
  tokenUsage: { input: number; output: number }
): PWInterviewResult {
  if (judgments.length === 0) {
    return {
      personaId,
      questions,
      judgments: [],
      overallScore: 0,
      verdict: "fail",
      failedDimensions: [],
      executedAt: new Date(),
      tokenUsage,
    }
  }

  const overallScore = round(judgments.reduce((sum, j) => sum + j.score, 0) / judgments.length)

  const failedDimensions = judgments
    .filter((j) => j.verdict === "fail")
    .map((j) => {
      const q = questions.find((q) => q.id === j.questionId)
      return q?.dimension ?? j.questionId
    })

  let verdict: PWInterviewResult["verdict"]
  if (overallScore >= VERDICT_THRESHOLDS.pass) {
    verdict = "pass"
  } else if (overallScore >= VERDICT_THRESHOLDS.warning) {
    verdict = "warning"
  } else {
    verdict = "fail"
  }

  return {
    personaId,
    questions,
    judgments,
    overallScore,
    verdict,
    failedDimensions: [...new Set(failedDimensions)],
    executedAt: new Date(),
    tokenUsage,
  }
}

// ── 적응적 스케줄링 ──────────────────────────────────────────

export type PISGrade = "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL" | "QUARANTINE"

export interface PersonaScheduleInfo {
  personaId: string
  pisGrade: PISGrade
  lastInterviewAt: Date | null
  hasRecentDeviation: boolean
}

/**
 * 인터뷰 대상 선택 (적응적 스케줄링).
 *
 * 1. PIS 등급별 주기에 따라 인터뷰 필요 여부 결정
 * 2. 최근 이탈 감지된 페르소나 우선 포함
 * 3. defaultSampleRatio 기반 랜덤 샘플링
 */
export function selectInterviewTargets(
  personas: PersonaScheduleInfo[],
  config: InterviewScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
  now: Date = new Date()
): string[] {
  const targets: string[] = []
  const remaining: PersonaScheduleInfo[] = []

  for (const p of personas) {
    // 최근 이탈 감지 → 우선 포함
    if (p.hasRecentDeviation) {
      targets.push(p.personaId)
      continue
    }

    // 등급별 주기 체크
    const intervalDays = config.gradeIntervals[p.pisGrade] ?? 7
    if (p.lastInterviewAt) {
      const daysSinceLast = (now.getTime() - p.lastInterviewAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLast >= intervalDays) {
        targets.push(p.personaId)
        continue
      }
    } else {
      // 인터뷰 이력 없으면 포함
      targets.push(p.personaId)
      continue
    }

    remaining.push(p)
  }

  // 랜덤 샘플링 (남은 것 중)
  const sampleCount = Math.max(
    0,
    Math.ceil(personas.length * config.defaultSampleRatio) - targets.length
  )

  if (sampleCount > 0 && remaining.length > 0) {
    const shuffled = [...remaining].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(sampleCount, shuffled.length); i++) {
      targets.push(shuffled[i].personaId)
    }
  }

  return [...new Set(targets)]
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
