import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

// ── 설정 ─────────────────────────────────────────────────────

const MAX_IMAGES = 4
const MAX_CONTENT_LENGTH = 2000
const INTERNAL_UPLOAD_PREFIX = "/uploads/images/"

// ── POST /api/public/posts ───────────────────────────────────

/**
 * 유저 이미지 포스트 생성 API.
 *
 * Body:
 * - userId: string (필수)
 * - content: string (필수, 최대 2000자)
 * - imageUrls?: string[] (최대 4장, 내부 업로드 URL만 허용)
 *
 * Response: { success: true, data: { postId } }
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as {
      userId?: unknown
      content?: unknown
      imageUrls?: unknown
    }

    // ── 입력 검증 ──────────────────────────────────────────

    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "userId는 필수입니다." } },
        { status: 400 }
      )
    }

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "content는 필수입니다." } },
        { status: 400 }
      )
    }

    if (body.content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_TOO_LONG",
            message: `포스트 내용은 최대 ${MAX_CONTENT_LENGTH}자입니다.`,
          },
        },
        { status: 400 }
      )
    }

    // ── 이미지 URL 검증 ────────────────────────────────────

    let imageUrls: string[] = []
    if (body.imageUrls !== undefined) {
      if (!Array.isArray(body.imageUrls)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "imageUrls는 배열이어야 합니다." },
          },
          { status: 400 }
        )
      }

      if (body.imageUrls.length > MAX_IMAGES) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TOO_MANY_IMAGES",
              message: `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`,
            },
          },
          { status: 400 }
        )
      }

      // 내부 업로드 URL만 허용 (외부 URL 차단 — XSS/SSRF 방지)
      for (const url of body.imageUrls) {
        if (typeof url !== "string" || !url.startsWith(INTERNAL_UPLOAD_PREFIX)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_IMAGE_URL",
                message: `허용되지 않는 이미지 URL입니다. 내부 업로드 URL만 사용할 수 있습니다.`,
              },
            },
            { status: 400 }
          )
        }
      }

      imageUrls = body.imageUrls as string[]
    }

    // ── DB 저장 ────────────────────────────────────────────

    const hasImages = imageUrls.length > 0

    const post = await prisma.personaPost.create({
      data: {
        personaId: body.userId,
        type: hasImages ? "IMAGE_REACTION" : "THOUGHT",
        content: body.content,
        trigger: "USER_INTERACTION",
        postSource: "USER_SUBMITTED",
        imageUrls: hasImages ? imageUrls : [],
        metadata: hasImages ? { imageCount: imageUrls.length, source: "user_upload" } : undefined,
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        postId: post.id,
        type: post.type,
        imageUrls,
        createdAt: post.createdAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "포스트 생성에 실패했습니다."
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    )
  }
}
