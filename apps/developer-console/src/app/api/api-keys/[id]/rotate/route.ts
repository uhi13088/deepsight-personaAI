import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import crypto from "crypto"

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
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Find the existing API key
    const existingKey = await prisma.apiKey.findUnique({
      where: { id },
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
      // Update the existing key with new values
      const updated = await tx.apiKey.update({
        where: { id },
        data: {
          keyHash: newHash,
          lastFour: newLastFour,
          updatedAt: new Date(),
        },
      })

      return updated
    })

    // Return the new key (only shown once)
    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          key: newKey, // Full key - only shown once!
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
