import { NextResponse, type NextRequest } from "next/server"
import { ZodError } from "zod"
import { verifyToken, type TokenPayload } from "@/lib/auth/jwt"

/**
 * Standard JSON success response.
 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Standard JSON error response.
 */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status })
}

/**
 * Auth guard used like middleware inside route handlers.
 * Reads the Bearer token from the Authorization header and verifies it.
 * Returns the decoded token payload, or throws an ApiError with 401.
 */
export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function requireAuth(req: NextRequest): TokenPayload {
  const header = req.headers.get("authorization") || ""
  const [scheme, token] = header.split(" ")

  if (scheme !== "Bearer" || !token) {
    throw new ApiError("Authentication required. Provide a Bearer token.", 401)
  }

  try {
    return verifyToken(token)
  } catch {
    throw new ApiError("Invalid or expired token.", 401)
  }
}

// NEW: same as requireAuth, but additionally checks that the token belongs
// to the admin (isAdmin: true). Use this to protect all /api/admin/* routes.
export function requireAdmin(req: NextRequest): TokenPayload {
  const payload = requireAuth(req)
  if (!payload.isAdmin) {
    throw new ApiError("Admin access required.", 403)
  }
  return payload
}

/**
 * Wraps a route handler with consistent error handling for
 * ApiError, ZodError, and unexpected errors.
 */
export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.message, error.status)
  }
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten().fieldErrors)
  }
  // Duplicate key (e.g., email already exists)
  if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
    return fail("A record with that value already exists.", 409)
  }
  console.log("[v0] Unhandled API error:", error)
  return fail("Internal server error", 500)
}