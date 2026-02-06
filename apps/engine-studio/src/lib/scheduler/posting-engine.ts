/**
 * 자율 포스팅 엔진
 *
 * 페르소나의 성격, 관심사, 트렌드를 기반으로 자율적으로 콘텐츠를 생성합니다.
 */

import type { ActivityTraits } from "./activity-scheduler"

/**
 * 포스트 타입
 */
export type PostType =
  | "REVIEW"
  | "THOUGHT"
  | "RECOMMENDATION"
  | "REACTION"
  | "QUESTION"
  | "LIST"
  | "THREAD"
  | "VS_BATTLE"
  | "QNA"
  | "CURATION"
  | "DEBATE"
  | "MEME"
  | "COLLAB"
  | "TRIVIA"
  | "PREDICTION"
  | "ANNIVERSARY"
  | "BEHIND_STORY"

/**
 * 활동 트리거
 */
export type ActivityTrigger =
  | "SCHEDULED"
  | "CONTENT_RELEASE"
  | "SOCIAL_EVENT"
  | "USER_INTERACTION"
  | "TRENDING"

/**
 * 페르소나 정보
 */
export interface PersonaInfo {
  id: string
  name: string
  handle: string | null
  description: string | null

  // 활동성 속성
  activityTraits: ActivityTraits

  // 6D 벡터
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  }

  // 관심사
  favoriteGenres: string[]
  dislikedGenres: string[]
  expertise: string[]

  // 프롬프트
  basePrompt: string | null
  postPrompt: string | null
  reviewPrompt: string | null

  // 콘텐츠 설정 (JSON)
  contentSettings: ContentSettings | null
}

/**
 * 콘텐츠 설정
 */
export interface ContentSettings {
  preferredPostTypes?: PostType[]
  contentStyle?: {
    formality?: number // 0.0 (반말) ~ 1.0 (존댓말)
    emojiUsage?: "NONE" | "RARE" | "MODERATE" | "FREQUENT"
    hashtagUsage?: boolean
  }
  reviewStyle?: {
    ratingScale?: number // 5 or 10
    includesSpoiler?: boolean
  }
}

/**
 * 생성된 포스트
 */
export interface GeneratedPost {
  type: PostType
  content: string
  hashtags: string[]
  trigger: ActivityTrigger
  contentId?: string // 리뷰 대상 콘텐츠 ID
  metadata?: Record<string, unknown>
}

/**
 * 가중치 랜덤 선택을 위한 아이템
 */
interface WeightedItem<T> {
  item: T
  weight: number
}

/**
 * 가중치 기반 랜덤 선택
 */
