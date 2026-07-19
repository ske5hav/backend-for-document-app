import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { User } from "@/lib/models/User"
import { registerSchema } from "@/lib/api/validators"
import { serializeUser } from "@/lib/api/serializers"
import { signToken } from "@/lib/auth/jwt"
import { success, handleError } from "@/lib/api/helpers"

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()
    const body = await req.json()
    // FIX: ab role, company, jobTitle, college, course bhi destructure
    // aur User.create() ko pass ho rahe hain — pehle ye silently drop ho
    // jaate the.
    const { name, email, password, role, company, jobTitle, college, course } = registerSchema.parse(body)

    const user = await User.create({
      name,
      email,
      password,
      role,
      company,
      jobTitle,
      college,
      course,
    })
    const token = signToken({ userId: user._id.toString(), email: user.email })

    return success({ token, user: serializeUser(user) }, 201)
  } catch (error) {
    return handleError(error)
  }
}