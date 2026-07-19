import mongoose, { Schema, type Model, type Document as MongooseDocument } from "mongoose"

export type SharePermission = "view" | "edit"

export interface ISharedWith {
  user: mongoose.Types.ObjectId
  permission: SharePermission
}

export interface IAttachment {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedAt: Date
}

export interface IDocument extends MongooseDocument {
  _id: mongoose.Types.ObjectId
  title: string
  content: string
  owner: mongoose.Types.ObjectId
  sharedWith: ISharedWith[]
  attachments: IAttachment[]
  isStarred: boolean
  createdAt: Date
  updatedAt: Date
}

const SharedWithSchema = new Schema<ISharedWith>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    permission: { type: String, enum: ["view", "edit"], default: "view" },
  },
  { _id: false },
)

const AttachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const DocumentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      default: "Untitled Document",
      maxlength: [200, "Title must be at most 200 characters"],
    },
    content: {
      type: String,
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sharedWith: {
      type: [SharedWithSchema],
      default: [],
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

// Text index to support search across title and content
DocumentSchema.index({ title: "text", content: "text" })

export const DocumentModel: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema)
