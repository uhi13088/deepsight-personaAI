import { describe, it, expect } from "vitest"
import { PLAN_DATA, type PlanId } from "@/services/billing-service"

describe("PLAN_DATA", () => {
  const allPlanIds: PlanId[] = ["starter", "pro", "max", "ent_starter", "ent_growth", "ent_scale"]

  it("contains all 6 plans", () => {
    expect(Object.keys(PLAN_DATA)).toHaveLength(6)
    for (const id of allPlanIds) {
      expect(PLAN_DATA[id]).toBeDefined()
    }
  })

  it("has correct pricing for starter", () => {
    expect(PLAN_DATA.starter.price).toBe(199)
    expect(PLAN_DATA.starter.name).toBe("Starter")
  })

  it("has correct pricing for pro", () => {
    expect(PLAN_DATA.pro.price).toBe(499)
    expect(PLAN_DATA.pro.name).toBe("Pro")
  })

  it("has correct pricing for max", () => {
    expect(PLAN_DATA.max.price).toBe(1499)
    expect(PLAN_DATA.max.name).toBe("Max")
  })

  it("has correct pricing for enterprise starter", () => {
    expect(PLAN_DATA.ent_starter.price).toBe(3500)
    expect(PLAN_DATA.ent_starter.isEnterprise).toBe(true)
  })

  it("has correct pricing for enterprise growth", () => {
    expect(PLAN_DATA.ent_growth.price).toBe(5000)
    expect(PLAN_DATA.ent_growth.isEnterprise).toBe(true)
  })

  it("has correct pricing for enterprise scale", () => {
    expect(PLAN_DATA.ent_scale.price).toBe(15000)
    expect(PLAN_DATA.ent_scale.isEnterprise).toBe(true)
  })

  describe("annual pricing", () => {
    it("has correct annual prices", () => {
      expect(PLAN_DATA.starter.annualPrice).toBe(159)
      expect(PLAN_DATA.pro.annualPrice).toBe(399)
      expect(PLAN_DATA.max.annualPrice).toBe(1199)
      expect(PLAN_DATA.ent_starter.annualPrice).toBe(3500)
      expect(PLAN_DATA.ent_growth.annualPrice).toBe(5000)
      expect(PLAN_DATA.ent_scale.annualPrice).toBe(15000)
    })

    it("annual price is less than or equal to monthly price", () => {
      for (const id of allPlanIds) {
        expect(PLAN_DATA[id].annualPrice).toBeLessThanOrEqual(PLAN_DATA[id].price)
      }
    })
  })

  describe("limits", () => {
    it("starter has correct limits", () => {
      expect(PLAN_DATA.starter.limits.activePersonas).toBe(50)
      expect(PLAN_DATA.starter.limits.matchingApiCalls).toBe(500_000)
      expect(PLAN_DATA.starter.limits.rateLimit).toBe(100)
      expect(PLAN_DATA.starter.limits.apiKeys).toBe(5)
      expect(PLAN_DATA.starter.limits.teamMembers).toBe(3)
    })

    it("pro has higher limits than starter", () => {
      expect(PLAN_DATA.pro.limits.activePersonas).toBeGreaterThan(
        PLAN_DATA.starter.limits.activePersonas
      )
      expect(PLAN_DATA.pro.limits.matchingApiCalls).toBeGreaterThan(
        PLAN_DATA.starter.limits.matchingApiCalls
      )
    })

    it("enterprise scale has highest limits", () => {
      expect(PLAN_DATA.ent_scale.limits.activePersonas).toBe(5000)
      expect(PLAN_DATA.ent_scale.limits.matchingApiCalls).toBe(15_000_000)
      expect(PLAN_DATA.ent_scale.limits.rateLimit).toBe(-1)
      expect(PLAN_DATA.ent_scale.limits.apiKeys).toBe(-1)
      expect(PLAN_DATA.ent_scale.limits.teamMembers).toBe(-1)
    })
  })

  describe("enterprise flag", () => {
    it("non-enterprise plans are marked correctly", () => {
      expect(PLAN_DATA.starter.isEnterprise).toBe(false)
      expect(PLAN_DATA.pro.isEnterprise).toBe(false)
      expect(PLAN_DATA.max.isEnterprise).toBe(false)
    })

    it("enterprise plans are marked correctly", () => {
      expect(PLAN_DATA.ent_starter.isEnterprise).toBe(true)
      expect(PLAN_DATA.ent_growth.isEnterprise).toBe(true)
      expect(PLAN_DATA.ent_scale.isEnterprise).toBe(true)
    })
  })

  describe("plan features", () => {
    it("each plan has at least one feature", () => {
      for (const id of allPlanIds) {
        expect(PLAN_DATA[id].features.length).toBeGreaterThan(0)
      }
    })
  })

  describe("overage pricing", () => {
    it("starter has overage rates", () => {
      expect(PLAN_DATA.starter.overage.matchApiPerCall).toBeGreaterThan(0)
      expect(PLAN_DATA.starter.overage.personaPerUnit).toBeGreaterThan(0)
    })

    it("higher tiers have lower or equal overage rates", () => {
      expect(PLAN_DATA.max.overage.matchApiPerCall).toBeLessThan(
        PLAN_DATA.starter.overage.matchApiPerCall
      )
      expect(PLAN_DATA.ent_scale.overage.matchApiPerCall).toBe(0)
    })
  })

  describe("support levels", () => {
    it("each plan has a support description", () => {
      for (const id of allPlanIds) {
        expect(PLAN_DATA[id].support).toBeTruthy()
      }
    })
  })

  describe("plan structure validation", () => {
    it("all plans have required fields", () => {
      for (const id of allPlanIds) {
        const plan = PLAN_DATA[id]
        expect(plan.id).toBe(id)
        expect(plan.name).toBeTruthy()
        expect(plan.description).toBeTruthy()
        expect(typeof plan.price).toBe("number")
        expect(typeof plan.annualPrice).toBe("number")
        expect(plan.limits).toBeDefined()
        expect(plan.overage).toBeDefined()
      }
    })
  })
})
