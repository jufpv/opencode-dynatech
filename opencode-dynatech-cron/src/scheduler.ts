import { Cron } from "croner"
import { randomUUID } from "node:crypto"
import type { CronTask } from "./types.ts"
import { TaskStore } from "./store.ts"

export interface SessionClient {
  session: {
    create: (input?: {
      title?: string | null
      agent?: string | null
      location?: { directory: string } | null
    }) => Promise<{ id: string }>
    prompt: (input: { sessionID: string; text: string }) => Promise<unknown>
  }
}

export class Scheduler {
  private readonly jobs = new Map<string, Cron>()
  private readonly running = new Set<string>()
  private tasks: CronTask[] = []
  private readonly store: TaskStore
  private readonly ctx: SessionClient
  private readonly timezone: string
  private readonly defaultAgent?: string
  private readonly directory?: string

  constructor(
    store: TaskStore,
    ctx: SessionClient,
    timezone: string,
    defaultAgent?: string,
    directory?: string,
  ) {
    this.store = store
    this.ctx = ctx
    this.timezone = timezone
    this.defaultAgent = defaultAgent
    this.directory = directory
  }

  getDirectory(): string | undefined {
    return this.directory
  }

  async start(): Promise<void> {
    await this.reload()
  }

  async reload(): Promise<void> {
    for (const job of this.jobs.values()) job.stop()
    this.jobs.clear()
    this.tasks = await this.store.load()
    for (const task of this.tasks) this.syncJob(task)
  }

  async stop(): Promise<void> {
    for (const job of this.jobs.values()) job.stop()
    this.jobs.clear()
    this.running.clear()
  }

  getTimezone(): string {
    return this.timezone
  }

  list(): CronTask[] {
    return this.tasks.map((task) => ({ ...task }))
  }

  get(id: string): CronTask | undefined {
    return this.tasks.find((task) => task.id === id)
  }

  nextRun(id: string): string | null {
    const job = this.jobs.get(id)
    const next = job?.nextRun()
    return next ? next.toISOString() : null
  }

  preview(cron: string): { cron: string; nextRunAt: string | null; description: string } {
    const expression = cron.trim()
    this.assertCron(expression)
    const job = new Cron(expression, { timezone: this.timezone, paused: true })
    const next = job.nextRun()
    return {
      cron: expression,
      nextRunAt: next ? next.toISOString() : null,
      description: expression,
    }
  }

  async create(input: {
    name: string
    cron: string
    message: string
    agent?: string
    enabled?: boolean
  }): Promise<CronTask> {
    this.assertCron(input.cron)
    const now = new Date().toISOString()
    const task: CronTask = {
      id: randomUUID(),
      name: input.name.trim(),
      cron: input.cron.trim(),
      message: input.message,
      agent: input.agent?.trim() || this.defaultAgent,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }
    this.tasks.push(task)
    await this.persist()
    this.syncJob(task)
    return { ...task }
  }

  async update(
    id: string,
    input: {
      name?: string
      cron?: string
      message?: string
      agent?: string | null
      enabled?: boolean
    },
  ): Promise<CronTask> {
    const task = this.require(id)
    if (input.cron != null) this.assertCron(input.cron)
    if (input.name != null) task.name = input.name.trim()
    if (input.cron != null) task.cron = input.cron.trim()
    if (input.message != null) task.message = input.message
    if (input.agent !== undefined) {
      task.agent = input.agent?.trim() || this.defaultAgent
    }
    if (input.enabled != null) task.enabled = input.enabled
    task.updatedAt = new Date().toISOString()
    await this.persist()
    this.syncJob(task)
    return { ...task }
  }

  async setEnabled(id: string, enabled: boolean): Promise<CronTask> {
    return this.update(id, { enabled })
  }

  async remove(id: string): Promise<CronTask> {
    const task = this.require(id)
    this.tasks = this.tasks.filter((item) => item.id !== id)
    await this.persist()
    const job = this.jobs.get(id)
    job?.stop()
    this.jobs.delete(id)
    return { ...task }
  }

  async runNow(id: string): Promise<{ task: CronTask; sessionID?: string; error?: string }> {
    const task = this.require(id)
    return this.execute(task)
  }

  private require(id: string): CronTask {
    const task = this.get(id)
    if (!task) throw new Error(`Tâche introuvable: ${id}`)
    return task
  }

  private assertCron(expression: string) {
    try {
      new Cron(expression, { timezone: this.timezone, paused: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Expression cron invalide "${expression}": ${message}`)
    }
  }

  private syncJob(task: CronTask) {
    const existing = this.jobs.get(task.id)
    existing?.stop()
    this.jobs.delete(task.id)

    if (!task.enabled) return

    // Avoid Croner's global job names: OpenCode may activate the plugin more
    // than once, and reused names throw "name already taken".
    const job = new Cron(
      task.cron,
      {
        timezone: this.timezone,
        protect: true,
      },
      () => {
        void this.execute(task).catch((error) => {
          console.error(`[opencode-cron] run failed for ${task.id}:`, error)
        })
      },
    )
    this.jobs.set(task.id, job)
  }

  private async execute(task: CronTask): Promise<{ task: CronTask; sessionID?: string; error?: string }> {
    if (this.running.has(task.id)) {
      return { task: { ...task }, error: "Exécution déjà en cours pour cette tâche" }
    }

    this.running.add(task.id)
    const live = this.require(task.id)

    try {
      const session = await this.ctx.session.create({
        title: `Cron · ${live.name}`,
        agent: live.agent ?? null,
        location: this.directory ? { directory: this.directory } : null,
      })

      await this.ctx.session.prompt({
        sessionID: session.id,
        text: live.message,
      })

      live.lastRunAt = new Date().toISOString()
      live.lastSessionID = session.id
      live.lastError = undefined
      live.updatedAt = live.lastRunAt
      await this.persist()
      console.log(
        `[opencode-cron] ran "${live.name}" -> session ${session.id}` +
          (this.directory ? ` @ ${this.directory}` : ""),
      )
      return { task: { ...live }, sessionID: session.id }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      live.lastRunAt = new Date().toISOString()
      live.lastError = message
      live.updatedAt = live.lastRunAt
      await this.persist()
      console.error(`[opencode-cron] run failed for ${live.id}:`, message)
      return { task: { ...live }, error: message }
    } finally {
      this.running.delete(task.id)
    }
  }

  private async persist() {
    await this.store.save(this.tasks)
  }
}
