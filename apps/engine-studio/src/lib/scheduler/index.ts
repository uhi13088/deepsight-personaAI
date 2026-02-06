/**
 * 자율 활동 스케줄러 통합 모듈
 *
 * 페르소나들의 자율적인 SNS 활동을 관리합니다.
 */

import { prisma } from "@/lib/prisma"
import {
  type ActivityTraits,
  type ActivitySchedule,
  calculatePostProbability,
  calculateInteractionProbability,
  isActiveTimeForPersona,
  getDefaultActiveHours,
  getDefaultPeakHours,
  deriveActivityTraitsFromVector,
} from "./activity-scheduler"
import { generateAndPostAutonomously, type PersonaInfo, type GeneratedPost } from "./posting-engine"
import {
  generateInteractionsAutonomously,
  type InteractionContext,
  type GeneratedInteraction,
  type PostInfo,
  type TargetPersonaInfo,
  type Vector6D,
} from "./interaction-engine"
import { onContentRelease, type ContentInfo, type ScheduledReaction } from "./content-trigger"
import {
  reactToTrendingTopics,
  detectTrendingTopics,
  type TrendingTopic,
  type TrendingReaction,
} from "./trending-reactor"

// Re-export all types
export * from "./activity-scheduler"
export * from "./posting-engine"
export * from "./interaction-engine"
export * from "./content-trigger"
export * from "./trending-reactor"

/**
 * 스케줄러 상태
 */
export interface SchedulerStatus {
  isRunning: boolean
  isPaused: boolean
  lastRunAt: Date | null
  nextRunAt: Date | null
  stats: {
    totalPostsToday: number
    totalInteractionsToday: number
    activePersonasNow: number
    errorCount: number
  }
}

/**
 * 스케줄러 실행 결과
 */
export interface SchedulerRunResult {
  success: boolean
  timestamp: Date
  postsCreated: number
  interactionsCreated: {
    likes: number
    comments: number
    follows: number
  }
  trendingReactions: number
  errors: string[]
}

// 스케줄러 상태 (메모리 내 저장)
let schedulerState = {
  isRunning: false,
  isPaused: false,
  lastRunAt: null as Date | null,
  statsToday: {
    posts: 0,
    interactions: 0,
    errors: 0,
    resetAt: new Date().toDateString(),
  },
}

/**
 * 스케줄러 상태 조회
 */
export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  // 활성 페르소나 수 조회
  const activePersonasCount = await prisma.persona.count({
    where: { status: "ACTIVE" },
  })

  // 오늘 날짜가 바뀌었으면 통계 리셋
  const today = new Date().toDateString()
  if (schedulerState.statsToday.resetAt !== today) {
    schedulerState.statsToday = {
      posts: 0,
      interactions: 0,
      errors: 0,
      resetAt: today,
    }
  }

  return {
    isRunning: schedulerState.isRunning,
    isPaused: schedulerState.isPaused,
    lastRunAt: schedulerState.lastRunAt,
    nextRunAt: schedulerState.lastRunAt
      ? new Date(schedulerState.lastRunAt.getTime() + 60 * 60 * 1000) // 1시간 후
      : null,
    stats: {
      totalPostsToday: schedulerState.statsToday.posts,
      totalInteractionsToday: schedulerState.statsToday.interactions,
      activePersonasNow: activePersonasCount,
      errorCount: schedulerState.statsToday.errors,
    },
  }
}

/**
 * 스케줄러 일시 정지/재개
 */
export function setSchedulerPaused(paused: boolean): void {
  schedulerState.isPaused = paused
}

/**
 * 활성 페르소나 정보 조회
 */
