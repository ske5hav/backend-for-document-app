import mongoose, { Schema, type Model, type Document } from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  password: string
  avatarColor: string
  // FIX: naye optional fields — role-based basic details.
  role?: "employee" | "student"
  company?: string
  jobTitle?: string
  college?: string
  course?: string
  // FIX: soft delete field — account delete hone par yahan timestamp set hota hai,
  // 30 din tak restore ho sakta hai.
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name must be at most 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    avatarColor: {
      type: String,
      default: "#6366f1",
    },
    // FIX: naye fields — register form se aane wali role-based details.
    role: {
      type: String,
      enum: ["employee", "student"],
    },
    company: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    college: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    course: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    // FIX: soft delete — account delete hone par set hota hai, restore hone par null.
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

// Hash password before saving (async hook: no next callback needed)
UserSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)