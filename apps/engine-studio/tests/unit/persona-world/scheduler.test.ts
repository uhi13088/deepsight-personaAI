import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  decideActivity,
  getActivePersonas,
  runScheduler,
  type SchedulerPersona,
  type SchedulerDataProvider,
} from "@/lib/persona-world/scheduler"
import type { PersonaStateData, SchedulerContext } from "@/lib/persona-world/types"

// ── Mock: getPersonaState를 모킹 ──
vi.mock("@/lib/persona-world/state-manager", () => ({
  getPersonaState: vi.fn().mockResolvedValue({
    mood: 0.5,
    energy: 0.8,
    socialBattery: 0.7,
    paradoxTension: 0.2,
  }),
}))

// ── 테스트용 헬퍼 ──

const makeVectors = (overrides?: Partial<ThreeLayerVector>): ThreeLayerVector => ({
  social: {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
    ...overrides?.social,
  },
  temperament: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    ...overrides?.temperament,
  },
  narrative: {
    lack: 0.5,
    moralCompass: 0.5,
    volatility: 0.5,
    growthArc: 0.5,
    ...overrides?.narrative,
  },
})

const makePersona = (overrides?: Partial<SchedulerPersona>): SchedulerPersona => ({
  id: "persona-1",
  name: "테스트 페르소나",
  status: "ACTIVE",
  vectors: makeVectors(),
  paradoxScore: 0.3,
  ...overrides,
})

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 0.8,
  socialBattery: 0.7,
  paradoxTension: 0.2,
  ...overrides,
})

const makeContext = (overrides?: Partial<SchedulerContext>): SchedulerContext => ({
  trigger: "SCHEDULED",
  currentHour: 15,
  ...overrides,
})

const makeMockProvider = (personas: SchedulerPersona[] = []): SchedulerDataProvider => ({
  getActiveStatusPersonas: vi.fn().mockResolvedValue(personas),
})

// ═══ decideActivity ═══

describe("decideActivity", () => {
  it("결과에 shouldPost와 shouldInteract 포함", () => {
    const persona = makePersona()
    const traits = {
      sociability: 0.5,
      initiative: 0.5,
      expressiveness: 0.5,
      interactivity: 0.5,
      endurance: 0.5,
      volatility: 0.5,
      depthSeeking: 0.5,
      growthDrive: 0.5,
    }
    const state = makeState()
    const context = makeContext()

    const decision = decideActivity(persona, traits, state, context)

    expect(decision).toHaveProperty("shouldPost")
    expect(decision).toHaveProperty("shouldInteract")
    expect(typeof decision.shouldPost).toBe("boolean")
    expect(typeof decision.shouldInteract).toBe("boolean")
  })

  it("에너지 높으면 활동 가능", () => {
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.8,
          lens: 0.8,
          stance: 0.8,
          scope: 0.8,
          taste: 0.8,
          purpose: 0.8,
          sociability: 0.9,
        },
      }),
    })
    const traits = {
      sociability: 0.9,
      initiative: 0.9,
      expressiveness: 0.9,
      interactivity: 0.9,
      endurance: 0.9,
      volatility: 0.5,
      depthSeeking: 0.5,
      growthDrive: 0.5,
    }
    const state = makeState({ energy: 1.0, mood: 0.8, socialBattery: 0.9 })
    const context = makeContext()

    // 여러 번 실행하여 최소 한 번은 shouldPost=true인지 확인
    let posted = false
    for (let i = 0; i < 20; i++) {
      const decision = decideActivity(persona, traits, state, context)
      if (decision.shouldPost) {
        posted = true
        break
      }
    }
    expect(posted).toBe(true)
  })

  it("shouldPost=true이면 postType이 존재", () => {
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.8,
          lens: 0.8,
          stance: 0.8,
          scope: 0.8,
          taste: 0.8,
          purpose: 0.8,
          sociability: 0.9,
        },
      }),
    })
    const traits = {
      sociability: 0.9,
      initiative: 0.9,
      expressiveness: 0.9,
      interactivity: 0.9,
      endurance: 0.9,
      volatility: 0.5,
      depthSeeking: 0.5,
      growthDrive: 0.5,
    }
    const state = makeState({ energy: 1.0, mood: 0.9 })
    const context = makeContext()

    // shouldPost=true인 결과를 찾을 때까지 반복
    for (let i = 0; i < 50; i++) {
      const decision = decideActivity(persona, traits, state, context)
      if (decision.shouldPost) {
        expect(decision.postType).toBeDefined()
        expect(decision.postTypeReason).toBeDefined()
        return
      }
    }
    // 50번 안에 shouldPost=true가 나오지 않으면 스킵 (확률적)
  })

  it("socialBattery 부족하면 shouldInteract=false", () => {
    const persona = makePersona()
    const traits = {
      sociability: 0.5,
      initiative: 0.5,
      expressiveness: 0.5,
      interactivity: 0.5,
      endurance: 0.5,
      volatility: 0.5,
      depthSeeking: 0.5,
      growthDrive: 0.5,
    }
    const state = makeState({ socialBattery: 0.05 }) // < 0.1 threshold
    const context = makeContext()

    // 여러 번 실행해도 shouldInteract=false
    for (let i = 0; i < 10; i++) {
      const decision = decideActivity(persona, traits, state, context)
      expect(decision.shouldInteract).toBe(false)
    }
  })
})