async function getActivePersonas(): Promise<PersonaInfo[]> {
  const personas = await prisma.persona.findMany({
    where: { status: "ACTIVE" },
    include: {
      vectors: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  })

  return personas.map((p) => {
    const vec = p.vectors[0]
    const vector: Vector6D = vec
      ? {
          depth: Number(vec.depth),
          lens: Number(vec.lens),
          stance: Number(vec.stance),
          scope: Number(vec.scope),
          taste: Number(vec.taste),
          purpose: Number(vec.purpose),
        }
      : { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 }

    // 활동성 속성이 없으면 벡터에서 추론
    const activityTraits: ActivityTraits = {
      sociability: p.sociability
        ? Number(p.sociability)
        : deriveActivityTraitsFromVector(vector).sociability,
      initiative: p.initiative
        ? Number(p.initiative)
        : deriveActivityTraitsFromVector(vector).initiative,
      expressiveness: p.expressiveness
        ? Number(p.expressiveness)
        : deriveActivityTraitsFromVector(vector).expressiveness,
      interactivity: p.interactivity
        ? Number(p.interactivity)
        : deriveActivityTraitsFromVector(vector).interactivity,
    }

    return {
      id: p.id,
      name: p.name,
      handle: p.handle,
      description: p.description,
      activityTraits,
      vector,
      favoriteGenres: p.favoriteGenres ?? [],
      dislikedGenres: p.dislikedGenres ?? [],
      expertise: p.expertise ?? [],
      basePrompt: p.basePrompt,
      postPrompt: p.postPrompt,
      reviewPrompt: p.reviewPrompt,
      contentSettings: p.contentSettings as PersonaInfo["contentSettings"],
    }
  })
}

/**
 * 페르소나의 스케줄 정보 조회
 */
function getPersonaSchedule(
  persona: PersonaInfo,
  dbPersona: { timezone: string; activeHours: number[]; peakHours: number[]; postFrequency: string }
): ActivitySchedule {
  return {
    timezone: dbPersona.timezone || "Asia/Seoul",
    activeHours:
      dbPersona.activeHours.length > 0
        ? dbPersona.activeHours
        : getDefaultActiveHours(persona.activityTraits),
    peakHours:
      dbPersona.peakHours.length > 0
        ? dbPersona.peakHours
        : getDefaultPeakHours(persona.activityTraits),
    postFrequency: (dbPersona.postFrequency || "MODERATE") as ActivitySchedule["postFrequency"],
  }
}

/**
 * 최근 포스트 조회 (인터랙션용)
 */
async function getRecentPosts(excludePersonaIds: string[] = []): Promise<PostInfo[]> {
  const posts = await prisma.personaPost.findMany({
    where: {
      isHidden: false,
      personaId: { notIn: excludePersonaIds },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      persona: {
        include: {
          vectors: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  })

  return posts.map((post) => {
    const vec = post.persona.vectors[0]
    const personaVector: Vector6D | undefined = vec
      ? {
          depth: Number(vec.depth),
          lens: Number(vec.lens),
          stance: Number(vec.stance),
          scope: Number(vec.scope),
          taste: Number(vec.taste),
          purpose: Number(vec.purpose),
        }
      : undefined

    return {
      id: post.id,
      personaId: post.personaId,
      personaName: post.persona.name,
      content: post.content,
      type: post.type,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      personaVector,
    }
  })
}

/**
 * 팔로우/인터랙션 가능한 페르소나 조회
 */
async function getTargetPersonas(excludePersonaId: string): Promise<TargetPersonaInfo[]> {
  const personas = await prisma.persona.findMany({
    where: {
      status: "ACTIVE",
      id: { not: excludePersonaId },
    },
    include: {
      vectors: {
        orderBy: { version: "desc" },
        take: 1,
      },
      _count: {
        select: {
          posts: true,
          followers: true,
        },
      },
    },
    take: 50,
  })

  return personas.map((p) => {
    const vec = p.vectors[0]
    const vector: Vector6D = vec
      ? {
          depth: Number(vec.depth),
          lens: Number(vec.lens),
          stance: Number(vec.stance),
          scope: Number(vec.scope),
          taste: Number(vec.taste),
          purpose: Number(vec.purpose),
        }
      : { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 }

    return {
      id: p.id,
      name: p.name,
      handle: p.handle,
      vector,
      followersCount: p._count.followers,
      postsCount: p._count.posts,
    }
  })
}

/**
 * 인터랙션 컨텍스트 생성
 */
async function buildInteractionContext(persona: PersonaInfo): Promise<InteractionContext> {
  // 이미 좋아요/댓글/팔로우한 대상 조회
  const [likes, comments, following] = await Promise.all([
    prisma.personaPostLike.findMany({
      where: { personaId: persona.id },
      select: { postId: true },
    }),
    prisma.personaComment.findMany({
      where: { personaId: persona.id },
      select: { postId: true },
    }),
    prisma.personaFollow.findMany({
      where: { followerPersonaId: persona.id },
      select: { followingPersonaId: true },
    }),
  ])

  return {
    personaId: persona.id,
    activityTraits: persona.activityTraits,
    vector: persona.vector,
    alreadyLikedPostIds: new Set(likes.map((l) => l.postId)),
    alreadyCommentedPostIds: new Set(comments.map((c) => c.postId)),
    followingPersonaIds: new Set(following.map((f) => f.followingPersonaId)),
  }
}

/**
 * 자율 활동 스케줄러 메인 실행
 */
export async function runAutonomousActivityScheduler(): Promise<SchedulerRunResult> {
  const errors: string[] = []
  let postsCreated = 0
  const interactionsCreated = { likes: 0, comments: 0, follows: 0 }
  let trendingReactions = 0

  // 이미 실행 중이거나 일시정지 상태면 스킵
  if (schedulerState.isRunning) {
    return {
      success: false,
      timestamp: new Date(),
      postsCreated: 0,
      interactionsCreated,
      trendingReactions: 0,
      errors: ["Scheduler is already running"],
    }
  }

  if (schedulerState.isPaused) {
    return {
      success: false,
      timestamp: new Date(),
      postsCreated: 0,
      interactionsCreated,
      trendingReactions: 0,
      errors: ["Scheduler is paused"],
    }
  }

  schedulerState.isRunning = true
  const currentDate = new Date()

  try {
    // 활성 페르소나 조회
    const personas = await getActivePersonas()

    // DB에서 스케줄 정보 조회
    const dbPersonas = await prisma.persona.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        timezone: true,
        activeHours: true,
        peakHours: true,
        postFrequency: true,
      },
    })
    const scheduleMap = new Map(dbPersonas.map((p) => [p.id, p]))

    // 최근 포스트 조회 (인터랙션용)
    const recentPosts = await getRecentPosts()

    // 트렌딩 토픽 감지
    const postsForTrending = await prisma.personaPost.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        isHidden: false,
      },
      select: {
        content: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
      },
    })
    const trendingTopics = detectTrendingTopics(
      postsForTrending.map((p) => ({
        // Extract hashtags from content
        hashtags: extractHashtagsFromContent(p.content),
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      }))
    )

    // 각 페르소나별 처리
    for (const persona of personas) {
      try {
        const dbSchedule = scheduleMap.get(persona.id)
        if (!dbSchedule) continue

        const schedule = getPersonaSchedule(persona, dbSchedule)

        // 활동 시간 확인
        if (!isActiveTimeForPersona(schedule, currentDate)) {
          continue
        }

        // 1. 포스팅 확률 계산 및 실행
        const postProbability = calculatePostProbability(
          persona.activityTraits,
          schedule,
          currentDate
        )

        if (Math.random() < postProbability) {
          const post = await generateAndPostAutonomously(persona)

          // DB에 포스트 저장 (hashtags are included in the content)
          await prisma.personaPost.create({
            data: {
              personaId: persona.id,
              type: post.type,
              content: appendHashtagsToContent(post.content, post.hashtags),
              trigger: post.trigger,
              contentId: post.contentId ?? null,
            },
          })

          postsCreated++
        }

        // 2. 인터랙션 확률 계산 및 실행
        const interactionProbability = calculateInteractionProbability(
          persona.activityTraits,
          schedule,
          currentDate
        )

        if (Math.random() < interactionProbability) {
          const context = await buildInteractionContext(persona)
          const targetPersonas = await getTargetPersonas(persona.id)

          const interactions = await generateInteractionsAutonomously(
            context,
            recentPosts,
            targetPersonas
          )

          // 인터랙션 저장
          for (const interaction of interactions) {
            try {
              if (interaction.type === "LIKE") {
                await prisma.personaPostLike.create({
                  data: {
                    postId: interaction.targetId,
                    personaId: persona.id,
                  },
                })
                // 좋아요 카운트 증가
                await prisma.personaPost.update({
                  where: { id: interaction.targetId },
                  data: { likeCount: { increment: 1 } },
                })
                interactionsCreated.likes++
              } else if (interaction.type === "COMMENT") {
                await prisma.personaComment.create({
                  data: {
                    postId: interaction.targetId,
                    personaId: persona.id,
                    content: interaction.content ?? "",
                  },
                })
                // 댓글 카운트 증가
                await prisma.personaPost.update({
                  where: { id: interaction.targetId },
                  data: { commentCount: { increment: 1 } },
                })
                interactionsCreated.comments++
              } else if (interaction.type === "FOLLOW") {
                await prisma.personaFollow.create({
                  data: {
                    followerPersonaId: persona.id,
                    followingPersonaId: interaction.targetId,
                  },
                })
                interactionsCreated.follows++
              }
            } catch {
              // 중복 인터랙션 등 무시
            }
          }
        }

        // 3. 트렌딩 토픽 반응 (낮은 확률로)
        if (trendingTopics.length > 0 && Math.random() < 0.1) {
          const reactions = await reactToTrendingTopics([persona], trendingTopics)

          for (const reaction of reactions) {
            await prisma.personaPost.create({
              data: {
                personaId: reaction.personaId,
                type: reaction.postType as "THOUGHT" | "REVIEW" | "DEBATE" | "THREAD" | "REACTION",
                content: appendHashtagsToContent(reaction.content, reaction.hashtags),
                trigger: "TRENDING",
              },
            })
            trendingReactions++
          }
        }
      } catch (err) {
        const errorMsg = `Error processing persona ${persona.id}: ${err instanceof Error ? err.message : String(err)}`
        errors.push(errorMsg)
        schedulerState.statsToday.errors++
      }
    }

    // 통계 업데이트
    schedulerState.statsToday.posts += postsCreated
    schedulerState.statsToday.interactions +=
      interactionsCreated.likes + interactionsCreated.comments + interactionsCreated.follows
    schedulerState.lastRunAt = currentDate

    return {
      success: true,
      timestamp: currentDate,
      postsCreated,
      interactionsCreated,
      trendingReactions,
      errors,
    }
  } catch (err) {
    const errorMsg = `Scheduler error: ${err instanceof Error ? err.message : String(err)}`
    errors.push(errorMsg)
    schedulerState.statsToday.errors++

    return {
      success: false,
      timestamp: currentDate,
      postsCreated,
      interactionsCreated,
      trendingReactions,
      errors,
    }
  } finally {
    schedulerState.isRunning = false
  }
}

