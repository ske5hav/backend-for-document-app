"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Star, Trash2, Share2, Upload, Save, Plus, Search, Paperclip } from "lucide-react"

export interface DocOwner {
  id: string
  name: string
  email: string
  avatarColor: string
}

export interface SharedEntry {
  user: DocOwner | string
  permission: "view" | "edit"
}

export interface DocAttachment {
  originalName: string
  size: number
  url: string
}

export interface DocItem {
  id: string
  title: string
  content: string
  isStarred: boolean
  owner: DocOwner | string
  sharedWith: SharedEntry[]
  attachments: DocAttachment[]
  updatedAt: string
}

interface DocumentsPanelProps {
  documents: DocItem[]
  selectedId: string | null
  currentUserId: string | null
  filter: string
  search: string
  busy: boolean
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
  onSelect: (id: string) => void
  onCreate: () => void
  onSave: (id: string, title: string, content: string) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string, next: boolean) => void
  onShare: (id: string, email: string, permission: "view" | "edit") => void
  onUpload: (id: string, file: File) => void
}

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

function ownerLabel(owner: DocOwner | string, currentUserId: string | null) {
  if (typeof owner === "string") return owner === currentUserId ? "You" : "Someone"
  return owner.id === currentUserId ? "You" : owner.name
}

export function DocumentsPanel(props: DocumentsPanelProps) {
  const {
    documents,
    selectedId,
    currentUserId,
    filter,
    search,
    busy,
    onFilterChange,
    onSearchChange,
    onSelect,
    onCreate,
    onSave,
    onDelete,
    onToggleStar,
    onShare,
    onUpload,
  } = props

  const selected = documents.find((d) => d.id === selectedId) || null
  const [draftTitle, setDraftTitle] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [shareEmail, setShareEmail] = useState("bob@example.com")
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view")
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // Sync local draft when the selected document changes
  if (selected && selected.id !== loadedId) {
    setDraftTitle(selected.title)
    setDraftContent(selected.content)
    setLoadedId(selected.id)
  }
  if (!selected && loadedId !== null) {
    setLoadedId(null)
  }

  const isOwner =
    selected &&
    (typeof selected.owner === "string" ? selected.owner === currentUserId : selected.owner.id === currentUserId)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* List */}
      <section aria-label="Documents" className="flex flex-col rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-card-foreground">Documents</h2>
          <Button size="sm" onClick={onCreate} disabled={busy}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            New
          </Button>
        </header>

        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              className={`${field} pl-8`}
              placeholder="Search documents..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search documents"
            />
          </div>
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {["all", "owned", "shared", "starred"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                  filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <ul className="flex-1 overflow-auto p-2">
          {documents.length === 0 ? (
            <li className="px-2 py-8 text-center text-sm text-muted-foreground">No documents yet.</li>
          ) : (
            documents.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left transition-colors ${
                    doc.id === selectedId ? "bg-accent" : "hover:bg-muted"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ownerLabel(doc.owner, currentUserId)}
                      {doc.attachments.length > 0 && ` · ${doc.attachments.length} file(s)`}
                    </p>
                  </div>
                  {doc.isStarred && <Star className="h-3.5 w-3.5 fill-foreground text-foreground" aria-label="Starred" />}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Editor / detail */}
      <section aria-label="Document detail" className="flex flex-col rounded-lg border border-border bg-card">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Select a document to view and edit it.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <input
                className={`${field} font-medium`}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                aria-label="Document title"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => onToggleStar(selected.id, !selected.isStarred)}
                disabled={busy || !isOwner}
                aria-label={selected.isStarred ? "Unstar" : "Star"}
                title={isOwner ? "Toggle star" : "Only the owner can star"}
              >
                <Star className={`h-4 w-4 ${selected.isStarred ? "fill-foreground" : ""}`} aria-hidden="true" />
              </Button>
            </div>

            <textarea
              className={`${field} min-h-40 resize-y font-mono`}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              aria-label="Document content"
              placeholder="Document content (HTML or plain text)..."
            />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onSave(selected.id, draftTitle, draftContent)} disabled={busy}>
                <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(selected.id)}
                disabled={busy || !isOwner}
                title={isOwner ? "Delete document" : "Only the owner can delete"}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onUpload(selected.id, file)
                    e.target.value = ""
                  }}
                />
                <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted">
                  <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Upload file
                </span>
              </label>
            </div>

            {/* Attachments */}
            {selected.attachments.length > 0 && (
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Attachments</p>
                <ul className="flex flex-col gap-1.5">
                  {selected.attachments.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <a href={a.url} target="_blank" rel="noreferrer" className="truncate text-foreground underline">
                        {a.originalName}
                      </a>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {(a.size / 1024).toFixed(1)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Share */}
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs font-medium text-muted-foreground">Sharing</p>
              </div>
              {selected.sharedWith.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {selected.sharedWith.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="truncate text-foreground">
                        {typeof s.user === "string" ? s.user : s.user.email}
                      </span>
                      <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {s.permission}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {isOwner ? (
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault()
                    onShare(selected.id, shareEmail, sharePermission)
                  }}
                >
                  <input
                    type="email"
                    className={field}
                    placeholder="user@example.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    aria-label="Share with email"
                    required
                  />
                  <select
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as "view" | "edit")}
                    aria-label="Permission"
                  >
                    <option value="view">view</option>
                    <option value="edit">edit</option>
                  </select>
                  <Button type="submit" size="sm" disabled={busy}>
                    Share
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground">Only the owner can manage sharing.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
