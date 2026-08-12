import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { homedir } from "node:os"
import type { CronTask } from "./types.ts"

interface StoreFile {
  version: 1
  tasks: CronTask[]
}

function defaultDataPath() {
  const xdg = process.env.XDG_DATA_HOME
  const root = xdg && xdg.trim() ? xdg : join(homedir(), ".local", "share")
  return join(root, "opencode", "opencode-cron", "tasks.json")
}

export class TaskStore {
  readonly path: string

  constructor(path = defaultDataPath()) {
    this.path = path
  }

  async load(): Promise<CronTask[]> {
    try {
      const raw = await readFile(this.path, "utf8")
      const parsed = JSON.parse(raw) as StoreFile
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tasks)) return []
      return parsed.tasks
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
      throw error
    }
  }

  async save(tasks: CronTask[]): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    const payload: StoreFile = { version: 1, tasks }
    await writeFile(this.path, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  }
}
