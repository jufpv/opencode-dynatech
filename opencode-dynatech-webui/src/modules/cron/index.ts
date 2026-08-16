import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "./theme.ts"
import { renderToolsWorkspacePage, resolveCronTimezone } from "../../shell/tools-workspace.ts"

export function createCronModule(
  cronApiUrl: string,
  timezoneFallback = "Europe/Paris",
): WebuiModule {
  return {
    id: "cron",
    mountPath: "/cron",
    renderPage: async () => {
      const timezone = await resolveCronTimezone(cronApiUrl, timezoneFallback)
      return renderToolsWorkspacePage("cron", resolveUiTheme(), timezone)
    },
  }
}
