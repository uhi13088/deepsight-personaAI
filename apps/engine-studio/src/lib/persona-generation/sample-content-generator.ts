/**
 * 샘플 콘텐츠 자동 생성
 *
 * 생성된 페르소나로 샘플 콘텐츠를 생성하여 품질을 확인합니다.
 * 리뷰 2개, 일상 포스트 1개, 댓글 2개를 자동 생성합니다.
 */

import type { PromptTemplates } from "./prompt-builder"
import type { CharacterAttributes } from "./character-generator"
import type { Vector6D } from "./vector-diversity"

export interface SampleContents {
  reviews: SampleReview[]
  posts: SamplePost[]
  comments: SampleComment[]
  generatedAt: Date
}

export interface SampleReview {
  movieTitle: string
  rating: number // 1-5
  content: string
  tags: string[]
}

export interface SamplePost {
  type: "DAILY" | "RECOMMENDATION" | "QUESTION"
  content: string
  hashtags: string[]
}

export interface SampleComment {
  context: string // 원본 포스트 요약
  content: string
  tone: "AGREE" | "DISAGREE" | "QUESTION"
}

// 샘플 영화 목록 (리뷰용)
const SAMPLE_MOVIES = [
  { title: "기생충", genres: ["드라마", "스릴러"], year: 2019 },
  { title: "인터스텔라", genres: ["SF", "드라마"], year: 2014 },
  { title: "라라랜드", genres: ["뮤지컬", "로맨스"], year: 2016 },
  { title: "올드보이", genres: ["스릴러", "미스터리"], year: 2003 },
  { title: "어바웃 타임", genres: ["로맨스", "판타지"], year: 2013 },
  { title: "조커", genres: ["드라마", "스릴러"], year: 2019 },
  { title: "업", genres: ["애니메이션", "모험"], year: 2009 },
  { title: "위플래쉬", genres: ["드라마", "음악"], year: 2014 },
]

// 샘플 포스트 컨텍스트 (댓글용)
const SAMPLE_POST_CONTEXTS = [
  "다른 유저가 '기생충'을 평점 5점으로 찬양한 리뷰",
  "다른 유저가 '인터스텔라'를 과대평가라고 비판한 글",
  "좋아하는 영화 추천해달라는 질문 글",
  "최근에 본 영화 중 실망스러웠던 영화에 대한 글",
]

export interface GenerationOptions {
  reviewCount?: number
  postCount?: number
  commentCount?: number
}

/**
 * 샘플 콘텐츠 생성
 */
export async function generateSampleContents(
  templates: PromptTemplates,
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D,
  options: GenerationOptions = {}
): Promise<SampleContents> {
  const { reviewCount = 2, postCount = 1, commentCount = 2 } = options

  // 리뷰 생성
  const reviews = await generateSampleReviews(templates, characterAttrs, vector6d, reviewCount)

  // 포스트 생성
  const posts = await generateSamplePosts(templates, characterAttrs, vector6d, postCount)

  // 댓글 생성
  const comments = await generateSampleComments(templates, characterAttrs, vector6d, commentCount)

  return {
    reviews,
    posts,
    comments,
    generatedAt: new Date(),
  }
}

/**
 * 샘플 리뷰 생성
 */
async function generateSampleReviews(
  templates: PromptTemplates,
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D,
  count: number
): Promise<SampleReview[]> {
  const reviews: SampleReview[] = []

  // 캐릭터의 선호 장르에 맞는 영화 선택
  const selectedMovies = selectMoviesForCharacter(characterAttrs, count)

  for (const movie of selectedMovies) {
    const review = generateReviewContent(movie, characterAttrs, vector6d)
    reviews.push(review)
  }

  return reviews
}

/**
 * 캐릭터에 맞는 영화 선택
 */
function selectMoviesForCharacter(
  characterAttrs: CharacterAttributes,
  count: number
): typeof SAMPLE_MOVIES {
  // 선호 장르와 겹치는 영화 우선 선택
  const scored = SAMPLE_MOVIES.map((movie) => {
    const genreMatch = movie.genres.filter((g) =>
      characterAttrs.favoriteGenres.some(
        (fg) =>
          fg.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(fg.toLowerCase())
      )
    ).length

    return { movie, score: genreMatch + Math.random() }
  }).sort((a, b) => b.score - a.score)

  return scored.slice(0, count).map((s) => s.movie)
}

/**
 * 리뷰 콘텐츠 생성
 */
function generateReviewContent(
  movie: (typeof SAMPLE_MOVIES)[0],
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D
): SampleReview {
  // 평점 결정 (warmth와 stance에 따라)
  const baseRating = 3.5
  const warmthBonus = (characterAttrs.warmth - 0.5) * 1 // -0.5 ~ +0.5
  const stanceBonus = (0.5 - vector6d.stance) * 1 // 비판적이면 낮게
  const rating = Math.max(
    1,
    Math.min(
      5,
      Math.round((baseRating + warmthBonus + stanceBonus + (Math.random() - 0.5)) * 2) / 2
    )
  )

  // 리뷰 콘텐츠 생성
  const content = buildReviewText(movie, characterAttrs, vector6d, rating)

  // 태그 생성
  const tags = [...movie.genres, characterAttrs.name, movie.year.toString()]

  return {
    movieTitle: movie.title,
    rating,
    content,
    tags,
  }
}

