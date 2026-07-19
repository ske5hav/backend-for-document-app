import { z } from "zod"

// FIX: registerSchema mein ab role aur uski details bhi hain. "role" ke
// hisaab se employee/student ki fields required hain (refine se check).
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: z.string().trim().toLowerCase().email("Please provide a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["employee", "student"]).optional(),
    company: z.string().trim().max(120).optional(),
    jobTitle: z.string().trim().max(120).optional(),
    college: z.string().trim().max(120).optional(),
    course: z.string().trim().max(120).optional(),
  })
  .refine(
    (data) => {
      if (data.role === "employee") return !!data.company && !!data.jobTitle
      if (data.role === "student") return !!data.college && !!data.course
      return true // role optional hai — agar diya hi nahi, to skip
    },
    {
      message: "Please fill in all required details for your role",
      path: ["role"],
    },
  )

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
})

export const createDocumentSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().optional(),
})

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    content: z.string().optional(),
    isStarred: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

export const shareDocumentSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email"),
  permission: z.enum(["view", "edit"]).default("view"),
})

export const unshareDocumentSchema = z.object({
  userId: z.string().min(1, "userId is required"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>