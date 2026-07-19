import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { User } from "@/lib/models/User"
import { loginSchema } from "@/lib/api/validators"
import { serializeUser } from "@/lib/api/serializers"
import { signToken } from "@/lib/auth/jwt"
import { success, fail, handleError } from "@/lib/api/helpers"

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    // password is select:false, so explicitly request it
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return fail("Invalid email or password", 401)
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return fail("Invalid email or password", 401)
    }

    const token = signToken({ userId: user._id.toString(), email: user.email })
    return success({ token, user: serializeUser(user) })
  } catch (error) {
    return handleError(error)
  }
}
