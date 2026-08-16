import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "../../shell/theme.ts"
import { renderToolsWorkspacePage, resolveCronTimezone } from "../../shell/tools-workspace.ts"

export function createHomeModule(cronApiUrl: string): WebuiModule {
  return {
    id: "home",
    mountPath: "/",
    renderPage: async () => {
      const timezone = await resolveCronTimezone(cronApiUrl)
      return renderToolsWorkspacePage("home", resolveUiTheme(), timezone)
    },
  }
}
