import type { NextRequest } from "next/server"
import { isValidObjectId } from "mongoose"
import { connectToDatabase } from "@/lib/db/mongoose"
import { DocumentModel } from "@/lib/models/Document"
import { updateDocumentSchema } from "@/lib/api/validators"
import { serializeDocument } from "@/lib/api/serializers"
import { canView, canEdit, isOwner } from "@/lib/api/access"
import { requireAuth, success, fail, handleError } from "@/lib/api/helpers"

async function loadDocument(id: string) {
  if (!isValidObjectId(id)) return null
  return DocumentModel.findById(id)
    .populate("owner", "name email avatarColor")
    .populate("sharedWith.user", "name email avatarColor")
}

/**
 * GET /api/documents/:id - returns a single document if the user can view it.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    const { id } = await params
    await connectToDatabase()

    const doc = await loadDocument(id)
    if (!doc) return fail("Document not found", 404)
    if (!canView(doc, auth.userId)) return fail("You do not have access to this document", 403)

    return success({ document: serializeDocument(doc) })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/documents/:id - updates title/content/isStarred if the user can edit.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    const { id } = await params
    await connectToDatabase()

    const doc = await loadDocument(id)
    if (!doc) return fail("Document not found", 404)
    if (!canEdit(doc, auth.userId)) return fail("You do not have permission to edit this document", 403)

    const body = await req.json()
    const updates = updateDocumentSchema.parse(body)

    if (updates.title !== undefined) doc.title = updates.title
    if (updates.content !== undefined) doc.content = updates.content
    // Only the owner may toggle starred state on their copy
    if (updates.isStarred !== undefined && isOwner(doc, auth.userId)) {
      doc.isStarred = updates.isStarred
    }

    await doc.save()

    return success({ document: serializeDocument(doc) })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/documents/:id - only the owner may delete.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    const { id } = await params
    await connectToDatabase()

    const doc = await loadDocument(id)
    if (!doc) return fail("Document not found", 404)
    if (!isOwner(doc, auth.userId)) return fail("Only the owner can delete this document", 403)

    await doc.deleteOne()

    return success({ deleted: true, id })
  } catch (error) {
    return handleError(error)
  }
}
