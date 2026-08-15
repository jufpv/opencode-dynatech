export interface PluginWebuiOptions {
  /** Local UI port. Set to 0 to disable. Default 9877 (avoids Hermes on 8787). */
  uiPort?: number
  /** Base URL of the cron JSON API. Default http://127.0.0.1:8788 */
  cronApiUrl?: string
  /**
   * mDNS / Bonjour hostname without `.local` (e.g. `alfred` → http://alfred.local:9877/).
   * Empty string disables. Default `alfred`.
   */
  mdnsHost?: string
}

export const DEFAULT_UI_PORT = 9877
export const DEFAULT_MDNS_HOST = "alfred"

export function parseOptions(raw: unknown): Required<PluginWebuiOptions> {
  const options = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  const uiPort =
    typeof options.uiPort === "number" && Number.isFinite(options.uiPort)
      ? Math.max(0, Math.floor(options.uiPort))
      : DEFAULT_UI_PORT

  const cronApiUrl =
    typeof options.cronApiUrl === "string" && options.cronApiUrl.trim()
      ? options.cronApiUrl.trim().replace(/\/$/, "")
      : "http://127.0.0.1:8788"

  let mdnsHost = DEFAULT_MDNS_HOST
  if (typeof options.mdnsHost === "string") {
    mdnsHost = options.mdnsHost.trim().replace(/\.local$/i, "")
  } else if (options.mdnsHost === false || options.mdnsHost === null) {
    mdnsHost = ""
  }

  return { uiPort, cronApiUrl, mdnsHost }
}
