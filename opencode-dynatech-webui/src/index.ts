import { Plugin } from "@opencode-ai/plugin"
import type { Server } from "node:http"
import { createCronModule } from "./modules/cron/index.ts"
import { startWebuiServer } from "./server.ts"
import { parseOptions } from "./types.ts"

const WEBUI_OPEN_MARKER = "OPENCODE_WEBUI_OPENED"

function openUiTemplate(url: string, label: string): string {
  return [
    `!\`open '${url}' >/dev/null 2>&1 || xdg-open '${url}' >/dev/null 2>&1 || true; printf '${WEBUI_OPEN_MARKER}'\``,
    "",
    `${label} a été ouverte dans le navigateur (${url}).`,
    "Réponds en une seule phrase courte en français pour confirmer. N'utilise aucun outil.",
  ].join("\n")
}

export default Plugin.define({
  id: "dynatech.opencode-webui",
  setup: async (ctx) => {
    const options = parseOptions(ctx.options)
    let ui: { server: Server; url: string } | undefined

    if (options.uiPort > 0) {
      try {
        ui = await startWebuiServer({
          port: options.uiPort,
          cronApiUrl: options.cronApiUrl,
          modules: [createCronModule(options.cronApiUrl)],
        })
        console.log(`[opencode-webui] UI: ${ui.url}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[opencode-webui] Instance secondaire (UI ${options.uiPort}): ${message}`)
      }
    }

    const uiUrl = ui?.url ?? `http://127.0.0.1:${options.uiPort || 8787}`
    const cronUrl = `${uiUrl.replace(/\/$/, "")}/cron`

    await ctx.command.transform((commands) => {
      commands.update("cron", (command) => {
        command.description = "Ouvrir l'UI des tâches planifiées"
        command.template = openUiTemplate(cronUrl, "La page des tâches planifiées")
      })
    })

    await ctx.session.hook("context", (event) => {
      const last = event.messages.at(-1)
      const text =
        last && typeof last === "object" && "content" in last
          ? JSON.stringify(last.content)
          : typeof last === "object"
            ? JSON.stringify(last)
            : String(last ?? "")
      if (!text.includes(WEBUI_OPEN_MARKER)) return
      for (const key of Object.keys(event.tools)) delete event.tools[key]
    })

    return async () => {
      if (ui) {
        await new Promise<void>((resolve) => ui?.server.close(() => resolve()))
      }
    }
  },
})
