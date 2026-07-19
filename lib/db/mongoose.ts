import mongoose from "mongoose"
console.log("MONGODB_URI =", process.env.MONGODB_URI)
const MONGODB_URI = process.env.MONGODB_URI

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and across serverless function invocations in production.
 * This prevents connections growing exponentially during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = global._mongooseCache || { conn: null, promise: null }

if (!global._mongooseCache) {
  global._mongooseCache = cached
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined. Add it in your project environment variables.")
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    cached.promise = null
    throw error
  }

  return cached.conn
}