function weightedRandom<T>(items: WeightedItem<T>[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight

  for (const { item, weight } of items) {
    random -= weight
    if (random <= 0) {
      return item
    }
  }

  return items[items.length - 1].item
}

/**
 * 성격 기반 포스트 타입 선택
 */
export function selectPostType(persona: PersonaInfo): PostType {
  const { initiative, expressiveness } = persona.activityTraits
  // Use 6D vector for content-related traits
  const { stance } = persona.vector

  // 선호 포스트 타입이 설정되어 있으면 그 중에서 선택
  if (persona.contentSettings?.preferredPostTypes?.length) {
    const preferred = persona.contentSettings.preferredPostTypes
    return preferred[Math.floor(Math.random() * preferred.length)]
  }

  // 비판적 (6D vector) + 주도적 → 토론, 리뷰
  if (stance > 0.7 && initiative > 0.7) {
    return weightedRandom([
      { item: "DEBATE" as PostType, weight: 0.25 },
      { item: "REVIEW" as PostType, weight: 0.35 },
      { item: "VS_BATTLE" as PostType, weight: 0.2 },
      { item: "PREDICTION" as PostType, weight: 0.1 },
      { item: "THOUGHT" as PostType, weight: 0.1 },
    ])
  }

  // 표현력 높음 → 큐레이션, 스레드
  if (expressiveness > 0.7) {
    return weightedRandom([
      { item: "CURATION" as PostType, weight: 0.25 },
      { item: "THREAD" as PostType, weight: 0.25 },
      { item: "REVIEW" as PostType, weight: 0.2 },
      { item: "QNA" as PostType, weight: 0.15 },
      { item: "LIST" as PostType, weight: 0.15 },
    ])
  }

  // 친화력 높음 → 추천, 반응
  if (persona.activityTraits.interactivity > 0.7) {
    return weightedRandom([
      { item: "RECOMMENDATION" as PostType, weight: 0.3 },
      { item: "REACTION" as PostType, weight: 0.25 },
      { item: "THOUGHT" as PostType, weight: 0.25 },
      { item: "QUESTION" as PostType, weight: 0.2 },
    ])
  }

  // 기본: 일상적인 포스트
  return weightedRandom([
    { item: "THOUGHT" as PostType, weight: 0.35 },
    { item: "REVIEW" as PostType, weight: 0.25 },
    { item: "RECOMMENDATION" as PostType, weight: 0.2 },
    { item: "QUESTION" as PostType, weight: 0.1 },
    { item: "MEME" as PostType, weight: 0.1 },
  ])
}

/**
 * 주제 자동 선택
 */
export async function selectTopic(
  persona: PersonaInfo,
  options: {
    recentContents?: { id: string; title: string; genres: string[] }[]
    trendingTopics?: string[]
    recentPosts?: { topic: string }[]
  } = {}
): Promise<{ topic: string; contentId?: string }> {
  const { recentContents = [], trendingTopics = [], recentPosts = [] } = options

  // 최근 포스팅한 주제 제외
  const recentTopics = new Set(recentPosts.map((p) => p.topic))

  // 1. 새로 출시된 관련 콘텐츠가 있으면 우선
  if (recentContents.length > 0) {
    const relevantContent = recentContents.find((content) =>
      content.genres.some(
        (genre) => persona.favoriteGenres.includes(genre) && !persona.dislikedGenres.includes(genre)
      )
    )

    if (relevantContent) {
      return { topic: relevantContent.title, contentId: relevantContent.id }
    }
  }

  // 2. 트렌딩 토픽 중 관심 있는 것
  if (trendingTopics.length > 0) {
    // 페르소나 관심사와 매칭되는 트렌딩 토픽
    const relevantTrending = trendingTopics.find(
      (topic) =>
        persona.expertise.some((exp) => topic.toLowerCase().includes(exp.toLowerCase())) &&
        !recentTopics.has(topic)
    )

    if (relevantTrending) {
      return { topic: relevantTrending }
    }
  }

  // 3. 관심 장르에서 랜덤 선택
  if (persona.favoriteGenres.length > 0) {
    const genre = persona.favoriteGenres[Math.floor(Math.random() * persona.favoriteGenres.length)]
    return { topic: `${genre} 관련 이야기` }
  }

  // 4. 기본 주제
  const defaultTopics = [
    "오늘의 생각",
    "최근 본 것",
    "추천하고 싶은 것",
    "일상 이야기",
    "관심사 이야기",
  ]
  return { topic: defaultTopics[Math.floor(Math.random() * defaultTopics.length)] }
}

/**
 * 콘텐츠 생성 (LLM 호출 - Mock)
 *
 * 실제 구현에서는 OpenAI, Anthropic 등의 API를 호출합니다.
 * 현재는 템플릿 기반 Mock 응답을 반환합니다.
 */
export async function generateContent(
  persona: PersonaInfo,
  postType: PostType,
  topic: string
): Promise<string> {
  // TODO: 실제 LLM 연동 구현
  // 현재는 템플릿 기반 Mock 응답

  const { name } = persona
  const warmth = persona.activityTraits.expressiveness
  const emoji = warmth > 0.5 ? getRandomEmoji() : ""

  const templates: Record<PostType, string[]> = {
    REVIEW: [
      `🎬 [${topic}] ${warmth > 0.7 ? "너무 좋았어요!" : "봤습니다."}\n\n${generateReviewBody(persona, topic)}`,
      `📝 ${topic} 리뷰\n\n${generateReviewBody(persona, topic)}`,
    ],
    THOUGHT: [
      `${emoji} ${generateThoughtBody(persona, topic)}`,
      `오늘 문득 ${topic}에 대해 생각해봤는데...\n\n${generateThoughtBody(persona, topic)}`,
    ],
    RECOMMENDATION: [
      `👍 오늘의 추천: ${topic}\n\n${generateRecommendationBody(persona, topic)}`,
      `${topic} 꼭 한번 보세요! ${emoji}\n\n${generateRecommendationBody(persona, topic)}`,
    ],
    REACTION: [`방금 본 ${topic}에 대한 생각...\n\n${generateReactionBody(persona)}`],
    QUESTION: [
      `❓ 궁금한게 있어요!\n\n${topic}에 대해 어떻게 생각하세요?`,
      `${topic} 좋아하시는 분 계세요? 의견 들려주세요 ${emoji}`,
    ],
    LIST: [`📋 ${name}의 ${topic} TOP 5\n\n${generateListBody()}`],
    THREAD: [
      `🧵 [스레드] ${topic}\n\n1/${Math.floor(Math.random() * 5) + 3}\n${generateThoughtBody(persona, topic)}\n\n[스레드 계속]`,
    ],
    VS_BATTLE: [`🥊 [VS 배틀] ${name}의 선택\n\n${generateVsBattleBody(topic)}`],
    QNA: [`💬 [Q&A] ${name}에게 물어보세요!\n\n${topic}에 대한 질문을 받습니다 ${emoji}`],
    CURATION: [`📚 [큐레이션] ${name}'s ${topic}\n\n${generateCurationBody()}`],
    DEBATE: [`🎤 [토론] ${topic}에 대해 이야기해봐요\n\n${generateDebateBody(persona)}`],
    MEME: [`😂 ${generateMemeBody(persona)}`],
    COLLAB: [`🤝 [콜라보] ${topic}에 대해 함께 이야기해요!`],
    TRIVIA: [`🧠 [퀴즈] ${name}의 덕력 테스트\n\nQ. ${topic}에 관한 질문...\n\n정답은 내일 공개!`],
    PREDICTION: [`🔮 [예측] ${name}의 ${topic} 전망\n\n${generatePredictionBody(persona)}`],
    ANNIVERSARY: [`🎉 오늘은 ${topic} 기념일이에요!\n\n${generateThoughtBody(persona, topic)}`],
    BEHIND_STORY: [`📖 [비하인드] ${topic}에 대해 알려드릴게요\n\n${generateBehindBody()}`],
  }

  const typeTemplates = templates[postType]
  const template = typeTemplates[Math.floor(Math.random() * typeTemplates.length)]

  return template
}

/**
 * 해시태그 생성
 */
export function generateHashtags(postType: PostType, topic: string): string[] {
  const baseHashtags: string[] = []

  // 주제에서 해시태그 추출
  const words = topic.split(/\s+/).filter((w) => w.length > 1)
  if (words.length > 0) {
    baseHashtags.push(words[0].replace(/[^가-힣a-zA-Z0-9]/g, ""))
  }

  // 포스트 타입별 해시태그
  const typeHashtags: Record<PostType, string[]> = {
    REVIEW: ["리뷰", "후기"],
    THOUGHT: ["일상", "생각"],
    RECOMMENDATION: ["추천", "꿀팁"],
    REACTION: ["반응", "소감"],
    QUESTION: ["질문", "궁금"],
    LIST: ["리스트", "모음"],
    THREAD: ["스레드", "정리"],
    VS_BATTLE: ["VS배틀", "투표"],
    QNA: ["QnA", "질문답변"],
    CURATION: ["큐레이션", "모음"],
    DEBATE: ["토론", "의견"],
    MEME: ["밈", "웃김"],
    COLLAB: ["콜라보", "함께"],
    TRIVIA: ["퀴즈", "덕력테스트"],
    PREDICTION: ["예측", "전망"],
    ANNIVERSARY: ["기념일", "축하"],
    BEHIND_STORY: ["비하인드", "이야기"],
  }

  return [...baseHashtags, ...typeHashtags[postType]]
}

/**
 * 자율 포스팅 실행
 */
export async function generateAndPostAutonomously(
  persona: PersonaInfo,
  options: {
    trigger?: ActivityTrigger
    topic?: string
    contentId?: string
  } = {}
): Promise<GeneratedPost> {
  const trigger = options.trigger ?? "SCHEDULED"

  // 1. 포스트 타입 자동 결정
  const postType = selectPostType(persona)

  // 2. 주제 선택 (옵션으로 제공되지 않은 경우)
  const { topic, contentId } = options.topic
    ? { topic: options.topic, contentId: options.contentId }
    : await selectTopic(persona)

  // 3. 콘텐츠 생성
  const content = await generateContent(persona, postType, topic)

  // 4. 해시태그 생성
  const hashtags = generateHashtags(postType, topic)

  return {
    type: postType,
    content,
    hashtags,
    trigger,
    contentId,
    metadata: {
      topic,
      generatedAt: new Date().toISOString(),
    },
  }
}

// ============================================
// Helper Functions (템플릿 생성용)
// ============================================

function getRandomEmoji(): string {
  const emojis = ["😊", "🎬", "✨", "💭", "🌟", "💫", "🎭", "📽️", "🍿", "💝"]
  return emojis[Math.floor(Math.random() * emojis.length)]
}

function generateReviewBody(persona: PersonaInfo, topic: string): string {
  const { expressiveness } = persona.activityTraits
  const { stance } = persona.vector

  if (stance > 0.7) {
    return `솔직히 말하자면, ${topic}은(는) 기대와는 달랐어요. 좋은 점도 있지만 아쉬운 점이 더 눈에 띄네요.`
  } else if (expressiveness > 0.7) {
    return `${topic}... 정말 마음에 와닿았어요. 보는 내내 감정이입이 되더라구요. 특히 마지막 부분은 눈물이 났어요 ㅠㅠ`
  } else {
    return `${topic} 괜찮았어요. 시간 가는 줄 모르고 봤네요.`
  }
}

function generateThoughtBody(persona: PersonaInfo, topic: string): string {
  const { expressiveness } = persona.activityTraits
  const { lens } = persona.vector

  if (lens > 0.7) {
    return `${topic}에 대해 분석해보면, 여러 관점에서 생각해볼 점이 많아요.`
  } else if (expressiveness > 0.7) {
    return `${topic} 생각하니까 기분이 좋아지네요. 여러분도 그런 적 있으신가요?`
  } else {
    return `${topic}... 요즘 자주 생각하게 되네요.`
  }
}

function generateRecommendationBody(persona: PersonaInfo, topic: string): string {
  const { expressiveness } = persona.activityTraits

  if (expressiveness > 0.5) {
    return `제가 정말 좋아하는 ${topic}이에요! 아직 안 보셨다면 꼭 한번 보세요 ✨`
  }
  return `${topic} 추천합니다. 후회 안 하실 거예요.`
}

function generateReactionBody(persona: PersonaInfo): string {
  const { stance } = persona.vector

  if (stance > 0.7) {
    return `음... 이건 좀 동의하기 어렵네요. 제 생각은 조금 다릅니다.`
  }
  return `공감해요! 저도 비슷한 생각을 했었거든요.`
}

function generateListBody(): string {
  return `1. (비밀)\n2. (비밀)\n3. (비밀)\n4. (비밀)\n5. (비밀)\n\n자세한 내용은 다음 포스트에서!`
}

function generateVsBattleBody(topic: string): string {
  return `🅰️ 옵션 A (45%)\n🅱️ 옵션 B (55%) ✓ 내 선택\n\n${topic}에 대한 여러분의 선택은?\n\n[투표하기]`
}

function generateCurationBody(): string {
  return `1. 첫 번째 추천\n   "이건 정말 빠질 수 없죠"\n\n2. 두 번째 추천\n   "분위기가 너무 좋아요"\n\n[더 보기 +3개]`
}

function generateDebateBody(persona: PersonaInfo): string {
  const { stance } = persona.vector

  if (stance > 0.7) {
    return `제 입장은 명확합니다. 반박 환영합니다.`
  }
  return `다양한 의견을 듣고 싶어요. 어떻게 생각하세요?`
}

function generateMemeBody(persona: PersonaInfo): string {
  return `친구: "그거 재밌어?"\n\n나: (3시간 동안 설명 시작)\n\n친구: (이미 자리에 없음)\n\n#덕후일상 #공감하면_RT`
}

function generatePredictionBody(persona: PersonaInfo): string {
  const confidence = Math.floor(Math.random() * 30) + 60
  return `예상 확률: ${confidence}%\n\n이유:\n1. 최근 트렌드를 보면...\n2. 과거 패턴을 분석하면...\n\n⚠️ 주관적 예측입니다`
}

function generateBehindBody(): string {
  return `사실 이건 원래 이렇게 될 예정이 아니었대요.\n\n제작 과정에서 많은 변화가 있었다고 하더라구요...`
}
