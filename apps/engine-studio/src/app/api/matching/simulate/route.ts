import { NextRequest, NextResponse } from "next/server"

// 코사인 유사도 계산 (division by zero 방지)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  // Prevent division by zero - return 0 if either vector is zero
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) {
    return 0
  }

  return dotProduct / denominator
}

// 가중치 적용 유클리디안 거리
function weightedEuclidean(vecA: number[], vecB: number[], weights: number[]): number {
  let sum = 0
  for (let i = 0; i < vecA.length; i++) {
    sum += weights[i] * Math.pow(vecA[i] - vecB[i], 2)
  }
  return 1 - Math.sqrt(sum) / Math.sqrt(weights.reduce((a, b) => a + b, 0))
}

// Mock 페르소나 데이터
const PERSONAS = [
  {
    id: "1",
    name: "논리적 평론가",
    vector: { depth: 0.85, lens: 0.78, stance: 0.72, scope: 0.45, taste: 0.68, purpose: 0.82 },
  },
  {
    id: "2",
    name: "감성 에세이스트",
    vector: { depth: 0.62, lens: 0.25, stance: 0.35, scope: 0.58, taste: 0.75, purpose: 0.42 },
  },
  {
    id: "3",
    name: "트렌드 헌터",
    vector: { depth: 0.45, lens: 0.55, stance: 0.48, scope: 0.85, taste: 0.32, purpose: 0.38 },
  },
  {
    id: "4",
    name: "균형 잡힌 가이드",
    vector: { depth: 0.55, lens: 0.52, stance: 0.5, scope: 0.55, taste: 0.48, purpose: 0.52 },
  },
  {
    id: "5",
    name: "시네필 평론가",
    vector: { depth: 0.92, lens: 0.72, stance: 0.78, scope: 0.22, taste: 0.88, purpose: 0.75 },
  },
]

// POST /api/matching/simulate - 매칭 시뮬레이션
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userVector, algorithm = "cosine", weights } = body

    if (!userVector) {
      return NextResponse.json(
        { success: false, error: "User vector is required" },
        { status: 400 }
      )
    }

    const dims = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
    const userVec = dims.map((d) => userVector[d] || 0)
    const defaultWeights = [1, 1, 1, 1, 1, 1]

    // 각 페르소나와의 매칭 점수 계산
    const results = PERSONAS.map((persona) => {
      const personaVec = dims.map((d) => persona.vector[d])

      let score: number
      switch (algorithm) {
        case "weighted":
          score = weightedEuclidean(userVec, personaVec, weights || defaultWeights)
          break
        case "cosine":
        default:
          score = cosineSimilarity(userVec, personaVec)
          break
      }

      // 차원별 유사도 계산
      const breakdown: Record<string, number> = {}
      dims.forEach((d, i) => {
        breakdown[d] = 1 - Math.abs(userVec[i] - personaVec[i])
      })

      return {
        persona: {
          id: persona.id,
          name: persona.name,
          vector: persona.vector,
        },
        score: score * 100,
        breakdown,
      }
    })

    // 점수순 정렬
    results.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      success: true,
      data: {
        algorithm,
        userVector,
        results,
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to simulate matching" },
      { status: 500 }
    )
  }
}
