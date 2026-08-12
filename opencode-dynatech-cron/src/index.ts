import { Plugin } from "@opencode-ai/plugin"
import { mkdirSync, watch } from "node:fs"
import { dirname, join } from "node:path"
import type { Server } from "node:http"
import { startApiServer } from "./api-server.ts"
import { Scheduler } from "./scheduler.ts"
import { TaskStore } from "./store.ts"
import { registerCronTools } from "./tools.ts"
import { parseOptions } from "./types.ts"

export default Plugin.define({
  id: "dynatech.opencode-cron",
  setup: async (ctx) => {
    const options = parseOptions(ctx.options)
    const store = new TaskStore(
      options.dataDir ? join(options.dataDir, "tasks.json") : undefined,
    )
    const directory =
      options.directory ||
      join(process.env.HOME || "", "Documents", "Default Project")
    const scheduler = new Scheduler(
      store,
      ctx,
      options.timezone,
      options.defaultAgent,
      directory,
    )

    // OpenCode activates the plugin once per location. Only the instance that
    // owns the API port should schedule jobs, otherwise each activation fires.
    let api: { server: Server; url: string } | undefined
    let leader = options.apiPort <= 0
    if (options.apiPort > 0) {
      try {
        api = await startApiServer(scheduler, options.apiPort)
        leader = true
        console.log(`[opencode-cron] API JSON: ${api.url}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[opencode-cron] Instance secondaire (API ${options.apiPort}): ${message}`)
      }
    }

    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    let watcher: ReturnType<typeof watch> | undefined

    if (leader) {
      await scheduler.start()
      console.log(`[opencode-cron] Sessions cron -> ${directory}`)

      mkdirSync(dirname(store.path), { recursive: true })
      watcher = watch(dirname(store.path), { persistent: false }, (_event, filename) => {
        if (filename && filename !== "tasks.json") return
        clearTimeout(reloadTimer)
        reloadTimer = setTimeout(() => {
          void scheduler.reload().catch((error) => {
            console.error("[opencode-cron] reload failed:", error)
          })
        }, 150)
      })
      watcher.on("error", () => {
        // Ignore watcher errors on unsupported platforms/files.
      })
    }

    const apiBase = (api?.url ?? `http://127.0.0.1:${options.apiPort || 8788}`).replace(
      /\/$/,
      "",
    )

    await ctx.tool.transform((tools) => {
      registerCronTools(tools, { scheduler, leader, apiBase })
    })

    return async () => {
      clearTimeout(reloadTimer)
      watcher?.close()
      if (leader) await scheduler.stop()
      if (api) {
        await new Promise<void>((resolve) => api?.server.close(() => resolve()))
      }
    }
  },
})
