import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import { getCurrentProject } from "./projects.ts"

const README_CANDIDATES = ["README.md", "Readme.md", "readme.md", "README.markdown", "README"]

const MAX_BYTES = 2 * 1024 * 1024

export interface ProjectReadmePayload {
  projectId: string
  projectName: string
  directory: string
  path: string
  name: string
  exists: boolean
  content: string
}

function requireCurrentDirectory(): { id: string; name: string; directory: string } {
  const current = getCurrentProject()
  if (!current?.directory) throw new Error("Aucun projet sélectionné")
  return current
}

function findExistingReadme(directory: string): string | null {
  for (const name of README_CANDIDATES) {
    const full = join(directory, name)
    if (existsSync(full)) return full
  }

  try {
    const match = readdirSync(directory).find((entry) => /^readme(\.|$)/i.test(entry))
    if (match) {
      const full = join(directory, match)
      if (existsSync(full)) return full
    }
  } catch {
    // ignore listing errors
  }

  return null
}

export function getProjectReadme(): ProjectReadmePayload {
  const current = requireCurrentDirectory()
  const existing = findExistingReadme(current.directory)
  const path = existing || join(current.directory, "README.md")
  const exists = Boolean(existing)
  let content = ""

  if (exists) {
    const raw = readFileSync(path)
    if (raw.byteLength > MAX_BYTES) throw new Error("README trop volumineux")
    content = raw.toString("utf8")
  }

  return {
    projectId: current.id,
    projectName: current.name,
    directory: current.directory,
    path,
    name: basename(path),
    exists,
    content,
  }
}

export function saveProjectReadme(content: string): ProjectReadmePayload {
  if (typeof content !== "string") throw new Error("Contenu invalide")
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    throw new Error("README trop volumineux")
  }

  const current = requireCurrentDirectory()
  const existing = findExistingReadme(current.directory)
  const path = existing || join(current.directory, "README.md")
  const normalized = content.endsWith("\n") ? content : `${content}\n`
  writeFileSync(path, normalized, "utf8")

  return {
    projectId: current.id,
    projectName: current.name,
    directory: current.directory,
    path,
    name: basename(path),
    exists: true,
    content: normalized,
  }
}
