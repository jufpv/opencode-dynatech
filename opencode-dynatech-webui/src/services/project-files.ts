import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path"
import { getCurrentProject } from "./projects.ts"

const MAX_LIST = 2000
const MAX_TEXT_BYTES = 1.5 * 1024 * 1024
const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024
const MAX_IMPORT_FILES = 40
const MAX_IMPORT_TOTAL_BYTES = 100 * 1024 * 1024

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
  ".svg",
])

/** Known binary / non-text extensions — never sniff as text. */
const BINARY_EXT = new Set([
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".7z",
  ".rar",
  ".tar",
  ".bz2",
  ".xz",
  ".dmg",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp3",
  ".mp4",
  ".m4a",
  ".wav",
  ".ogg",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".ico",
  ".icns",
  ".psd",
  ".ai",
  ".eps",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
  ".pages",
  ".numbers",
  ".key",
])

const TEXT_EXT = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ".jsonc",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".html",
  ".htm",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".env",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".sql",
  ".graphql",
  ".vue",
  ".svelte",
  ".csv",
  ".log",
  ".gitignore",
  ".dockerignore",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
])

export type FileEntryType = "dir" | "file"

export interface ProjectFileEntry {
  name: string
  path: string
  type: FileEntryType
  size: number | null
  mtime: number | null
  ext: string | null
}

export interface ProjectFilesListPayload {
  projectId: string
  projectName: string
  root: string
  path: string
  parent: string | null
  entries: ProjectFileEntry[]
  truncated: boolean
}

export type ProjectFileKind = "text" | "markdown" | "image" | "binary"

export interface ProjectFilePayload {
  projectId: string
  projectName: string
  root: string
  path: string
  name: string
  parent: string
  type: "file"
  kind: ProjectFileKind
  size: number
  mtime: number | null
  content: string | null
  contentType: string | null
  absolutePath: string
}

function requireCurrentDirectory(): { id: string; name: string; directory: string } {
  const current = getCurrentProject()
  if (!current?.directory) throw new Error("Aucun projet sélectionné")
  return current
}

