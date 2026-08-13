import type { WebuiModule } from "../../module.ts"
import { renderDocumentsPage } from "./ui-page.ts"
import { resolveUiTheme } from "../../shell/theme.ts"

export function createDocumentsModule(): WebuiModule {
  return {
    id: "documents",
    mountPath: "/documents",
    renderPage: () => renderDocumentsPage(resolveUiTheme()),
  }
}
