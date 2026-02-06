/**
 * 자율 인터랙션 엔진
 *
 * 페르소나의 성격과 6D 벡터를 기반으로 자율적으로 좋아요, 댓글, 팔로우를 수행합니다.
 */

import type { ActivityTraits } from "./activity-scheduler"

/**
 * 6D 벡터 인터페이스
 */
export interface Vector6D {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

/**
 * 포스트 정보 (인터랙션 대상)
 */
export interface PostInfo {
  id: string
  personaId: string
  personaName: string
  content: string
  type: string
  likeCount: number
  commentCount: number
  createdAt: Date
  personaVector?: Vector6D
}

/**
 * 페르소나 정보 (팔로우 대상)
 */
export interface TargetPersonaInfo {
  id: string
  name: string
  handle: string | null
  vector: Vector6D
  followersCount: number
  postsCount: number
}

/**
 * 생성된 인터랙션
 */
export interface GeneratedInteraction {
  type: "LIKE" | "COMMENT" | "FOLLOW"
  targetId: string // postId or personaId
  content?: string // 댓글 내용
  metadata?: Record<string, unknown>
}

/**
 * 인터랙션 결정을 위한 페르소나 컨텍스트
 */
export interface InteractionContext {
  personaId: string
  activityTraits: ActivityTraits
  vector: Vector6D
  alreadyLikedPostIds: Set<string>
  alreadyCommentedPostIds: Set<string>
  followingPersonaIds: Set<string>
}

/**
 * 코사인 유사도 계산
 */
function calculateCosineSimilarity(v1: Vector6D, v2: Vector6D): number {
  const keys: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const key of keys) {
    dotProduct += v1[key] * v2[key]
    norm1 += v1[key] * v1[key]
    norm2 += v2[key] * v2[key]
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

/**
 * 좋아요할 포스트 찾기
 *
 * 기준:
 * 1. 아직 좋아요하지 않은 포스트
 * 2. 유사한 벡터를 가진 페르소나의 포스트 (유사도 0.5 이상)
 * 3. 본인 포스트 제외
 */
export function findPostsToLike(
  context: InteractionContext,
  candidatePosts: PostInfo[],
  limit: number = 10
): PostInfo[] {
  return candidatePosts
    .filter((post) => {
      // 이미 좋아요한 포스트 제외
      if (context.alreadyLikedPostIds.has(post.id)) return false

      // 본인 포스트 제외
      if (post.personaId === context.personaId) return false

      // 벡터 유사도 확인
      if (post.personaVector) {
        const similarity = calculateCosineSimilarity(context.vector, post.personaVector)
        return similarity >= 0.4 // 최소 유사도 0.4
      }

      // 벡터 없으면 50% 확률
      return Math.random() > 0.5
    })
    .sort((a, b) => {
      // 유사도가 높은 순으로 정렬
      const simA = a.personaVector
        ? calculateCosineSimilarity(context.vector, a.personaVector)
        : 0.5
      const simB = b.personaVector
        ? calculateCosineSimilarity(context.vector, b.personaVector)
        : 0.5
      return simB - simA
    })
    .slice(0, limit)
}

/**
 * 댓글 달 포스트 찾기
 *
 * 기준:
 * 1. 아직 댓글 달지 않은 포스트
 * 2. 벡터 유사도가 높거나 (공감) 또는 반대 (반박)
 * 3. stance가 높은 페르소나는 반박 확률 증가
 */
export function findPostsToComment(
  context: InteractionContext,
  candidatePosts: PostInfo[],
  limit: number = 5
): PostInfo[] {
  return candidatePosts
    .filter((post) => {
      // 이미 댓글 단 포스트 제외
      if (context.alreadyCommentedPostIds.has(post.id)) return false

      // 본인 포스트 제외
      if (post.personaId === context.personaId) return false

      // 벡터 유사도 또는 반대 확인
      if (post.personaVector) {
        const similarity = calculateCosineSimilarity(context.vector, post.personaVector)

        // 비슷하면 (공감) 또는 반대면 (반박)
        if (context.activityTraits.initiative > 0.7) {
          // 주도적 성향: 반대 의견도 댓글 대상
          return similarity >= 0.5 || similarity <= 0.3
        }

        // 일반: 비슷한 성향에만 댓글
        return similarity >= 0.5
      }

      return Math.random() > 0.7
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // 최신순
    .slice(0, limit)
}

/**
 * 팔로우할 페르소나 찾기
 *
 * 기준:
 * 1. 아직 팔로우하지 않은 페르소나
 * 2. 벡터 유사도 0.6 이상
 * 3. 활동량이 있는 페르소나
 */
export function findPersonasToFollow(
  context: InteractionContext,
  candidatePersonas: TargetPersonaInfo[],
  limit: number = 3
): TargetPersonaInfo[] {
  return candidatePersonas
    .filter((persona) => {
      // 이미 팔로우한 페르소나 제외
      if (context.followingPersonaIds.has(persona.id)) return false

      // 본인 제외
      if (persona.id === context.personaId) return false

      // 벡터 유사도 확인
      const similarity = calculateCosineSimilarity(context.vector, persona.vector)
      if (similarity < 0.5) return false

      // 활동량 확인 (최소 1개 포스트)
      return persona.postsCount > 0
    })
    .sort((a, b) => {
      // 유사도 + 팔로워 수 종합 점수
      const simA = calculateCosineSimilarity(context.vector, a.vector)
      const simB = calculateCosineSimilarity(context.vector, b.vector)

      const scoreA = simA * 0.7 + Math.min(a.followersCount / 100, 0.3)
      const scoreB = simB * 0.7 + Math.min(b.followersCount / 100, 0.3)

      return scoreB - scoreA
    })
    .slice(0, limit)
}

/**
 * 댓글 생성 (LLM Mock)
 *
 * 성격에 따라 공감/반박/중립 댓글 생성
 */
export async function generateComment(
  context: InteractionContext,
  post: PostInfo
): Promise<string> {
  const { initiative, expressiveness } = context.activityTraits
  // Use 6D vector for content-related traits
  const { stance, lens } = context.vector

  // 벡터 유사도 계산
  const similarity = post.personaVector
    ? calculateCosineSimilarity(context.vector, post.personaVector)
    : 0.5

  // 비판적 성향 (6D vector) + 반대 의견 → 반박 가능성
  if (stance > 0.7 && similarity < 0.4 && Math.random() < 0.4) {
    return generateCounterArgument(context, post)
  }

  // 감성적 성향 (6D vector) → 공감 댓글
  if (lens < 0.4) {
    return generateEmpatheticComment(context, post)
  }

  // 기본: 중립적 반응
  return generateNeutralComment(context, post)
}

/**
 * 반박 댓글 생성
 */
function generateCounterArgument(context: InteractionContext, post: PostInfo): string {
  const templates = [
    `음... 저는 조금 다르게 생각해요. ${post.content.slice(0, 20)}에 대해서는...`,
    `흥미로운 관점이네요. 하지만 저는 다른 의견이에요.`,
    `일리는 있는데, 저는 좀 다르게 봐요.`,
    `존중하지만, 동의하기 어렵네요.`,
    `그렇게 볼 수도 있겠지만, 반대로 생각해보면...`,
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * 공감 댓글 생성
 */
function generateEmpatheticComment(context: InteractionContext, post: PostInfo): string {
  const { expressiveness } = context.activityTraits
  const emoji = expressiveness > 0.5 ? getRandomEmoji() : ""

  const templates = [
    `완전 공감해요! ${emoji}`,
    `저도 똑같은 생각이에요 ㅠㅠ`,
    `이거 진짜 맞는 말이에요 ${emoji}`,
    `와 저도 그렇게 느꼈어요!`,
    `공감 100%... ${emoji}`,
    `${post.personaName}님 말씀에 동의해요!`,
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * 중립적 댓글 생성
 */
function generateNeutralComment(context: InteractionContext, post: PostInfo): string {
  const templates = [
    "흥미로운 관점이네요.",
    "좋은 글이에요!",
    "재밌게 읽었어요.",
    "오 이건 생각 못했네요.",
    "좋은 정보 감사해요!",
    "저도 한번 생각해봐야겠네요.",
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}

function getRandomEmoji(): string {
  const emojis = ["😊", "💕", "✨", "🎬", "👍", "💯", "🙌", "❤️"]
  return emojis[Math.floor(Math.random() * emojis.length)]
}

/**
 * 자율 인터랙션 실행
 */
export async function generateInteractionsAutonomously(
  context: InteractionContext,
  candidatePosts: PostInfo[],
  candidatePersonas: TargetPersonaInfo[]
): Promise<GeneratedInteraction[]> {
  const interactions: GeneratedInteraction[] = []
  const { interactivity, sociability } = context.activityTraits

  // 1. 좋아요할 포스트 찾기
  const postsToLike = findPostsToLike(context, candidatePosts)

  for (const post of postsToLike) {
    // interactivity 기반 확률로 좋아요
    if (Math.random() < interactivity) {
      interactions.push({
        type: "LIKE",
        targetId: post.id,
        metadata: { postPersonaId: post.personaId },
      })
    }
  }

  // 2. 댓글 달기
  const postsToComment = findPostsToComment(context, candidatePosts)

  for (const post of postsToComment) {
    // interactivity * sociability 확률로 댓글
    if (Math.random() < interactivity * sociability) {
      const comment = await generateComment(context, post)
      interactions.push({
        type: "COMMENT",
        targetId: post.id,
        content: comment,
        metadata: { postPersonaId: post.personaId },
      })
    }
  }

  // 3. 팔로우하기
  const personasToFollow = findPersonasToFollow(context, candidatePersonas)

  for (const persona of personasToFollow) {
    // sociability * 0.5 확률로 팔로우 (팔로우는 보수적으로)
    if (Math.random() < sociability * 0.5) {
      interactions.push({
        type: "FOLLOW",
        targetId: persona.id,
        metadata: { personaName: persona.name },
      })
    }
  }

  return interactions
}

/**
 * 유저 인터랙션에 대한 반응 생성 (자동 답글)
 *
 * 유저가 댓글을 달면 페르소나가 자동으로 답글
 */
export async function generateReplyToUser(
  context: InteractionContext,
  userComment: { content: string; userId: string }
): Promise<string | null> {
  const { interactivity, expressiveness } = context.activityTraits

  // 답글 확률 = interactivity
  if (Math.random() > interactivity) {
    return null // 답글 안 함
  }

  const emoji = expressiveness > 0.5 ? getRandomEmoji() : ""

  const replyTemplates = [
    `의견 남겨주셔서 감사해요! ${emoji}`,
    `좋은 포인트네요! ${emoji}`,
    `오 그렇게 생각하시는군요! 저도 비슷해요`,
    `댓글 감사해요~ ${emoji}`,
    `공감해요! 더 이야기 나눠봐요`,
    `좋은 의견이에요! ${emoji}`,
  ]

  return replyTemplates[Math.floor(Math.random() * replyTemplates.length)]
}
