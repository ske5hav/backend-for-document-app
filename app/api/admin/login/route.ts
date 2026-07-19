import type { NextRequest } from "next/server"
import { signToken } from "@/lib/auth/jwt"
import { success, fail, handleError } from "@/lib/api/helpers"

// NEW: fixed admin credentials — set these in your project's environment
// variables (.env / hosting dashboard), never hardcode real values here:
//   ADMIN_EMAIL=you@yourapp.com
//   ADMIN_PASSWORD=a-strong-password
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body?.email === "string" ? body.email.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD environment variables are not set.")
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return fail("Invalid admin credentials", 401)
    }

    // NEW: admin token — same JWT system as normal users, but marked isAdmin: true
    const token = signToken({ userId: "admin", email: ADMIN_EMAIL, isAdmin: true })
    return success({ token })
  } catch (error) {
    return handleError(error)
  }
}