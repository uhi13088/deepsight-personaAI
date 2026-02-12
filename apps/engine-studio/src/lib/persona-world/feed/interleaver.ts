// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Feed Interleaver
// 구현계획서 §7, 설계서 §6.5
// 같은 Tier 연속 방지, 다양성 보장
// F F B F F E F F F F B F T ...
// ═══════════════════════════════════════════════════════════════

import type { FeedPost, FeedSource } from "../types"

/**
 * 피드 인터리빙.
 *
 * 설계서 §6.5:
 * - 같은 Tier(source)의 포스트가 연속되지 않도록 교차 배치
 * - Following이 기본, 사이사이에 Basic/Exploration/Advanced/Trending 삽입
 *
 * 알고리즘:
 * 1. Following 포스트를 기본 슬롯으로 배치
 * 2. non-Following 포스트를 2~3 Following마다 1개씩 삽입
 * 3. 같은 source가 연속 3회 이상 나오지 않도록
 */
export function interleaveFeed(
  following: FeedPost[],
  basic: FeedPost[],
  exploration: FeedPost[],
  advanced: FeedPost[],
  trending: FeedPost[]
): FeedPost[] {
  // non-following 포스트를 하나의 큐로 합침 (번갈아가며 추출)
  const nonFollowing = interleaveQueues([basic, exploration, trending, advanced])

  if (following.length === 0) return nonFollowing
  if (nonFollowing.length === 0) return following

  const result: FeedPost[] = []
  let fIdx = 0
  let nIdx = 0

  // Following 2개마다 non-following 1개 삽입 패턴
  while (fIdx < following.length || nIdx < nonFollowing.length) {
    // Following 2개 삽입
    for (let i = 0; i < 2 && fIdx < following.length; i++) {
      result.push(following[fIdx++])
    }

    // Non-following 1개 삽입
    if (nIdx < nonFollowing.length) {
      result.push(nonFollowing[nIdx++])
    }
  }

  return result
}

/**
 * 여러 큐를 라운드 로빈으로 인터리빙.
 *
 * [A1, A2, A3], [B1, B2], [C1] → [A1, B1, C1, A2, B2, A3]
 */
function interleaveQueues(queues: FeedPost[][]): FeedPost[] {
  const result: FeedPost[] = []
  const maxLen = Math.max(0, ...queues.map((q) => q.length))

  for (let i = 0; i < maxLen; i++) {
    for (const queue of queues) {
      if (i < queue.length) {
        result.push(queue[i])
      }
    }
  }

  return result
}
