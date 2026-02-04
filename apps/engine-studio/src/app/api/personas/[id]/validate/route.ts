import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 검증 기준
const VALIDATION_CRITERIA = {
  promptMinLength: 100, // 프롬프트 최소 길이
  promptMaxLength: 5000, // 프롬프트 최대 길이
  vectorVarianceMin: 0.1, // 벡터 차이 최소값 (너무 균일하면 안됨)
  expertiseMinCount: 1, // 최소 전문분야 수
  expertiseMaxCount: 10, // 최대 전문분야 수
}

// 프롬프트 품질 분석
function analyzePromptQuality(prompt: string): {
  score: number
  issues: string[]
  details: Record<string, number>
} {
  const issues: string[] = []
  let score = 100

  // 길이 검사
  if (prompt.length < VALIDATION_CRITERIA.promptMinLength) {
    issues.push(`프롬프트가 너무 짧습니다 (최소 ${VALIDATION_CRITERIA.promptMinLength}자)`)
    score -= 20
  }
  if (prompt.length > VALIDATION_CRITERIA.promptMaxLength) {
    issues.push(`프롬프트가 너무 깁니다 (최대 ${VALIDATION_CRITERIA.promptMaxLength}자)`)
    score -= 10
  }

  // 구조 검사 (섹션 구분)
  const hasSections = prompt.includes("-") || prompt.includes("•") || prompt.includes("\n\n")
  if (!hasSections) {
    issues.push("프롬프트에 구조화된 섹션이 없습니다")
    score -= 15
  }

  // 페르소나 역할 명시 검사
  const roleKeywords = ["당신은", "역할", "~입니다", "~하세요", "관점", "시선", "분석"]
  const hasRoleDefinition = roleKeywords.some((kw) => prompt.includes(kw))
  if (!hasRoleDefinition) {
    issues.push("페르소나 역할이 명확하게 정의되지 않았습니다")
    score -= 20
  }

  // 지시사항 명확성 검사
  const instructionKeywords = ["~해야", "~하세요", "~합니다", "중요", "필수", "반드시"]
  const instructionCount = instructionKeywords.filter((kw) => prompt.includes(kw)).length
  if (instructionCount < 2) {
    issues.push("구체적인 지시사항이 부족합니다")
    score -= 15
  }

  // 금기사항 검사
  const hasProhibitions =
    prompt.includes("금지") || prompt.includes("하지 마") || prompt.includes("피해")
  const prohibitionScore = hasProhibitions ? 5 : 0

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    details: {
      lengthScore:
        prompt.length >= VALIDATION_CRITERIA.promptMinLength
          ? 100
          : (prompt.length / VALIDATION_CRITERIA.promptMinLength) * 100,
      structureScore: hasSections ? 100 : 50,
      roleDefinitionScore: hasRoleDefinition ? 100 : 30,
      instructionScore: Math.min(100, instructionCount * 25),
      prohibitionScore: prohibitionScore > 0 ? 100 : 70,
    },
  }
}

