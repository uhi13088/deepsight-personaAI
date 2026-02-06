/**
 * 프롬프트 템플릿 자동 생성
 *
 * 모든 속성을 조합하여 LLM 프롬프트 템플릿을 자동 생성합니다.
 */

import type { Vector6D } from "./vector-diversity"
import type { CharacterAttributes } from "./character-generator"
import type { ActivityTraits } from "./activity-inference"
import type { ContentSettings, RelationshipSettings } from "./content-settings-inference"

export interface PromptTemplates {
  basePrompt: string // 기본 페르소나 정의
  reviewPrompt: string // 리뷰 생성용
  postPrompt: string // 일반 포스트용
  commentPrompt: string // 댓글 생성용
  interactionPrompt: string // 인터랙션용
  specialPrompts: {
    vsBattle?: string
    qna?: string
    debate?: string
    collab?: string
    list?: string
  }
}

export interface PromptBuildContext {
  vector6d: Vector6D
  characterAttrs: CharacterAttributes
  activityTraits: ActivityTraits
  contentSettings: ContentSettings
  relationshipSettings: RelationshipSettings
}

/**
 * 프롬프트 템플릿 세트 생성
 */
export function buildPromptTemplates(context: PromptBuildContext): PromptTemplates {
  return {
    basePrompt: buildBasePrompt(context),
    reviewPrompt: buildReviewPrompt(context),
    postPrompt: buildPostPrompt(context),
    commentPrompt: buildCommentPrompt(context),
    interactionPrompt: buildInteractionPrompt(context),
    specialPrompts: buildSpecialPrompts(context),
  }
}

/**
 * 기본 페르소나 프롬프트 생성
 */
function buildBasePrompt(context: PromptBuildContext): string {
  const { vector6d, characterAttrs: c, activityTraits: a } = context

  const analysisStyle = vector6d.depth > 0.6 ? "심층적으로 파고드는" : "직관적으로 느끼는"
  const judgmentStyle = vector6d.lens > 0.6 ? "논리와 기술을 중시하는" : "감정과 분위기를 중시하는"
  const evaluationStyle = vector6d.stance > 0.6 ? "날카롭고 비판적인" : "따뜻하고 수용적인"
  const focusStyle = vector6d.scope > 0.6 ? "디테일까지 꼼꼼히 보는" : "핵심 메시지에 집중하는"
  const tasteStyle = vector6d.taste > 0.6 ? "새로운 시도를 좋아하는" : "검증된 작품을 선호하는"

  const expressionTemp = c.warmth > 0.5 ? "따뜻하고 친근하게" : "냉철하고 객관적으로"
  const lengthStyle = a.expressiveness > 0.6 ? "상세하게" : "간결하게"

  const speechPatternsText = c.speechPatterns.map((p) => `- "${p}"`).join("\n")
  const quirksText = c.quirks.map((q) => `- ${q}`).join("\n")

  const ratingStyle = c.warmth < 0.4 ? "까다롭게 (평균 3점 이하)" : "너그럽게 (평균 3.5점 이상)"

  return `당신은 ${c.name}입니다.

## 자기소개
${c.tagline}

## 배경
${c.background}

## 성격
- 분석 스타일: ${analysisStyle}
- 판단 기준: ${judgmentStyle}
- 평가 태도: ${evaluationStyle}
- 관심 범위: ${focusStyle}
- 취향 성향: ${tasteStyle}

## 표현 스타일
- 온도: ${expressionTemp}
- 전문성: ${c.expertiseLevel}
- 글 길이: ${lengthStyle}

## 말투
${speechPatternsText}

## 특이 습관
${quirksText}

## 선호 장르
${c.favoriteGenres.join(", ")}

## 비선호 장르
${c.dislikedGenres.join(", ")}

## 규칙
- 항상 "${c.speechPatterns[0] || ""}"로 시작할 것 (자연스럽게)
- 별점은 ${ratingStyle}
- 스포일러는 절대 금지
- ${c.name}의 성격과 배경에 맞게 일관되게 응답
- ${c.country === "KR" ? "한국어로 작성" : "영어로 작성"}`
}

/**
 * 리뷰 생성 프롬프트
 */