/**
 * 리뷰 텍스트 빌드
 */
function buildReviewText(
  movie: (typeof SAMPLE_MOVIES)[0],
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D,
  rating: number
): string {
  const { name, speechPatterns, warmth, expertiseLevel } = characterAttrs

  // 시작 문구 (말버릇 사용)
  const opener = speechPatterns[0] || ""

  // 전반적 평가
  const overallTone = rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral"

  // 전문성에 따른 분석 깊이
  const analysisDepth =
    expertiseLevel === "CRITIC" || expertiseLevel === "EXPERT" ? "deep" : "casual"

  // 콘텐츠 템플릿
  const templates: Record<string, Record<string, string[]>> = {
    positive: {
      deep: [
        `${opener} '${movie.title}'은(는) 정말 인상적인 작품이었습니다. ${movie.genres.join(", ")} 장르의 정수를 보여주며, 특히 연출과 서사 구조에서 감독의 역량이 돋보입니다. 기술적 완성도와 정서적 깊이를 모두 갖춘 수작입니다.`,
        `${opener} '${movie.title}'은(는) 기대 이상이었습니다. ${movie.year}년 작품이라고 믿기 어려울 정도로 시대를 앞서간 연출과 메시지가 인상적입니다. 여러 번 볼수록 새로운 의미가 발견되는 작품입니다.`,
      ],
      casual: [
        `${opener} '${movie.title}' 진짜 좋았어요! 처음부터 끝까지 몰입해서 봤습니다. ${movie.genres[0]} 좋아하시는 분들한테 강추드려요!`,
        `${opener} '${movie.title}' 완전 재밌었어요! 이런 ${movie.genres.join("+")} 조합 너무 좋네요. 주말에 한 번 보시길 추천합니다.`,
      ],
    },
    negative: {
      deep: [
        `${opener} '${movie.title}'은(는) 솔직히 기대에 미치지 못했습니다. ${movie.genres.join(", ")} 장르로서 갖춰야 할 요소들이 부족했고, 서사 전개에서 아쉬운 부분이 많았습니다. 완성도 면에서 재고가 필요한 작품입니다.`,
        `${opener} '${movie.title}'은(는) 과대평가된 측면이 있습니다. 기술적 측면은 인정하지만, 스토리텔링과 캐릭터 구축에서 깊이가 부족합니다. 비슷한 시기의 다른 작품들과 비교하면 아쉬움이 남습니다.`,
      ],
      casual: [
        `${opener} '${movie.title}' 기대만큼은 아니었어요. 나쁘진 않지만 그냥 그랬달까... 시간 때우기용으로는 괜찮아요.`,
        `${opener} '${movie.title}' 음... 저한텐 안 맞았나 봐요. 평이 좋길래 봤는데 좀 지루했어요.`,
      ],
    },
    neutral: {
      deep: [
        `${opener} '${movie.title}'은(는) 장단점이 공존하는 작품입니다. ${movie.genres[0]} 요소는 잘 살렸지만, 전체적인 완성도에서 아쉬움이 남습니다. 좋은 시도였으나 조금 더 다듬어졌으면 하는 아쉬움이 있습니다.`,
        `${opener} '${movie.title}'은(는) 평범한 수준의 ${movie.genres.join(", ")} 작품입니다. 특별히 나쁘지도, 뛰어나지도 않은 무난한 선택입니다. 장르 팬이라면 한 번쯤 볼 만합니다.`,
      ],
      casual: [
        `${opener} '${movie.title}' 나쁘진 않았어요. 그냥저냥 볼 만한 정도? 특별히 추천하진 않지만 싫어하지도 않을 것 같아요.`,
        `${opener} '${movie.title}' 괜찮았어요! 재미는 있는데 뭔가 아쉬운 느낌? 기대를 낮추고 보면 좋을 듯해요.`,
      ],
    },
  }

  const options = templates[overallTone][analysisDepth]
  let content = options[Math.floor(Math.random() * options.length)]

  // 마무리 문구 추가
  if (warmth > 0.6) {
    content += " 꼭 한 번 보세요!"
  } else if (warmth < 0.3 && rating < 3) {
    content += " 시간이 아깝습니다."
  }

  return content
}

/**
 * 샘플 포스트 생성
 */
async function generateSamplePosts(
  templates: PromptTemplates,
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D,
  count: number
): Promise<SamplePost[]> {
  const posts: SamplePost[] = []
  const postTypes: SamplePost["type"][] = ["DAILY", "RECOMMENDATION", "QUESTION"]

  for (let i = 0; i < count; i++) {
    const type = postTypes[i % postTypes.length]
    const post = generatePostContent(type, characterAttrs, vector6d)
    posts.push(post)
  }

  return posts
}

