import type { WebuiModule } from "../../module.ts"
import { renderEntityPage } from "../../shell/entity-page.ts"
import { resolveUiTheme } from "../../shell/theme.ts"

export function createMcpsModule(): WebuiModule {
  return {
    id: "mcps",
    mountPath: "/mcps",
    renderPage: () => renderEntityPage("mcps", resolveUiTheme()),
  }
}
