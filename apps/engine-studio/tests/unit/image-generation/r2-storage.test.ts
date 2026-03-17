import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────

const { sendMock } = vi.hoisted(() => {
  const sendMock = vi.fn().mockResolvedValue({})
  return { sendMock }
})

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = sendMock
  }
  class MockPutObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return { S3Client: MockS3Client, PutObjectCommand: MockPutObjectCommand }
})

const mockFetchResponse = {
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
  headers: new Headers({ "content-type": "image/webp" }),
}
vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse))

import {
  isR2Configured,
  uploadImageToR2,
  _resetClientForTest,
} from "@/lib/image-generation/r2-storage"

describe("isR2Configured", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET_NAME
    delete process.env.R2_PUBLIC_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should return false when no R2 env vars set", () => {
    expect(isR2Configured()).toBe(false)
  })

  it("should return false when only some vars set", () => {
    process.env.R2_ACCOUNT_ID = "test-id"
    process.env.R2_BUCKET_NAME = "test-bucket"
    expect(isR2Configured()).toBe(false)
  })

  it("should return true when all R2 vars set", () => {
    process.env.R2_ACCOUNT_ID = "test-id"
    process.env.R2_ACCESS_KEY_ID = "test-access"
    process.env.R2_SECRET_ACCESS_KEY = "test-secret"
    process.env.R2_BUCKET_NAME = "test-bucket"
    process.env.R2_PUBLIC_URL = "https://pub.example.com"
    expect(isR2Configured()).toBe(true)
  })
})

describe("uploadImageToR2", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    _resetClientForTest()
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: "test-account",
      R2_ACCESS_KEY_ID: "test-key",
      R2_SECRET_ACCESS_KEY: "test-secret",
      R2_BUCKET_NAME: "test-bucket",
      R2_PUBLIC_URL: "https://pub.example.com",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should download image and upload to R2", async () => {
    const result = await uploadImageToR2("https://fal.media/files/example/image.webp")

    expect(fetch).toHaveBeenCalledWith("https://fal.media/files/example/image.webp")
    expect(result.publicUrl).toMatch(/^https:\/\/pub\.example\.com\/profile-images\//)
    expect(result.key).toMatch(/^profile-images\/\d{4}\/\d{2}\/\d{2}\/[\w-]+\.webp$/)
    expect(sendMock).toHaveBeenCalled()
  })

  it("should throw on download failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    await expect(uploadImageToR2("https://example.com/missing.webp")).rejects.toThrow(
      "Failed to download image"
    )
  })

  it("should use correct extension based on content-type", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(512)),
      headers: new Headers({ "content-type": "image/png" }),
    } as unknown as Response)

    const result = await uploadImageToR2("https://example.com/image.png")
    expect(result.key).toMatch(/\.png$/)
  })

  it("should strip trailing slash from R2_PUBLIC_URL", async () => {
    process.env.R2_PUBLIC_URL = "https://pub.example.com/"

    const result = await uploadImageToR2("https://fal.media/files/example/image.webp")
    expect(result.publicUrl).not.toContain("//profile-images")
  })
})