// 벡터 일관성 검사
function analyzeVectorConsistency(
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  },
  prompt: string
): {
  score: number
  issues: string[]
  details: Record<string, { expected: string; actual: string; match: boolean }>
} {
  const issues: string[] = []
  let matchCount = 0
  const details: Record<string, { expected: string; actual: string; match: boolean }> = {}

  // Depth 분석 (심층적 0→1)
  const depthKeywords = {
    high: ["심층", "깊이", "분석", "철학", "의미", "맥락", "배경"],
    low: ["직관", "표면", "간단", "빠른", "핵심만"],
  }
  const hasHighDepth = depthKeywords.high.some((kw) => prompt.includes(kw))
  const hasLowDepth = depthKeywords.low.some((kw) => prompt.includes(kw))
  const expectedDepth = vector.depth > 0.6 ? "high" : vector.depth < 0.4 ? "low" : "medium"
  const actualDepth =
    hasHighDepth && !hasLowDepth ? "high" : hasLowDepth && !hasHighDepth ? "low" : "medium"
  const depthMatch = expectedDepth === actualDepth || expectedDepth === "medium"
  details.depth = { expected: expectedDepth, actual: actualDepth, match: depthMatch }
  if (depthMatch) matchCount++
  else issues.push(`벡터 Depth(${vector.depth})와 프롬프트 톤이 불일치`)

  // Lens 분석 (논리적 0→1)
  const lensKeywords = {
    logical: ["논리", "분석", "객관", "데이터", "근거", "사실"],
    emotional: ["감성", "감정", "공감", "느낌", "마음"],
  }
  const hasLogical = lensKeywords.logical.some((kw) => prompt.includes(kw))
  const hasEmotional = lensKeywords.emotional.some((kw) => prompt.includes(kw))
  const expectedLens = vector.lens > 0.6 ? "logical" : vector.lens < 0.4 ? "emotional" : "balanced"
  const actualLens =
    hasLogical && !hasEmotional ? "logical" : hasEmotional && !hasLogical ? "emotional" : "balanced"
  const lensMatch = expectedLens === actualLens || expectedLens === "balanced"
  details.lens = { expected: expectedLens, actual: actualLens, match: lensMatch }
  if (lensMatch) matchCount++
  else issues.push(`벡터 Lens(${vector.lens})와 프롬프트 관점이 불일치`)

  // Stance 분석 (비판적 0→1)
  const stanceKeywords = {
    critical: ["비판", "날카로운", "엄격", "평가", "약점"],
    accepting: ["수용", "긍정", "열린", "이해", "포용"],
  }
  const hasCritical = stanceKeywords.critical.some((kw) => prompt.includes(kw))
  const hasAccepting = stanceKeywords.accepting.some((kw) => prompt.includes(kw))
  const expectedStance =
    vector.stance > 0.6 ? "critical" : vector.stance < 0.4 ? "accepting" : "balanced"
  const actualStance =
    hasCritical && !hasAccepting
      ? "critical"
      : hasAccepting && !hasCritical
        ? "accepting"
        : "balanced"
  const stanceMatch = expectedStance === actualStance || expectedStance === "balanced"
  details.stance = { expected: expectedStance, actual: actualStance, match: stanceMatch }
  if (stanceMatch) matchCount++
  else issues.push(`벡터 Stance(${vector.stance})와 프롬프트 태도가 불일치`)

  // Scope 분석 (디테일 0→1)
  const scopeKeywords = {
    detailed: ["디테일", "세부", "상세", "구체", "모든"],
    focused: ["핵심", "중요한", "간결", "요점"],
  }
  const hasDetailed = scopeKeywords.detailed.some((kw) => prompt.includes(kw))
  const hasFocused = scopeKeywords.focused.some((kw) => prompt.includes(kw))
  const expectedScope =
    vector.scope > 0.6 ? "detailed" : vector.scope < 0.4 ? "focused" : "balanced"
  const actualScope =
    hasDetailed && !hasFocused ? "detailed" : hasFocused && !hasDetailed ? "focused" : "balanced"
  const scopeMatch = expectedScope === actualScope || expectedScope === "balanced"
  details.scope = { expected: expectedScope, actual: actualScope, match: scopeMatch }
  if (scopeMatch) matchCount++
  else issues.push(`벡터 Scope(${vector.scope})와 프롬프트 범위가 불일치`)

  // Taste 분석 (실험적 0→1)
  const tasteKeywords = {
    experimental: ["실험", "새로운", "독특", "창의", "혁신", "도전"],
    classic: ["전통", "클래식", "검증", "안정", "보편"],
  }
  const hasExperimental = tasteKeywords.experimental.some((kw) => prompt.includes(kw))
  const hasClassic = tasteKeywords.classic.some((kw) => prompt.includes(kw))
  const expectedTaste =
    vector.taste > 0.6 ? "experimental" : vector.taste < 0.4 ? "classic" : "balanced"
  const actualTaste =
    hasExperimental && !hasClassic
      ? "experimental"
      : hasClassic && !hasExperimental
        ? "classic"
        : "balanced"
  const tasteMatch = expectedTaste === actualTaste || expectedTaste === "balanced"
  details.taste = { expected: expectedTaste, actual: actualTaste, match: tasteMatch }
  if (tasteMatch) matchCount++
  else issues.push(`벡터 Taste(${vector.taste})와 프롬프트 취향이 불일치`)

  // Purpose 분석 (의미추구 0→1)
  const purposeKeywords = {
    meaningful: ["의미", "가치", "메시지", "교훈", "생각"],
    entertaining: ["재미", "흥미", "즐거", "유머", "가벼"],
  }
  const hasMeaningful = purposeKeywords.meaningful.some((kw) => prompt.includes(kw))
  const hasEntertaining = purposeKeywords.entertaining.some((kw) => prompt.includes(kw))
  const expectedPurpose =
    vector.purpose > 0.6 ? "meaningful" : vector.purpose < 0.4 ? "entertaining" : "balanced"
  const actualPurpose =
    hasMeaningful && !hasEntertaining
      ? "meaningful"
      : hasEntertaining && !hasMeaningful
        ? "entertaining"
        : "balanced"
  const purposeMatch = expectedPurpose === actualPurpose || expectedPurpose === "balanced"
  details.purpose = { expected: expectedPurpose, actual: actualPurpose, match: purposeMatch }
  if (purposeMatch) matchCount++
  else issues.push(`벡터 Purpose(${vector.purpose})와 프롬프트 목적이 불일치`)

  const score = Math.round((matchCount / 6) * 100)
  return { score, issues, details }
}