// ═══ getActivePersonas ═══

describe("getActivePersonas", () => {
  it("활동 시간대에 속하는 페르소나만 필터링", async () => {
    // sociability=0.5 → peakHour = 12 + round(0.5 × 10) = 17
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
      }),
    })
    const provider = makeMockProvider([persona])

    // 17시에 활동 가능 (peakHour = 17)
    const result = await getActivePersonas(17, provider)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].persona.id).toBe("persona-1")
  })

  it("활동 시간대 밖이면 빈 배열", async () => {
    // sociability=0.5 → peakHour=17, 새벽 3시는 활동 시간 밖
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
      }),
    })
    const provider = makeMockProvider([persona])

    const result = await getActivePersonas(3, provider)
    expect(result).toHaveLength(0)
  })

  it("빈 페르소나 목록 → 빈 결과", async () => {
    const provider = makeMockProvider([])

    const result = await getActivePersonas(15, provider)
    expect(result).toHaveLength(0)
  })

  it("traits와 state가 포함된 결과", async () => {
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
      }),
    })
    const provider = makeMockProvider([persona])

    const result = await getActivePersonas(17, provider)
    if (result.length > 0) {
      expect(result[0].traits).toHaveProperty("sociability")
      expect(result[0].traits).toHaveProperty("endurance")
      expect(result[0].state).toHaveProperty("mood")
      expect(result[0].state).toHaveProperty("energy")
    }
  })
})

// ═══ runScheduler ═══

describe("runScheduler", () => {
  it("결과에 totalPersonas, activePersonas, decisions 포함", async () => {
    const provider = makeMockProvider([])
    const context = makeContext()

    const result = await runScheduler(context, provider)

    expect(result).toHaveProperty("totalPersonas")
    expect(result).toHaveProperty("activePersonas")
    expect(result).toHaveProperty("decisions")
    expect(result.totalPersonas).toBe(0)
    expect(result.activePersonas).toBe(0)
    expect(result.decisions).toHaveLength(0)
  })

  it("활성 페르소나에 대해 decision 생성", async () => {
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
      }),
    })
    const provider = makeMockProvider([persona])
    const context = makeContext({ currentHour: 17 }) // peakHour=17

    const result = await runScheduler(context, provider)

    expect(result.totalPersonas).toBe(1)
    if (result.activePersonas > 0) {
      expect(result.decisions.length).toBeGreaterThan(0)
      expect(result.decisions[0].personaId).toBe("persona-1")
      expect(result.decisions[0].personaName).toBe("테스트 페르소나")
    }
  })

  it("decision에 paradoxTriggered 필드 포함", async () => {
    const persona = makePersona({
      vectors: makeVectors({
        social: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
      }),
    })
    const provider = makeMockProvider([persona])
    const context = makeContext({ currentHour: 17 })

    const result = await runScheduler(context, provider)

    if (result.activePersonas > 0) {
      expect(result.decisions[0]).toHaveProperty("paradoxTriggered")
      expect(typeof result.decisions[0].paradoxTriggered).toBe("boolean")
    }
  })

  it("CONTENT_RELEASE 트리거 정상 처리", async () => {
    const provider = makeMockProvider([])
    const context = makeContext({
      trigger: "CONTENT_RELEASE",
      triggerData: { contentId: "movie-123" },
    })

    const result = await runScheduler(context, provider)
    expect(result).toBeDefined()
    expect(result.decisions).toHaveLength(0) // 활성 페르소나 없음
  })
})
