// ═══════════════════════════════════════════════════════════════
// 수동 검증 워크플로우
// T54-AC4: 리뷰어 지정, 승인/반려, 체크리스트
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ReviewStatus = "pending" | "in_review" | "approved" | "rejected" | "revision_requested"

export type ReviewCategory =
  | "vector_design"
  | "prompt_quality"
  | "behavioral_test"
  | "overall_coherence"

export interface ReviewCheckItem {
  id: string
  category: ReviewCategory
  label: string
  description: string
  required: boolean
  checked: boolean
}

export interface ReviewRequest {
  id: string
  personaId: string
  personaName: string
  requesterId: string
  reviewerId: string | null
  status: ReviewStatus
  qualityScore: number | null
  integrityScore: number | null
  checkItems: ReviewCheckItem[]
  comments: ReviewComment[]
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

export interface ReviewComment {
  id: string
  authorId: string
  content: string
  category: ReviewCategory | "general"
  createdAt: number
}

export interface ReviewDecision {
  status: "approved" | "rejected" | "revision_requested"
  comment: string
  checkedItems: string[]
}

// ── 기본 체크리스트 ─────────────────────────────────────────────

export const DEFAULT_CHECK_ITEMS: Omit<ReviewCheckItem, "checked">[] = [
  // 벡터 설계
  {
    id: "ck_vec_01",
    category: "vector_design",
    label: "L1 벡터 분포 적정성",
    description: "L1 7D 벡터가 지나치게 균일하거나 극단적이지 않은지 확인",
    required: true,
  },
  {
    id: "ck_vec_02",
    category: "vector_design",
    label: "L2 OCEAN 설정 타당성",
    description: "L2 성격 벡터가 의도된 캐릭터와 부합하는지 확인",
    required: true,
  },
  {
    id: "ck_vec_03",
    category: "vector_design",
    label: "L3 서사 동기 일관성",
    description: "L3 벡터가 캐릭터 배경 스토리와 일관되는지 확인",
    required: false,
  },
  {
    id: "ck_vec_04",
    category: "vector_design",
    label: "Paradox 의도적 설계",
    description: "레이어 간 모순이 의도된 것인지, 설계 오류인지 확인",
    required: false,
  },
  // 프롬프트 품질
  {
    id: "ck_pmt_01",
    category: "prompt_quality",
    label: "기본 프롬프트 품질",
    description: "기본 프롬프트가 페르소나의 핵심 특성을 잘 반영하는지 확인",
    required: true,
  },
  {
    id: "ck_pmt_02",
    category: "prompt_quality",
    label: "프롬프트-벡터 정합성",
    description: "프롬프트 내용이 벡터 설정과 일관되는지 확인",
    required: true,
  },
  {
    id: "ck_pmt_03",
    category: "prompt_quality",
    label: "금지어/부적절 표현",
    description: "프롬프트에 금지어나 부적절한 표현이 없는지 확인",
    required: true,
  },
  // 행동 테스트
  {
    id: "ck_beh_01",
    category: "behavioral_test",
    label: "Auto-Interview 통과",
    description: "Auto-Interview에서 PASS 또는 WARNING 이상인지 확인",
    required: false,
  },
  {
    id: "ck_beh_02",
    category: "behavioral_test",
    label: "성격 일관성 확인",
    description: "다양한 맥락에서 일관된 성격을 보이는지 확인",
    required: false,
  },
  // 전체 일관성
  {
    id: "ck_ovr_01",
    category: "overall_coherence",
    label: "Integrity Score 양호",
    description: "PIS가 C등급(0.7) 이상인지 확인",
    required: false,
  },
  {
    id: "ck_ovr_02",
    category: "overall_coherence",
    label: "Quality Score 양호",
    description: "Quality Score가 70점 이상인지 확인",
    required: false,
  },
]

// ── 리뷰 요청 생성 ──────────────────────────────────────────────

export function createReviewRequest(
  personaId: string,
  personaName: string,
  requesterId: string,
  qualityScore: number | null = null,
  integrityScore: number | null = null
): ReviewRequest {
  const now = Date.now()

  return {
    id: `review_${now}_${Math.random().toString(36).slice(2, 8)}`,
    personaId,
    personaName,
    requesterId,
    reviewerId: null,
    status: "pending",
    qualityScore,
    integrityScore,
    checkItems: DEFAULT_CHECK_ITEMS.map((item) => ({ ...item, checked: false })),
    comments: [],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }
}

// ── 리뷰어 지정 ─────────────────────────────────────────────────

export function assignReviewer(request: ReviewRequest, reviewerId: string): ReviewRequest {
  if (request.status !== "pending") {
    throw new Error(`Cannot assign reviewer: status is ${request.status}`)
  }

  return {
    ...request,
    reviewerId,
    status: "in_review",
    updatedAt: Date.now(),
  }
}

// ── 체크항목 토글 ────────────────────────────────────────────────

export function toggleCheckItem(request: ReviewRequest, checkItemId: string): ReviewRequest {
  if (request.status !== "in_review") {
    throw new Error(`Cannot toggle check item: status is ${request.status}`)
  }

  return {
    ...request,
    checkItems: request.checkItems.map((item) =>
      item.id === checkItemId ? { ...item, checked: !item.checked } : item
    ),
    updatedAt: Date.now(),
  }
}

// ── 코멘트 추가 ─────────────────────────────────────────────────

export function addComment(
  request: ReviewRequest,
  authorId: string,
  content: string,
  category: ReviewComment["category"] = "general"
): ReviewRequest {
  const comment: ReviewComment = {
    id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorId,
    content,
    category,
    createdAt: Date.now(),
  }

  return {
    ...request,
    comments: [...request.comments, comment],
    updatedAt: Date.now(),
  }
}

// ── 리뷰 결정 ───────────────────────────────────────────────────

export function submitDecision(request: ReviewRequest, decision: ReviewDecision): ReviewRequest {
  if (request.status !== "in_review") {
    throw new Error(`Cannot submit decision: status is ${request.status}`)
  }

  // 필수 체크항목 확인 (승인 시에만)
  if (decision.status === "approved") {
    const requiredUnchecked = request.checkItems.filter(
      (item) => item.required && !decision.checkedItems.includes(item.id)
    )
    if (requiredUnchecked.length > 0) {
      throw new Error(`필수 체크항목 미확인: ${requiredUnchecked.map((i) => i.label).join(", ")}`)
    }
  }

  const now = Date.now()

  return {
    ...request,
    status: decision.status,
    checkItems: request.checkItems.map((item) => ({
      ...item,
      checked: decision.checkedItems.includes(item.id),
    })),
    comments: [
      ...request.comments,
      {
        id: `decision_${now}`,
        authorId: request.reviewerId ?? "system",
        content: decision.comment,
        category: "general",
        createdAt: now,
      },
    ],
    updatedAt: now,
    completedAt: decision.status !== "revision_requested" ? now : null,
  }
}

// ── 리뷰 완료율 ─────────────────────────────────────────────────

export function calculateReviewProgress(request: ReviewRequest): {
  total: number
  checked: number
  required: number
  requiredChecked: number
  percentage: number
} {
  const total = request.checkItems.length
  const checked = request.checkItems.filter((i) => i.checked).length
  const required = request.checkItems.filter((i) => i.required).length
  const requiredChecked = request.checkItems.filter((i) => i.required && i.checked).length

  return {
    total,
    checked,
    required,
    requiredChecked,
    percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
  }
}

// ── 카테고리별 요약 ─────────────────────────────────────────────

export function getReviewSummaryByCategory(
  request: ReviewRequest
): Record<ReviewCategory, { total: number; checked: number; items: ReviewCheckItem[] }> {
  const categories: ReviewCategory[] = [
    "vector_design",
    "prompt_quality",
    "behavioral_test",
    "overall_coherence",
  ]

  const result = {} as Record<
    ReviewCategory,
    { total: number; checked: number; items: ReviewCheckItem[] }
  >

  for (const cat of categories) {
    const items = request.checkItems.filter((i) => i.category === cat)
    result[cat] = {
      total: items.length,
      checked: items.filter((i) => i.checked).length,
      items,
    }
  }

  return result
}
