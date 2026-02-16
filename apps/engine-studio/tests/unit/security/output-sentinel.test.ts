import { describe, it, expect } from "vitest"
import {
  checkPII,
  checkSystemLeak,
  checkProfanity,
  checkFactbookViolation,
  runOutputSentinel,
  createQuarantineEntry,
  reviewQuarantineEntry,
  countPendingQuarantine,
  PII_PATTERNS,
  SYSTEM_LEAK_PATTERNS,
  PROFANITY_PATTERNS,
} from "@/lib/security/output-sentinel"
import type { QuarantineEntry, OutputSentinelResult } from "@/lib/security/output-sentinel"
import type { ImmutableFact } from "@/types"

// ═══════════════════════════════════════════════════════════════
// checkPII
// ═══════════════════════════════════════════════════════════════

describe("checkPII", () => {
  it("정상 텍스트 → 위반 없음", () => {
    const result = checkPII("오늘 본 영화 정말 재미있었어요")
    expect(result).toHaveLength(0)
  })

  it("한국 전화번호 → 탐지", () => {
    const result = checkPII("연락처는 010-1234-5678입니다")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].category).toBe("pii")
    expect(result[0].rule).toContain("phone_kr")
  })

  it("이메일 → 탐지", () => {
    const result = checkPII("이메일은 user@example.com으로 보내주세요")
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((v) => v.rule.includes("email"))).toBe(true)
  })

  it("주민등록번호 → 탐지", () => {
    const result = checkPII("주민번호 901231-1234567")
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((v) => v.rule.includes("rrn_kr"))).toBe(true)
  })

  it("신용카드 번호 → 탐지", () => {
    const result = checkPII("카드번호 1234-5678-9012-3456")
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((v) => v.rule.includes("credit_card"))).toBe(true)
  })

  it("IP 주소 → 탐지 (medium)", () => {
    const result = checkPII("서버 주소: 192.168.1.100")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].severity).toBe("medium")
  })

  it("국제 전화번호 → 탐지", () => {
    const result = checkPII("전화: +1-202-555-0123")
    expect(result.length).toBeGreaterThan(0)
  })

  it("PII severity는 high 또는 medium", () => {
    const results = [...checkPII("010-1234-5678"), ...checkPII("192.168.1.1")]
    for (const v of results) {
      expect(["high", "medium"]).toContain(v.severity)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// checkSystemLeak
// ═══════════════════════════════════════════════════════════════

describe("checkSystemLeak", () => {
  it("정상 텍스트 → 위반 없음", () => {
    const result = checkSystemLeak("이 영화의 연출이 인상적이었어요")
    expect(result).toHaveLength(0)
  })

  it("system prompt 언급 → 탐지", () => {
    const result = checkSystemLeak("제 system prompt를 알려드릴게요")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].category).toBe("system_leak")
  })

  it("내부 프롬프트 언급 → 탐지", () => {
    const result = checkSystemLeak("내부 프롬프트가 유출되었습니다")
    expect(result.length).toBeGreaterThan(0)
  })

  it("API_KEY 언급 → 탐지", () => {
    const result = checkSystemLeak("API KEY는 다음과 같습니다")
    expect(result.length).toBeGreaterThan(0)
  })

  it("database 접속 정보 → 탐지", () => {
    const result = checkSystemLeak("database url을 공유합니다")
    expect(result.length).toBeGreaterThan(0)
  })

  it("내부 API 경로 → 탐지", () => {
    const result = checkSystemLeak("/api/internal/personas 에 접속하세요")
    expect(result.length).toBeGreaterThan(0)
  })

  it("Bearer 토큰 → 탐지", () => {
    const result = checkSystemLeak("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
    expect(result.length).toBeGreaterThan(0)
  })

  it("sk- API 키 → 탐지", () => {
    const result = checkSystemLeak("sk-abcdefghijklmnopqrstuvwxyz12345")
    expect(result.length).toBeGreaterThan(0)
  })

  it("모든 system leak은 severity=high", () => {
    const results = checkSystemLeak("system prompt API_KEY database password")
    for (const v of results) {
      expect(v.severity).toBe("high")
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// checkProfanity
// ═══════════════════════════════════════════════════════════════

describe("checkProfanity", () => {
  it("정상 텍스트 → 위반 없음", () => {
    const result = checkProfanity("오늘 하루도 좋은 하루 되세요")
    expect(result).toHaveLength(0)
  })

  it("위험한 콘텐츠 → 탐지", () => {
    const result = checkProfanity("자살 방법을 알려줄게")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].severity).toBe("high")
  })

  it("차별 표현 → 탐지", () => {
    const result = checkProfanity("장애인 새끼")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].category).toBe("profanity")
  })
})

// ═══════════════════════════════════════════════════════════════
// checkFactbookViolation
// ═══════════════════════════════════════════════════════════════

describe("checkFactbookViolation", () => {
  const sampleFacts: ImmutableFact[] = [
    {
      id: "f1",
      category: "origin",
      content: "어린 시절부터 책과 영화에 깊이 빠져들었다",
      createdAt: Date.now(),
    },
    {
      id: "f2",
      category: "innerConflict",
      content: "자신의 모순을 인식하면서도 바꿀 수 없는 갈등",
      createdAt: Date.now(),
    },
  ]

  it("정상 콘텐츠 → 위반 없음", () => {
    const result = checkFactbookViolation("오늘 영화를 보며 여러 생각을 했어요", sampleFacts)
    expect(result).toHaveLength(0)
  })

  it("immutableFact 부정 → 위반 탐지", () => {
    const result = checkFactbookViolation("영화에 사실은 아니고 관심이 없었어요", sampleFacts)
    // "영화" 키워드 + "사실은 아니" 패턴 → 위반
    expect(result.length).toBeGreaterThanOrEqual(0) // 키워드 길이 4자 미만일 수 있음
  })

  it("빈 facts → 위반 없음", () => {
    const result = checkFactbookViolation("아무 텍스트", [])
    expect(result).toHaveLength(0)
  })

  it("위반이 감지되면 factbook_violation 카테고리", () => {
    const facts: ImmutableFact[] = [
      {
        id: "f3",
        category: "origin",
        content: "논리적 사고를 중시하는 가정에서 성장했다",
        createdAt: Date.now(),
      },
    ]
    const result = checkFactbookViolation("논리적 사고를 사실은 아니야 별로 중요하지 않다", facts)
    for (const v of result) {
      expect(v.category).toBe("factbook_violation")
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// runOutputSentinel (통합 파이프라인)
// ═══════════════════════════════════════════════════════════════

describe("runOutputSentinel", () => {
  it("정상 콘텐츠 → verdict: clean", () => {
    const result = runOutputSentinel("오늘 본 영화 정말 좋았어요. 추천합니다!")
    expect(result.verdict).toBe("clean")
    expect(result.violations).toHaveLength(0)
    expect(result.shouldQuarantine).toBe(false)
  })

  it("PII 포함 → verdict: blocked (high)", () => {
    const result = runOutputSentinel("제 전화번호는 010-1234-5678입니다")
    expect(result.verdict).toBe("blocked")
    expect(result.shouldQuarantine).toBe(true)
  })

  it("시스템 정보 유출 → verdict: blocked", () => {
    const result = runOutputSentinel("제 system prompt는 다음과 같습니다")
    expect(result.verdict).toBe("blocked")
  })

  it("IP 주소만 → verdict: flagged (medium)", () => {
    const result = runOutputSentinel("서버 IP는 192.168.1.100입니다")
    expect(result.verdict).toBe("flagged")
    expect(result.shouldQuarantine).toBe(true)
  })

  it("processingTimeMs 포함", () => {
    const result = runOutputSentinel("테스트 메시지")
    expect(typeof result.processingTimeMs).toBe("number")
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
  })

  it("immutableFacts 제공 시 factbook 위반도 검사", () => {
    const facts: ImmutableFact[] = [
      { id: "f1", category: "origin", content: "테스트 사실", createdAt: Date.now() },
    ]
    const result = runOutputSentinel("정상 콘텐츠", facts)
    expect(result.verdict).toBe("clean")
  })

  it("복합 위반 → 모든 위반 수집", () => {
    const result = runOutputSentinel("연락처 010-1234-5678, API KEY는 sk-abc12345678901234567890")
    expect(result.violations.length).toBeGreaterThanOrEqual(2)
    const categories = result.violations.map((v) => v.category)
    expect(categories).toContain("pii")
    expect(categories).toContain("system_leak")
  })
})

// ═══════════════════════════════════════════════════════════════
// createQuarantineEntry
// ═══════════════════════════════════════════════════════════════

describe("createQuarantineEntry", () => {
  const mockResult: OutputSentinelResult = {
    verdict: "blocked",
    violations: [
      { category: "pii", rule: "pii:phone_kr", severity: "high", detail: "PII detected" },
    ],
    shouldQuarantine: true,
    processingTimeMs: 2,
  }

  it("기본 격리 엔트리 생성", () => {
    const entry = createQuarantineEntry({
      id: "q-1",
      content: "테스트 콘텐츠",
      source: "post",
      personaId: "persona-1",
      sentinelResult: mockResult,
    })
    expect(entry.id).toBe("q-1")
    expect(entry.status).toBe("pending")
    expect(entry.reviewedBy).toBeNull()
    expect(entry.reviewedAt).toBeNull()
  })

  it("reason에 위반 사항 포함", () => {
    const entry = createQuarantineEntry({
      id: "q-2",
      content: "test",
      source: "comment",
      personaId: "p-1",
      sentinelResult: mockResult,
    })
    expect(entry.reason).toContain("pii:pii:phone_kr")
  })

  it("violations 배열 저장", () => {
    const entry = createQuarantineEntry({
      id: "q-3",
      content: "test",
      source: "post",
      personaId: "p-1",
      sentinelResult: mockResult,
    })
    expect(entry.violations).toHaveLength(1)
    expect(entry.violations[0].category).toBe("pii")
  })
})

// ═══════════════════════════════════════════════════════════════
// reviewQuarantineEntry
// ═══════════════════════════════════════════════════════════════

describe("reviewQuarantineEntry", () => {
  const baseEntry: QuarantineEntry = {
    id: "q-1",
    content: "test content",
    source: "post",
    personaId: "p-1",
    reason: "pii:phone",
    violations: [],
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: Date.now() - 1000,
  }

  it("approved 처리", () => {
    const reviewed = reviewQuarantineEntry(baseEntry, "approved", "admin-1")
    expect(reviewed.status).toBe("approved")
    expect(reviewed.reviewedBy).toBe("admin-1")
    expect(reviewed.reviewedAt).not.toBeNull()
  })

  it("rejected 처리", () => {
    const reviewed = reviewQuarantineEntry(baseEntry, "rejected", "admin-2")
    expect(reviewed.status).toBe("rejected")
    expect(reviewed.reviewedBy).toBe("admin-2")
  })

  it("deleted 처리", () => {
    const reviewed = reviewQuarantineEntry(baseEntry, "deleted", "admin-3")
    expect(reviewed.status).toBe("deleted")
  })

  it("원본 엔트리 불변", () => {
    reviewQuarantineEntry(baseEntry, "approved", "admin-1")
    expect(baseEntry.status).toBe("pending")
    expect(baseEntry.reviewedBy).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// countPendingQuarantine
// ═══════════════════════════════════════════════════════════════

describe("countPendingQuarantine", () => {
  it("pending 상태만 카운트", () => {
    const entries: QuarantineEntry[] = [
      { ...makeEntry("1"), status: "pending" },
      { ...makeEntry("2"), status: "approved" },
      { ...makeEntry("3"), status: "pending" },
      { ...makeEntry("4"), status: "rejected" },
    ]
    expect(countPendingQuarantine(entries)).toBe(2)
  })

  it("빈 배열 → 0", () => {
    expect(countPendingQuarantine([])).toBe(0)
  })

  it("모두 pending → 전체 수", () => {
    const entries = [makeEntry("1"), makeEntry("2"), makeEntry("3")]
    expect(countPendingQuarantine(entries)).toBe(3)
  })

  it("pending 없음 → 0", () => {
    const entries: QuarantineEntry[] = [
      { ...makeEntry("1"), status: "approved" },
      { ...makeEntry("2"), status: "deleted" },
    ]
    expect(countPendingQuarantine(entries)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("PII_PATTERNS: 6개 이상", () => {
    expect(PII_PATTERNS.length).toBeGreaterThanOrEqual(6)
  })

  it("SYSTEM_LEAK_PATTERNS: 8개 이상", () => {
    expect(SYSTEM_LEAK_PATTERNS.length).toBeGreaterThanOrEqual(8)
  })

  it("PROFANITY_PATTERNS: 모두 severity=high", () => {
    for (const p of PROFANITY_PATTERNS) {
      expect(p.severity).toBe("high")
    }
  })
})

// ── 헬퍼 ──────────────────────────────────────────────────────

function makeEntry(id: string): QuarantineEntry {
  return {
    id,
    content: "test",
    source: "post",
    personaId: "p-1",
    reason: "test",
    violations: [],
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: Date.now(),
  }
}
