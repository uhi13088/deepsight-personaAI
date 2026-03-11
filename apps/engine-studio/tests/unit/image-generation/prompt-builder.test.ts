import { describe, it, expect } from "vitest"
import {
  buildProfileImagePrompt,
  buildQualityEnhancement,
} from "@/lib/image-generation/prompt-builder"
import type { ProfileImagePromptInput } from "@/lib/image-generation/prompt-builder"

describe("buildProfileImagePrompt", () => {
  const baseInput: ProfileImagePromptInput = {
    gender: "FEMALE",
    nationality: "Korean",
    age: 30,
    role: "CURATOR",
    expertise: ["contemporary art", "film"],
    personality: {
      extraversion: 0.6,
      agreeableness: 0.7,
      openness: 0.8,
      neuroticism: 0.3,
    },
  }

  it("should include ethnicity, gender, and age", () => {
    const prompt = buildProfileImagePrompt(baseInput)
    expect(prompt).toContain("Korean")
    expect(prompt).toContain("woman")
    expect(prompt).toContain("young adult")
  })

  it("should include role-based appearance", () => {
    const prompt = buildProfileImagePrompt(baseInput)
    expect(prompt).toContain("creative and stylish")
  })

  it("should include expertise context", () => {
    const prompt = buildProfileImagePrompt(baseInput)
    expect(prompt).toContain("contemporary art")
    expect(prompt).toContain("film")
  })

  it("should include photorealistic quality descriptors", () => {
    const prompt = buildProfileImagePrompt(baseInput)
    expect(prompt).toContain("photorealistic")
    expect(prompt).toContain("85mm")
    expect(prompt).toContain("studio lighting")
  })

  it("should handle MALE gender", () => {
    const prompt = buildProfileImagePrompt({ ...baseInput, gender: "MALE" })
    expect(prompt).toContain("man")
    expect(prompt).not.toContain("woman")
  })

  it("should handle NON_BINARY gender", () => {
    const prompt = buildProfileImagePrompt({ ...baseInput, gender: "NON_BINARY" })
    expect(prompt).toContain("person")
  })

  it("should handle unknown nationality gracefully", () => {
    const prompt = buildProfileImagePrompt({ ...baseInput, nationality: "Martian" })
    expect(prompt).toContain("Martian")
  })

  it("should handle various age ranges", () => {
    expect(buildProfileImagePrompt({ ...baseInput, age: 22 })).toContain("youthful")
    expect(buildProfileImagePrompt({ ...baseInput, age: 35 })).toContain("mature")
    expect(buildProfileImagePrompt({ ...baseInput, age: 50 })).toContain("middle-aged")
    expect(buildProfileImagePrompt({ ...baseInput, age: 60 })).toContain("distinguished")
  })

  it("should infer warm expression for high agreeableness + extraversion", () => {
    const prompt = buildProfileImagePrompt({
      ...baseInput,
      personality: { extraversion: 0.8, agreeableness: 0.8, openness: 0.5, neuroticism: 0.2 },
    })
    expect(prompt).toContain("warm genuine smile")
  })

  it("should infer gentle expression for agreeable introverts", () => {
    const prompt = buildProfileImagePrompt({
      ...baseInput,
      personality: { extraversion: 0.3, agreeableness: 0.7, openness: 0.5, neuroticism: 0.2 },
    })
    expect(prompt).toContain("gentle smile")
  })

  it("should infer contemplative expression for high neuroticism", () => {
    const prompt = buildProfileImagePrompt({
      ...baseInput,
      personality: { extraversion: 0.4, agreeableness: 0.4, openness: 0.5, neuroticism: 0.7 },
    })
    expect(prompt).toContain("contemplative")
  })

  it("should handle empty expertise", () => {
    const prompt = buildProfileImagePrompt({ ...baseInput, expertise: [] })
    expect(prompt).not.toContain("works in")
  })

  it("should handle all roles", () => {
    const roles = ["ANALYST", "CURATOR", "COMPANION", "REVIEWER", "EDUCATOR"]
    for (const role of roles) {
      const prompt = buildProfileImagePrompt({ ...baseInput, role })
      expect(prompt.length).toBeGreaterThan(100)
    }
  })

  it("should handle unknown role with default appearance", () => {
    const prompt = buildProfileImagePrompt({ ...baseInput, role: "UNKNOWN" })
    expect(prompt).toContain("professional and approachable")
  })
})

describe("buildQualityEnhancement", () => {
  it("should return anti-illustration directives", () => {
    const result = buildQualityEnhancement()
    expect(result).toContain("no illustration")
    expect(result).toContain("no cartoon")
    expect(result).toContain("no anime")
    expect(result).toContain("real photograph")
  })
})
