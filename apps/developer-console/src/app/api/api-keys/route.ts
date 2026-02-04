import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/api-keys - List all API keys
export async function GET() {
  try {
    const session = await auth()

    // Get organization (use first one for now if no session)
    let organization
    if (session?.user?.id) {
      // Find user's organization membership
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        include: { organization: true },
      })
      organization = membership?.organization
    }
    if (!organization) {
      organization = await prisma.organization.findFirst()
    }

    if (!organization) {
      return NextResponse.json({ apiKeys: [], total: 0 })
    }

    // Fetch API keys from database
    const dbApiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    })

    const apiKeys = dbApiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      lastFour: key.lastFour,
      environment: key.environment.toLowerCase(),
      status: key.status.toLowerCase(),
      permissions: key.permissions,
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      rateLimit: key.rateLimit,
    }))

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
    const session = await auth()

    // Get organization and user
    let organization
    let userId: string

    if (session?.user?.id) {
      // Find user's organization membership
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        include: { organization: true },
      })
      organization = membership?.organization
      userId = session.user.id
    }

    // Fallback for development
    if (!organization) {
      organization = await prisma.organization.findFirst()
    }

    if (!userId!) {
      const user = await prisma.user.findFirst()
      if (!user) {
        return NextResponse.json(
          { error: { code: "NO_USER", message: "No user found. Please run database seed." } },
          { status: 400 }
        )
      }
      userId = user.id
    }

    if (!organization) {
      return NextResponse.json(
        { error: { code: "NO_ORGANIZATION", message: "No organization found" } },
        { status: 400 }
      )
    }

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

    // Insert into database
    const dbApiKey = await prisma.apiKey.create({
      data: {
        name,
        keyPrefix: prefix,
        keyHash,
        lastFour,
        environment: environment.toUpperCase() as "TEST" | "LIVE",
        status: "ACTIVE",
        permissions,
        rateLimit: environment === "live" ? 1000 : 100,
        userId,
        organizationId: organization.id,
      },
    })

    const newApiKey = {
      id: dbApiKey.id,
      name: dbApiKey.name,
      prefix: dbApiKey.keyPrefix,
      lastFour: dbApiKey.lastFour,
      environment: dbApiKey.environment.toLowerCase(),
      status: dbApiKey.status.toLowerCase(),
      permissions: dbApiKey.permissions,
      createdAt: dbApiKey.createdAt.toISOString(),
      rateLimit: dbApiKey.rateLimit,
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
