export interface WebuiModule {
  readonly id: string
  /** Primary mount path, e.g. "/cron". */
  readonly mountPath: string
  /** Extra paths that serve the same page (e.g. "/"). */
  readonly aliases?: readonly string[]
  renderPage: () => string | Promise<string>
}
