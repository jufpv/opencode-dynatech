import type { WebuiModule } from "../../module.ts"
import { renderChatPage } from "./ui-page.ts"
import { resolveUiTheme } from "../../shell/theme.ts"

export function createChatModule(): WebuiModule {
  return {
    id: "chat",
    mountPath: "/chat",
    renderPage: () => renderChatPage(resolveUiTheme()),
  }
}
