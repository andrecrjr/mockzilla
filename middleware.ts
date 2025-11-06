import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Global CORS middleware for all /api/* routes
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "*"

  const allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  const allowedHeaders = request.headers.get("access-control-request-headers") || "Content-Type, Authorization"

  // Preflight request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": allowedMethods,
        "Access-Control-Allow-Headers": allowedHeaders,
        "Access-Control-Max-Age": "86400",
      },
    })
  }

  // Actual request: pass through and add CORS headers
  const response = NextResponse.next()
  response.headers.set("Access-Control-Allow-Origin", origin)
  response.headers.set("Access-Control-Allow-Credentials", "true")
  response.headers.set("Access-Control-Allow-Methods", allowedMethods)
  response.headers.set("Access-Control-Allow-Headers", allowedHeaders)
  response.headers.set("Access-Control-Max-Age", "86400")

  return response
}

// Apply only to API routes
export const config = {
  matcher: "/api/:path*",
}