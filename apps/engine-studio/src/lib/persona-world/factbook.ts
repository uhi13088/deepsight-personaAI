// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Factbook (팩트북)
// 불변의 진실(immutableFacts)과 변할 수 있는 맥락(mutableContext) 분리
//
// - immutableFacts: SHA256 해시로 변조 감지
// - mutableContext: 변경 이력 추적, 과도한 변경 감지
// - backstory에서 자동 분류
// ═══════════════════════════════════════════════════════════════

import type { BackstoryDimension, Factbook, ImmutableFact, MutableContext } from "@/types"

// ── 상수 ────────────────────────────────────────────────────────

/** 가변 맥락 과도한 변경 임계값 (하루 5회 이상 = 의심) */
export const MUTABLE_CHANGE_ALERT_THRESHOLD = 5

/** 팩트북 카테고리별 설명 */
export const FACTBOOK_CATEGORIES = {
  immutable: {
    origin: "페르소나의 기원/탄생 배경",
    formativeExperience: "성격을 형성한 핵심 경험",
    innerConflict: "내면의 근본적 갈등",
    coreIdentity: "변하지 않는 핵심 정체성",
  },
  mutable: {
    selfNarrative: "자기 서사 (시간에 따라 진화)",
    currentGoal: "현재 추구하는 목표",
    recentExperience: "최근 경험에서 얻은 통찰",
    evolvedPerspective: "변화된 관점/시각",
  },
} as const

// ── SHA256 해시 ─────────────────────────────────────────────────

/**
 * immutableFacts 배열의 SHA256 해시를 계산.
 *
 * 브라우저/Node.js 호환을 위해 Web Crypto API 사용.
 * 순서 일관성을 위해 id로 정렬 후 직렬화.
 */
