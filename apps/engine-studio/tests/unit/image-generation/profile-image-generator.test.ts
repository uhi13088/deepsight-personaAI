import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────

vi.mock("@/lib/image-generation/replicate-client", () => ({
  isImageGenerationConfigured: vi.fn(),
  generateImageWithFlux: vi.fn(),
}))

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

// fetch mock for image download
const mockFetchResponse = {
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
}
vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse))

import { generateProfileImage } from "@/lib/image-generation/profile-image-generator"
import {
  isImageGenerationConfigured,
  generateImageWithFlux,
} from "@/lib/image-generation/replicate-client"
import { writeFile, mkdir } from "fs/promises"

const mockedIsConfigured = vi.mocked(isImageGenerationConfigured)
const mockedGenerateImage = vi.mocked(generateImageWithFlux)

const DEFAULT_INPUT = {
  gender: "FEMALE",
  nationality: "Korean",
  birthDate: new Date("1996-05-15"),
  role: "CURATOR",
  expertise: ["art", "film"],
  personality: {
    extraversion: 0.6,
    agreeableness: 0.7,
    openness: 0.8,
    neuroticism: 0.3,
  },
}

describe("generateProfileImage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return null when Replicate is not configured", async () => {
    mockedIsConfigured.mockReturnValue(false)

    const result = await generateProfileImage(DEFAULT_INPUT)
    expect(result).toBeNull()
    expect(mockedGenerateImage).not.toHaveBeenCalled()
  })

  it("should generate image and save locally when configured", async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedGenerateImage.mockResolvedValue({
      imageUrl: "https://replicate.delivery/example/image.webp",
      model: "black-forest-labs/flux-1.1-pro",
    })

    const result = await generateProfileImage(DEFAULT_INPUT)

    expect(result).not.toBeNull()
    expect(result?.profileImageUrl).toMatch(
      /^\/uploads\/images\/\d{4}\/\d{2}\/\d{2}\/[\w-]+\.webp$/
    )
    expect(result?.model).toBe("black-forest-labs/flux-1.1-pro")
    expect(mkdir).toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalled()
  })

  it("should return null when FLUX returns null", async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedGenerateImage.mockResolvedValue(null)

    const result = await generateProfileImage(DEFAULT_INPUT)
    expect(result).toBeNull()
  })

  it("should return null on download failure", async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedGenerateImage.mockResolvedValue({
      imageUrl: "https://replicate.delivery/example/image.webp",
      model: "black-forest-labs/flux-1.1-pro",
    })
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response)

    const result = await generateProfileImage(DEFAULT_INPUT)
    expect(result).toBeNull()
  })

  it("should return null on unexpected error", async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedGenerateImage.mockRejectedValue(new Error("API timeout"))

    const result = await generateProfileImage(DEFAULT_INPUT)
    expect(result).toBeNull()
  })

  it("should pass correct prompt input to FLUX", async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedGenerateImage.mockResolvedValue({
      imageUrl: "https://replicate.delivery/example/image.webp",
      model: "black-forest-labs/flux-1.1-pro",
    })

    await generateProfileImage(DEFAULT_INPUT)

    expect(mockedGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1024,
        height: 1024,
        prompt: expect.stringContaining("Korean"),
      })
    )
  })

  it("should include quality enhancement in prompt", async () => {
    mockedIsConfigured.mockReturnValue(true)
    mockedGenerateImage.mockResolvedValue({
      imageUrl: "https://replicate.delivery/example/image.webp",
      model: "black-forest-labs/flux-1.1-pro",
    })

    await generateProfileImage(DEFAULT_INPUT)

    const call = mockedGenerateImage.mock.calls[0][0]
    expect(call.prompt).toContain("no illustration")
    expect(call.prompt).toContain("real photograph")
  })
})
