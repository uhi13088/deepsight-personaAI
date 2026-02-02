import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// GET /api/api-keys - List all API keys
export async function GET(request: NextRequest) {
  try {
    // TODO: Get organization ID from session/auth
    const organizationId = "org_xyz789"

    // Mock data - replace with database query
    const apiKeys = [
      {
        id: "key_1",
        name: "Production Server",
        prefix: "pk_live_",
        lastFour: "xyz8",
        environment: "live",
        status: "active",
        permissions: ["match", "personas", "feedback"],
        createdAt: "2025-01-01T00:00:00Z",
        lastUsedAt: new Date(Date.now() - 120000).toISOString(),
        rateLimit: 1000,
      },
      {
        id: "key_2",
        name: "Development",
        prefix: "pk_test_",
        lastFour: "abc3",
        environment: "test",
        status: "active",
        permissions: ["match", "personas", "feedback"],
        createdAt: "2025-01-05T00:00:00Z",
        lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
        rateLimit: 100,
      },
    ]

    return NextResponse.json({ apiKeys, total: apiKeys.length })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch API keys" } },
      { status: 500 }
    )
  }
}

// POST /api/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, environment, permissions } = body

    // Validate input
    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Name must be at least 3 characters" } },
        { status: 400 }
      )
    }

    if (!environment || !["test", "live"].includes(environment)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Environment must be 'test' or 'live'" } },
        { status: 400 }
      )
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "At least one permission is required" } },
        { status: 400 }
      )
    }

    // Generate API key
    const prefix = environment === "live" ? "pk_live_" : "pk_test_"
    const randomPart = crypto.randomBytes(24).toString("base64url")
    const fullKey = prefix + randomPart
    const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex")
    const lastFour = randomPart.slice(-4)

    // Mock response - replace with database insert
    const newApiKey = {
      id: "key_" + crypto.randomBytes(8).toString("hex"),
      name,
      prefix,
      lastFour,
      environment,
      status: "active",
      permissions,
      createdAt: new Date().toISOString(),
      rateLimit: environment === "live" ? 1000 : 100,
    }

    return NextResponse.json({
      apiKey: newApiKey,
      key: fullKey, // Only return the full key once
      message: "API key created successfully. Save this key - it won't be shown again.",
    })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create API key" } },
      { status: 500 }
    )
  }
}
