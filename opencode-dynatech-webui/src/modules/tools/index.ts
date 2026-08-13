import type { WebuiModule } from "../../module.ts"
import { renderEntityPage } from "../../shell/entity-page.ts"
import { resolveUiTheme } from "../../shell/theme.ts"

export function createToolsModule(): WebuiModule {
  return {
    id: "tools",
    mountPath: "/tools",
    renderPage: () => renderEntityPage("tools", resolveUiTheme()),
  }
}
