import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "../../shell/theme.ts"
import { renderToolsWorkspacePage, resolveCronTimezone } from "../../shell/tools-workspace.ts"

export function createChatModule(cronApiUrl: string): WebuiModule {
  return {
    id: "chat",
    mountPath: "/chat",
    renderPage: async () => {
      const timezone = await resolveCronTimezone(cronApiUrl)
      return renderToolsWorkspacePage("chat", resolveUiTheme(), timezone)
    },
  }
}
