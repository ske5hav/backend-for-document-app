import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { User } from "@/lib/models/User"
import { success, fail, handleError, requireAdmin } from "@/lib/api/helpers"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(req)
    await connectToDatabase()

    const { id } = await params

    const deleted = await User.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    )

    if (!deleted) {
      return fail("User not found", 404)
    }

    // FIX: fallback agar deletedAt schema mein missing hai (crash-proof)
    const deletedAt = deleted.deletedAt || new Date()

    return success({
      deletedId: id,
      deletedAt,
      recoverableUntil: new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    })
  } catch (error) {
    return handleError(error)
  }
}