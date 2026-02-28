import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/public/posts/[postId]/vote
 *
 * VS_BATTLE 포스트에 대한 A/B 투표.
 *
 * Body:
 * - userId: string (필수)
 * - choice: "A" | "B" (필수)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { postId } = await params
    const body = await request.json()
    const { userId, choice } = body as { userId?: string; choice?: string }

    if (!userId || !choice || !["A", "B"].includes(choice)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId와 choice(A 또는 B) 필요" },
        },
        { status: 400 }
      )
    }

    const post = await prisma.personaPost.findUnique({
      where: { id: postId },
      select: { id: true, type: true, metadata: true },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    if (post.type !== "VS_BATTLE") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "VS_BATTLE 타입만 투표 가능" },
        },
        { status: 400 }
      )
    }

    // 현재 metadata 파싱
    const metadata = (post.metadata ?? {}) as Record<string, unknown>
    const votes = (metadata.votes as { A?: number; B?: number } | undefined) ?? { A: 0, B: 0 }
    const voters = (metadata.voters as Record<string, string> | undefined) ?? {}

    const previousChoice = voters[userId] as "A" | "B" | undefined

    // 이전 투표 취소 + 새 투표 반영
    if (previousChoice) {
      votes[previousChoice] = Math.max(0, (votes[previousChoice] ?? 0) - 1)
    }
    const typedChoice = choice as "A" | "B"
    votes[typedChoice] = (votes[typedChoice] ?? 0) + 1
    voters[userId] = choice

    // metadata 업데이트
    const updatedMetadata = { ...metadata, votes, voters }
    await prisma.personaPost.update({
      where: { id: postId },
      data: { metadata: updatedMetadata },
    })

    const totalVotes = (votes.A ?? 0) + (votes.B ?? 0)
    const pctA = totalVotes > 0 ? Math.round(((votes.A ?? 0) / totalVotes) * 100) : 50

    return NextResponse.json({
      success: true,
      data: {
        postId,
        choice,
        votes: { A: votes.A ?? 0, B: votes.B ?? 0 },
        totalVotes,
        pctA,
        pctB: 100 - pctA,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "VOTE_ERROR", message } },
      { status: 500 }
    )
  }
}
