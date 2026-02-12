import { describe, it, expect, beforeEach } from "vitest"
import { useUserStore } from "../user-store"
import type { OnboardingAnswer } from "../types"

// Zustand persist는 테스트에서 동기적으로 작동
describe("user-store: 온보딩 상태 관리", () => {
  beforeEach(() => {
    // 스토어 초기화
    useUserStore.getState().reset()
  })

  // ── 초기 상태 ─────────────────────────────────────────────

  it("초기 온보딩 상태", () => {
    const { onboarding } = useUserStore.getState()
    expect(onboarding.currentPhase).toBe(0)
    expect(onboarding.completedPhases).toEqual([])
    expect(onboarding.phaseAnswers).toEqual({})
    expect(onboarding.profileLevel).toBe("BASIC")
    expect(onboarding.creditsBalance).toBe(0)
  })

  // ── Phase 시작 ────────────────────────────────────────────

  it("startPhase로 Phase 진입", () => {
    useUserStore.getState().startPhase(1)
    expect(useUserStore.getState().onboarding.currentPhase).toBe(1)
  })

  // ── Phase 답변 저장 ───────────────────────────────────────

  it("savePhaseAnswers로 답변 저장", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "q1", value: "a" },
      { questionId: "q2", value: "b" },
    ]
    useUserStore.getState().savePhaseAnswers(1, answers)
    expect(useUserStore.getState().onboarding.phaseAnswers[1]).toEqual(answers)
  })

  // ── Phase 완료 ────────────────────────────────────────────

  it("completePhase로 Phase 완료 + 등급 + 크레딧", () => {
    useUserStore.getState().startPhase(1)
    useUserStore.getState().completePhase(1, 100, "BASIC")

    const { onboarding } = useUserStore.getState()
    expect(onboarding.currentPhase).toBe(0)
    expect(onboarding.completedPhases).toContain(1)
    expect(onboarding.profileLevel).toBe("BASIC")
    expect(onboarding.creditsBalance).toBe(100)
  })

  it("Phase 2 완료 시 크레딧 누적", () => {
    useUserStore.getState().completePhase(1, 100, "BASIC")
    useUserStore.getState().completePhase(2, 150, "STANDARD")

    const { onboarding } = useUserStore.getState()
    expect(onboarding.completedPhases).toEqual([1, 2])
    expect(onboarding.profileLevel).toBe("STANDARD")
    expect(onboarding.creditsBalance).toBe(250)
  })

  it("Phase 3 완료 → ADVANCED + 450 코인", () => {
    useUserStore.getState().completePhase(1, 100, "BASIC")
    useUserStore.getState().completePhase(2, 150, "STANDARD")
    useUserStore.getState().completePhase(3, 200, "ADVANCED")

    const { onboarding } = useUserStore.getState()
    expect(onboarding.completedPhases).toEqual([1, 2, 3])
    expect(onboarding.profileLevel).toBe("ADVANCED")
    expect(onboarding.creditsBalance).toBe(450)
  })

  // ── Phase 중복 완료 방지 ──────────────────────────────────

  it("같은 Phase 중복 완료 시 completedPhases 중복 추가 안 됨", () => {
    useUserStore.getState().completePhase(1, 100, "BASIC")
    useUserStore.getState().completePhase(1, 100, "BASIC")

    expect(useUserStore.getState().onboarding.completedPhases).toEqual([1])
    // 크레딧은 200 (2번 호출로 누적됨 — 비즈니스 로직에서 중복 호출 방지 필요)
    expect(useUserStore.getState().onboarding.creditsBalance).toBe(200)
  })

  // ── 현재 Phase 리셋 (이탈 정책) ──────────────────────────

  it("resetCurrentPhase로 진행 중 Phase 초기화", () => {
    useUserStore.getState().startPhase(2)
    useUserStore.getState().savePhaseAnswers(2, [{ questionId: "q1", value: "a" }])
    useUserStore.getState().resetCurrentPhase()

    const { onboarding } = useUserStore.getState()
    expect(onboarding.currentPhase).toBe(0)
    expect(onboarding.phaseAnswers[2]).toBeUndefined()
  })

  it("리셋 시 이전 Phase 데이터 보존", () => {
    useUserStore.getState().completePhase(1, 100, "BASIC")
    useUserStore.getState().savePhaseAnswers(1, [{ questionId: "q1", value: "a" }])
    useUserStore.getState().startPhase(2)
    useUserStore.getState().savePhaseAnswers(2, [{ questionId: "q5", value: "b" }])
    useUserStore.getState().resetCurrentPhase()

    const { onboarding } = useUserStore.getState()
    // Phase 1 데이터 보존
    expect(onboarding.completedPhases).toContain(1)
    expect(onboarding.phaseAnswers[1]).toBeDefined()
    // Phase 2 데이터 초기화
    expect(onboarding.phaseAnswers[2]).toBeUndefined()
  })

  // ── 온보딩 완료 ───────────────────────────────────────────

  it("completeOnboarding으로 프로필 생성", () => {
    useUserStore.getState().completeOnboarding()
    expect(useUserStore.getState().profile?.completedOnboarding).toBe(true)
  })
})
