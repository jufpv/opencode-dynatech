import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "../../shell/theme.ts"
import { renderHomePage } from "./ui-page.ts"

export function createHomeModule(): WebuiModule {
  return {
    id: "home",
    mountPath: "/",
    renderPage: () => renderHomePage(resolveUiTheme()),
  }
}
