export interface CronTask {
  id: string
  name: string
  cron: string
  message: string
  agent?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  lastError?: string
  lastSessionID?: string
}

export interface PluginCronOptions {
  timezone?: string
  defaultAgent?: string
  dataDir?: string
  /**
   * Project directory where cron sessions are created.
   * Must match the project you browse in OpenCode Desktop (e.g. Default Project).
   */
  directory?: string
  /** Local JSON API port. Set to 0 to disable. Default 8788. */
  apiPort?: number
}

export function parseOptions(raw: unknown): Required<Pick<PluginCronOptions, "timezone" | "apiPort">> &
  PluginCronOptions {
  const options = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const timezone =
    typeof options.timezone === "string" && options.timezone.trim()
      ? options.timezone.trim()
      : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

  const apiPort =
    typeof options.apiPort === "number" && Number.isFinite(options.apiPort)
      ? Math.max(0, Math.floor(options.apiPort))
      : 8788

  return {
    timezone,
    apiPort,
    defaultAgent:
      typeof options.defaultAgent === "string" && options.defaultAgent.trim()
        ? options.defaultAgent.trim()
        : undefined,
    dataDir:
      typeof options.dataDir === "string" && options.dataDir.trim()
        ? options.dataDir.trim()
        : undefined,
    directory:
      typeof options.directory === "string" && options.directory.trim()
        ? options.directory.trim()
        : undefined,
  }
}
