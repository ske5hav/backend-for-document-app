"use client"

import { useCallback, useEffect, useState } from "react"
import { apiRequest, getToken, setToken } from "@/lib/client/api"
import { AuthPanel } from "@/components/console/auth-panel"
import { DocumentsPanel, type DocItem } from "@/components/console/documents-panel"
import { ResponsePanel, type LogEntry } from "@/components/console/response-panel"
import { EnvNotice } from "@/components/console/env-notice"
import { FileText } from "lucide-react"

interface AuthUser {
  id: string
  name: string
  email: string
  avatarColor: string
}

export default function Page() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])

  const pushLog = useCallback((method: string, path: string, result: LogEntry["result"]) => {
    setLog((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          method,
          path,
          result,
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 25),
    )
  }, [])

  const loadDocuments = useCallback(
    async (nextFilter = filter, nextSearch = search) => {
      const params = new URLSearchParams()
      if (nextFilter && nextFilter !== "all") params.set("filter", nextFilter)
      if (nextSearch.trim()) params.set("search", nextSearch.trim())
      const path = `/api/documents${params.toString() ? `?${params.toString()}` : ""}`
      const result = await apiRequest<{ documents: DocItem[] }>(path)
      pushLog("GET", path, result)
      if (result.ok && result.data) setDocuments(result.data.documents)
    },
    [filter, search, pushLog],
  )

  // Restore session on mount
  useEffect(() => {
    const token = getToken()
    if (!token) return
    ;(async () => {
      const result = await apiRequest<{ user: AuthUser }>("/api/auth/me")
      pushLog("GET", "/api/auth/me", result)
      if (result.ok && result.data) {
        setUser(result.data.user)
        loadDocuments()
      } else {
        setToken(null)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRegister = async (name: string, email: string, password: string) => {
    setBusy(true)
    const result = await apiRequest<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    })
    pushLog("POST", "/api/auth/register", result)
    if (result.ok && result.data) {
      setToken(result.data.token)
      setUser(result.data.user)
      loadDocuments()
      window.location.href = "http://localhost:3001/?token=" + result.data.token
      return
    }
    setBusy(false)
  }

  const handleLogin = async (email: string, password: string) => {
    setBusy(true)
    const result = await apiRequest<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    })
    pushLog("POST", "/api/auth/login", result)
    if (result.ok && result.data) {
      setToken(result.data.token)
      setUser(result.data.user)
      loadDocuments()
      window.location.href = "http://localhost:3001/?token=" + result.data.token
    }
    setBusy(false)
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    setDocuments([])
    setSelectedId(null)
  }

  const handleSelect = async (id: string) => {
    setSelectedId(id)
    const result = await apiRequest<{ document: DocItem }>(`/api/documents/${id}`)
    pushLog("GET", `/api/documents/${id}`, result)
    if (result.ok && result.data) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? result.data!.document : d)))
    }
  }

  const handleCreate = async () => {
    setBusy(true)
    const result = await apiRequest<{ document: DocItem }>("/api/documents", {
      method: "POST",
      body: { title: "Untitled Document", content: "" },
    })
    pushLog("POST", "/api/documents", result)
    if (result.ok && result.data) {
      await loadDocuments()
      setSelectedId(result.data.document.id)
    }
    setBusy(false)
  }

  const handleSave = async (id: string, title: string, content: string) => {
    setBusy(true)
    const result = await apiRequest<{ document: DocItem }>(`/api/documents/${id}`, {
      method: "PATCH",
      body: { title, content },
    })
    pushLog("PATCH", `/api/documents/${id}`, result)
    if (result.ok && result.data) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? result.data!.document : d)))
    }
    setBusy(false)
  }

  const handleDelete = async (id: string) => {
    setBusy(true)
    const result = await apiRequest(`/api/documents/${id}`, { method: "DELETE" })
    pushLog("DELETE", `/api/documents/${id}`, result)
    if (result.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      if (selectedId === id) setSelectedId(null)
    }
    setBusy(false)
  }

  const handleToggleStar = async (id: string, next: boolean) => {
    setBusy(true)
    const result = await apiRequest<{ document: DocItem }>(`/api/documents/${id}`, {
      method: "PATCH",
      body: { isStarred: next },
    })
    pushLog("PATCH", `/api/documents/${id}`, result)
    if (result.ok && result.data) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? result.data!.document : d)))
    }
    setBusy(false)
  }

  const handleShare = async (id: string, email: string, permission: "view" | "edit") => {
    setBusy(true)
    const result = await apiRequest<{ document: DocItem }>(`/api/documents/${id}/share`, {
      method: "POST",
      body: { email, permission },
    })
    pushLog("POST", `/api/documents/${id}/share`, result)
    if (result.ok && result.data) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? result.data!.document : d)))
    }
    setBusy(false)
  }

  const handleUpload = async (id: string, file: File) => {
    setBusy(true)
    const formData = new FormData()
    formData.append("file", file)
    const result = await apiRequest<{ document: DocItem }>(`/api/documents/${id}/upload`, {
      method: "POST",
      formData,
    })
    pushLog("POST", `/api/documents/${id}/upload`, result)
    if (result.ok && result.data) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? result.data!.document : d)))
    }
    setBusy(false)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-foreground">DocsAPI Console</h1>
          <p className="text-sm text-muted-foreground">Test client for the document management REST API</p>
        </div>
      </header>

      <EnvNotice />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <AuthPanel
            user={user}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onLogout={handleLogout}
            busy={busy}
          />
          <div className="hidden lg:block lg:h-[420px]">
            <ResponsePanel log={log} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {user ? (
            <DocumentsPanel
              documents={documents}
              selectedId={selectedId}
              currentUserId={user.id}
              filter={filter}
              search={search}
              busy={busy}
              onFilterChange={(f) => {
                setFilter(f)
                loadDocuments(f, search)
              }}
              onSearchChange={(s) => {
                setSearch(s)
                loadDocuments(filter, s)
              }}
              onSelect={handleSelect}
              onCreate={handleCreate}
              onSave={handleSave}
              onDelete={handleDelete}
              onToggleStar={handleToggleStar}
              onShare={handleShare}
              onUpload={handleUpload}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
              <p className="text-sm text-muted-foreground">Sign in to load and manage documents.</p>
            </div>
          )}
          <div className="lg:hidden">
            <ResponsePanel log={log} />
          </div>
        </div>
      </div>
    </main>
  )
}
