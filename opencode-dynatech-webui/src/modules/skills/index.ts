import type { WebuiModule } from "../../module.ts"
import { renderEntityPage } from "../../shell/entity-page.ts"
import { resolveUiTheme } from "../../shell/theme.ts"

export function createSkillsModule(): WebuiModule {
  return {
    id: "skills",
    mountPath: "/skills",
    renderPage: () => renderEntityPage("skills", resolveUiTheme()),
  }
}
