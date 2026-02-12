import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import type { SocialDimension } from "@/types"
import {
  BASE_ARCHETYPES,
  createCustomArchetype,
  addArchetype,
  removeArchetype,
} from "@/lib/user-insight/user-archetype"
import type { UserArchetype, ArchetypeThreshold } from "@/lib/user-insight/user-archetype"

// ── In-memory store ─────────────────────────────────────────────

let store: UserArchetype[] | null = null

function getStore(): UserArchetype[] {
  if (!store) {
    store = [...BASE_ARCHETYPES]
  }
  return store
}

// ── Response type ───────────────────────────────────────────────

interface ArchetypeResponse {
  archetypes: UserArchetype[]
}

// ── GET: Return all archetypes ──────────────────────────────────

export async function GET() {
  try {
    const archetypes = getStore()

    return NextResponse.json<ApiResponse<ArchetypeResponse>>({
      success: true,
      data: { archetypes },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Mutations (add, remove archetypes) ────────────────────

interface ArchetypePostRequest {
  action: "add_custom" | "remove"
  // For add_custom
  name?: string
  nameKo?: string
  description?: string
  referenceVector?: Record<SocialDimension, number>
  thresholds?: ArchetypeThreshold[]
  // For remove
  archetypeId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ArchetypePostRequest
    const archetypes = getStore()

    if (body.action === "add_custom") {
      if (!body.name?.trim() || !body.nameKo?.trim()) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "이름 (EN/KO)이 필요합니다" },
          },
          { status: 400 }
        )
      }

      const defaultVector: Record<SocialDimension, number> = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }

      const custom = createCustomArchetype(
        body.name.trim(),
        body.nameKo.trim(),
        body.description?.trim() || `${body.nameKo} 커스텀 아키타입`,
        body.referenceVector ?? defaultVector,
        body.thresholds ?? []
      )

      try {
        store = addArchetype(archetypes, custom)
      } catch {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "DUPLICATE_ID", message: "중복된 아키타입 ID입니다" },
          },
          { status: 400 }
        )
      }

      return NextResponse.json<ApiResponse<ArchetypeResponse>>({
        success: true,
        data: { archetypes: store },
      })
    }

    if (body.action === "remove") {
      if (!body.archetypeId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "archetypeId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      try {
        store = removeArchetype(archetypes, body.archetypeId)
      } catch (e) {
        const message = e instanceof Error ? e.message : "아키타입 삭제 실패"
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_OPERATION", message },
          },
          { status: 400 }
        )
      }

      return NextResponse.json<ApiResponse<ArchetypeResponse>>({
        success: true,
        data: { archetypes: store },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: add_custom, remove",
        },
      },
      { status: 400 }
    )
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 작업 실패" },
      },
      { status: 500 }
    )
  }
}