// 전문분야 검증
function analyzeExpertise(
  expertise: string[],
  prompt: string
): {
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  if (expertise.length < VALIDATION_CRITERIA.expertiseMinCount) {
    issues.push("전문분야가 설정되지 않았습니다")
    score -= 30
  }

  if (expertise.length > VALIDATION_CRITERIA.expertiseMaxCount) {
    issues.push(`전문분야가 너무 많습니다 (최대 ${VALIDATION_CRITERIA.expertiseMaxCount}개)`)
    score -= 10
  }

  // 프롬프트에 전문분야 관련 내용이 있는지 확인
  const mentionedExpertise = expertise.filter((exp) =>
    prompt.toLowerCase().includes(exp.toLowerCase())
  )
  const mentionRate = expertise.length > 0 ? mentionedExpertise.length / expertise.length : 0

  if (mentionRate < 0.5 && expertise.length > 0) {
    issues.push("프롬프트에 전문분야 관련 내용이 부족합니다")
    score -= 20
  }

  return { score: Math.max(0, score), issues }
}

// POST /api/personas/[id]/validate - 페르소나 검증 실행
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 페르소나 조회
    const persona = await prisma.persona.findUnique({
      where: { id },
      include: {
        vectors: { orderBy: { version: "desc" }, take: 1 },
      },
    })

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const vector = persona.vectors[0]
    if (!vector) {
      return NextResponse.json(
        { success: false, error: { code: "NO_VECTOR", message: "벡터 데이터가 없습니다" } },
        { status: 400 }
      )
    }

    // 검증 실행
    const promptAnalysis = analyzePromptQuality(persona.promptTemplate)
    const vectorAnalysis = analyzeVectorConsistency(
      {
        depth: Number(vector.depth),
        lens: Number(vector.lens),
        stance: Number(vector.stance),
        scope: Number(vector.scope),
        taste: Number(vector.taste),
        purpose: Number(vector.purpose),
      },
      persona.promptTemplate
    )
    const expertiseAnalysis = analyzeExpertise(persona.expertise, persona.promptTemplate)

    // 종합 점수 계산 (가중 평균)
    const overallScore = Math.round(
      promptAnalysis.score * 0.4 + vectorAnalysis.score * 0.4 + expertiseAnalysis.score * 0.2
    )

    // 모든 이슈 수집
    const allIssues = [
      ...promptAnalysis.issues,
      ...vectorAnalysis.issues,
      ...expertiseAnalysis.issues,
    ]

    // 검증 통과 여부 (70점 이상)
    const passed = overallScore >= 70

    // DB 업데이트
    const currentVersion = await prisma.persona.findUnique({
      where: { id },
      select: { validationVersion: true },
    })

    await prisma.persona.update({
      where: { id },
      data: {
        validationScore: overallScore / 100,
        validationVersion: (currentVersion?.validationVersion ?? 0) + 1,
        lastValidationDate: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        personaId: id,
        overallScore,
        passed,
        breakdown: {
          promptQuality: {
            score: promptAnalysis.score,
            details: promptAnalysis.details,
            issues: promptAnalysis.issues,
          },
          vectorConsistency: {
            score: vectorAnalysis.score,
            details: vectorAnalysis.details,
            issues: vectorAnalysis.issues,
          },
          expertiseRelevance: {
            score: expertiseAnalysis.score,
            issues: expertiseAnalysis.issues,
          },
        },
        allIssues,
        validatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] POST /api/personas/[id]/validate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "검증 실행에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// GET /api/personas/[id]/validate - 마지막 검증 결과 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const persona = await prisma.persona.findUnique({
      where: { id },
      select: {
        id: true,
        validationScore: true,
        validationVersion: true,
        lastValidationDate: true,
      },
    })

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        personaId: persona.id,
        validationScore: persona.validationScore ? Number(persona.validationScore) * 100 : null,
        validationVersion: persona.validationVersion,
        lastValidationDate: persona.lastValidationDate?.toISOString() || null,
        hasBeenValidated: persona.validationScore !== null,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/personas/[id]/validate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "검증 결과 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
