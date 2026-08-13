import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "./theme.ts"
import { renderUiPage } from "./ui-page.ts"

export function createCronModule(
  cronApiUrl: string,
  timezoneFallback = "Europe/Paris",
): WebuiModule {
  return {
    id: "cron",
    mountPath: "/cron",
    renderPage: async () => {
      let timezone = timezoneFallback
      try {
        const res = await fetch(`${cronApiUrl.replace(/\/$/, "")}/api/tasks`)
        if (res.ok) {
          const data = (await res.json()) as { timezone?: string }
          if (typeof data.timezone === "string" && data.timezone.trim()) {
            timezone = data.timezone.trim()
          }
        }
      } catch {
        // Cron API offline: still render the page; fetches will fail clearly.
      }
      return renderUiPage(timezone, resolveUiTheme())
    },
  }
}
