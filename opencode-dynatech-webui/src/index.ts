import { Plugin } from "@opencode-ai/plugin"
import { pathToFileURL } from "node:url"
import type { Server } from "node:http"
import { createChatModule } from "./modules/chat/index.ts"
import { createCronModule } from "./modules/cron/index.ts"
import { createDocumentsModule } from "./modules/documents/index.ts"
import { createHomeModule } from "./modules/home/index.ts"
import { createMcpsModule } from "./modules/mcps/index.ts"
import { createSkillsModule } from "./modules/skills/index.ts"
import { createStatusModule } from "./modules/status/index.ts"
import { createToolsModule } from "./modules/tools/index.ts"
import { startWebuiServer } from "./server.ts"
import { listEnabledCustomToolFiles } from "./services/tools.ts"
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

async function loadCustomToolDefs(): Promise<Array<Record<string, unknown>>> {
  const defs: Array<Record<string, unknown>> = []
  for (const file of listEnabledCustomToolFiles()) {
    try {
      const mod = await import(pathToFileURL(file).href)
      const def = mod.default
      if (!def || typeof def !== "object") {
        console.warn(`[opencode-webui] outil ignoré (export default manquant): ${file}`)
        continue
      }
      const name = String(def.name || file.split("/").pop()?.replace(/\.ts$/, ""))
      defs.push({
        ...def,
        name,
        options: { codemode: false, ...(def.options || {}) },
      })
      console.log(`[opencode-webui] outil custom: ${name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[opencode-webui] échec chargement outil ${file}: ${message}`)
    }
  }
  return defs
}

export default Plugin.define({
  id: "dynatech.opencode-webui",
  setup: async (ctx) => {
    const options = parseOptions(ctx.options)
    let ui:
      | {
          server: Server
          url: string
          lanUrls: string[]
          mdnsUrl?: string
          stopExtras?: () => Promise<void>
        }
      | undefined

    const customTools = await loadCustomToolDefs()
    await ctx.tool.transform((tools) => {
      for (const def of customTools) tools.add(def)
    })

    if (options.uiPort > 0) {
      try {
        ui = await startWebuiServer({
          port: options.uiPort,
          cronApiUrl: options.cronApiUrl,
          mdnsHost: options.mdnsHost,
          modules: [
            createHomeModule(),
            createChatModule(),
            createDocumentsModule(),
            createCronModule(options.cronApiUrl),
            createStatusModule(),
            createSkillsModule(),
            createToolsModule(),
            createMcpsModule(),
          ],
        })
        console.log(`[opencode-webui] UI: ${ui.url}`)
        for (const lan of ui.lanUrls) {
          console.log(`[opencode-webui] LAN: ${lan}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[opencode-webui] Instance secondaire (UI ${options.uiPort}): ${message}`)
      }
    }

    const uiUrl = ui?.mdnsUrl || ui?.url || `http://127.0.0.1:${options.uiPort || 9877}`
    const baseUrl = uiUrl.replace(/\/$/, "")
    const homeUrl = `${baseUrl}/`
    const cronUrl = `${baseUrl}/cron`

    await ctx.command.transform((commands) => {
      commands.update("cron", (command) => {
        command.description = "Ouvrir l'UI des automatisations"
        command.template = openUiTemplate(cronUrl, "La page des automatisations")
      })
      commands.update("webui", (command) => {
        command.description = "Ouvrir l'accueil Dynatech WebUI"
        command.template = openUiTemplate(homeUrl, "L'accueil WebUI")
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
      await ui?.stopExtras?.()
      if (ui) {
        await new Promise<void>((resolve) => ui?.server.close(() => resolve()))
      }
    }
  },
})