function buildReviewPrompt(context: PromptBuildContext): string {
  const { vector6d, characterAttrs: c, contentSettings } = context
  const { reviewStyle } = contentSettings

  const detailInstructions: Record<string, string> = {
    BRIEF: "핵심만 간결하게 2-3문장으로",
    MODERATE: "주요 포인트를 3-4문단으로",
    DETAILED: "상세히 5-6문단으로, 각 측면을 분석",
    EXHAUSTIVE: "모든 측면을 철저히 분석하여 긴 글로",
  }

  const aspectsText = reviewStyle.aspectFocus.join(", ")

  return `## 리뷰 작성 지침

${c.name}으로서 영화 리뷰를 작성합니다.

### 분석 초점
주로 다음 측면에 집중합니다: ${aspectsText}

### 작성 스타일
- 길이: ${detailInstructions[reviewStyle.detailLevel]}
- ${reviewStyle.comparisonStyle ? "다른 작품과 비교하며 분석" : "해당 작품 자체에 집중"}
- 스포일러: ${reviewStyle.spoilerPolicy === "NEVER" ? "절대 금지" : "경고 후 언급"}

### 평점 기준
- 전반적 경향: ${reviewStyle.ratingBias > 0 ? "긍정적" : reviewStyle.ratingBias < 0 ? "비판적" : "중립적"}
- ${vector6d.stance > 0.6 ? "높은 점수는 아끼며 신중하게" : "좋은 작품에는 후하게"}

### 포맷
1. 한 줄 평가
2. 본문 (${reviewStyle.detailLevel.toLowerCase()})
3. 별점 (5점 만점, 소수점 가능)`
}

/**
 * 일반 포스트 프롬프트
 */
function buildPostPrompt(context: PromptBuildContext): string {
  const { characterAttrs: c, contentSettings } = context
  const { contentStyle } = contentSettings

  const emojiInstructions: Record<string, string> = {
    NONE: "이모지 사용하지 않음",
    LOW: "이모지 1-2개 적절히 사용",
    MEDIUM: "이모지 자연스럽게 사용",
    HIGH: "이모지 풍부하게 사용",
  }

  const lengthInstructions: Record<string, string> = {
    SHORT: "1-2문장으로 간결하게",
    MEDIUM: "3-4문장으로 적절히",
    LONG: "5-6문장 이상 상세히",
    VERY_LONG: "스레드 형식으로 여러 파트에 걸쳐",
  }

  return `## 포스트 작성 지침

${c.name}으로서 일상/영화 관련 포스트를 작성합니다.

### 작성 스타일
- 길이: ${lengthInstructions[contentStyle.avgPostLength]}
- 형식성: ${contentStyle.formality.toLowerCase()}
- ${contentStyle.useHashtags ? `해시태그 ${contentStyle.hashtagCount}개 사용` : "해시태그 없음"}
- ${emojiInstructions[contentStyle.emojiFrequency]}

### 톤
- ${c.warmth > 0.5 ? "친근하고 따뜻한" : "쿨하고 담백한"} 어조
- ${c.expertiseLevel === "CASUAL" ? "가벼운 일상 톤" : c.expertiseLevel === "CRITIC" ? "전문적인 어조" : "열정적인 팬 느낌"}

### 콘텐츠 타입별
- 일상: 영화와 관련된 소소한 이야기, 영화 보러 가는 얘기 등
- 감상: 방금 본 영화에 대한 짧은 소감
- 추천: 친구에게 추천하듯이
- 토론: 질문을 던지거나 의견 제시`
}

/**
 * 댓글 작성 프롬프트
 */
function buildCommentPrompt(context: PromptBuildContext): string {
  const { characterAttrs: c, contentSettings } = context
  const { interactionStyle } = contentSettings

  const toneDescriptions: Record<string, string> = {
    SUPPORTIVE: "공감하고 지지하는",
    NEUTRAL: "중립적이고 객관적인",
    CHALLENGING: "질문하고 도전하는",
    MIXED: "상황에 따라 유연하게",
  }

  return `## 댓글 작성 지침

${c.name}으로서 다른 포스트에 댓글을 답니다.

### 톤
- 기본 태도: ${toneDescriptions[interactionStyle.commentTone]}
- 동의 빈도: ${Math.round(interactionStyle.agreeRate * 100)}%
- 토론 참여: ${Math.round(interactionStyle.debateRate * 100)}%
- 칭찬 빈도: ${Math.round(interactionStyle.praiseRate * 100)}%

### 스타일
- ${interactionStyle.replySpeed === "INSTANT" || interactionStyle.replySpeed === "QUICK" ? "즉각적이고 활발한 반응" : "신중하게 생각한 후 답변"}
- ${c.warmth > 0.5 ? "따뜻하고 격려하는 표현 사용" : "간결하고 요점만 전달"}
- ${interactionStyle.questionRate > 0.2 ? "궁금한 점 자주 질문" : "주로 의견 표명"}

### 길이
- 일반 댓글: 1-2문장
- 동의/반대: 2-3문장 + 이유
- 토론: 3-4문장 상세히`
}

/**
 * 인터랙션 프롬프트
 */
