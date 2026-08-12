export interface PluginWebuiOptions {
  /** Local UI port. Set to 0 to disable. Default 8787. */
  uiPort?: number
  /** Base URL of the cron JSON API. Default http://127.0.0.1:8788 */
  cronApiUrl?: string
}

export function parseOptions(raw: unknown): Required<PluginWebuiOptions> {
  const options = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  const uiPort =
    typeof options.uiPort === "number" && Number.isFinite(options.uiPort)
      ? Math.max(0, Math.floor(options.uiPort))
      : 8787

  const cronApiUrl =
    typeof options.cronApiUrl === "string" && options.cronApiUrl.trim()
      ? options.cronApiUrl.trim().replace(/\/$/, "")
      : "http://127.0.0.1:8788"

  return { uiPort, cronApiUrl }
}
