import type { NextRequest } from "next/server"
import { isValidObjectId } from "mongoose"
import { connectToDatabase } from "@/lib/db/mongoose"
import { DocumentModel } from "@/lib/models/Document"
import { User } from "@/lib/models/User"
import { shareDocumentSchema, unshareDocumentSchema } from "@/lib/api/validators"
import { serializeDocument } from "@/lib/api/serializers"
import { isOwner } from "@/lib/api/access"
import { requireAuth, success, fail, handleError } from "@/lib/api/helpers"

/**
 * POST /api/documents/:id/share
 * Owner shares the document with another user by email.
 * If already shared, updates the permission.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    const { id } = await params
    await connectToDatabase()

    if (!isValidObjectId(id)) return fail("Document not found", 404)
    const doc = await DocumentModel.findById(id)
    if (!doc) return fail("Document not found", 404)
    if (!isOwner(doc, auth.userId)) return fail("Only the owner can share this document", 403)

    const body = await req.json()
    const { email, permission } = shareDocumentSchema.parse(body)

    const target = await User.findOne({ email })
    if (!target) return fail("No user found with that email", 404)
    if (target._id.toString() === auth.userId) {
      return fail("You cannot share a document with yourself", 400)
    }

    const existing = doc.sharedWith.find((s) => s.user.toString() === target._id.toString())
    if (existing) {
      existing.permission = permission
    } else {
      doc.sharedWith.push({ user: target._id, permission })
    }

    await doc.save()
    await doc.populate("owner", "name email avatarColor")
    await doc.populate("sharedWith.user", "name email avatarColor")

    return success({ document: serializeDocument(doc) })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/documents/:id/share
 * Owner revokes a user's access. Expects { userId } in the body.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    const { id } = await params
    await connectToDatabase()

    if (!isValidObjectId(id)) return fail("Document not found", 404)
    const doc = await DocumentModel.findById(id)
    if (!doc) return fail("Document not found", 404)
    if (!isOwner(doc, auth.userId)) return fail("Only the owner can modify sharing", 403)

    const body = await req.json()
    const { userId } = unshareDocumentSchema.parse(body)

    doc.sharedWith = doc.sharedWith.filter((s) => s.user.toString() !== userId)
    await doc.save()
    await doc.populate("owner", "name email avatarColor")
    await doc.populate("sharedWith.user", "name email avatarColor")

    return success({ document: serializeDocument(doc) })
  } catch (error) {
    return handleError(error)
  }
}
