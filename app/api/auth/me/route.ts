import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { User } from "@/lib/models/User"
import { requireAuth, success, fail, handleError } from "@/lib/api/helpers"

function serializeUser(u: any) {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
    role: u.role,
    company: u.company,
    jobTitle: u.jobTitle,
    college: u.college,
    course: u.course,
  }
}

/**
 * GET /api/auth/me - returns the logged-in user's profile.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    await connectToDatabase()

    const user = await User.findById(auth.userId)
    if (!user) return fail("User not found", 404)

    return success({ user: serializeUser(user) })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/auth/me - updates profile fields (name, role, company, jobTitle,
 * college, course), OR changes the password when currentPassword/newPassword
 * are supplied instead.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    await connectToDatabase()

    const body = await req.json()

    // Password-change branch: requires the current password to be selected
    // explicitly since it's excluded from queries by default (select: false).
    if (body.currentPassword && body.newPassword) {
      const user = await User.findById(auth.userId).select("+password")
      if (!user) return fail("User not found", 404)

      const matches = await user.comparePassword(body.currentPassword)
      if (!matches) return fail("Current password is incorrect", 400)

      if (typeof body.newPassword !== "string" || body.newPassword.length < 6) {
        return fail("New password must be at least 6 characters", 400)
      }

      user.password = body.newPassword // pre-save hook re-hashes it
      await user.save()

      return success({ updated: true })
    }

    // Profile-update branch
    const user = await User.findById(auth.userId)
    if (!user) return fail("User not found", 404)

    if (body.name !== undefined) user.name = body.name
    if (body.role !== undefined) user.role = body.role
    if (body.company !== undefined) user.company = body.company
    if (body.jobTitle !== undefined) user.jobTitle = body.jobTitle
    if (body.college !== undefined) user.college = body.college
    if (body.course !== undefined) user.course = body.course

    await user.save()

    return success({ user: serializeUser(user) })
  } catch (error) {
    return handleError(error)
  }
}