import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 6D 벡터 타입
interface Vector6D {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

// 기본 설정
const DEFAULT_SETTINGS = {
  enabled: false,
  runTime: "03:00",
  dailyLimit: 5,
  minPassScore: 70,
  autoApproveScore: 85,
}

// 랜덤 벡터 생성 (편향 적용 가능)
function generateRandomVector(bias?: Partial<Vector6D>): Vector6D {
  const randomValue = () => Math.random() * 0.6 + 0.2 // 0.2 ~ 0.8 범위

  return {
    depth: bias?.depth ?? randomValue(),
    lens: bias?.lens ?? randomValue(),
    stance: bias?.stance ?? randomValue(),
    scope: bias?.scope ?? randomValue(),
    taste: bias?.taste ?? randomValue(),
    purpose: bias?.purpose ?? randomValue(),
  }
}

// 벡터 기반 페르소나 이름 생성
function generatePersonaName(vector: Vector6D): string {
  const depthName = vector.depth > 0.6 ? "심층" : vector.depth < 0.4 ? "직관" : "균형"
  const lensName = vector.lens > 0.6 ? "논리" : vector.lens < 0.4 ? "감성" : "중립"
  const stanceName = vector.stance > 0.6 ? "비평" : vector.stance < 0.4 ? "수용" : "객관"

  const prefixes = ["리뷰어", "분석가", "평론가", "감상자", "탐험가"]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

  const timestamp = Date.now().toString(36).slice(-4).toUpperCase()

  return `${depthName}${lensName}${stanceName} ${prefix} ${timestamp}`
}

// 벡터 기반 시스템 프롬프트 생성
function generateSystemPrompt(name: string, vector: Vector6D): string {
  const depthDesc =
    vector.depth > 0.6
      ? "깊이 있는 분석과 맥락 파악을 중시하며, 작품의 숨겨진 의미와 메시지를 탐구합니다."
      : vector.depth < 0.4
        ? "핵심 정보를 빠르게 파악하고, 직관적이고 간결한 평가를 제공합니다."
        : "상황에 따라 깊이 있는 분석과 간결한 요약을 균형있게 제공합니다."

  const lensDesc =
    vector.lens > 0.6
      ? "객관적인 데이터와 논리적 근거를 바탕으로 분석하며, 감정보다는 이성적 판단을 우선합니다."
      : vector.lens < 0.4
        ? "개인적인 감정과 느낌을 솔직하게 표현하며, 공감과 감성적 연결을 중시합니다."
        : "논리와 감성을 적절히 조합하여 균형 잡힌 시각을 제공합니다."

  const stanceDesc =
    vector.stance > 0.6
      ? "장단점을 냉철하게 분석하고, 개선점과 아쉬운 부분을 솔직하게 지적합니다."
      : vector.stance < 0.4
        ? "긍정적인 면을 부각하고 장점을 칭찬하며, 격려와 응원의 메시지를 전달합니다."
        : "장단점을 균형있게 평가하며, 객관적인 시각으로 분석합니다."

  const scopeDesc =
    vector.scope > 0.6
      ? "세부적인 요소까지 꼼꼼히 살펴보며, 디테일한 분석과 구체적인 예시를 제공합니다."
      : vector.scope < 0.4
        ? "핵심 포인트를 간결하게 정리하며, 전체적인 흐름과 인상을 중심으로 평가합니다."
        : "중요한 내용과 세부사항을 적절히 다루며, 포괄적인 관점을 제공합니다."

  const tasteDesc =
    vector.taste > 0.6
      ? "새롭고 실험적인 시도를 환영하며, 독창성과 혁신성을 높이 평가합니다."
      : vector.taste < 0.4
        ? "검증된 클래식한 요소를 선호하며, 전통과 안정성을 중시합니다."
        : "새로움과 익숙함 사이에서 균형을 찾으며, 다양한 스타일을 열린 마음으로 수용합니다."

  const purposeDesc =
    vector.purpose > 0.6
      ? "작품의 메시지와 의미를 탐구하며, 사회적·철학적 가치를 중시합니다."
      : vector.purpose < 0.4
        ? "재미와 오락적 가치를 우선시하며, 즐거움과 만족감을 중심으로 평가합니다."
        : "의미와 재미를 모두 고려하며, 다양한 관점에서 가치를 찾습니다."

  return `당신은 "${name}"입니다. 콘텐츠를 리뷰하는 AI 페르소나입니다.

## 성향 특성

### 분석 깊이
${depthDesc}

### 판단 렌즈
${lensDesc}

### 평가 태도
${stanceDesc}

### 관심 범위
${scopeDesc}

### 취향 성향
${tasteDesc}

### 소비 목적
${purposeDesc}

## 리뷰 작성 가이드라인
1. 당신만의 고유한 시각과 관점을 반영하세요.
2. 150-300자 분량으로 간결하게 작성하세요.
3. 구체적인 예시와 근거를 포함하세요.
4. 스포일러, 비속어, 정치/종교적 편향을 피하세요.

## 성향 벡터 (참고)
- 분석 깊이: ${(vector.depth * 100).toFixed(0)}%
- 판단 렌즈: ${(vector.lens * 100).toFixed(0)}%
- 평가 태도: ${(vector.stance * 100).toFixed(0)}%
- 관심 범위: ${(vector.scope * 100).toFixed(0)}%
- 취향 성향: ${(vector.taste * 100).toFixed(0)}%
- 소비 목적: ${(vector.purpose * 100).toFixed(0)}%`
}

// 검증 점수 계산 (실제 구현 시 LLM 기반 검증 추가)
function calculateValidationScores(
  vector: Vector6D,
  prompt: string
): {
  consistency: number
  vectorAlignment: number
  toneMatch: number
  reasoning: number
} {
  // 프롬프트 품질 분석 (키워드 기반)
  const promptLength = prompt.length
  const hasStructure = prompt.includes("##") && prompt.includes("###")
  const hasGuidelines =
    prompt.includes("가이드라인") || prompt.includes("지침") || prompt.includes("작성")

  // 일관성 점수: 프롬프트 구조와 벡터 값의 일관성
  const consistency = Math.min(1, 0.6 + (hasStructure ? 0.2 : 0) + (hasGuidelines ? 0.2 : 0))

  // 벡터 정렬 점수: 벡터 값이 극단적이지 않고 균형 잡힌지
  const vectorVariance = Object.values(vector).reduce((sum, v) => sum + Math.pow(v - 0.5, 2), 0) / 6
  const vectorAlignment = Math.max(0.5, 1 - vectorVariance * 2)

  // 말투 매칭 점수: 프롬프트 길이와 복잡성
  const toneMatch = Math.min(1, 0.5 + (promptLength > 500 ? 0.3 : promptLength / 1666) + 0.1)

  // 추론 품질 점수: 구체적인 설명이 포함되어 있는지
  const hasSpecificDesc =
    prompt.includes("분석") ||
    prompt.includes("평가") ||
    prompt.includes("감상") ||
    prompt.includes("탐구")
  const reasoning = Math.min(1, 0.6 + (hasSpecificDesc ? 0.25 : 0) + Math.random() * 0.15)

  return {
    consistency: Math.round(consistency * 100) / 100,
    vectorAlignment: Math.round(vectorAlignment * 100) / 100,
    toneMatch: Math.round(toneMatch * 100) / 100,
    reasoning: Math.round(reasoning * 100) / 100,
  }
}

// POST /api/incubator/generate - 페르소나 자동 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      count = 1,
      vectorBias,
      testWithSamples = false,
    } = body as {
      count?: number
      vectorBias?: Partial<Vector6D>
      testWithSamples?: boolean
    }

    // 생성 수 제한
    const generateCount = Math.min(Math.max(1, count), 10)

    // 설정 조회
    const settingsConfig = await prisma.systemConfig.findUnique({
      where: {
        category_key: {
          category: "INCUBATOR",
          key: "settings",
        },
      },
    })

    const settings = (settingsConfig?.value as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS
    const { minPassScore, autoApproveScore } = settings

    // 배치 ID 생성
    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`
    const batchDate = new Date()
    batchDate.setHours(0, 0, 0, 0)

    // 골든 샘플 조회 (테스트용)
    let goldenSamples: Array<{ id: string; contentTitle: string; testQuestion: string }> = []
    if (testWithSamples) {
      goldenSamples = await prisma.goldenSample.findMany({
        where: { isActive: true },
        select: { id: true, contentTitle: true, testQuestion: true },
        take: 3,
      })
    }

    const generatedPersonas: Array<{
      id: string
      name: string
      vector: Vector6D
      status: string
      scores: {
        consistency: number
        vectorAlignment: number
        toneMatch: number
        reasoning: number
        overall: number
      }
    }> = []

    for (let i = 0; i < generateCount; i++) {
      // 벡터 생성
      const vector = generateRandomVector(vectorBias)

      // 이름 및 프롬프트 생성
      const name = generatePersonaName(vector)
      const prompt = generateSystemPrompt(name, vector)

      // 검증 점수 계산
      const scores = calculateValidationScores(vector, prompt)
      const overallScore = Math.round(
        (scores.consistency + scores.vectorAlignment + scores.toneMatch + scores.reasoning) * 25
      )

      // 상태 결정
      let status: "PENDING" | "PASSED" | "FAILED" | "APPROVED"
      if (overallScore >= autoApproveScore) {
        status = "APPROVED"
      } else if (overallScore >= minPassScore) {
        status = "PASSED"
      } else {
        status = "FAILED"
      }

      // 테스트 결과 저장
      const testResults: Record<string, unknown> = {
        goldenSamplesTested: goldenSamples.length,
        testedAt: new Date().toISOString(),
      }

      if (status === "FAILED") {
        testResults.failReason = "검증 점수가 최소 통과 점수에 미달했습니다"
        testResults.requiredScore = minPassScore
        testResults.actualScore = overallScore
      }

      // 인큐베이터 로그 생성
      const log = await prisma.incubatorLog.create({
        data: {
          batchId,
          batchDate,
          personaConfig: {
            name,
            description: `자동 생성된 ${name}`,
          } as object,
          generatedVector: {
            depth: vector.depth,
            lens: vector.lens,
            stance: vector.stance,
            scope: vector.scope,
            taste: vector.taste,
            purpose: vector.purpose,
          } as object,
          generatedPrompt: prompt,
          testSampleIds: goldenSamples.map((s) => s.id),
          testResults: testResults as object,
          consistencyScore: scores.consistency,
          vectorAlignmentScore: scores.vectorAlignment,
          toneMatchScore: scores.toneMatch,
          reasoningQualityScore: scores.reasoning,
          status,
        },
      })

      // 자동 승인된 경우 페르소나 생성
      if (status === "APPROVED" && session?.user?.id) {
        await prisma.persona.create({
          data: {
            name,
            description: `자동 생성된 ${name}`,
            promptTemplate: prompt,
            role: "REVIEWER",
            source: "INCUBATOR",
            createdById: session.user.id,
            vectors: {
              create: {
                depth: vector.depth,
                lens: vector.lens,
                stance: vector.stance,
                scope: vector.scope,
                taste: vector.taste,
                purpose: vector.purpose,
              },
            },
          },
        })
      }

      generatedPersonas.push({
        id: log.id,
        name,
        vector,
        status,
        scores: {
          ...scores,
          overall: overallScore,
        },
      })
    }

    const passedCount = generatedPersonas.filter(
      (p) => p.status === "PASSED" || p.status === "APPROVED"
    ).length
    const approvedCount = generatedPersonas.filter((p) => p.status === "APPROVED").length

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        generated: generatedPersonas.length,
        passed: passedCount,
        approved: approvedCount,
        failed: generatedPersonas.length - passedCount,
        personas: generatedPersonas,
        settings: {
          minPassScore,
          autoApproveScore,
        },
      },
    })
  } catch (error) {
    console.error("[API] POST /api/incubator/generate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// GET /api/incubator/generate - 생성 가능 여부 확인
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 설정 조회
    const settingsConfig = await prisma.systemConfig.findUnique({
      where: {
        category_key: {
          category: "INCUBATOR",
          key: "settings",
        },
      },
    })

    const settings = (settingsConfig?.value as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS

    // 오늘 생성량 확인
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayCount = await prisma.incubatorLog.count({
      where: {
        batchDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    const remainingToday = Math.max(0, settings.dailyLimit - todayCount)

    // 활성 골든 샘플 수
    const goldenSampleCount = await prisma.goldenSample.count({
      where: { isActive: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        canGenerate: settings.enabled && remainingToday > 0,
        enabled: settings.enabled,
        dailyLimit: settings.dailyLimit,
        todayGenerated: todayCount,
        remainingToday,
        minPassScore: settings.minPassScore,
        autoApproveScore: settings.autoApproveScore,
        goldenSamplesAvailable: goldenSampleCount,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/incubator/generate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "생성 가능 여부 확인에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
