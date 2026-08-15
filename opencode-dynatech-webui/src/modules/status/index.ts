import type { WebuiModule } from "../../module.ts"
import { resolveUiTheme } from "../../shell/theme.ts"
import { renderStatusPage } from "./ui-page.ts"

export function createStatusModule(): WebuiModule {
  return {
    id: "status",
    mountPath: "/status",
    renderPage: () => renderStatusPage(resolveUiTheme()),
  }
}
