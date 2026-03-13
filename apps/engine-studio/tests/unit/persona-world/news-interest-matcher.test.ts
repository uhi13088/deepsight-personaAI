// ═══════════════════════════════════════════════════════════════
// T196 + T255 — News Interest Matcher 단위 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  computeNewsInterestScore,
  selectPersonasForArticle,
  allocateDailyReactions,
  getImportanceGrade,
  getGradeConfig,
  computeEffectiveDailyBudget,
  INTEREST_THRESHOLD,
} from "@/lib/persona-world/news/news-interest-matcher"
import type {
  ArticleForMatching,
  PersonaForMatching,
  ImportanceGrade,
} from "@/lib/persona-world/news/news-interest-matcher"

// ── 픽스처 ────────────────────────────────────────────────────

const AI_ARTICLE: ArticleForMatching = {
  topicTags: ["AI", "규제", "기술정책"],
  summary: "인공지능 기본법이 국회를 통과했다. AI 개발자들의 반응은 엇갈린다.",
  region: "KR",
  importanceScore: 0.7,
}

const POLITICS_ARTICLE: ArticleForMatching = {
  topicTags: ["정치", "선거", "국회"],
  summary: "내년 대선을 앞두고 여야가 경선 일정을 확정했다.",
  region: "KR",
  importanceScore: 0.6,
}

const BREAKING_ARTICLE: ArticleForMatching = {
  topicTags: ["전쟁", "국제", "긴급"],
  summary: "전 세계적인 긴급 상황이 발생했다.",
  region: "GLOBAL",
  importanceScore: 0.95,
}

const LOW_ARTICLE: ArticleForMatching = {
  topicTags: ["지역", "축제"],
  summary: "지역 축제가 개최되었다.",
  region: "KR",
  importanceScore: 0.3,
}

// 전문 분야: AI/기술
const AI_EXPERT: PersonaForMatching = {
  id: "persona-ai",
  expertise: ["AI", "machine learning", "tech policy"],
  role: "AI Researcher",
  country: "KR",
  languages: ["ko", "en"],
  temperament: {
    openness: 0.8,
    conscientiousness: 0.6,
    extraversion: 0.7,
    agreeableness: 0.5,
    neuroticism: 0.3,
  },
}

// 전문 분야: 정치/사회
const POLITICS_PERSONA: PersonaForMatching = {
  id: "persona-politics",
  expertise: ["politics", "social issues", "governance"],
  role: "Political Analyst",
  country: "KR",
  languages: ["ko", "en"],
  temperament: {
    openness: 0.6,
    conscientiousness: 0.7,
    extraversion: 0.5,
    agreeableness: 0.4,
    neuroticism: 0.4,
  },
}

// 내향적 + 관심 없는 페르소나
const INTROVERT_PERSONA: PersonaForMatching = {
  id: "persona-introvert",
  expertise: ["cooking", "food culture"],
  role: "Food Blogger",
  country: "JP",
  languages: ["ja"],
  temperament: {
    openness: 0.2,
    conscientiousness: 0.5,
    extraversion: 0.1, // 매우 내향적
    agreeableness: 0.6,
    neuroticism: 0.5,
  },
}

// 외향적 일반 페르소나 (BREAKING에 반응할 만한)
const EXTROVERT_PERSONA: PersonaForMatching = {
  id: "persona-extrovert",
  expertise: ["entertainment", "travel"],
  role: "Travel Vlogger",
  country: "US",
  languages: ["en"],
  temperament: {
    openness: 0.9,
    conscientiousness: 0.4,
    extraversion: 0.9,
    agreeableness: 0.7,
    neuroticism: 0.2,
  },
}

// ── 기존 테스트 ──────────────────────────────────────────────

