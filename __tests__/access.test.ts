import { isOwner, canView, canEdit } from "@/lib/api/access"
import type { IDocument } from "@/lib/models/Document"

// Minimal stand-in objects that satisfy the fields the access helpers touch.
function makeDoc(ownerId: string, shared: { userId: string; permission: "view" | "edit" }[] = []) {
  return {
    owner: { toString: () => ownerId },
    sharedWith: shared.map((s) => ({
      user: { toString: () => s.userId },
      permission: s.permission,
    })),
  } as unknown as IDocument
}

const OWNER = "owner123"
const VIEWER = "viewer456"
const EDITOR = "editor789"
const STRANGER = "stranger000"

describe("access control helpers", () => {
  const doc = makeDoc(OWNER, [
    { userId: VIEWER, permission: "view" },
    { userId: EDITOR, permission: "edit" },
  ])

  describe("isOwner", () => {
    it("returns true for the owner", () => {
      expect(isOwner(doc, OWNER)).toBe(true)
    })
    it("returns false for non-owners", () => {
      expect(isOwner(doc, VIEWER)).toBe(false)
      expect(isOwner(doc, STRANGER)).toBe(false)
    })
  })

  describe("canView", () => {
    it("allows the owner", () => {
      expect(canView(doc, OWNER)).toBe(true)
    })
    it("allows shared viewers and editors", () => {
      expect(canView(doc, VIEWER)).toBe(true)
      expect(canView(doc, EDITOR)).toBe(true)
    })
    it("denies strangers", () => {
      expect(canView(doc, STRANGER)).toBe(false)
    })
  })

  describe("canEdit", () => {
    it("allows the owner", () => {
      expect(canEdit(doc, OWNER)).toBe(true)
    })
    it("allows only editors among shared users", () => {
      expect(canEdit(doc, EDITOR)).toBe(true)
      expect(canEdit(doc, VIEWER)).toBe(false)
    })
    it("denies strangers", () => {
      expect(canEdit(doc, STRANGER)).toBe(false)
    })
  })
})
