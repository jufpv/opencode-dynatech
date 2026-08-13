import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { homedir } from "node:os"
import { execFileSync } from "node:child_process"
import { getOpencodeConfigDir } from "../lib/paths.ts"

export interface ProjectInfo {
  id: string
  name: string
  directory: string
}

export interface ProjectsPayload {
  projects: ProjectInfo[]
  defaultProject: ProjectInfo | null
  others: ProjectInfo[]
  current: ProjectInfo | null
}

interface WebuiState {
  currentProjectId?: string
}

interface DesktopServerState {
  projects?: {
    local?: Array<{ worktree?: string; expanded?: boolean }>
    [serverKey: string]: Array<{ worktree?: string; expanded?: boolean }> | undefined
  }
  lastProject?: {
    local?: string
    [serverKey: string]: string | undefined
  }
}

function getDbPath(): string {
  return join(homedir(), ".local", "share", "opencode", "opencode.db")
}

function getStatePath(): string {
  return join(getOpencodeConfigDir(), "dynatech-webui.json")
}

/** OpenCode Desktop home project list (same source as the « Projets » sidebar). */
function getDesktopGlobalDatCandidates(): string[] {
  return [
    join(
      homedir(),
      "Library",
      "Application Support",
      "ai.opencode.desktop.beta",
      "opencode.global.dat",
    ),
    join(
      homedir(),
      "Library",
      "Application Support",
      "ai.opencode.desktop",
      "opencode.global.dat",
    ),
  ]
}

function readState(): WebuiState {
  const path = getStatePath()
  if (!existsSync(path)) return {}
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as WebuiState
    return data && typeof data === "object" ? data : {}
  } catch {
    return {}
  }
}

function writeState(state: WebuiState) {
  const dir = getOpencodeConfigDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(getStatePath(), JSON.stringify(state, null, 2) + "\n", "utf8")
}

function displayName(directory: string, name?: string | null): string {
  if (name && name.trim()) return name.trim()
  if (!directory || directory === "/") return "Global"
  return basename(directory)
}

function readDesktopServerState(): DesktopServerState | undefined {
  for (const path of getDesktopGlobalDatCandidates()) {
    if (!existsSync(path)) continue
    try {
      const outer = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
      const raw = outer.server
      if (typeof raw === "string") {
        return JSON.parse(raw) as DesktopServerState
      }
      if (raw && typeof raw === "object") {
        return raw as DesktopServerState
      }
    } catch {
      // try next candidate
    }
  }
  return undefined
}

/** Map worktree -> OpenCode project id from the server DB when available. */
function loadProjectIdsByDirectory(): Map<string, { id: string; name: string | null }> {
  const map = new Map<string, { id: string; name: string | null }>()
  const dbPath = getDbPath()
  if (!existsSync(dbPath)) return map
  try {
    const out = execFileSync(
      "sqlite3",
      [
        "-separator",
        "\t",
        dbPath,
        `SELECT p.id, IFNULL(p.name,''), p.worktree,
                IFNULL((SELECT d.directory FROM project_directory d
                        WHERE d.project_id = p.id
                        ORDER BY d.time_created ASC LIMIT 1), '')
         FROM project p;`,
      ],
      { encoding: "utf8", timeout: 3000, maxBuffer: 2 * 1024 * 1024 },
    )
    for (const line of out.split("\n")) {
      if (!line.trim()) continue
      const [id, name, worktree, directoryCol] = line.split("\t")
      if (!id || id === "global") continue
      for (const directory of [directoryCol, worktree]) {
        const dir = (directory || "").trim()
        if (!dir || dir === "/") continue
        map.set(dir, { id, name: name || null })
      }
    }
  } catch {
    // DB unavailable
  }
  return map
}

function desktopWorktrees(server: DesktopServerState | undefined): string[] {
  if (!server?.projects || typeof server.projects !== "object") return []
  const dirs: string[] = []
  const seen = new Set<string>()
  // Prefer local first (Default Project lives there), then other server keys.
  const keys = Object.keys(server.projects)
  keys.sort((a, b) => {
    if (a === "local") return -1
    if (b === "local") return 1
    return a.localeCompare(b)
  })
  for (const key of keys) {
    const value = server.projects[key]
    if (!Array.isArray(value)) continue
    for (const item of value) {
      const worktree = typeof item?.worktree === "string" ? item.worktree.trim() : ""
      if (!worktree || worktree === "/" || seen.has(worktree)) continue
      seen.add(worktree)
      dirs.push(worktree)
    }
  }
  return dirs
}

/** OpenCode Desktop default project: ~/Documents/Default Project */
export function getDefaultProjectDirectory(): string {
  return join(homedir(), "Documents", "Default Project")
}

function isDefaultProjectDirectory(directory: string): boolean {
  return resolve(directory) === resolve(getDefaultProjectDirectory())
}

function toProjectInfo(directory: string, ids: Map<string, { id: string; name: string | null }>): ProjectInfo {
  const meta = ids.get(directory)
  return {
    id: meta?.id || `worktree:${directory}`,
    name: displayName(directory, meta?.name),
    directory,
  }
}

