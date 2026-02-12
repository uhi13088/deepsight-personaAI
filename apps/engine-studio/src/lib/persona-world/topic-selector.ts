// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Topic Selector
// 구현계획서 §5.3, 설계서 §4.7
// 포스트 주제 선택 우선순위: 트리거 → 관심사 연속 → 벡터 매칭 → 자유 주제
// ═══════════════════════════════════════════════════════════════

import type { SchedulerContext, SchedulerTrigger } from "./types"

/**
 * 주제 선택 결과.
 */
export interface TopicSelectionResult {
  topic: string | null
  source: "trigger" | "interest_continuity" | "vector_matching" | "free"
  confidence: number // 0.0~1.0
}

/**
 * 주제 선택에 필요한 외부 데이터 인터페이스.
 *
 * 실제 DB/RAG 조회는 T106~T107에서 구현.
 * 이 인터페이스를 통해 의존성을 주입받음.
 */
export interface TopicDataProvider {
  /** 트리거 데이터에서 주제 추출 */
  getTopicFromTrigger(
    trigger: SchedulerTrigger,
    triggerData?: SchedulerContext["triggerData"]
  ): Promise<string | null>

  /** RAG 기반 관심사 연속성 주제 조회 (최근 좋아요/리포스트에서 추출) */
  getInterestContinuityTopic(personaId: string): Promise<string | null>

  /** L1 벡터 매칭 기반 주제 조회 (콘텐츠 DB에서 유사 주제 랜덤) */
  getVectorMatchingTopic(personaId: string): Promise<string | null>
}

/**
 * 포스트 주제를 우선순위에 따라 선택.
 *
 * 설계서 §4.7 우선순위:
 * 1. 트리거 기반 (CONTENT_RELEASE, TRENDING)
 * 2. 관심사 연속성 (RAG)
 * 3. L1 벡터 매칭 (콘텐츠 DB)
 * 4. 자유 주제 (LLM 자율)
 */
export async function selectTopic(
  personaId: string,
  trigger: SchedulerTrigger,
  provider: TopicDataProvider,
  triggerData?: SchedulerContext["triggerData"]
): Promise<TopicSelectionResult> {
  // 1. 트리거 기반 (CONTENT_RELEASE, TRENDING)
  if (trigger === "CONTENT_RELEASE" || trigger === "TRENDING") {
    const triggerTopic = await provider.getTopicFromTrigger(trigger, triggerData)
    if (triggerTopic) {
      return {
        topic: triggerTopic,
        source: "trigger",
        confidence: 1.0,
      }
    }
  }

  // 2. 관심사 연속성 (RAG)
  const interestTopic = await provider.getInterestContinuityTopic(personaId)
  if (interestTopic) {
    return {
      topic: interestTopic,
      source: "interest_continuity",
      confidence: 0.8,
    }
  }

  // 3. L1 벡터 매칭 (콘텐츠 DB)
  const vectorTopic = await provider.getVectorMatchingTopic(personaId)
  if (vectorTopic) {
    return {
      topic: vectorTopic,
      source: "vector_matching",
      confidence: 0.6,
    }
  }

  // 4. 자유 주제 (LLM 자율 — topic null)
  return {
    topic: null,
    source: "free",
    confidence: 0.4,
  }
}

/**
 * 트리거 타입이 주제를 강제하는지 여부.
 */
export function isTriggerBasedTopic(trigger: SchedulerTrigger): boolean {
  return trigger === "CONTENT_RELEASE" || trigger === "TRENDING"
}
