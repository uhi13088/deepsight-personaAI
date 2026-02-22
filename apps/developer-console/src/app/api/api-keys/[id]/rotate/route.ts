import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import crypto from "crypto"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"

/**
 * Generate a secure API key with prefix
 */
function generateApiKey(environment: "TEST" | "LIVE"): {
  key: string
  hash: string
  lastFour: string
} {
  const prefix = environment === "LIVE" ? "pk_live_" : "pk_test_"
  const randomBytes = crypto.randomBytes(24)
  const keyBody = randomBytes.toString("base64url")
  const fullKey = prefix + keyBody

  // Hash the key for storage
  const hash = crypto.createHash("sha256").update(fullKey).digest("hex")

  // Get last 4 characters
  const lastFour = keyBody.slice(-4)

  return { key: fullKey, hash, lastFour }
}

/**
 * POST /api/api-keys/:id/rotate - Rotate (regenerate) an API key
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // T210: 인증 필수
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    // T210: 조직 소속 확인
    const membership = await getUserOrganization(session.user.id)
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "조직 접근 권한이 없습니다." } },
        { status: 403 }
      )
    }

    // T210: organizationId 필터로 Cross-Org 방지
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, organizationId: membership.organizationId },
    })

    if (!existingKey) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "API 키를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Check if already revoked
    if (existingKey.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: { code: "KEY_REVOKED", message: "이미 폐기된 API 키입니다." } },
        { status: 400 }
      )
    }

    // Generate new key
    const {
      key: newKey,
      hash: newHash,
      lastFour: newLastFour,
    } = generateApiKey(existingKey.environment as "TEST" | "LIVE")

    // Update the key in a transaction
    const updatedKey = await prisma.$transaction(async (tx) => {
      return tx.apiKey.update({
        where: { id },
        data: {
          keyHash: newHash,
          lastFour: newLastFour,
          updatedAt: new Date(),
        },
      })
    })

    // Return the new key (only shown once — client must copy immediately)
    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          key: newKey,
          prefix: updatedKey.keyPrefix,
          lastFour: newLastFour,
          environment: updatedKey.environment.toLowerCase(),
          permissions: updatedKey.permissions,
          rateLimit: updatedKey.rateLimit,
          rotatedAt: new Date().toISOString(),
        },
        message: "API 키가 성공적으로 로테이션되었습니다. 새 키를 안전하게 저장하세요.",
      },
    })
  } catch (error) {
    console.error("Error rotating API key:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "API 키 로테이션에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}
