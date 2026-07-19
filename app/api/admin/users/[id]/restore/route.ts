import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { User } from "@/lib/models/User"
import { success, fail, handleError, requireAdmin } from "@/lib/api/helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(req)
    await connectToDatabase()

    // FIX: Next.js 15+/16 mein params ab Promise hai, isliye await zaroori hai
    const { id } = await params

    const user = await User.findById(id)
    if (!user || !user.deletedAt) {
      return fail("User not found or not deleted", 404)
    }

    const daysSinceDeletion = (Date.now() - user.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceDeletion > 30) {
      return fail("Recovery window (30 days) has expired", 410)
    }

    user.deletedAt = null
    await user.save()

    return success({ restoredId: id })
  } catch (error) {
    return handleError(error)
  }
}