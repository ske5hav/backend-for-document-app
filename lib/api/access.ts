import type { IDocument } from "@/lib/models/Document"

/**
 * Safely extracts a string ID from a field that might be:
 * - a plain ObjectId (unpopulated) -> has .toString()
 * - a populated document/object -> has ._id
 * - a plain string already
 */
function idToString(value: any): string {
  if (!value) return ""
  if (typeof value === "object" && value._id) return value._id.toString()
  return value.toString()
}

/**
 * Returns true if the user is the owner of the document.
 * Works whether `doc.owner` is populated or not.
 */
export function isOwner(doc: IDocument, userId: string): boolean {
  return idToString(doc.owner) === userId
}

/**
 * Returns true if the user can view the document (owner or shared with any permission).
 */
export function canView(doc: IDocument, userId: string): boolean {
  if (isOwner(doc, userId)) return true
  return doc.sharedWith.some((s) => idToString(s.user) === userId)
}

/**
 * Returns true if the user can edit the document (owner or shared with edit permission).
 */
export function canEdit(doc: IDocument, userId: string): boolean {
  if (isOwner(doc, userId)) return true
  return doc.sharedWith.some((s) => idToString(s.user) === userId && s.permission === "edit")
}