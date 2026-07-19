import {
  registerSchema,
  loginSchema,
  createDocumentSchema,
  updateDocumentSchema,
  shareDocumentSchema,
} from "@/lib/api/validators"

describe("registerSchema", () => {
  it("accepts valid input and lowercases the email", () => {
    const result = registerSchema.parse({
      name: "Jane Doe",
      email: "JANE@Example.com",
      password: "secret1",
    })
    expect(result.email).toBe("jane@example.com")
  })

  it("rejects a short password", () => {
    expect(() => registerSchema.parse({ name: "Jane", email: "j@x.com", password: "123" })).toThrow()
  })

  it("rejects an invalid email", () => {
    expect(() => registerSchema.parse({ name: "Jane", email: "not-an-email", password: "secret1" })).toThrow()
  })
})

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    expect(() => loginSchema.parse({ email: "j@x.com", password: "" })).toThrow()
  })
})

describe("createDocumentSchema", () => {
  it("allows an empty object (defaults applied later)", () => {
    expect(() => createDocumentSchema.parse({})).not.toThrow()
  })
})

describe("updateDocumentSchema", () => {
  it("rejects an empty update", () => {
    expect(() => updateDocumentSchema.parse({})).toThrow()
  })
  it("accepts a partial update", () => {
    expect(updateDocumentSchema.parse({ isStarred: true })).toEqual({ isStarred: true })
  })
})

describe("shareDocumentSchema", () => {
  it("defaults permission to view", () => {
    const result = shareDocumentSchema.parse({ email: "user@x.com" })
    expect(result.permission).toBe("view")
  })
  it("rejects an invalid permission", () => {
    expect(() => shareDocumentSchema.parse({ email: "user@x.com", permission: "admin" })).toThrow()
  })
})
