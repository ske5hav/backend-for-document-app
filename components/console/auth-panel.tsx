"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, User as UserIcon } from "lucide-react"

interface AuthUser {
  id: string
  name: string
  email: string
  avatarColor: string
}

interface AuthPanelProps {
  user: AuthUser | null
  onRegister: (name: string, email: string, password: string) => void
  onLogin: (email: string, password: string) => void
  onLogout: () => void
  busy: boolean
}

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
const label = "mb-1 block text-xs font-medium text-muted-foreground"

export function AuthPanel({ user, onRegister, onLogin, onLogout, busy }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("alice@example.com")
  const [password, setPassword] = useState("password123")

  if (user) {
    return (
      <section aria-label="Authenticated user" className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
            style={{ backgroundColor: user.avatarColor }}
            aria-hidden="true"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-card-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={onLogout} disabled={busy}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Authentication" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-card-foreground">Authentication</h2>
      </div>

      <div className="mb-4 flex gap-1 rounded-md bg-muted p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (mode === "register") onRegister(name, email, password)
          else onLogin(email, password)
        }}
      >
        {mode === "register" && (
          <div>
            <label htmlFor="auth-name" className={label}>
              Name
            </label>
            <input
              id="auth-name"
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className={label}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="auth-password" className={label}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="mt-1">
          {mode === "register" ? "Create account" : "Sign in"}
        </Button>
      </form>
    </section>
  )
}
