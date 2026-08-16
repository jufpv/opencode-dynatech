import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "../../shell/theme.ts"
import { renderToolsWorkspacePage, resolveCronTimezone } from "../../shell/tools-workspace.ts"

export function createDocumentsModule(cronApiUrl: string): WebuiModule {
  return {
    id: "documents",
    mountPath: "/documents",
    renderPage: async () => {
      const timezone = await resolveCronTimezone(cronApiUrl)
      return renderToolsWorkspacePage("documents", resolveUiTheme(), timezone)
    },
  }
}
