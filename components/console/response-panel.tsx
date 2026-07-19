"use client"

import type { ApiResult } from "@/lib/client/api"

export interface LogEntry {
  id: string
  method: string
  path: string
  result: ApiResult
  at: string
}

function statusColor(status: number) {
  if (status === 0) return "text-destructive"
  if (status >= 200 && status < 300) return "text-foreground"
  if (status >= 400) return "text-destructive"
  return "text-muted-foreground"
}

export function ResponsePanel({ log }: { log: LogEntry[] }) {
  return (
    <section aria-label="API response log" className="flex h-full flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-card-foreground">Response Log</h2>
        <span className="text-xs text-muted-foreground">{log.length} request(s)</span>
      </header>
      <div className="flex-1 overflow-auto p-3">
        {log.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">
            Responses from your API calls will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {log.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border bg-background">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                    {entry.method}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{entry.path}</span>
                  <span className={`ml-auto font-mono text-xs font-semibold ${statusColor(entry.result.status)}`}>
                    {entry.result.status || "ERR"}
                  </span>
                </div>
                <pre className="max-h-52 overflow-auto p-3 font-mono text-xs leading-relaxed text-foreground">
                  {JSON.stringify(entry.result.data ?? entry.result.error ?? entry.result.details ?? {}, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
