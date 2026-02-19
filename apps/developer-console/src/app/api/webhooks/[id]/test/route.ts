import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import crypto from "crypto"
import { requireAuth } from "@/lib/require-auth"

// ============================================================================
// POST /api/webhooks/[id]/test - 웹훅 테스트 전송
// ============================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    })

    if (!webhook) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Webhook not found" },
        },
        { status: 404 }
      )
    }

    // Prepare test payload
    const testPayload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook delivery from DeepSight API",
        webhookId: webhook.id,
      },
    }

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000)
    const payloadString = JSON.stringify(testPayload)
    const signaturePayload = `${timestamp}.${payloadString}`
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(signaturePayload)
      .digest("hex")

    // Send webhook
    const startTime = Date.now()
    let statusCode = 0
    let responseBody = ""
    let deliveryStatus: "SUCCESS" | "FAILED" = "FAILED"

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DeepSight-Signature": `t=${timestamp},v1=${signature}`,
          "X-DeepSight-Event": "webhook.test",
          "User-Agent": "DeepSight-Webhook/1.0",
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      statusCode = response.status
      responseBody = await response.text().catch(() => "")

      if (response.ok) {
        deliveryStatus = "SUCCESS"
      }
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError" || fetchError.name === "TimeoutError") {
          responseBody = "Request timeout"
          statusCode = 408
        } else {
          responseBody = fetchError.message
          statusCode = 0
        }
      }
    }

    const latencyMs = Date.now() - startTime

    // Record delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: "webhook.test",
        payload: testPayload,
        statusCode,
        responseBody: responseBody.substring(0, 1000), // Truncate response
        latencyMs,
        status: deliveryStatus,
        attemptCount: 1,
      },
    })

    // Update webhook last delivery info
    await prisma.webhook.update({
      where: { id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: deliveryStatus,
      },
    })

    return NextResponse.json({
      success: deliveryStatus === "SUCCESS",
      data: {
        success: deliveryStatus === "SUCCESS",
        statusCode,
        latency: latencyMs,
        response: responseBody.substring(0, 200),
      },
    })
  } catch (error) {
    console.error("Error testing webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to test webhook" },
      },
      { status: 500 }
    )
  }
}