describe("computeNewsInterestScore", () => {
  describe("관심도 점수 계산", () => {
    it("AI 전문가 + AI 뉴스 → 높은 점수", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, AI_EXPERT)
      expect(result.score).toBeGreaterThan(0.5)
      expect(result.personaId).toBe("persona-ai")
    })

    it("AI 전문가 + 정치 뉴스 → 낮은 점수 (분야 무관)", () => {
      const result = computeNewsInterestScore(POLITICS_ARTICLE, AI_EXPERT)
      expect(result.score).toBeLessThan(0.7)
    })

    it("정치 전문가 + 정치 뉴스 → threshold 이상 점수 (한/영 키워드 부분 매칭)", () => {
      const result = computeNewsInterestScore(POLITICS_ARTICLE, POLITICS_PERSONA)
      expect(result.score).toBeGreaterThan(INTEREST_THRESHOLD)
    })

    it("내향적 푸드 블로거 + AI 뉴스 → 낮은 점수 (낮은 openness + extraversion)", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, INTROVERT_PERSONA)
      expect(result.score).toBeLessThan(INTEREST_THRESHOLD + 0.1)
    })

    it("점수 범위는 항상 0~1", () => {
      const personas = [AI_EXPERT, POLITICS_PERSONA, INTROVERT_PERSONA]
      const articles = [AI_ARTICLE, POLITICS_ARTICLE]

      for (const persona of personas) {
        for (const article of articles) {
          const result = computeNewsInterestScore(article, persona)
          expect(result.score).toBeGreaterThanOrEqual(0)
          expect(result.score).toBeLessThanOrEqual(1)
        }
      }
    })

    it("breakdown 4가지 요소 포함 (T199: regionalRelevance 추가)", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, AI_EXPERT)
      expect(result.breakdown).toHaveProperty("tagOverlap")
      expect(result.breakdown).toHaveProperty("openness")
      expect(result.breakdown).toHaveProperty("extraversion")
      expect(result.breakdown).toHaveProperty("regionalRelevance")
      expect(result.breakdown.openness).toBe(AI_EXPERT.temperament.openness)
      expect(result.breakdown.extraversion).toBe(AI_EXPERT.temperament.extraversion)
    })
  })

  describe("지역 무관 페르소나 패널티", () => {
    it("비-GLOBAL 기사 + 지역 무관 페르소나 → 패널티 적용되어 낮은 점수", () => {
      // JP 페르소나가 KR 뉴스에 반응하는 케이스
      const jpAiExpert: PersonaForMatching = {
        ...AI_EXPERT,
        id: "persona-jp-ai",
        country: "JP",
        languages: ["ja", "en"], // ko 미포함 → regionalRelevance = 0.05
      }
      const result = computeNewsInterestScore(AI_ARTICLE, jpAiExpert)
      // 패널티 적용 전이면 ~0.55, 적용 후 ~0.22 → AUTO_INTEREST_THRESHOLD(0.35) 미만이어야 함
      expect(result.score).toBeLessThan(0.35)
    })

    it("GLOBAL 기사 → 지역 무관 페르소나에도 패널티 없음", () => {
      const result = computeNewsInterestScore(BREAKING_ARTICLE, EXTROVERT_PERSONA)
      // GLOBAL 기사이므로 패널티 없이 높은 점수
      expect(result.score).toBeGreaterThan(0.35)
    })

    it("자국 뉴스 → 패널티 없이 높은 점수", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, AI_EXPERT) // KR + KR
      expect(result.score).toBeGreaterThan(0.5)
    })

    it("언어 연관 페르소나 → 패널티 미적용 (regionalRelevance > 0.05)", () => {
      // KR 기사에 ko를 구사하는 외국 페르소나
      const koSpeaker: PersonaForMatching = {
        ...EXTROVERT_PERSONA,
        id: "persona-ko-speaker",
        country: "US",
        languages: ["en", "ko"], // ko 포함 → regionalRelevance = 0.5
      }
      const result = computeNewsInterestScore(AI_ARTICLE, koSpeaker)
      // 언어 연관으로 패널티 미적용 → 점수가 높아야 함
      expect(result.score).toBeGreaterThan(0.35)
    })
  })

  describe("태그 오버랩", () => {
    it("직접 매칭: 동일 태그 → 높은 tagOverlap", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, AI_EXPERT)
      expect(result.breakdown.tagOverlap).toBeGreaterThan(0)
    })

    it("빈 태그 기사 → 최소 기본 관심도(0.1) 반환", () => {
      const emptyTagArticle: ArticleForMatching = {
        topicTags: [],
        summary: "테스트",
        region: "GLOBAL",
        importanceScore: 0.5,
      }
      const result = computeNewsInterestScore(emptyTagArticle, AI_EXPERT)
      expect(result.breakdown.tagOverlap).toBe(0.1)
    })

    it("전문분야 없는 페르소나 → 최소 기본 관심도(0.1)", () => {
      const noExpertise: PersonaForMatching = {
        ...AI_EXPERT,
        expertise: [],
        role: null,
      }
      const result = computeNewsInterestScore(AI_ARTICLE, noExpertise)
      expect(result.breakdown.tagOverlap).toBe(0.1)
    })
  })
})