export function listProjects(): ProjectInfo[] {
  const server = readDesktopServerState()
  const worktrees = desktopWorktrees(server)
  const ids = loadProjectIdsByDirectory()
  const projects = worktrees.map((directory) => toProjectInfo(directory, ids))

  return projects.sort((a, b) => {
    const aDef = isDefaultProjectDirectory(a.directory) ? 0 : 1
    const bDef = isDefaultProjectDirectory(b.directory) ? 0 : 1
    if (aDef !== bDef) return aDef - bDef
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  })
}

function getDocumentsDirectory(): string {
  return join(homedir(), "Documents")
}

function normalizeProjectName(nameInput: string): string {
  const name = nameInput.trim().replace(/\s+/g, " ")
  if (!name) throw new Error("Nom de projet requis")
  if (name === "." || name === "..") throw new Error("Nom de projet invalide")
  if (/[\\/]/.test(name) || name.includes("\0")) {
    throw new Error("Le nom ne doit pas contenir de chemin")
  }
  if (name.length > 120) throw new Error("Nom de projet trop long")
  return name
}

function getDesktopGlobalDatPath(): string | undefined {
  return getDesktopGlobalDatCandidates().find((path) => existsSync(path))
}

function registerDesktopWorktree(directory: string): ProjectInfo {
  let resolved = directory
  try {
    resolved = realpathSync(directory)
  } catch {
    resolved = resolve(directory)
  }

  const datPath = getDesktopGlobalDatPath()
  if (!datPath) {
    throw new Error("Fichier projets OpenCode Desktop introuvable")
  }

  const outer = JSON.parse(readFileSync(datPath, "utf8")) as Record<string, unknown>
  const rawServer = outer.server
  const server: DesktopServerState =
    typeof rawServer === "string"
      ? (JSON.parse(rawServer) as DesktopServerState)
      : rawServer && typeof rawServer === "object"
        ? (rawServer as DesktopServerState)
        : {}

  if (!server.projects || typeof server.projects !== "object") {
    server.projects = { local: [] }
  }
  if (!Array.isArray(server.projects.local)) {
    server.projects.local = []
  }

  const already = server.projects.local.some(
    (item) => typeof item?.worktree === "string" && resolve(item.worktree) === resolved,
  )
  if (!already) {
    server.projects.local.push({ worktree: resolved, expanded: true })
  }

  if (typeof rawServer === "string") {
    outer.server = JSON.stringify(server)
  } else {
    outer.server = server
  }
  writeFileSync(datPath, JSON.stringify(outer), "utf8")

  const ids = loadProjectIdsByDirectory()
  const project = toProjectInfo(resolved, ids)
  writeState({ currentProjectId: project.id })
  return project
}

/**
 * Create (if needed) ~/Documents/<name> and register it in Desktop projects.local.
 */
export function addDesktopProject(nameInput: string): ProjectInfo {
  const name = normalizeProjectName(nameInput)
  const documents = getDocumentsDirectory()
  mkdirSync(documents, { recursive: true })

  const directory = join(documents, name)
  if (existsSync(directory)) {
    if (!statSync(directory).isDirectory()) {
      throw new Error(`« ${name} » existe déjà et n'est pas un dossier`)
    }
  } else {
    mkdirSync(directory, { recursive: false })
  }

  return registerDesktopWorktree(directory)
}

function desktopLastProjectDirectory(): string | undefined {
  const server = readDesktopServerState()
  const last = server?.lastProject
  if (!last || typeof last !== "object") return undefined
  if (typeof last.local === "string" && last.local.trim()) return last.local.trim()
  for (const value of Object.values(last)) {
    if (typeof value === "string" && value.trim() && value !== "/") return value.trim()
  }
  return undefined
}

export function getCurrentProject(): ProjectInfo | null {
  const projects = listProjects()
  if (!projects.length) return null

  const state = readState()
  if (state.currentProjectId) {
    const match = projects.find((p) => p.id === state.currentProjectId)
    if (match) return match
  }

  const lastDir = desktopLastProjectDirectory()
  if (lastDir) {
    const match = projects.find((p) => p.directory === lastDir)
    if (match) return match
  }

  return projects[0] ?? null
}

export function setCurrentProject(id: string): ProjectInfo {
  const projects = listProjects()
  const match = projects.find((p) => p.id === id)
  if (!match) throw new Error(`Projet inconnu: ${id}`)
  writeState({ currentProjectId: match.id })
  return match
}

export function getProjectsPayload(): ProjectsPayload {
  const projects = listProjects()
  const current = getCurrentProject()
  const defaultProject =
    projects.find((p) => isDefaultProjectDirectory(p.directory)) ?? null
  const others = projects.filter((p) => !isDefaultProjectDirectory(p.directory))
  return {
    projects,
    defaultProject,
    others,
    current: current
      ? { id: current.id, name: current.name, directory: current.directory }
      : null,
  }
}
