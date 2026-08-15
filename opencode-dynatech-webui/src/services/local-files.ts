import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { extname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { listProjects } from "./projects.ts"

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
}

const MAX_BYTES = 20 * 1024 * 1024

export interface LocalImageResult {
  path: string
  contentType: string
  body: Buffer
}

function allowedRoots(): string[] {
  const roots = new Set<string>()
  for (const project of listProjects()) {
    if (!project.directory) continue
    try {
      roots.add(realpathSync(project.directory))
    } catch {
      roots.add(resolve(project.directory))
    }
  }
  return [...roots]
}

function isUnderRoot(filePath: string, root: string): boolean {
  const prefix = root.endsWith("/") ? root : `${root}/`
  return filePath === root || filePath.startsWith(prefix)
}

function resolveLocalPath(raw: string): string {
  const input = raw.trim()
  if (!input) throw new Error("Chemin requis")

  let path: string
  if (input.startsWith("file:")) {
    path = fileURLToPath(input)
  } else if (input.startsWith("/")) {
    path = decodeURIComponent(input)
  } else {
    throw new Error("Chemin local invalide")
  }

  let resolved = resolve(path)
  try {
    resolved = realpathSync(resolved)
  } catch {
    // keep resolved path; exists check follows
  }
  return resolved
}

export function readLocalImage(raw: string): LocalImageResult {
  const filePath = resolveLocalPath(raw)
  const roots = allowedRoots()
  if (!roots.some((root) => isUnderRoot(filePath, root))) {
    throw new Error("Fichier hors des projets autorisés")
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error("Fichier introuvable")
  }

  const ext = extname(filePath).toLowerCase()
  const contentType = IMAGE_TYPES[ext]
  if (!contentType) throw new Error("Type d'image non supporté")

  const st = statSync(filePath)
  if (st.size > MAX_BYTES) throw new Error("Image trop volumineuse")

  return {
    path: filePath,
    contentType,
    body: readFileSync(filePath),
  }
}
