import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongoose"
import { DocumentModel } from "@/lib/models/Document"
import { createDocumentSchema } from "@/lib/api/validators"
import { serializeDocument } from "@/lib/api/serializers"
import { requireAuth, success, handleError } from "@/lib/api/helpers"

/**
 * GET /api/documents
 * Lists documents the user owns or that are shared with them.
 * Optional query params:
 *   - search: full-text search across title & content
 *   - filter: "owned" | "shared" | "starred"
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim()
    const filter = searchParams.get("filter")

    const accessClause = {
      $or: [{ owner: auth.userId }, { "sharedWith.user": auth.userId }],
    }

    const conditions: Record<string, unknown>[] = [accessClause]

    if (filter === "owned") {
      conditions.push({ owner: auth.userId })
    } else if (filter === "shared") {
      conditions.push({ "sharedWith.user": auth.userId })
    } else if (filter === "starred") {
      conditions.push({ isStarred: true })
    }

    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ],
      })
    }

    const query = conditions.length > 1 ? { $and: conditions } : accessClause

    const docs = await DocumentModel.find(query)
      .populate("owner", "name email avatarColor")
      .populate("sharedWith.user", "name email avatarColor")
      .sort({ updatedAt: -1 })

    return success({ documents: docs.map(serializeDocument) })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/documents
 * Creates a new document owned by the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    await connectToDatabase()

    const body = await req.json().catch(() => ({}))
    const { title, content } = createDocumentSchema.parse(body)

    const doc = await DocumentModel.create({
      title: title || "Untitled Document",
      content: content || "",
      owner: auth.userId,
    })

    await doc.populate("owner", "name email avatarColor")

    return success({ document: serializeDocument(doc) }, 201)
  } catch (error) {
    return handleError(error)
  }
}
