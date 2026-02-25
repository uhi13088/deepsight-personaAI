import { NextRequest } from "next/server"
import { proxyToEngineStudio } from "@/lib/api-proxy"

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  console.log(
    `[route-handler] /api/public/[...path] hit: ${request.method} /api/public/${path.join("/")}`
  )
  return proxyToEngineStudio(request, "/api/public", path)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
