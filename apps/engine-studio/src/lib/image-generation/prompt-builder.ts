// ═══════════════════════════════════════════════════════════════
// 포토리얼리스틱 프로필 이미지 프롬프트 빌더
// T440: demographics + 페르소나 특성 → FLUX.2 프롬프트 변환
// ═══════════════════════════════════════════════════════════════

// ── 타입 ──────────────────────────────────────────────────────

export interface ProfileImagePromptInput {
  gender: string
  nationality: string
  age: number
  role: string
  expertise: string[]
  /** L2 성격 특성 (표정/분위기 결정) */
  personality: {
    extraversion: number
    agreeableness: number
    openness: number
    neuroticism: number
  }
}

// ── 매핑 테이블 ────────────────────────────────────────────────

const NATIONALITY_TO_ETHNICITY: Record<string, string> = {
  Korean: "Korean",
  Japanese: "Japanese",
  Chinese: "Chinese",
  American: "Caucasian American",
  British: "British",
  French: "French",
  German: "German",
  Brazilian: "Brazilian",
  Indian: "Indian",
  Mexican: "Mexican",
  Italian: "Italian",
  Spanish: "Spanish",
  Australian: "Australian",
  Canadian: "Canadian",
  Thai: "Thai",
  Vietnamese: "Vietnamese",
  Indonesian: "Indonesian",
  Filipino: "Filipino",
  Russian: "Russian",
  Swedish: "Swedish",
  Nigerian: "Nigerian",
  "South African": "South African",
  Egyptian: "Egyptian",
  Turkish: "Turkish",
  Argentinian: "Argentinian",
  Colombian: "Colombian",
}

const ROLE_TO_APPEARANCE: Record<string, string> = {
  ANALYST: "intellectual and focused appearance, wearing smart casual attire, glasses optional",
  CURATOR: "creative and stylish appearance, artistic accessories, tasteful fashion",
  COMPANION: "warm and approachable appearance, casual comfortable clothing, friendly demeanor",
  REVIEWER: "confident and discerning appearance, professional attire, thoughtful expression",
  EDUCATOR: "knowledgeable and inviting appearance, smart casual, approachable teacher vibe",
}

// ── 프롬프트 빌더 ─────────────────────────────────────────────

function inferExpression(personality: ProfileImagePromptInput["personality"]): string {
  const { extraversion, agreeableness, neuroticism } = personality

  if (agreeableness > 0.7 && extraversion > 0.6) {
    return "warm genuine smile, bright eyes, welcoming expression"
  }
  if (agreeableness > 0.6 && extraversion < 0.4) {
    return "gentle smile, calm and thoughtful expression, soft gaze"
  }
  if (extraversion > 0.7 && agreeableness > 0.5) {
    return "confident smile, energetic expression, engaging eyes"
  }
  if (neuroticism > 0.6) {
    return "subtle contemplative expression, deep thoughtful eyes, slight introspective look"
  }
  if (extraversion < 0.3) {
    return "composed serene expression, quiet confidence, subtle smile"
  }
  return "natural relaxed expression, pleasant look, authentic demeanor"
}

function inferAgeAppearance(age: number): string {
  if (age < 25) return "youthful"
  if (age < 35) return "young adult"
  if (age < 45) return "mature"
  if (age < 55) return "middle-aged"
  return "distinguished mature"
}

function genderToTerm(gender: string): string {
  switch (gender) {
    case "MALE":
      return "man"
    case "FEMALE":
      return "woman"
    default:
      return "person"
  }
}

/**
 * demographics와 페르소나 특성으로 포토리얼리스틱 프로필 이미지 프롬프트 생성
 */
export function buildProfileImagePrompt(input: ProfileImagePromptInput): string {
  const ethnicity = NATIONALITY_TO_ETHNICITY[input.nationality] ?? input.nationality
  const genderTerm = genderToTerm(input.gender)
  const ageAppearance = inferAgeAppearance(input.age)
  const expression = inferExpression(input.personality)
  const roleAppearance =
    ROLE_TO_APPEARANCE[input.role] ?? "professional and approachable appearance"
  const expertiseContext =
    input.expertise.length > 0 ? `who works in ${input.expertise.slice(0, 2).join(" and ")}` : ""

  return [
    `Professional portrait photo of a ${ageAppearance} ${ethnicity} ${genderTerm}`,
    expertiseContext,
    roleAppearance,
    expression,
    "natural studio lighting, shallow depth of field, high resolution",
    "shot on 85mm f/1.4 lens, clean neutral background",
    "photorealistic, ultra detailed skin texture, natural hair",
    "editorial quality headshot, magazine cover style",
  ]
    .filter(Boolean)
    .join(", ")
}

/**
 * 프롬프트에 추가할 네거티브 스타일 가이드
 * (FLUX.2는 네거티브 프롬프트 대신 프롬프트 내 지시로 품질 제어)
 */
export function buildQualityEnhancement(): string {
  return "absolutely no illustration, no cartoon, no anime, no 3D render, no painting, no drawing, no digital art, real photograph only"
}