function toPosixRel(rel: string): string {
  return rel.split(sep).join("/").replace(/^\.\//, "").replace(/\/+$/, "")
}

function normalizeRelPath(input: string | null | undefined): string {
  const raw = String(input || "").trim().replace(/\\/g, "/")
  if (!raw || raw === "." || raw === "/") return ""
  const parts = raw.split("/").filter((p) => p && p !== ".")
  if (parts.some((p) => p === "..")) throw new Error("Chemin invalide")
  return parts.join("/")
}

function resolveUnderRoot(root: string, relPath: string): { absolute: string; rel: string } {
  let rootReal = resolve(root)
  try {
    rootReal = realpathSync(rootReal)
  } catch {
    // keep resolve()
  }

  const absolute = relPath ? resolve(rootReal, ...relPath.split("/")) : rootReal
  let real = absolute
  try {
    real = realpathSync(absolute)
  } catch {
    if (!existsSync(absolute)) throw new Error("Introuvable")
  }

  const prefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`
  if (real !== rootReal && !real.startsWith(prefix)) {
    throw new Error("Chemin hors du projet")
  }

  const rel = real === rootReal ? "" : toPosixRel(relative(rootReal, real))
  return { absolute: real, rel }
}

function parentRel(rel: string): string | null {
  if (!rel) return null
  const parent = dirname(rel)
  if (!parent || parent === ".") return ""
  return toPosixRel(parent)
}

function detectKind(name: string, filePath: string): ProjectFileKind {
  const ext = extname(name).toLowerCase()
  if (IMAGE_EXT.has(ext)) return "image"
  if (ext === ".md" || ext === ".markdown") return "markdown"
  if (TEXT_EXT.has(ext)) return "text"
  if (BINARY_EXT.has(ext)) return "binary"
  if (!ext && !name.startsWith(".")) {
    // extensionless: try utf8 sniff below via caller
    return "text"
  }
  if (!ext) return "text"
  // Unknown ext: treat as text if mostly printable
  try {
    const sample = readFileSync(filePath).subarray(0, 512)
    if (sample.includes(0)) return "binary"
    const text = sample.toString("utf8")
    const bad = [...text].filter((ch) => {
      const code = ch.charCodeAt(0)
      return code < 9 || (code > 13 && code < 32) || code === 127
    }).length
    return bad / Math.max(text.length, 1) > 0.1 ? "binary" : "text"
  } catch {
    return "binary"
  }
}

function mimeFromExt(name: string): string | null {
  const ext = extname(name).toLowerCase()
  switch (ext) {
    case ".pdf":
      return "application/pdf"
    case ".svg":
      return "image/svg+xml"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".gif":
      return "image/gif"
    case ".webp":
      return "image/webp"
    case ".bmp":
      return "image/bmp"
    case ".avif":
      return "image/avif"
    case ".md":
    case ".markdown":
      return "text/markdown; charset=utf-8"
    case ".html":
    case ".htm":
      // Avoid executing untrusted HTML in the same origin.
      return "text/plain; charset=utf-8"
    case ".json":
    case ".jsonc":
      return "application/json; charset=utf-8"
    case ".css":
      return "text/css; charset=utf-8"
    case ".xml":
      return "application/xml; charset=utf-8"
    case ".zip":
      return "application/zip"
    default:
      return null
  }
}

function contentTypeFor(kind: ProjectFileKind, name: string): string | null {
  const byExt = mimeFromExt(name)
  if (byExt) return byExt
  if (kind === "image") return "application/octet-stream"
  if (kind === "markdown") return "text/markdown; charset=utf-8"
  if (kind === "text") return "text/plain; charset=utf-8"
  return null
}

const MAX_RAW_BYTES = 50 * 1024 * 1024

export interface ProjectFileRawPayload {
  name: string
  path: string
  contentType: string
  body: Buffer
}

function contentDispositionInline(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_")
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `inline; filename="${ascii || "file"}"; filename*=UTF-8''${encoded}`
}

/** Raw bytes for opening a project file in a browser tab. */
export function readProjectFileRaw(pathInput?: string | null): ProjectFileRawPayload & { contentDisposition: string } {
  const current = requireCurrentDirectory()
  const rel = normalizeRelPath(pathInput)
  if (!rel) throw new Error("Fichier requis")
  const { absolute, rel: path } = resolveUnderRoot(current.directory, rel)

  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    throw new Error("Fichier introuvable")
  }

  const st = statSync(absolute)
  if (st.size > MAX_RAW_BYTES) {
    throw new Error("Fichier trop volumineux")
  }

  const name = basename(absolute)
  const kind = detectKind(name, absolute)
  const contentType = contentTypeFor(kind, name) || "application/octet-stream"

  return {
    name,
    path,
    contentType,
    body: readFileSync(absolute),
    contentDisposition: contentDispositionInline(name),
  }
}

export function listProjectFiles(pathInput?: string | null): ProjectFilesListPayload {
  const current = requireCurrentDirectory()
  const rel = normalizeRelPath(pathInput)
  const { absolute, rel: path } = resolveUnderRoot(current.directory, rel)

  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new Error("Dossier introuvable")
  }

  const entries: ProjectFileEntry[] = []
  let truncated = false
  const names = readdirSync(absolute)
  names.sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))

  for (const name of names) {
    if (entries.length >= MAX_LIST) {
      truncated = true
      break
    }
    if (name.startsWith(".")) continue
    const full = join(absolute, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    const childRel = path ? `${path}/${name}` : name
    entries.push({
      name,
      path: childRel,
      type: st.isDirectory() ? "dir" : "file",
      size: st.isFile() ? st.size : null,
      mtime: Number.isFinite(st.mtimeMs) ? Math.round(st.mtimeMs) : null,
      ext: st.isFile() ? extname(name).toLowerCase() || null : null,
    })
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  })

  return {
    projectId: current.id,
    projectName: current.name,
    root: current.directory,
    path,
    parent: parentRel(path),
    entries,
    truncated,
  }
}

export function readProjectFile(pathInput?: string | null): ProjectFilePayload {
  const current = requireCurrentDirectory()
  const rel = normalizeRelPath(pathInput)
  if (!rel) throw new Error("Fichier requis")
  const { absolute, rel: path } = resolveUnderRoot(current.directory, rel)

  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    throw new Error("Fichier introuvable")
  }

  const st = statSync(absolute)
  const name = basename(absolute)
  const kind = detectKind(name, absolute)
  let content: string | null = null

  if (kind === "text" || kind === "markdown") {
    if (st.size > MAX_TEXT_BYTES) {
      throw new Error("Fichier trop volumineux pour l'aperçu")
    }
    content = readFileSync(absolute, "utf8")
  }

  return {
    projectId: current.id,
    projectName: current.name,
    root: current.directory,
    path,
    name,
    parent: parentRel(path) ?? "",
    type: "file",
    kind,
    size: st.size,
    mtime: Number.isFinite(st.mtimeMs) ? Math.round(st.mtimeMs) : null,
    content,
    contentType: contentTypeFor(kind, name),
    absolutePath: absolute,
  }
}

export interface ProjectImportFile {
  name: string
  data: Buffer
}

export interface ProjectImportResult {
  path: string
  imported: Array<{ name: string; path: string; size: number; overwritten: boolean }>
  skipped: Array<{ name: string; reason: string }>
}

function sanitizeImportName(raw: string): string {
  const base = basename(String(raw || "").replace(/\\/g, "/")).trim()
  if (!base) throw new Error("Nom de fichier manquant")
  if (base === "." || base === ".." || base.startsWith(".")) {
    throw new Error(`Nom de fichier invalide : ${base}`)
  }
  if (/[<>:"|?*\u0000-\u001f]/.test(base)) {
    throw new Error(`Nom de fichier invalide : ${base}`)
  }
  return base
}

export function importProjectFiles(
  dirInput: string | null | undefined,
  files: ProjectImportFile[],
): ProjectImportResult {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Aucun fichier à importer")
  }
  if (files.length > MAX_IMPORT_FILES) {
    throw new Error(`Trop de fichiers (max ${MAX_IMPORT_FILES})`)
  }

  const current = requireCurrentDirectory()
  const rel = normalizeRelPath(dirInput)
  const { absolute: dirAbs, rel: path } = resolveUnderRoot(current.directory, rel)
  if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) {
    throw new Error("Dossier introuvable")
  }

  let total = 0
  const imported: ProjectImportResult["imported"] = []
  const skipped: ProjectImportResult["skipped"] = []

  for (const file of files) {
    let name: string
    try {
      name = sanitizeImportName(file.name)
    } catch (err) {
      skipped.push({
        name: String(file.name || ""),
        reason: err instanceof Error ? err.message : "Nom invalide",
      })
      continue
    }

    const data = file.data
    if (!Buffer.isBuffer(data) || data.length === 0) {
      skipped.push({ name, reason: "Fichier vide" })
      continue
    }
    if (data.length > MAX_IMPORT_FILE_BYTES) {
      skipped.push({ name, reason: "Fichier trop volumineux" })
      continue
    }
    total += data.length
    if (total > MAX_IMPORT_TOTAL_BYTES) {
      skipped.push({ name, reason: "Import trop volumineux" })
      continue
    }

    const dest = join(dirAbs, name)
    const overwritten = existsSync(dest)
    if (overwritten && statSync(dest).isDirectory()) {
      skipped.push({ name, reason: "Un dossier porte déjà ce nom" })
      continue
    }
    writeFileSync(dest, data)
    imported.push({
      name,
      path: path ? `${path}/${name}` : name,
      size: data.length,
      overwritten,
    })
  }

  if (!imported.length && skipped.length) {
    throw new Error(skipped[0]?.reason || "Import impossible")
  }

  return { path, imported, skipped }
}

export function createProjectFolder(
  dirInput: string | null | undefined,
  nameInput: string,
): ProjectFilesListPayload {
  const name = sanitizeImportName(nameInput)
  const current = requireCurrentDirectory()
  const rel = normalizeRelPath(dirInput)
  const { absolute: dirAbs, rel: path } = resolveUnderRoot(current.directory, rel)
  if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) {
    throw new Error("Dossier introuvable")
  }
  const dest = join(dirAbs, name)
  if (existsSync(dest)) throw new Error(`« ${name} » existe déjà`)
  mkdirSync(dest)
  return listProjectFiles(path)
}

export function deleteProjectEntry(pathInput: string | null | undefined): {
  deleted: string
  parent: string
  listing: ProjectFilesListPayload
} {
  const rel = normalizeRelPath(pathInput)
  if (!rel) throw new Error("Impossible de supprimer la racine du projet")
  const current = requireCurrentDirectory()
  const { absolute, rel: path } = resolveUnderRoot(current.directory, rel)
  if (!existsSync(absolute)) throw new Error("Introuvable")
  const st = statSync(absolute)
  if (st.isDirectory()) {
    rmSync(absolute, { recursive: true, force: true })
  } else if (st.isFile()) {
    unlinkSync(absolute)
  } else {
    throw new Error("Type d'élément non supporté")
  }
  const parent = parentRel(path) ?? ""
  return {
    deleted: path,
    parent,
    listing: listProjectFiles(parent),
  }
}
