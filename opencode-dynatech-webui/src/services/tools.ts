import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs"
import { join, resolve, sep } from "node:path"
import { isToolEnabled, setToolEnabled as setPermissionToolEnabled } from "../lib/permissions.ts"
import { getToolsDir } from "../lib/paths.ts"

const TOOL_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const DEFAULT_TOOL_TEMPLATE = `export default {
  name: "mon-outil",
  description: "Description de l'outil",
  options: { codemode: false },
  input: {
    type: "object",
    properties: {
      input: { type: "string", description: "Entrée" },
    },
    required: ["input"],
    additionalProperties: false,
  },
  async execute({ input }) {
    return { content: String(input) }
  },
}
`

const BUILTIN_TOOLS: Array<{ id: string; description: string }> = [
  { id: "read", description: "Lire des fichiers" },
  { id: "edit", description: "Modifier / écrire des fichiers" },
  { id: "shell", description: "Exécuter des commandes shell" },
  { id: "glob", description: "Rechercher des fichiers par motif" },
  { id: "grep", description: "Rechercher du texte dans les fichiers" },
  { id: "question", description: "Poser une question à l'utilisateur" },
  { id: "webfetch", description: "Récupérer le contenu d'une URL" },
  { id: "websearch", description: "Recherche web" },
  { id: "skill", description: "Charger une compétence (skill)" },
  { id: "subagent", description: "Lancer un sous-agent" },
]

const BUILTIN_IDS = new Set(BUILTIN_TOOLS.map((t) => t.id))

export type ToolSummary = {
  id: string
  name: string
  description: string
  enabled: boolean
  updatedAt?: number
  builtin?: boolean
}

export type ToolDetail = ToolSummary & { source: string }

export type ToolInput = {
  id?: string
  name: string
  source: string
  enabled?: boolean
}

function validateToolId(id: string): string {
  const normalized = id.trim()
  if (!normalized) throw new Error("L'identifiant de l'outil est requis.")
  if (!TOOL_ID_RE.test(normalized)) {
    throw new Error("Identifiant invalide (minuscules, chiffres et tirets uniquement).")
  }
  return normalized
}

function getToolFilePath(toolId: string): string {
  const validated = validateToolId(toolId)
  const filePath = join(getToolsDir(), `${validated}.ts`)
  const resolvedFile = resolve(filePath)
  const resolvedRoot = resolve(getToolsDir())
  if (resolvedFile !== resolvedRoot && !resolvedFile.startsWith(resolvedRoot + sep)) {
    throw new Error("Chemin d'outil invalide.")
  }
  return resolvedFile
}

function extractDescription(source: string): string {
  const match = source.match(/description:\s*["'`]([^"'`]*)["'`]/)
  return match?.[1]?.trim() || ""
}

function validateToolSource(source: string): void {
  const trimmed = source.trim()
  if (!trimmed) throw new Error("Le code source de l'outil est requis.")
  if (!trimmed.includes("export default")) {
    throw new Error("Le fichier doit exporter un outil (export default { ... }).")
  }
  if (!trimmed.includes("execute")) {
    throw new Error("Le fichier doit définir une fonction execute.")
  }
}

export function getDefaultToolTemplate(): string {
  return DEFAULT_TOOL_TEMPLATE
}

export function listTools(): ToolSummary[] {
  const custom: ToolSummary[] = []
  const toolsDir = getToolsDir()
  if (existsSync(toolsDir)) {
    for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.startsWith("_")) continue
      const id = entry.name.replace(/\.ts$/, "")
      try {
        const filePath = join(toolsDir, entry.name)
        const source = readFileSync(filePath, "utf8")
        custom.push({
          id,
          name: id,
          description: extractDescription(source),
          enabled: isToolEnabled(id),
          updatedAt: statSync(filePath).mtimeMs,
          builtin: false,
        })
      } catch {
        // ignore
      }
    }
  }
  custom.sort((a, b) => a.name.localeCompare(b.name, "fr"))
  const builtins = BUILTIN_TOOLS.map((tool) => ({
    id: tool.id,
    name: tool.id,
    description: tool.description,
    enabled: isToolEnabled(tool.id),
    builtin: true,
  }))
  return [...custom, ...builtins]
}

export function getTool(toolId: string): ToolDetail {
  const validated = validateToolId(toolId)
  if (BUILTIN_IDS.has(validated)) {
    const builtin = BUILTIN_TOOLS.find((t) => t.id === validated)!
    return {
      id: validated,
      name: validated,
      description: builtin.description,
      enabled: isToolEnabled(validated),
      builtin: true,
      source: "",
    }
  }
  const filePath = getToolFilePath(validated)
  if (!existsSync(filePath)) throw new Error(`Outil « ${validated} » introuvable.`)
  const source = readFileSync(filePath, "utf8")
  return {
    id: validated,
    name: validated,
    description: extractDescription(source),
    enabled: isToolEnabled(validated),
    updatedAt: statSync(filePath).mtimeMs,
    builtin: false,
    source,
  }
}

export function setToolEnabled(toolId: string, enabled: boolean): ToolSummary[] {
  const validated = validateToolId(toolId)
  if (!BUILTIN_IDS.has(validated) && !existsSync(getToolFilePath(validated))) {
    throw new Error(`Outil « ${validated} » introuvable.`)
  }
  setPermissionToolEnabled(validated, enabled)
  return listTools()
}

export function upsertTool(input: ToolInput): ToolDetail {
  const toolId = validateToolId(input.id ?? input.name)
  if (BUILTIN_IDS.has(toolId)) {
    throw new Error(`« ${toolId} » est un outil intégré — activez-le depuis la liste.`)
  }
  const source = input.source?.trim() ? input.source : DEFAULT_TOOL_TEMPLATE
  validateToolSource(source)
  const filePath = getToolFilePath(toolId)
  const isCreate = !existsSync(filePath)
  mkdirSync(getToolsDir(), { recursive: true })
  writeFileSync(filePath, source.endsWith("\n") ? source : `${source}\n`, "utf8")
  const enabled = input.enabled ?? (isCreate ? true : isToolEnabled(toolId))
  setPermissionToolEnabled(toolId, enabled)
  return getTool(toolId)
}

export function deleteTool(toolId: string): ToolSummary[] {
  const validated = validateToolId(toolId)
  if (BUILTIN_IDS.has(validated)) {
    throw new Error(`« ${validated} » est un outil intégré et ne peut pas être supprimé.`)
  }
  const filePath = getToolFilePath(validated)
  if (existsSync(filePath)) unlinkSync(filePath)
  setPermissionToolEnabled(validated, true)
  return listTools()
}

/** Absolute paths of enabled custom tool modules for plugin registration. */
export function listEnabledCustomToolFiles(): string[] {
  const toolsDir = getToolsDir()
  if (!existsSync(toolsDir)) return []
  const files: string[] = []
  for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.startsWith("_")) continue
    const id = entry.name.replace(/\.ts$/, "")
    if (!isToolEnabled(id)) continue
    files.push(join(toolsDir, entry.name))
  }
  return files
}
