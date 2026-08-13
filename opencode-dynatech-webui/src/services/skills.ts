import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join, resolve, sep } from "node:path"
import { isSkillEnabled, setSkillEnabled } from "../lib/permissions.ts"
import { getSkillsDir } from "../lib/paths.ts"

const SKILL_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type SkillSummary = {
  id: string
  name: string
  description: string
  enabled: boolean
  updatedAt?: number
}

export type SkillDetail = SkillSummary & {
  body: string
  metadata?: Record<string, string>
}

export type SkillInput = {
  id?: string
  name: string
  description: string
  body: string
  enabled?: boolean
  metadata?: Record<string, string>
}

function validateSkillId(id: string): string {
  const normalized = id.trim()
  if (!normalized) throw new Error("L'identifiant de la compétence est requis.")
  if (!SKILL_ID_RE.test(normalized)) {
    throw new Error("Identifiant invalide (minuscules, chiffres et tirets uniquement).")
  }
  return normalized
}

function unquoteYamlValue(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentObject: Record<string, string> | null = null
  let currentKey = ""

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line.trim() || line.trim().startsWith("#")) continue

    const nestedMatch = line.match(/^  ([A-Za-z0-9_/-]+):\s*(.*)$/)
    if (nestedMatch && currentObject && currentKey) {
      currentObject[nestedMatch[1]!] = unquoteYamlValue(nestedMatch[2]!)
      continue
    }

    const topMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!topMatch) continue
    currentKey = topMatch[1]!
    const value = topMatch[2]!
    if (!value) {
      currentObject = {}
      result[currentKey] = currentObject
      continue
    }
    currentObject = null
    result[currentKey] = unquoteYamlValue(value)
  }
  return result
}

function formatYamlScalar(value: string): string {
  if (!value) return '""'
  if (/[:#{}[\],&*?|<>=!%@`"'\\]/.test(value) || value.includes("\n")) {
    return JSON.stringify(value)
  }
  return value
}

function stringifySimpleYaml(data: Record<string, unknown>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${key}:`)
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, string>)) {
        lines.push(`  ${nestedKey}: ${formatYamlScalar(String(nestedValue))}`)
      }
      continue
    }
    lines.push(`${key}: ${formatYamlScalar(String(value ?? ""))}`)
  }
  return lines.join("\n")
}

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/)
  if (!match) return { frontmatter: {}, body: content.trimStart() }
  return {
    frontmatter: parseSimpleYaml(match[1]!),
    body: (match[2] ?? "").replace(/^\r?\n/, ""),
  }
}

function getSkillFilePath(skillId: string): string {
  const validated = validateSkillId(skillId)
  const dir = join(getSkillsDir(), validated)
  const resolvedDir = resolve(dir)
  const resolvedRoot = resolve(getSkillsDir())
  if (resolvedDir !== resolvedRoot && !resolvedDir.startsWith(resolvedRoot + sep)) {
    throw new Error("Chemin de compétence invalide.")
  }
  return join(resolvedDir, "SKILL.md")
}

function readSkillFile(skillId: string): SkillDetail {
  const filePath = getSkillFilePath(skillId)
  if (!existsSync(filePath)) throw new Error(`Compétence « ${skillId} » introuvable.`)
  const stat = statSync(filePath)
  const content = readFileSync(filePath, "utf8")
  const { frontmatter, body } = parseFrontmatter(content)
  const metadata =
    frontmatter.metadata && typeof frontmatter.metadata === "object"
      ? Object.fromEntries(
          Object.entries(frontmatter.metadata as Record<string, string>).map(([k, v]) => [
            k,
            String(v),
          ]),
        )
      : undefined

  return {
    id: skillId,
    name: String(frontmatter.name ?? skillId),
    description: String(frontmatter.description ?? ""),
    enabled: isSkillEnabled(skillId),
    updatedAt: stat.mtimeMs,
    body,
    metadata,
  }
}

export function listSkills(): SkillSummary[] {
  const skillsDir = getSkillsDir()
  if (!existsSync(skillsDir)) return []
  const skills: SkillSummary[] = []
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillFile = join(skillsDir, entry.name, "SKILL.md")
    if (!existsSync(skillFile)) continue
    try {
      const detail = readSkillFile(entry.name)
      skills.push({
        id: detail.id,
        name: detail.name,
        description: detail.description,
        enabled: detail.enabled,
        updatedAt: detail.updatedAt,
      })
    } catch {
      // ignore
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

export function getSkill(skillId: string): SkillDetail {
  return readSkillFile(validateSkillId(skillId))
}

export function upsertSkill(input: SkillInput): SkillDetail {
  const description = input.description.trim()
  const body = input.body ?? ""
  if (!description) throw new Error("La description est requise.")
  const skillId = validateSkillId(input.id ?? input.name)
  const skillDir = join(getSkillsDir(), skillId)
  const skillFile = join(skillDir, "SKILL.md")
  const isCreate = !existsSync(skillFile)

  let metadata = input.metadata
  if (!isCreate && !input.metadata) {
    metadata = readSkillFile(skillId).metadata
  }

  const frontmatter: Record<string, unknown> = {
    name: input.name.trim() || skillId,
    description,
  }
  if (metadata && Object.keys(metadata).length > 0) frontmatter.metadata = metadata

  mkdirSync(skillDir, { recursive: true })
  const normalizedBody = body.replace(/\s+$/u, "")
  writeFileSync(
    skillFile,
    `---\n${stringifySimpleYaml(frontmatter)}\n---\n\n${normalizedBody}${normalizedBody ? "\n" : ""}`,
    "utf8",
  )

  const enabled = input.enabled ?? (isCreate ? true : isSkillEnabled(skillId))
  setSkillEnabled(skillId, enabled)
  return readSkillFile(skillId)
}

export function deleteSkill(skillId: string): SkillSummary[] {
  const validated = validateSkillId(skillId)
  const skillDir = join(getSkillsDir(), validated)
  if (existsSync(skillDir)) rmSync(skillDir, { recursive: true, force: true })
  setSkillEnabled(validated, true) // remove deny rule
  // Actually delete should remove deny - setSkillEnabled(true) removes deny. Good.
  // But we also want to clean - setSkillEnabled true removes deny. Fine.
  return listSkills()
}
