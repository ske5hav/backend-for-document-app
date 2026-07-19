import type { NextRequest } from "next/server"
import { isValidObjectId } from "mongoose"
import { randomUUID } from "crypto"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { connectToDatabase } from "@/lib/db/mongoose"
import { DocumentModel } from "@/lib/models/Document"
import { serializeDocument } from "@/lib/api/serializers"
import { canEdit } from "@/lib/api/access"
import { requireAuth, success, fail, handleError } from "@/lib/api/helpers"

// Multer-style constraints
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")

/**
 * POST /api/documents/:id/upload
 * Accepts a multipart/form-data body with a "file" field and attaches it to the document.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    const { id } = await params
    await connectToDatabase()

    if (!isValidObjectId(id)) return fail("Document not found", 404)
    const doc = await DocumentModel.findById(id)
    if (!doc) return fail("Document not found", 404)
    if (!canEdit(doc, auth.userId)) return fail("You do not have permission to upload to this document", 403)

    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return fail("No file provided under the 'file' field", 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("File exceeds the 5MB size limit", 413)
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail(`Unsupported file type: ${file.type}`, 415)
    }

    const ext = path.extname(file.name) || ""
    const filename = `${randomUUID()}${ext}`

    await mkdir(UPLOAD_DIR, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(UPLOAD_DIR, filename), buffer)

    const attachment = {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/${filename}`,
      uploadedAt: new Date(),
    }

    doc.attachments.push(attachment)
    await doc.save()
    await doc.populate("owner", "name email avatarColor")
    await doc.populate("sharedWith.user", "name email avatarColor")

    return success({ document: serializeDocument(doc), attachment }, 201)
  } catch (error) {
    return handleError(error)
  }
}
