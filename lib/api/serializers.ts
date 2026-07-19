import type { IUser } from "@/lib/models/User"
import type { IDocument } from "@/lib/models/Document"

export function serializeUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt,
  }
}

export function serializeDocument(doc: IDocument) {
  const owner = doc.owner as unknown
  const ownerIsPopulated = owner && typeof owner === "object" && "email" in (owner as object)

  return {
    id: doc._id.toString(),
    title: doc.title,
    content: doc.content,
    isStarred: doc.isStarred,
    owner: ownerIsPopulated ? serializeUser(owner as IUser) : doc.owner.toString(),
    sharedWith: doc.sharedWith.map((s) => {
      const u = s.user as unknown
      const populated = u && typeof u === "object" && "email" in (u as object)
      return {
        user: populated ? serializeUser(u as IUser) : s.user.toString(),
        permission: s.permission,
      }
    }),
    attachments: doc.attachments.map((a) => ({
      filename: a.filename,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
      url: a.url,
      uploadedAt: a.uploadedAt,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