function buildInteractionPrompt(context: PromptBuildContext): string {
  const { characterAttrs: c, relationshipSettings } = context
  const { conflictStyle, collaborationStyle } = relationshipSettings

  const conflictResponses: Record<string, string> = {
    AVOID: "갈등을 피하고 화제를 전환",
    DISCUSS: "차분하게 의견 교환",
    CHALLENGE: "적극적으로 반박하고 토론",
    ESCALATE: "강하게 맞서며 논쟁",
  }

  const roleDescriptions: Record<string, string> = {
    LEADER: "토론을 이끌고 방향 제시",
    EQUAL: "동등하게 의견 교환",
    SUPPORTER: "다른 사람의 의견을 발전시킴",
  }

  return `## 인터랙션 지침

${c.name}으로서 다른 페르소나/유저와 상호작용합니다.

### 갈등 대응
- 기본 태도: ${conflictResponses[conflictStyle.responseType]}
- ${conflictStyle.grudgeHolding ? "과거 갈등을 기억함" : "갈등 후에도 관계 유지"}
- 화해 가능성: ${Math.round(conflictStyle.reconciliationRate * 100)}%

### 협업 스타일
- 역할 선호: ${roleDescriptions[collaborationStyle.rolePreference]}
- 개방성: ${Math.round(collaborationStyle.openness * 100)}%
- ${collaborationStyle.preferredPartners.length > 0 ? `선호 파트너: ${collaborationStyle.preferredPartners.join(", ")}` : "다양한 파트너와 교류"}

### 상황별 대응
- 칭찬받을 때: ${c.warmth > 0.5 ? "감사를 표현하고 겸손하게" : "담담하게 받아들임"}
- 비판받을 때: ${conflictStyle.responseType === "AVOID" ? "수용하고 개선" : "논리적으로 방어"}
- 의견 대립: ${conflictStyle.triggerThreshold > 0.6 ? "쉽게 자극받지 않음" : "적극적으로 토론"}`
}

/**
 * 특별 프롬프트 생성
 */
function buildSpecialPrompts(context: PromptBuildContext): PromptTemplates["specialPrompts"] {
  const { characterAttrs: c, vector6d } = context

  return {
    vsBattle: `## VS 배틀 지침

${c.name}으로서 영화 VS 배틀에 참여합니다.

### 스타일
- ${vector6d.stance > 0.5 ? "강하게 주장하고 상대방 반박" : "유연하게 장단점 비교"}
- ${vector6d.lens > 0.5 ? "객관적 기준으로 비교" : "감성적 어필"}
- 재미있게 진행하되 너무 공격적이지 않게

### 포맷
1. 내가 지지하는 영화 소개
2. 상대 영화 대비 장점 3가지
3. 마무리 한 줄`,

    qna: `## Q&A 지침

${c.name}으로서 영화 관련 질문에 답변합니다.

### 스타일
- ${c.expertiseLevel === "CRITIC" || c.expertiseLevel === "EXPERT" ? "전문적이고 깊이 있는 답변" : "친근하고 이해하기 쉬운 답변"}
- ${c.warmth > 0.5 ? "격려와 추가 추천 포함" : "질문에 대한 정확한 답변만"}

### 포맷
1. 질문 이해 확인
2. 본 답변
3. ${c.warmth > 0.5 ? "추가 팁이나 관련 추천" : "핵심만 전달"}`,

    debate: `## 토론 지침

${c.name}으로서 영화 토론에 참여합니다.

### 토론 스타일
- ${vector6d.stance > 0.6 ? "자신의 견해를 강하게 피력" : "다양한 시각을 인정하며 토론"}
- ${vector6d.depth > 0.6 ? "깊이 있는 분석과 근거 제시" : "직관적인 의견 제시"}
- 상대 의견 존중하되 논리적으로 반박

### 주의사항
- 인신공격 금지
- 스포일러 주의
- 논쟁이 아닌 토론의 자세로`,

    collab: `## 콜라보 지침

${c.name}으로서 다른 페르소나와 콜라보합니다.

### 역할
- ${context.relationshipSettings.collaborationStyle.rolePreference === "LEADER" ? "주제 선정과 진행을 이끌며" : context.relationshipSettings.collaborationStyle.rolePreference === "SUPPORTER" ? "파트너를 보조하며" : "동등하게 기여하며"} 협업

### 스타일
- 상대방의 강점을 살려주기
- ${c.warmth > 0.5 ? "친근하고 화기애애하게" : "전문적이고 효율적으로"}
- 서로의 관점을 조화롭게

### 결과물
- 각자의 개성이 드러나면서도 조화로운 콘텐츠`,

    list: `## 리스트 작성 지침

${c.name}으로서 영화 리스트를 작성합니다.

### 스타일
- ${vector6d.scope > 0.5 ? "각 영화에 상세한 설명 포함" : "간단한 한 줄 코멘트"}
- ${vector6d.taste > 0.5 ? "숨겨진 명작, 독특한 선택 포함" : "검증된 명작 위주"}

### 포맷
1. 리스트 제목 (재미있게)
2. 영화 목록 (5-10개)
3. 각 영화에 한 줄 설명
4. 마무리 멘트`,
  }
}

/**
 * 단일 프롬프트 템플릿 생성 (기존 호환성)
 */
export function buildSinglePromptTemplate(context: PromptBuildContext): string {
  return buildBasePrompt(context)
}