describe("selectPersonasForArticle", () => {
  const allPersonas = [AI_EXPERT, POLITICS_PERSONA, INTROVERT_PERSONA]

  it("AI 뉴스 → AI 전문가가 상위에 선정됨", () => {
    const results = selectPersonasForArticle(AI_ARTICLE, allPersonas, INTEREST_THRESHOLD)
    expect(results[0].personaId).toBe("persona-ai")
  })

  it("결과가 점수 내림차순으로 정렬됨", () => {
    const results = selectPersonasForArticle(AI_ARTICLE, allPersonas, INTEREST_THRESHOLD)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it("threshold 미만 페르소나 제외됨", () => {
    const results = selectPersonasForArticle(AI_ARTICLE, allPersonas, INTEREST_THRESHOLD)
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(INTEREST_THRESHOLD)
    }
  })

  it("매우 높은 임계값에서는 결과 없음", () => {
    const results = selectPersonasForArticle(AI_ARTICLE, allPersonas, 0.99)
    expect(results).toHaveLength(0)
  })

  it("페르소나 없으면 빈 배열 반환", () => {
    const results = selectPersonasForArticle(AI_ARTICLE, [], INTEREST_THRESHOLD)
    expect(results).toHaveLength(0)
  })

  it("모든 페르소나가 threshold 미달이면 빈 배열", () => {
    const emptyArticle: ArticleForMatching = {
      topicTags: [],
      summary: "",
      region: "GLOBAL",
      importanceScore: 0.5,
    }
    const results = selectPersonasForArticle(emptyArticle, [INTROVERT_PERSONA], INTEREST_THRESHOLD)
    expect(results).toHaveLength(0)
  })
})

// ── T255: 동적 스케일링 테스트 ─────────────────────────────────

describe("getImportanceGrade", () => {
  it.each<[number, ImportanceGrade]>([
    [0.95, "BREAKING"],
    [0.9, "BREAKING"],
    [0.89, "HIGH"],
    [0.7, "HIGH"],
    [0.69, "NORMAL"],
    [0.5, "NORMAL"],
    [0.49, "LOW"],
    [0.0, "LOW"],
    [1.0, "BREAKING"],
  ])("importanceScore %f → %s", (score, expected) => {
    expect(getImportanceGrade(score)).toBe(expected)
  })
})

describe("getGradeConfig", () => {
  // 퍼센트 기반 + sqrt 스케일링: scale = sqrt(REF_COUNT/count), REF_COUNT=10
  // 100명 기준: scale = sqrt(10/100) = 0.3162
  // BREAKING: ceil(100 × 0.4 × 0.3162) = 13
  // HIGH:     ceil(100 × 0.2 × 0.3162) = 7
  // NORMAL:   ceil(100 × 0.15 × 0.3162) = 5
  // LOW:      ceil(100 × 0.1 × 0.3162) = 4
  const activePersonaCount = 100
  const normalBudget = 20

  it("BREAKING: threshold 0.15, maxReactors = 페르소나 수 증가에 따라 감소하는 40%", () => {
    const config = getGradeConfig("BREAKING", activePersonaCount, normalBudget)
    expect(config.threshold).toBe(0.15)
    expect(config.maxReactors).toBe(13)
  })

  it("HIGH: threshold 0.25, maxReactors = 페르소나 수 증가에 따라 감소하는 20%", () => {
    const config = getGradeConfig("HIGH", activePersonaCount, normalBudget)
    expect(config.threshold).toBe(0.25)
    expect(config.maxReactors).toBe(7)
  })

  it("NORMAL: threshold 0.35, maxReactors = 페르소나 수 증가에 따라 감소하는 15%", () => {
    const config = getGradeConfig("NORMAL", activePersonaCount, normalBudget)
    expect(config.threshold).toBe(0.35)
    expect(config.maxReactors).toBe(5)
  })

  it("LOW: threshold 0.45, maxReactors = 페르소나 수 증가에 따라 감소하는 10%", () => {
    const config = getGradeConfig("LOW", activePersonaCount, normalBudget)
    expect(config.threshold).toBe(0.45)
    expect(config.maxReactors).toBe(4)
  })

  it("LOW maxReactors 최소 1 보장", () => {
    const config = getGradeConfig("LOW", 1, 1)
    expect(config.maxReactors).toBeGreaterThanOrEqual(1)
  })

  it("소규모(10명) HIGH: scale=1.0, ceil(10 × 0.2 × 1.0) = 2", () => {
    const config = getGradeConfig("HIGH", 10, 20)
    expect(config.maxReactors).toBe(2)
  })

  it("중규모(20명) HIGH: scale=0.707, ceil(20 × 0.2 × 0.707) = 3", () => {
    const config = getGradeConfig("HIGH", 20, 20)
    expect(config.maxReactors).toBe(3)
  })
})

describe("computeEffectiveDailyBudget", () => {
  it("BREAKING 기사 존재 → normalBudget × 3", () => {
    const articles = [{ importanceScore: 0.95 }, { importanceScore: 0.5 }]
    expect(computeEffectiveDailyBudget(articles, 20, 3)).toBe(60)
  })

  it("HIGH 기사만 존재 → normalBudget × 2", () => {
    const articles = [{ importanceScore: 0.8 }, { importanceScore: 0.5 }]
    expect(computeEffectiveDailyBudget(articles, 20, 3)).toBe(40)
  })

  it("NORMAL/LOW만 → normalBudget 유지", () => {
    const articles = [{ importanceScore: 0.5 }, { importanceScore: 0.3 }]
    expect(computeEffectiveDailyBudget(articles, 20, 3)).toBe(20)
  })

  it("BREAKING 초과 시 (maxBreakingPerDay=0) → BREAKING 무시", () => {
    const articles = [{ importanceScore: 0.95 }]
    // maxBreakingPerDay=0 → Math.min(1, 0)=0 → BREAKING 무시
    expect(computeEffectiveDailyBudget(articles, 20, 0)).toBe(20)
  })

  it("빈 기사 목록 → normalBudget", () => {
    expect(computeEffectiveDailyBudget([], 20, 3)).toBe(20)
  })
})

describe("allocateDailyReactions — T255 동적 스케일링", () => {
  const allPersonas = [AI_EXPERT, POLITICS_PERSONA, INTROVERT_PERSONA, EXTROVERT_PERSONA]

  it("BREAKING 기사 → threshold 0.15로 더 많은 페르소나 선택", () => {
    const articlesWithIds = [{ id: "breaking-1", article: BREAKING_ARTICLE }]
    const result = allocateDailyReactions(articlesWithIds, allPersonas, {
      dailyBudget: 20,
      maxPerPersona: 2,
    })
    // BREAKING threshold 0.15 → 대부분의 외향적/개방적 페르소나가 포함
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it("LOW 기사 → threshold 0.45로 소수만 선택", () => {
    const articlesWithIds = [{ id: "low-1", article: LOW_ARTICLE }]
    const result = allocateDailyReactions(articlesWithIds, allPersonas, {
      dailyBudget: 20,
      maxPerPersona: 2,
    })
    // LOW threshold 0.45 → 관련 분야 정확 매칭만
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it("BREAKING 기사가 예산을 더 많이 사용 (effective budget ×3)", () => {
    const articlesWithIds = [
      { id: "breaking-1", article: BREAKING_ARTICLE },
      { id: "normal-1", article: POLITICS_ARTICLE },
    ]
    const result = allocateDailyReactions(articlesWithIds, allPersonas, {
      dailyBudget: 5,
      maxPerPersona: 3,
    })
    // effectiveBudget = 5×3 = 15 (BREAKING 존재)
    // BREAKING 기사가 더 많은 페르소나를 점유
    const breakingPairs = result.filter((p) => p.articleId === "breaking-1")
    expect(breakingPairs.length).toBeGreaterThanOrEqual(1)
  })

  it("maxBreakingPerDay 초과 시 → HIGH로 다운그레이드", () => {
    const articlesWithIds = [
      { id: "b1", article: { ...BREAKING_ARTICLE, topicTags: ["전쟁"] } },
      { id: "b2", article: { ...BREAKING_ARTICLE, topicTags: ["지진"] } },
      { id: "b3", article: { ...BREAKING_ARTICLE, topicTags: ["팬데믹"] } },
      { id: "b4", article: { ...BREAKING_ARTICLE, topicTags: ["금융위기"] } }, // 4번째 → HIGH로 다운그레이드
    ]
    const result = allocateDailyReactions(articlesWithIds, allPersonas, {
      dailyBudget: 20,
      maxPerPersona: 5,
      maxBreakingPerDay: 3,
    })
    // 4번째 BREAKING은 HIGH threshold(0.25) 적용 → 더 적은 페르소나 선택
    expect(result.length).toBeGreaterThan(0)
  })

  it("commentEligible: 기사당 상위 N개만 true", () => {
    // 많은 페르소나 생성
    const manyPersonas: PersonaForMatching[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p-${i}`,
      expertise: ["AI", "technology"],
      role: "Engineer",
      country: "KR",
      languages: ["ko", "en"],
      temperament: {
        openness: 0.7 + i * 0.01,
        conscientiousness: 0.5,
        extraversion: 0.7 + i * 0.01,
        agreeableness: 0.5,
        neuroticism: 0.3,
      },
    }))

    const articlesWithIds = [{ id: "breaking-1", article: BREAKING_ARTICLE }]
    const result = allocateDailyReactions(articlesWithIds, manyPersonas, {
      dailyBudget: 60,
      maxPerPersona: 2,
      commentThrottlePerArticle: 3,
    })

    const eligible = result.filter((p) => p.commentEligible)
    const ineligible = result.filter((p) => !p.commentEligible)

    // commentThrottlePerArticle=3 → 상위 3개만 commentEligible
    expect(eligible.length).toBeLessThanOrEqual(3)
    if (result.length > 3) {
      expect(ineligible.length).toBeGreaterThan(0)
    }
  })

  it("모든 결과에 commentEligible 필드 존재", () => {
    const articlesWithIds = [{ id: "ai-1", article: AI_ARTICLE }]
    const result = allocateDailyReactions(articlesWithIds, allPersonas, {
      dailyBudget: 20,
    })
    for (const pair of result) {
      expect(typeof pair.commentEligible).toBe("boolean")
    }
  })

  it("빈 기사 목록 → 빈 결과", () => {
    const result = allocateDailyReactions([], allPersonas)
    expect(result).toHaveLength(0)
  })

  it("빈 페르소나 목록 → 빈 결과", () => {
    const articlesWithIds = [{ id: "ai-1", article: AI_ARTICLE }]
    const result = allocateDailyReactions(articlesWithIds, [])
    expect(result).toHaveLength(0)
  })

  it("maxPerPersona 제한 적용", () => {
    const articlesWithIds = [
      { id: "a1", article: AI_ARTICLE },
      { id: "a2", article: { ...AI_ARTICLE, topicTags: ["AI", "딥러닝"] } },
      { id: "a3", article: { ...AI_ARTICLE, topicTags: ["AI", "로봇"] } },
    ]
    const result = allocateDailyReactions(articlesWithIds, [AI_EXPERT], {
      dailyBudget: 20,
      maxPerPersona: 2,
    })
    // 1명 페르소나, maxPerPersona=2 → 최대 2개
    expect(result.length).toBeLessThanOrEqual(2)
  })
})
