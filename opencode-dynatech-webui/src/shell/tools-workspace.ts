import {
  CHAT_PAGE_CSS,
  CHAT_PAGE_JS,
  renderChatInnerHtml,
} from "../modules/chat/ui-page.ts"
import {
  CRON_PAGE_CSS,
  CRON_PAGE_JS,
  renderCronInnerHtml,
} from "../modules/cron/ui-page.ts"
import {
  DOCS_PAGE_CSS,
  DOCS_PAGE_JS,
  renderDocumentsInnerHtml,
} from "../modules/documents/ui-page.ts"
import {
  HOME_PAGE_CSS,
  HOME_PAGE_JS,
  WORKSPACE_BASE_CSS,
  renderHomeInnerHtml,
} from "../modules/home/ui-page.ts"
import type { UiTheme } from "./theme.ts"
import { themeColorScheme } from "./theme.ts"
import { NAV_CSS, renderShell, toolTitle, type ToolRailId } from "./nav.ts"

/** Single document with all 4 rail tools for fluid horizontal swipe. */
export function renderToolsWorkspacePage(
  activeRail: ToolRailId,
  theme: UiTheme,
  cronTimezone = "Europe/Paris",
): string {
  const colorScheme = themeColorScheme(theme.mode)
  const fontOverrides = `:root{--font:${theme.sans};--mono:${theme.mono};--font-size:${theme.fontSize}px}`
  const title = toolTitle(activeRail)

  const toolBodies = {
    home: renderHomeInnerHtml(),
    chat: renderChatInnerHtml(),
    documents: renderDocumentsInnerHtml(),
    cron: renderCronInnerHtml(cronTimezone),
  }

  return `<!DOCTYPE html>
<html lang="fr" data-theme="${theme.mode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="${colorScheme}">
  <title>${title}</title>
  <link rel="stylesheet" href="/code-editor.css">
  <style>${WORKSPACE_BASE_CSS}${NAV_CSS}${HOME_PAGE_CSS}${CHAT_PAGE_CSS}${DOCS_PAGE_CSS}${CRON_PAGE_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(null, toolBodies[activeRail], activeRail, { toolBodies })}
  <script src="/code-editor.js"></script>
  <script>${HOME_PAGE_JS}</script>
  <script>${CHAT_PAGE_JS}</script>
  <script>${DOCS_PAGE_JS}</script>
  <script>${CRON_PAGE_JS}</script>
</body>
</html>`
}

export async function resolveCronTimezone(
  cronApiUrl: string,
  fallback = "Europe/Paris",
): Promise<string> {
  try {
    const res = await fetch(`${cronApiUrl.replace(/\/$/, "")}/api/tasks`)
    if (!res.ok) return fallback
    const data = (await res.json()) as { timezone?: string }
    if (typeof data.timezone === "string" && data.timezone.trim()) {
      return data.timezone.trim()
    }
  } catch {
    // Cron API offline: still render the workspace.
  }
  return fallback
}
