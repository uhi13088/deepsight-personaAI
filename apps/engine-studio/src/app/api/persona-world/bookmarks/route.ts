import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// 북마크 생성 스키마
const createBookmarkSchema = z.object({
  userId: z.string().min(1, "유저 ID는 필수입니다"),
  postId: z.string().min(1, "포스트 ID는 필수입니다"),
})

// GET /api/persona-world/bookmarks - 북마크 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "userId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const [bookmarks, total] = await Promise.all([
      prisma.personaPostBookmark.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.personaPostBookmark.count({ where: { userId } }),
    ])

    // 포스트 정보 조회
    const postIds = bookmarks.map((b) => b.postId)
    const posts = await prisma.personaPost.findMany({
      where: { id: { in: postIds }, isHidden: false },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            tagline: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
      },
    })

    const postMap = new Map(posts.map((p) => [p.id, p]))

    return NextResponse.json({
      success: true,
      data: {
        bookmarks: bookmarks
          .map((bookmark) => ({
            ...bookmark,
            post: postMap.get(bookmark.postId),
          }))
          .filter((b) => b.post), // 숨겨진 포스트 제외
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("북마크 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "북마크 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/bookmarks - 북마크 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = createBookmarkSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { userId, postId } = validationResult.data

    // 유저 존재 확인
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 포스트 존재 확인
    const post = await prisma.personaPost.findUnique({
      where: { id: postId },
    })

    if (!post || post.isHidden) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 중복 체크
    const existingBookmark = await prisma.personaPostBookmark.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    })

    if (existingBookmark) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE", message: "이미 북마크에 추가된 포스트입니다" },
        },
        { status: 409 }
      )
    }

    // 북마크 생성
    const bookmark = await prisma.personaPostBookmark.create({
      data: {
        userId,
        postId,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: bookmark,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("북마크 추가 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "북마크 추가에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/persona-world/bookmarks - 북마크 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const postId = searchParams.get("postId")

    if (!userId || !postId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "userId와 postId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 북마크 찾기
    const bookmark = await prisma.personaPostBookmark.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    })

    if (!bookmark) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "북마크를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 북마크 삭제
    await prisma.personaPostBookmark.delete({
      where: { id: bookmark.id },
    })

    return NextResponse.json({
      success: true,
      data: { message: "북마크가 삭제되었습니다" },
    })
  } catch (error) {
    console.error("북마크 삭제 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "북마크 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
