/**
 * Seed script - creates demo users and documents.
 * Run with: pnpm seed
 * Requires MONGODB_URI in the environment.
 */
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import "dotenv/config";
import mongoose from "mongoose"
import { User } from "../lib/models/User"
import { DocumentModel } from "../lib/models/Document"

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.log("[v0] MONGODB_URI is not set. Add it before seeding.")
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log("[v0] Connected. Clearing existing demo data...")

  await User.deleteMany({ email: { $in: ["alice@example.com", "bob@example.com"] } })
  await DocumentModel.deleteMany({ title: { $regex: /^\[demo\]/i } })

  const alice = await User.create({
    name: "Alice Owner",
    email: "alice@example.com",
    password: "password123",
    avatarColor: "#6366f1",
  })

  const bob = await User.create({
    name: "Bob Collaborator",
    email: "bob@example.com",
    password: "password123",
    avatarColor: "#10b981",
  })

  await DocumentModel.create({
    title: "[demo] Product Roadmap",
    content: "<h1>Roadmap</h1><p>Q3 goals and milestones.</p>",
    owner: alice._id,
    isStarred: true,
    sharedWith: [{ user: bob._id, permission: "edit" }],
  })

  await DocumentModel.create({
    title: "[demo] Meeting Notes",
    content: "<p>Notes from the weekly sync.</p>",
    owner: alice._id,
    sharedWith: [{ user: bob._id, permission: "view" }],
  })

  await DocumentModel.create({
    title: "[demo] Bob's Private Draft",
    content: "<p>Only Bob can see this.</p>",
    owner: bob._id,
  })

  console.log("[v0] Seed complete.")
  console.log("[v0] Login with alice@example.com / password123 or bob@example.com / password123")
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.log("[v0] Seed failed:", err)
  process.exit(1)
})
