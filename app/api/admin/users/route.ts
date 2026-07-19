import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { User } from "@/lib/models/User"
import { success, fail, handleError, requireAdmin } from "@/lib/api/helpers"

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req)
    await connectToDatabase()

    const rawUsers = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean()

    // FIX: MongoDB har document ko "_id" deta hai, "id" nahi.
    // Frontend "id" field expect karta hai (delete/restore buttons isi
    // se URL banate hain) — isliye yahan _id ko id mein convert kar rahe hain.
    const users = rawUsers.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || null,
      company: u.company || null,
      jobTitle: u.jobTitle || null,
      college: u.college || null,
      course: u.course || null,
      createdAt: u.createdAt,
      deletedAt: u.deletedAt || null,
    }))

    return success({ users })
  } catch (error) {
    return handleError(error)
  }
}