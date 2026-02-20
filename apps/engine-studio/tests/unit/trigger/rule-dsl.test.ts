import { describe, it, expect } from "vitest"
import {
  evaluateExpression,
  evaluateRules,
  validateRule,
  validateRuleSet,
  compileRuleSet,
  convertLegacyTrigger,
  convertLegacyTriggers,
  resolveField,
  compare,
  range,
  contains,
  and,
  or,
  not,
  generateInitialTriggerRules,
} from "@/lib/trigger/rule-dsl"
import type { RuleContext, TriggerRuleDSL, RuleExpression } from "@/lib/trigger/rule-dsl"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ═══════════════════════════════════════════════════════════════
// resolveField
// ═══════════════════════════════════════════════════════════════

describe("resolveField", () => {
  const ctx: RuleContext = {
    L1: { stance: 0.7, depth: 0.5 },
    L2: { neuroticism: 0.8, extraversion: 0.3 },
    L3: { volatility: 0.6 },
    state: { mood: 0.4, energy: 0.7 },
    context: { text: "테스트 메시지", commentCount: 5 },
  }

  it("L1 필드 해석", () => {
    expect(resolveField(ctx, "L1.stance")).toBe(0.7)
  })

  it("L2 필드 해석", () => {
    expect(resolveField(ctx, "L2.neuroticism")).toBe(0.8)
  })

  it("L3 필드 해석", () => {
    expect(resolveField(ctx, "L3.volatility")).toBe(0.6)
  })

  it("state 필드 해석", () => {
    expect(resolveField(ctx, "state.mood")).toBe(0.4)
  })

  it("context 필드 해석", () => {
    expect(resolveField(ctx, "context.commentCount")).toBe(5)
  })

  it("존재하지 않는 루트 → undefined", () => {
    expect(resolveField(ctx, "unknown.field")).toBeUndefined()
  })

  it("존재하지 않는 하위 필드 → undefined", () => {
    expect(resolveField(ctx, "L1.nonexistent")).toBeUndefined()
  })

  it("빈 필드 → undefined", () => {
    expect(resolveField(ctx, "")).toBeUndefined()
  })

  it("루트만 없는 컨텍스트 → undefined", () => {
    expect(resolveField({}, "L1.stance")).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateExpression — compare
// ═══════════════════════════════════════════════════════════════

describe("evaluateExpression — compare", () => {
  const ctx: RuleContext = {
    L2: { neuroticism: 0.8, agreeableness: 0.3 },
    state: { mood: 0.4 },
  }

  it("> 조건 충족", () => {
    expect(evaluateExpression(compare("L2.neuroticism", ">", 0.5), ctx)).toBe(true)
  })

  it("> 조건 불충족", () => {
    expect(evaluateExpression(compare("L2.neuroticism", ">", 0.9), ctx)).toBe(false)
  })

  it(">= 경계값", () => {
    expect(evaluateExpression(compare("L2.neuroticism", ">=", 0.8), ctx)).toBe(true)
  })

  it("< 조건", () => {
    expect(evaluateExpression(compare("L2.agreeableness", "<", 0.4), ctx)).toBe(true)
  })

  it("<= 경계값", () => {
    expect(evaluateExpression(compare("state.mood", "<=", 0.4), ctx)).toBe(true)
  })

  it("== 동등", () => {
    expect(evaluateExpression(compare("L2.neuroticism", "==", 0.8), ctx)).toBe(true)
  })

  it("!= 비동등", () => {
    expect(evaluateExpression(compare("L2.neuroticism", "!=", 0.5), ctx)).toBe(true)
  })

  it("존재하지 않는 필드 → false", () => {
    expect(evaluateExpression(compare("L2.unknown", ">", 0), ctx)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateExpression — range
// ═══════════════════════════════════════════════════════════════

describe("evaluateExpression — range", () => {
  const ctx: RuleContext = {
    state: { mood: 0.5 },
  }

  it("범위 내", () => {
    expect(evaluateExpression(range("state.mood", 0.3, 0.7), ctx)).toBe(true)
  })

  it("범위 밖 (초과)", () => {
    expect(evaluateExpression(range("state.mood", 0.6, 0.9), ctx)).toBe(false)
  })

  it("범위 밖 (미만)", () => {
    expect(evaluateExpression(range("state.mood", 0.1, 0.3), ctx)).toBe(false)
  })

  it("경계값 포함 (min)", () => {
    expect(evaluateExpression(range("state.mood", 0.5, 0.8), ctx)).toBe(true)
  })

  it("경계값 포함 (max)", () => {
    expect(evaluateExpression(range("state.mood", 0.2, 0.5), ctx)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateExpression — contains
// ═══════════════════════════════════════════════════════════════

describe("evaluateExpression — contains", () => {
  const ctx: RuleContext = {
    context: {
      text: "이 영화는 정말 감동적이었다",
      keywords: ["영화", "감동", "리뷰"],
    },
  }

  it("문자열 포함", () => {
    expect(evaluateExpression(contains("context.text", "감동"), ctx)).toBe(true)
  })

  it("문자열 미포함", () => {
    expect(evaluateExpression(contains("context.text", "음악"), ctx)).toBe(false)
  })

  it("배열 내 포함", () => {
    expect(evaluateExpression(contains("context.keywords", "리뷰"), ctx)).toBe(true)
  })

  it("배열 내 미포함", () => {
    expect(evaluateExpression(contains("context.keywords", "드라마"), ctx)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateExpression — 논리 조합
// ═══════════════════════════════════════════════════════════════

describe("evaluateExpression — 논리 조합", () => {
  const ctx: RuleContext = {
    L2: { neuroticism: 0.8, agreeableness: 0.3 },
    state: { mood: 0.4 },
  }

  it("AND: 모두 참 → true", () => {
    const expr = and(compare("L2.neuroticism", ">", 0.5), compare("L2.agreeableness", "<", 0.5))
    expect(evaluateExpression(expr, ctx)).toBe(true)
  })

  it("AND: 하나 거짓 → false", () => {
    const expr = and(compare("L2.neuroticism", ">", 0.5), compare("L2.agreeableness", ">", 0.5))
    expect(evaluateExpression(expr, ctx)).toBe(false)
  })

  it("OR: 하나 참 → true", () => {
    const expr = or(compare("L2.neuroticism", ">", 0.9), compare("L2.agreeableness", "<", 0.5))
    expect(evaluateExpression(expr, ctx)).toBe(true)
  })

  it("OR: 모두 거짓 → false", () => {
    const expr = or(compare("L2.neuroticism", ">", 0.9), compare("L2.agreeableness", ">", 0.5))
    expect(evaluateExpression(expr, ctx)).toBe(false)
  })

  it("NOT: 참 → false", () => {
    const expr = not(compare("L2.neuroticism", ">", 0.5))
    expect(evaluateExpression(expr, ctx)).toBe(false)
  })

  it("NOT: 거짓 → true", () => {
    const expr = not(compare("L2.neuroticism", ">", 0.9))
    expect(evaluateExpression(expr, ctx)).toBe(true)
  })

  it("중첩 조합: AND + OR", () => {
    const expr = and(
      or(compare("L2.neuroticism", ">", 0.7), compare("state.mood", "<", 0.3)),
      not(compare("L2.agreeableness", ">", 0.5))
    )
    expect(evaluateExpression(expr, ctx)).toBe(true)
  })

  it("깊이 제한 초과 → false", () => {
    // 깊이 6까지 중첩 (최대 5)
    let expr: RuleExpression = compare("state.mood", ">", 0)
    for (let i = 0; i < 6; i++) {
      expr = not(expr)
    }
    expect(evaluateExpression(expr, {}, 0)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateRules
// ═══════════════════════════════════════════════════════════════

describe("evaluateRules", () => {
  const rules: TriggerRuleDSL[] = [
    {
      id: "high-neurotic",
      name: "높은 신경성 반응",
      when: compare("L2.neuroticism", ">", 0.7),
      then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.3 }],
      priority: 10,
    },
    {
      id: "low-mood",
      name: "낮은 기분",
      when: compare("state.mood", "<", 0.3),
      then: [{ layer: "L1", dimension: "sociability", mode: "suppress", magnitude: 0.2 }],
      priority: 5,
    },
    {
      id: "aggressive-comment",
      name: "공격적 댓글 감지",
      when: and(contains("context.text", "공격"), compare("L2.neuroticism", ">", 0.5)),
      then: [
        { layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.5 },
        { layer: "L3", dimension: "volatility", mode: "boost", magnitude: 0.3 },
      ],
      priority: 20,
    },
  ]

  it("매칭되는 규칙 반환", () => {
    const ctx: RuleContext = {
      L2: { neuroticism: 0.8 },
      state: { mood: 0.5 },
      context: { text: "일반 댓글" },
    }
    const result = evaluateRules(rules, ctx)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].ruleId).toBe("high-neurotic")
  })

  it("복수 매칭", () => {
    const ctx: RuleContext = {
      L2: { neuroticism: 0.8 },
      state: { mood: 0.2 },
      context: { text: "일반 댓글" },
    }
    const result = evaluateRules(rules, ctx)
    expect(result.matches).toHaveLength(2)
    expect(result.matches.map((m) => m.ruleId)).toContain("high-neurotic")
    expect(result.matches.map((m) => m.ruleId)).toContain("low-mood")
  })

  it("우선순위 정렬", () => {
    const ctx: RuleContext = {
      L2: { neuroticism: 0.8 },
      state: { mood: 0.2 },
      context: { text: "공격적인 댓글" },
    }
    const result = evaluateRules(rules, ctx)
    expect(result.matches[0].ruleId).toBe("aggressive-comment")
    expect(result.matches[0].priority).toBe(20)
  })

  it("효과 병합: 같은 dimension은 우선순위 높은 것만", () => {
    const ctx: RuleContext = {
      L2: { neuroticism: 0.8 },
      state: { mood: 0.5 },
      context: { text: "공격적인 댓글" },
    }
    const result = evaluateRules(rules, ctx)
    // aggressive-comment (priority 20)과 high-neurotic (priority 10)
    // 둘 다 L1.stance → 우선순위 높은 aggressive-comment의 0.5만 적용
    const stanceEffect = result.appliedEffects.find(
      (e) => e.layer === "L1" && e.dimension === "stance"
    )
    expect(stanceEffect?.magnitude).toBe(0.5)
  })

  it("매칭 없음", () => {
    const ctx: RuleContext = {
      L2: { neuroticism: 0.3 },
      state: { mood: 0.8 },
      context: { text: "평화로운 댓글" },
    }
    const result = evaluateRules(rules, ctx)
    expect(result.matches).toHaveLength(0)
    expect(result.appliedEffects).toHaveLength(0)
  })

  it("totalEvaluated 카운트", () => {
    const result = evaluateRules(rules, {})
    expect(result.totalEvaluated).toBe(3)
  })

  it("쿨다운 적용", () => {
    const ctx: RuleContext = { L2: { neuroticism: 0.8 } }
    const cooldowns = new Map<string, number>()
    const now = 10000
    cooldowns.set("high-neurotic", 9500) // 500ms 전

    const rulesWithCooldown: TriggerRuleDSL[] = [{ ...rules[0], cooldownMs: 1000 }]

    const result = evaluateRules(rulesWithCooldown, ctx, cooldowns, now)
    expect(result.matches).toHaveLength(0) // 쿨다운 중
  })

  it("쿨다운 만료 후 재발동", () => {
    const ctx: RuleContext = { L2: { neuroticism: 0.8 } }
    const cooldowns = new Map<string, number>()
    const now = 10000
    cooldowns.set("high-neurotic", 8000) // 2000ms 전

    const rulesWithCooldown: TriggerRuleDSL[] = [{ ...rules[0], cooldownMs: 1000 }]

    const result = evaluateRules(rulesWithCooldown, ctx, cooldowns, now)
    expect(result.matches).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// validateRule
// ═══════════════════════════════════════════════════════════════

describe("validateRule", () => {
  const validRule: TriggerRuleDSL = {
    id: "test-rule",
    name: "테스트 규칙",
    when: compare("L2.neuroticism", ">", 0.5),
    then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.3 }],
    priority: 10,
  }

  it("유효한 규칙 → valid", () => {
    const result = validateRule(validRule)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("id 누락 → 에러", () => {
    const result = validateRule({ ...validRule, id: "" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === "id")).toBe(true)
  })

  it("name 누락 → 에러", () => {
    const result = validateRule({ ...validRule, name: "" })
    expect(result.valid).toBe(false)
  })

  it("음수 priority → 에러", () => {
    const result = validateRule({ ...validRule, priority: -1 })
    expect(result.valid).toBe(false)
  })

  it("음수 cooldownMs → 에러", () => {
    const result = validateRule({ ...validRule, cooldownMs: -100 })
    expect(result.valid).toBe(false)
  })

  it("빈 then → 에러", () => {
    const result = validateRule({ ...validRule, then: [] })
    expect(result.valid).toBe(false)
  })

  it("잘못된 layer → 에러", () => {
    const result = validateRule({
      ...validRule,
      then: [{ layer: "L4" as "L1", dimension: "stance", mode: "boost", magnitude: 0.3 }],
    })
    expect(result.valid).toBe(false)
  })

  it("magnitude 범위 초과 → 에러", () => {
    const result = validateRule({
      ...validRule,
      then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 1.5 }],
    })
    expect(result.valid).toBe(false)
  })

  it("range min > max → 에러", () => {
    const result = validateRule({
      ...validRule,
      when: range("state.mood", 0.8, 0.2),
    })
    expect(result.valid).toBe(false)
  })

  it("중첩 AND 내 invalid → 에러 전파", () => {
    const result = validateRule({
      ...validRule,
      when: and(compare("L2.neuroticism", ">", 0.5), {
        type: "compare",
        field: "",
        op: ">",
        value: 0,
      }),
    })
    expect(result.valid).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// validateRuleSet
// ═══════════════════════════════════════════════════════════════

describe("validateRuleSet", () => {
  it("유효한 세트", () => {
    const rules: TriggerRuleDSL[] = [
      {
        id: "r1",
        name: "Rule 1",
        when: compare("L2.neuroticism", ">", 0.5),
        then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.3 }],
        priority: 10,
      },
      {
        id: "r2",
        name: "Rule 2",
        when: compare("state.mood", "<", 0.3),
        then: [{ layer: "L1", dimension: "sociability", mode: "suppress", magnitude: 0.2 }],
        priority: 5,
      },
    ]
    const result = validateRuleSet(rules)
    expect(result.valid).toBe(true)
  })

  it("중복 ID → 에러", () => {
    const rules: TriggerRuleDSL[] = [
      {
        id: "same-id",
        name: "Rule 1",
        when: compare("L2.neuroticism", ">", 0.5),
        then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.3 }],
        priority: 10,
      },
      {
        id: "same-id",
        name: "Rule 2",
        when: compare("state.mood", "<", 0.3),
        then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.2 }],
        priority: 5,
      },
    ]
    const result = validateRuleSet(rules)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes("중복 ID"))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// compileRuleSet
// ═══════════════════════════════════════════════════════════════

describe("compileRuleSet", () => {
  it("우선순위 내림차순 정렬", () => {
    const rules: TriggerRuleDSL[] = [
      {
        id: "low",
        name: "Low",
        when: compare("state.mood", ">", 0),
        then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.1 }],
        priority: 1,
      },
      {
        id: "high",
        name: "High",
        when: compare("state.mood", ">", 0),
        then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.5 }],
        priority: 100,
      },
      {
        id: "mid",
        name: "Mid",
        when: compare("state.mood", ">", 0),
        then: [{ layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.3 }],
        priority: 50,
      },
    ]
    const compiled = compileRuleSet(rules)
    expect(compiled.rules[0].id).toBe("high")
    expect(compiled.rules[1].id).toBe("mid")
    expect(compiled.rules[2].id).toBe("low")
    expect(compiled.totalRules).toBe(3)
    expect(compiled.maxPriority).toBe(100)
  })

  it("빈 세트", () => {
    const compiled = compileRuleSet([])
    expect(compiled.totalRules).toBe(0)
    expect(compiled.maxPriority).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// convertLegacyTrigger
// ═══════════════════════════════════════════════════════════════

describe("convertLegacyTrigger", () => {
  it("기존 TriggerRule → DSL 변환", () => {
    const legacy = {
      condition: "논쟁적 댓글이나 인신공격을 받았을 때",
      affectedLayer: "L1" as const,
      affectedDimension: "stance",
      effect: "boost" as const,
      magnitude: 0.5,
    }
    const dsl = convertLegacyTrigger(legacy, 0)
    expect(dsl.id).toBe("legacy-0")
    expect(dsl.description).toBe(legacy.condition)
    expect(dsl.then[0].layer).toBe("L1")
    expect(dsl.then[0].dimension).toBe("stance")
    expect(dsl.then[0].mode).toBe("boost")
    expect(dsl.then[0].magnitude).toBe(0.5)
  })

  it("일괄 변환", () => {
    const legacies = [
      {
        condition: "조건1",
        affectedLayer: "L1" as const,
        affectedDimension: "stance",
        effect: "boost" as const,
        magnitude: 0.3,
      },
      {
        condition: "조건2",
        affectedLayer: "L2" as const,
        affectedDimension: "neuroticism",
        effect: "suppress" as const,
        magnitude: 0.2,
      },
    ]
    const dsls = convertLegacyTriggers(legacies)
    expect(dsls).toHaveLength(2)
    expect(dsls[0].id).toBe("legacy-0")
    expect(dsls[1].id).toBe("legacy-1")
  })
})

// ═══════════════════════════════════════════════════════════════
// 빌더 헬퍼
// ═══════════════════════════════════════════════════════════════

describe("빌더 헬퍼", () => {
  it("compare 빌더", () => {
    const expr = compare("L2.neuroticism", ">", 0.5)
    expect(expr.type).toBe("compare")
    expect(expr.field).toBe("L2.neuroticism")
    expect(expr.op).toBe(">")
    expect(expr.value).toBe(0.5)
  })

  it("range 빌더", () => {
    const expr = range("state.mood", 0.3, 0.7)
    expect(expr.type).toBe("range")
    expect(expr.min).toBe(0.3)
    expect(expr.max).toBe(0.7)
  })

  it("contains 빌더", () => {
    const expr = contains("context.text", "키워드")
    expect(expr.type).toBe("contains")
    expect(expr.value).toBe("키워드")
  })

  it("and 빌더", () => {
    const expr = and(compare("L2.neuroticism", ">", 0.5), compare("state.mood", "<", 0.3))
    expect(expr.type).toBe("and")
    expect(expr.conditions).toHaveLength(2)
  })

  it("or 빌더", () => {
    const expr = or(compare("L2.neuroticism", ">", 0.5), compare("state.mood", "<", 0.3))
    expect(expr.type).toBe("or")
    expect(expr.conditions).toHaveLength(2)
  })

  it("not 빌더", () => {
    const expr = not(compare("L2.neuroticism", ">", 0.5))
    expect(expr.type).toBe("not")
  })
})

// ═══════════════════════════════════════════════════════════════
// 실제 시나리오 통합 테스트
// ═══════════════════════════════════════════════════════════════

describe("실제 시나리오", () => {
  it("높은 신경성 + 공격적 댓글 → stance boost + volatility boost", () => {
    const rules: TriggerRuleDSL[] = [
      {
        id: "neurotic-attack",
        name: "신경성 높은 페르소나에 공격 댓글",
        when: and(
          compare("L2.neuroticism", ">", 0.7),
          or(contains("context.text", "공격"), contains("context.text", "비판"))
        ),
        then: [
          { layer: "L1", dimension: "stance", mode: "boost", magnitude: 0.5 },
          { layer: "L3", dimension: "volatility", mode: "boost", magnitude: 0.3 },
        ],
        priority: 20,
      },
    ]

    const ctx: RuleContext = {
      L2: { neuroticism: 0.85 },
      context: { text: "이건 정말 무의미한 비판이야" },
    }

    const result = evaluateRules(rules, ctx)
    expect(result.matches).toHaveLength(1)
    expect(result.appliedEffects).toHaveLength(2)
  })

  it("에너지 소진 + 내향적 → 활동 억제", () => {
    const rules: TriggerRuleDSL[] = [
      {
        id: "introvert-exhaustion",
        name: "내향적 에너지 소진",
        when: and(
          compare("L2.extraversion", "<", 0.4),
          compare("state.energy", "<", 0.3),
          compare("state.socialBattery", "<", 0.2)
        ),
        then: [{ layer: "L1", dimension: "sociability", mode: "suppress", magnitude: 0.5 }],
        priority: 15,
      },
    ]

    const ctx: RuleContext = {
      L2: { extraversion: 0.25 },
      state: { energy: 0.15, socialBattery: 0.1 },
    }

    const result = evaluateRules(rules, ctx)
    expect(result.matches).toHaveLength(1)
    expect(result.appliedEffects[0].mode).toBe("suppress")
  })

  it("NOT 조건: 친화성 낮지 않은 경우 제외", () => {
    const rules: TriggerRuleDSL[] = [
      {
        id: "conflict-fighter",
        name: "갈등 파이터",
        when: and(compare("L2.neuroticism", ">", 0.6), not(compare("L2.agreeableness", ">", 0.5))),
        then: [{ layer: "L1", dimension: "stance", mode: "override", magnitude: 0.8 }],
        priority: 25,
      },
    ]

    // 친화성 높음 → 매칭 안 됨
    const ctx1: RuleContext = {
      L2: { neuroticism: 0.8, agreeableness: 0.7 },
    }
    expect(evaluateRules(rules, ctx1).matches).toHaveLength(0)

    // 친화성 낮음 → 매칭
    const ctx2: RuleContext = {
      L2: { neuroticism: 0.8, agreeableness: 0.3 },
    }
    expect(evaluateRules(rules, ctx2).matches).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// generateInitialTriggerRules
// ═══════════════════════════════════════════════════════════════

describe("generateInitialTriggerRules", () => {
  const analyticL1: SocialPersonaVector = {
    depth: 0.8,
    lens: 0.7,
    stance: 0.5,
    scope: 0.6,
    taste: 0.5,
    purpose: 0.7,
    sociability: 0.4,
  }
  const introvertL2: CoreTemperamentVector = {
    openness: 0.5,
    conscientiousness: 0.6,
    extraversion: 0.25,
    agreeableness: 0.5,
    neuroticism: 0.7,
  }
  const volatileL3: NarrativeDriveVector = {
    lack: 0.4,
    moralCompass: 0.7,
    volatility: 0.6,
    growthArc: 0.5,
  }

  it("벡터 기반으로 규칙 생성", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    expect(rules.length).toBeGreaterThan(0)
  })

  it("모든 규칙이 유효함", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const result = validateRuleSet(rules)
    expect(result.valid).toBe(true)
  })

  it("신경성 높음 → 기분 저조 규칙 포함", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const moodRule = rules.find((r) => r.name.includes("기분 저조"))
    expect(moodRule).toBeDefined()
  })

  it("변동성 높음 → Paradox 긴장 규칙 포함", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const paradoxRule = rules.find((r) => r.name.includes("Paradox"))
    expect(paradoxRule).toBeDefined()
  })

  it("내향적 → 사회적 피로 규칙 포함", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const socialRule = rules.find((r) => r.name.includes("사회적 피로"))
    expect(socialRule).toBeDefined()
  })

  it("분석적 → 긴장 시 분석 심화 규칙 포함", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const analysisRule = rules.find((r) => r.name.includes("분석 심화"))
    expect(analysisRule).toBeDefined()
  })

  it("외향적 벡터 → 사회적 피로 규칙 없음", () => {
    const extrovertL2: CoreTemperamentVector = {
      openness: 0.6,
      conscientiousness: 0.4,
      extraversion: 0.8,
      agreeableness: 0.5,
      neuroticism: 0.3,
    }
    const rules = generateInitialTriggerRules(analyticL1, extrovertL2, volatileL3)
    const socialRule = rules.find((r) => r.name.includes("사회적 피로"))
    expect(socialRule).toBeUndefined()
  })

  it("외향적 벡터 → 에너지 충만 규칙 포함", () => {
    const extrovertL2: CoreTemperamentVector = {
      openness: 0.6,
      conscientiousness: 0.4,
      extraversion: 0.8,
      agreeableness: 0.5,
      neuroticism: 0.3,
    }
    const rules = generateInitialTriggerRules(analyticL1, extrovertL2, volatileL3)
    const energyRule = rules.find((r) => r.name.includes("에너지 충만"))
    expect(energyRule).toBeDefined()
  })

  it("고유 ID 보장", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const ids = rules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("생성된 규칙이 실제 평가 가능", () => {
    const rules = generateInitialTriggerRules(analyticL1, introvertL2, volatileL3)
    const ctx: RuleContext = {
      state: { mood: 0.2, energy: 0.5, socialBattery: 0.1, paradoxTension: 0.8 },
    }
    const result = evaluateRules(rules, ctx)
    expect(result.totalEvaluated).toBe(rules.length)
    expect(result.matches.length).toBeGreaterThan(0)
  })

  it("중립 벡터 → 최소 규칙만 생성", () => {
    const neutralL1: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const neutralL2: CoreTemperamentVector = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
    const neutralL3: NarrativeDriveVector = {
      lack: 0.5,
      moralCompass: 0.5,
      volatility: 0.5,
      growthArc: 0.5,
    }
    const rules = generateInitialTriggerRules(neutralL1, neutralL2, neutralL3)
    // 중립 벡터: neuroticism=0.5 (경계), volatility=0.5>0.4, extraversion=0.5 (>=0.4이므로 사교성 없음)
    expect(rules.length).toBeGreaterThanOrEqual(1)
  })
})