/**
 * 포스트 콘텐츠 생성
 */
function generatePostContent(
  type: SamplePost["type"],
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D
): SamplePost {
  const { speechPatterns, favoriteGenres, warmth } = characterAttrs

  const postTemplates: Record<SamplePost["type"], string[]> = {
    DAILY: [
      `${speechPatterns[0] || "오늘"} 퇴근 후 영화 한 편 봐야겠다. 뭘 볼까 고민 중...`,
      `주말이다! 영화관 가야지. ${favoriteGenres[0] || "좋은 영화"} 관련 신작 없나?`,
      `오랜만에 ${favoriteGenres[Math.floor(Math.random() * favoriteGenres.length)] || "영화"} 정주행 중. 역시 명작은 명작이야.`,
    ],
    RECOMMENDATION: [
      `${favoriteGenres[0] || "이 장르"} 좋아하시는 분들한테 추천! 최근에 본 영화 중 최고였어요.`,
      `비 오는 날엔 이런 영화 어때요? ${warmth > 0.5 ? "따뜻한 마음이 되는" : "생각에 잠기게 되는"} 영화 추천합니다.`,
      `이번 주 넷플릭스 신작 중에 괜찮은 거 발견! 관심 있으신 분들 참고하세요.`,
    ],
    QUESTION: [
      `여러분은 영화 볼 때 뭘 가장 중요하게 보시나요? 저는 ${vector6d.lens > 0.5 ? "연출과 기술적 완성도" : "감정선과 캐릭터"}요.`,
      `${favoriteGenres[0] || "이 장르"} 영화 추천 좀 해주세요! 이미 유명한 건 다 봤어요.`,
      `영화 보고 나서 바로 리뷰 쓰시나요, 아니면 시간 지나고 쓰시나요? 궁금해요!`,
    ],
  }

  const content = postTemplates[type][Math.floor(Math.random() * postTemplates[type].length)]

  // 해시태그 생성
  const hashtags = [
    "#영화",
    `#${favoriteGenres[0]?.replace(/\s/g, "") || "영화추천"}`,
    warmth > 0.5 ? "#영화일상" : "#영화리뷰",
  ]

  return {
    type,
    content,
    hashtags,
  }
}

/**
 * 샘플 댓글 생성
 */
async function generateSampleComments(
  templates: PromptTemplates,
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D,
  count: number
): Promise<SampleComment[]> {
  const comments: SampleComment[] = []

  for (let i = 0; i < count; i++) {
    const context = SAMPLE_POST_CONTEXTS[i % SAMPLE_POST_CONTEXTS.length]
    const comment = generateCommentContent(context, characterAttrs, vector6d)
    comments.push(comment)
  }

  return comments
}

/**
 * 댓글 콘텐츠 생성
 */
function generateCommentContent(
  context: string,
  characterAttrs: CharacterAttributes,
  vector6d: Vector6D
): SampleComment {
  const { speechPatterns, warmth } = characterAttrs

  // 맥락에 따른 톤 결정
  let tone: SampleComment["tone"]
  if (context.includes("찬양") || context.includes("추천")) {
    tone = vector6d.stance > 0.6 ? "DISAGREE" : "AGREE"
  } else if (context.includes("비판") || context.includes("과대평가")) {
    tone = vector6d.stance > 0.6 ? "AGREE" : "DISAGREE"
  } else {
    tone = "QUESTION"
  }

  // 댓글 템플릿
  const commentTemplates: Record<SampleComment["tone"], string[]> = {
    AGREE: [
      `${speechPatterns[0] || "맞아요"} 저도 완전 공감해요! ${warmth > 0.5 ? "좋은 글 감사합니다!" : ""}`,
      `이거 진짜 동의합니다. 저도 비슷하게 느꼈어요.`,
      `${warmth > 0.5 ? "와, 제 마음을 대신 말씀해주셨네요!" : "동감입니다."}`,
    ],
    DISAGREE: [
      `${speechPatterns[0] || "음"} 저는 좀 다르게 생각하는데요. ${vector6d.stance > 0.7 ? "그건 좀 과한 평가 같아요." : "다른 시각도 있을 것 같아요."}`,
      `${warmth > 0.5 ? "존중하지만" : "솔직히"} 저는 의견이 달라요. ${vector6d.lens > 0.5 ? "기술적으로 보면" : "느낌상으로는"} 좀 다르게 봅니다.`,
      `흠, 저는 그렇게까지는 아니었는데... 어떤 부분에서 그렇게 느끼셨어요?`,
    ],
    QUESTION: [
      `오 그렇군요! 혹시 비슷한 영화 추천해주실 수 있나요?`,
      `저도 궁금했어요! ${speechPatterns[0] || ""} 더 자세히 알려주실 수 있나요?`,
      `${warmth > 0.5 ? "좋은 질문이네요!" : ""} 저도 한번 찾아봐야겠어요.`,
    ],
  }

  const content = commentTemplates[tone][Math.floor(Math.random() * commentTemplates[tone].length)]

  return {
    context,
    content,
    tone,
  }
}
