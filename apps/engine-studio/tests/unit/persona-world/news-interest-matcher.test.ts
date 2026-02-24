// ═══════════════════════════════════════════════════════════════
// T196 — News Interest Matcher 단위 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  computeNewsInterestScore,
  selectPersonasForArticle,
  INTEREST_THRESHOLD,
} from "@/lib/persona-world/news/news-interest-matcher"
import type {
  ArticleForMatching,
  PersonaForMatching,
} from "@/lib/persona-world/news/news-interest-matcher"

// ── 픽스처 ────────────────────────────────────────────────────

const AI_ARTICLE: ArticleForMatching = {
  topicTags: ["AI", "규제", "기술정책"],
  summary: "인공지능 기본법이 국회를 통과했다. AI 개발자들의 반응은 엇갈린다.",
  region: "KR",
}

const POLITICS_ARTICLE: ArticleForMatching = {
  topicTags: ["정치", "선거", "국회"],
  summary: "내년 대선을 앞두고 여야가 경선 일정을 확정했다.",
  region: "KR",
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

// ── 테스트 ────────────────────────────────────────────────────

describe("computeNewsInterestScore", () => {
  describe("관심도 점수 계산", () => {
    it("AI 전문가 + AI 뉴스 → 높은 점수", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, AI_EXPERT)
      expect(result.score).toBeGreaterThan(0.5)
      expect(result.personaId).toBe("persona-ai")
    })

    it("AI 전문가 + 정치 뉴스 → 낮은 점수 (분야 무관)", () => {
      const result = computeNewsInterestScore(POLITICS_ARTICLE, AI_EXPERT)
      // 태그 오버랩 낮음, openness/extraversion만 기여
      expect(result.score).toBeLessThan(0.7)
    })

    it("정치 전문가 + 정치 뉴스 → threshold 이상 점수 (한/영 키워드 부분 매칭)", () => {
      const result = computeNewsInterestScore(POLITICS_ARTICLE, POLITICS_PERSONA)
      // 한국어 태그 "정치" vs 영어 "politics" → 직접 매칭 안 되지만 openness+extraversion 기여
      expect(result.score).toBeGreaterThan(INTEREST_THRESHOLD)
    })

    it("내향적 푸드 블로거 + AI 뉴스 → 낮은 점수 (낮은 openness + extraversion)", () => {
      const result = computeNewsInterestScore(AI_ARTICLE, INTROVERT_PERSONA)
      // tagOverlap 거의 0, openness 0.2, extraversion 0.1 → 매우 낮음
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
      }
      const result = computeNewsInterestScore(emptyTagArticle, AI_EXPERT)
      // tagOverlap = 0.1 (최소값)
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
    // AI 전문가가 첫 번째여야 함
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
    // 모든 결과가 threshold 이상이어야 함
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(INTEREST_THRESHOLD)
    }
  })

  it("매우 높은 임계값에서는 결과 없음", () => {
    // threshold = 0.99 → 사실상 불가능한 점수 → 빈 배열
    const results = selectPersonasForArticle(AI_ARTICLE, allPersonas, 0.99)
    expect(results).toHaveLength(0)
  })

  it("페르소나 없으면 빈 배열 반환", () => {
    const results = selectPersonasForArticle(AI_ARTICLE, [], INTEREST_THRESHOLD)
    expect(results).toHaveLength(0)
  })

  it("모든 페르소나가 threshold 미달이면 빈 배열", () => {
    // 태그 없는 GLOBAL 기사 + 내향적 전문분야 불일치 페르소나
    const emptyArticle: ArticleForMatching = { topicTags: [], summary: "", region: "GLOBAL" }
    // 내향적 페르소나만 사용
    const results = selectPersonasForArticle(emptyArticle, [INTROVERT_PERSONA], INTEREST_THRESHOLD)
    // score = 0.1*0.35 + 0.2*0.25 + 0.1*0.25 + 0.3*0.15 = 0.035+0.05+0.025+0.045 = 0.155 < 0.25
    expect(results).toHaveLength(0)
  })
})