export async function computeFactbookHash(facts: ImmutableFact[]): Promise<string> {
  const sorted = [...facts].sort((a, b) => a.id.localeCompare(b.id))
  const serialized = JSON.stringify(
    sorted.map((f) => ({ id: f.id, category: f.category, content: f.content }))
  )
  const encoder = new TextEncoder()
  const data = encoder.encode(serialized)

  // Web Crypto API (Node.js 20+ / 브라우저 호환)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * 팩트북 무결성 검증.
 *
 * 저장된 해시와 현재 immutableFacts의 해시를 비교.
 * 불일치 시 변조 의심.
 */
export async function verifyFactbookIntegrity(factbook: Factbook): Promise<{
  valid: boolean
  expectedHash: string
  actualHash: string
}> {
  const actualHash = await computeFactbookHash(factbook.immutableFacts)
  return {
    valid: factbook.integrityHash === actualHash,
    expectedHash: factbook.integrityHash,
    actualHash,
  }
}

// ── Backstory → Factbook 변환 ───────────────────────────────────

/**
 * 기존 BackstoryDimension을 Factbook으로 변환.
 *
 * 자동 분류 규칙:
 * - origin → immutable (origin)
 * - formativeExperience → immutable (formativeExperience)
 * - innerConflict → immutable (innerConflict)
 * - selfNarrative → mutable (selfNarrative)
 * - nlpKeywords → immutable (coreIdentity)로 결합
 */
export async function convertBackstoryToFactbook(backstory: BackstoryDimension): Promise<Factbook> {
  const now = Date.now()

  const immutableFacts: ImmutableFact[] = []
  const mutableContext: MutableContext[] = []

  // origin → immutable
  if (backstory.origin) {
    immutableFacts.push({
      id: `fact-origin-${now}`,
      category: "origin",
      content: backstory.origin,
      createdAt: now,
    })
  }

  // formativeExperience → immutable
  if (backstory.formativeExperience) {
    immutableFacts.push({
      id: `fact-exp-${now}`,
      category: "formativeExperience",
      content: backstory.formativeExperience,
      createdAt: now,
    })
  }

  // innerConflict → immutable
  if (backstory.innerConflict) {
    immutableFacts.push({
      id: `fact-conflict-${now}`,
      category: "innerConflict",
      content: backstory.innerConflict,
      createdAt: now,
    })
  }

  // nlpKeywords → immutable (coreIdentity)
  if (backstory.nlpKeywords.length > 0) {
    immutableFacts.push({
      id: `fact-identity-${now}`,
      category: "coreIdentity",
      content: backstory.nlpKeywords.join(", "),
      createdAt: now,
    })
  }

  // selfNarrative → mutable
  if (backstory.selfNarrative) {
    mutableContext.push({
      id: `ctx-narrative-${now}`,
      category: "selfNarrative",
      content: backstory.selfNarrative,
      updatedAt: now,
      changeCount: 0,
    })
  }

  const integrityHash = await computeFactbookHash(immutableFacts)

  return {
    immutableFacts,
    mutableContext,
    integrityHash,
    createdAt: now,
    updatedAt: now,
  }
}

// ── Factbook 조작 ───────────────────────────────────────────────

/**
 * 가변 맥락 추가.
 */
export function addMutableContext(
  factbook: Factbook,
  category: MutableContext["category"],
  content: string
): Factbook {
  const now = Date.now()
  return {
    ...factbook,
    mutableContext: [
      ...factbook.mutableContext,
      {
        id: `ctx-${category}-${now}`,
        category,
        content,
        updatedAt: now,
        changeCount: 0,
      },
    ],
    updatedAt: now,
  }
}

/**
 * 가변 맥락 업데이트.
 */
export function updateMutableContext(
  factbook: Factbook,
  contextId: string,
  newContent: string
): Factbook {
  const now = Date.now()
  return {
    ...factbook,
    mutableContext: factbook.mutableContext.map((ctx) =>
      ctx.id === contextId
        ? { ...ctx, content: newContent, updatedAt: now, changeCount: ctx.changeCount + 1 }
        : ctx
    ),
    updatedAt: now,
  }
}

/**
 * 과도한 변경 감지.
 *
 * 하루 5회 이상 동일 항목 변경 시 플래그.
 */
export function detectExcessiveChanges(factbook: Factbook): MutableContext[] {
  return factbook.mutableContext.filter((ctx) => ctx.changeCount >= MUTABLE_CHANGE_ALERT_THRESHOLD)
}

// ── RAG 프롬프트 빌드 ───────────────────────────────────────────

/**
 * 팩트북을 RAG 시스템 프롬프트로 변환.
 *
 * immutableFacts → 시스템 프롬프트 최상단 (절대 위반 금지)
 * mutableContext → 검색 기반 동적 주입
 */
export function buildFactbookPrompt(factbook: Factbook): {
  systemPromptPrefix: string
  contextualInfo: string
} {
  // immutableFacts → 시스템 프롬프트 최상단
  const factLines: string[] = ["[팩트북 — 이 페르소나의 불변의 진실. 절대 위반하지 마세요]"]

  for (const fact of factbook.immutableFacts) {
    const categoryLabel = FACTBOOK_CATEGORIES.immutable[fact.category]
    factLines.push(`- [${categoryLabel}] ${fact.content}`)
  }

  // mutableContext → 컨텍스트 정보
  const contextLines: string[] = []
  if (factbook.mutableContext.length > 0) {
    contextLines.push("[현재 맥락 — 이 페르소나의 최근 상태/변화]")
    for (const ctx of factbook.mutableContext) {
      const categoryLabel = FACTBOOK_CATEGORIES.mutable[ctx.category]
      contextLines.push(`- [${categoryLabel}] ${ctx.content}`)
    }
  }

  return {
    systemPromptPrefix: factLines.join("\n"),
    contextualInfo: contextLines.join("\n"),
  }
}

/**
 * Factbook에서 BackstoryDimension으로 역변환 (호환성).
 */
export function factbookToBackstory(factbook: Factbook): BackstoryDimension {
  const findFact = (category: ImmutableFact["category"]) =>
    factbook.immutableFacts.find((f) => f.category === category)?.content ?? ""

  const findContext = (category: MutableContext["category"]) =>
    factbook.mutableContext.find((c) => c.category === category)?.content ?? ""

  const identityFact = findFact("coreIdentity")

  return {
    origin: findFact("origin"),
    formativeExperience: findFact("formativeExperience"),
    innerConflict: findFact("innerConflict"),
    selfNarrative: findContext("selfNarrative"),
    nlpKeywords: identityFact ? identityFact.split(", ") : [],
  }
}
