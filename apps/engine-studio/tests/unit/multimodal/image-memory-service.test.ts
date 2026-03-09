import { describe, it, expect, vi } from "vitest"
import {
  buildImageMemoryText,
  buildImageMemorySubject,
  saveImageMemory,
  searchImageMemories,
} from "@/lib/multimodal/image-memory-service"
import type { ImageMemoryProvider } from "@/lib/multimodal/image-memory-service"
import type { ImageAnalysis } from "@/lib/multimodal/image-analyzer"

const sampleAnalysis: ImageAnalysis = {
  description: "노을이 지는 해변에서 서핑하는 사람들",
  mood: "활기찬",
  tags: ["해변", "서핑", "노을", "바다"],
  dominantColors: ["주황색", "파란색"],
  sentiment: 0.7,
  category: "스포츠",
}

describe("buildImageMemoryText", () => {
  it("분석 결과를 자연어 기억 텍스트로 변환한다", () => {
    const text = buildImageMemoryText(sampleAnalysis)

    expect(text).toContain("노을이 지는 해변에서 서핑하는 사람들")
    expect(text).toContain("활기찬")
    expect(text).toContain("해변, 서핑, 노을, 바다")
    expect(text).toContain("주황색, 파란색")
  })

  it("mood가 빈 문자열이면 분위기 부분을 생략한다", () => {
    const text = buildImageMemoryText({ ...sampleAnalysis, mood: "" })
    expect(text).not.toContain("분위기")
  })

  it("태그가 비어있으면 키워드 부분을 생략한다", () => {
    const text = buildImageMemoryText({ ...sampleAnalysis, tags: [] })
    expect(text).not.toContain("키워드")
  })
})

describe("buildImageMemorySubject", () => {
  it("이미지 URL을 subject 키로 변환한다", () => {
    const subject = buildImageMemorySubject("/uploads/images/sunset.jpg")
    expect(subject).toBe("image:/uploads/images/sunset.jpg")
  })
})

describe("saveImageMemory", () => {
  it("이미지 분석 결과를 기억으로 저장한다", async () => {
    const mockProvider: ImageMemoryProvider = {
      saveImageMemory: vi.fn().mockResolvedValue({ id: "mem-1" }),
      searchImageMemories: vi.fn().mockResolvedValue([]),
    }

    const result = await saveImageMemory(
      {
        personaId: "persona-1",
        imageUrl: "/uploads/images/sunset.jpg",
        analysis: sampleAnalysis,
        sourcePostId: "post-1",
      },
      mockProvider
    )

    expect(result.id).toBe("mem-1")
    expect(mockProvider.saveImageMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: "persona-1",
        imageUrl: "/uploads/images/sunset.jpg",
        imageDescription: "노을이 지는 해변에서 서핑하는 사람들",
        sourceEpisodeIds: ["post-1"],
        subject: "image:/uploads/images/sunset.jpg",
      })
    )
  })

  it("confidence는 sentiment 기반으로 0.5~0.8 범위", async () => {
    const mockProvider: ImageMemoryProvider = {
      saveImageMemory: vi.fn().mockResolvedValue({ id: "mem-2" }),
      searchImageMemories: vi.fn().mockResolvedValue([]),
    }

    await saveImageMemory(
      {
        personaId: "p1",
        imageUrl: "/u/img.jpg",
        analysis: { ...sampleAnalysis, sentiment: 0.7 },
        sourcePostId: "post-2",
      },
      mockProvider
    )

    const call = (mockProvider.saveImageMemory as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      confidence: number
    }
    expect(call.confidence).toBeGreaterThanOrEqual(0.5)
    expect(call.confidence).toBeLessThanOrEqual(1.0)
  })
})

describe("searchImageMemories", () => {
  it("provider에 올바른 파라미터를 전달한다", async () => {
    const mockProvider: ImageMemoryProvider = {
      saveImageMemory: vi.fn().mockResolvedValue({ id: "mem-1" }),
      searchImageMemories: vi.fn().mockResolvedValue([]),
    }

    await searchImageMemories("persona-1", "해변 풍경", mockProvider, 5)

    expect(mockProvider.searchImageMemories).toHaveBeenCalledWith({
      personaId: "persona-1",
      query: "해변 풍경",
      limit: 5,
    })
  })

  it("기본 limit은 3이다", async () => {
    const mockProvider: ImageMemoryProvider = {
      saveImageMemory: vi.fn().mockResolvedValue({ id: "mem-1" }),
      searchImageMemories: vi.fn().mockResolvedValue([]),
    }

    await searchImageMemories("persona-1", "서핑", mockProvider)

    expect(mockProvider.searchImageMemories).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 })
    )
  })
})
