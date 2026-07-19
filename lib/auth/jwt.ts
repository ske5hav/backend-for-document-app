import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = "7d"

export interface TokenPayload {
  userId: string
  email: string
  // NEW: admin token mein ye true hoga, normal user token mein absent/undefined
  isAdmin?: boolean
}

export function signToken(payload: TokenPayload): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined. Add it in your project environment variables.")
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): TokenPayload {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined. Add it in your project environment variables.")
  }
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}