/**
 * 콘텐츠 출시 이벤트 처리
 */
export async function handleContentRelease(content: ContentInfo): Promise<ScheduledReaction[]> {
  const personas = await getActivePersonas()
  return onContentRelease(content, personas)
}

/**
 * 스케줄된 콘텐츠 반응 실행
 */
export async function executeScheduledReactions(
  reactions: ScheduledReaction[]
): Promise<{ success: number; failed: number }> {
  const now = new Date()
  let success = 0
  let failed = 0

  for (const reaction of reactions) {
    // 아직 시간이 안 됐으면 스킵
    if (reaction.scheduledAt > now) {
      continue
    }

    try {
      const persona = (await getActivePersonas()).find((p) => p.id === reaction.personaId)
      if (!persona) continue

      const post = await generateAndPostAutonomously(persona, {
        trigger: "CONTENT_RELEASE",
        contentId: reaction.contentId,
      })

      await prisma.personaPost.create({
        data: {
          personaId: persona.id,
          type: post.type,
          content: appendHashtagsToContent(post.content, post.hashtags),
          trigger: "CONTENT_RELEASE",
          contentId: reaction.contentId,
        },
      })

      success++
    } catch {
      failed++
    }
  }

  return { success, failed }
}

// ============================================
// Helper Functions
// ============================================

/**
 * 콘텐츠에서 해시태그 추출
 */
function extractHashtagsFromContent(content: string): string[] {
  const hashtagRegex = /#([가-힣a-zA-Z0-9_]+)/g
  const matches = content.match(hashtagRegex)
  return matches ? matches.map((tag) => tag.replace("#", "")) : []
}

/**
 * 콘텐츠에 해시태그 추가 (중복 없이)
 */
function appendHashtagsToContent(content: string, hashtags: string[]): string {
  if (hashtags.length === 0) return content

  // 이미 콘텐츠에 있는 해시태그 추출
  const existingTags = extractHashtagsFromContent(content)
  const existingSet = new Set(existingTags.map((t) => t.toLowerCase()))

  // 새로운 해시태그만 추가
  const newTags = hashtags.filter((tag) => !existingSet.has(tag.toLowerCase()))

  if (newTags.length === 0) return content

  // 해시태그 추가
  const hashtagString = newTags.map((tag) => `#${tag}`).join(" ")
  return `${content}\n\n${hashtagString}`
}
