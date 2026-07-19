import { AlertTriangle } from "lucide-react"

export function EnvNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground">Environment setup</p>
        <p>
          {
            "This console calls a live backend. Set MONGODB_URI and JWT_SECRET in Project Settings, then run the seed script (pnpm seed) to create demo accounts."
          }
        </p>
      </div>
    </div>
  )
}
