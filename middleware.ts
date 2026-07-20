import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://your-frontend-domain.vercel.app", // TODO: apna asli deployed frontend URL yaha daalo
]

function corsHeaders(origin: string | null) {
  const headers = new Headers()

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin)
  }

  headers.set("Access-Control-Allow-Credentials", "true")
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

  return headers
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin")

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  const response = NextResponse.next()
  const headers = corsHeaders(origin)
  headers.forEach((value, key) => response.headers.set(key, value))

  return response
}

export const config = {
  matcher: "/api/:path*",
}