import { NextRequest, NextResponse } from "next/server"

function getEngineStudioUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL?.trim()
  if (!raw) return "http://localhost:3000"
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/+$/, "")
  return `https://${raw}`.replace(/\/+$/, "")
}

/**
 * API 요청을 engine-studio로 프록시한다.
 *
 * middleware가 주입한 x-internal-token, x-authenticated-email 헤더를
 * 그대로 engine-studio에 전달하기 위해 route handler에서 fetch() 프록시를 수행한다.
 * (next.config.ts rewrites는 middleware 수정 헤더를 외부 URL에 전달하지 않음)
 */
export async function proxyToEngineStudio(
  request: NextRequest,
  prefix: string,
  path: string[]
): Promise<NextResponse> {
  const engineUrl = getEngineStudioUrl()
  const targetPath = `${prefix}/${path.join("/")}`
  const url = new URL(targetPath, engineUrl)

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  const headers = new Headers(request.headers)
  headers.delete("host")

  const init: RequestInit = {
    method: request.method,
    headers,
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    // @ts-expect-error duplex required for streaming request body
    init.duplex = "half"
  }

  const response = await fetch(url.toString(), init)

  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete("transfer-encoding")

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}
