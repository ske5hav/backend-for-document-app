"use client"

export interface ApiResult<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
  details?: unknown
}

const TOKEN_KEY = "docs_api_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  formData?: FormData
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, auth = true, formData } = opts
  const headers: Record<string, string> = {}

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let payload: BodyInit | undefined
  if (formData) {
    payload = formData
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body)
  }

  try {
    const res = await fetch(path, { method, headers, body: payload })
    const json = await res.json().catch(() => ({}))
    return {
      ok: res.ok && json.success !== false,
      status: res.status,
      data: json.data,
      error: json.error,
      details: json.details,
    }
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "Network error" }
  }
}
