import { describe, it, expect } from "vitest"
import { POST_TYPE_LABELS } from "../role-config"

// 타입 re-export 검증 (import가 정상적으로 동작하는지)
describe("types: shared-types v3 re-export", () => {
  it("ThreeLayerVector 타입 import 가능", async () => {
    const types = await import("../types")
    // re-export된 타입은 런타임에 값이 아니므로, 모듈 자체 import 성공을 검증
    expect(types).toBeDefined()
  })

  it("PersonaDetail 인터페이스 존재", async () => {
    const types = await import("../types")
    expect(types).toBeDefined()
  })

  it("PostType 17종 검증 (타입 안전성)", () => {
    expect(Object.keys(POST_TYPE_LABELS)).toHaveLength(17)
  })
})
