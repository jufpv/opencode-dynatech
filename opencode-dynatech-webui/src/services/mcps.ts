import {
  readOpencodeConfig,
  readOpencodeConfigSafe,
  replaceOrInsertObjectKey,
  removeObjectKey,
  writeOpencodeConfigText,
} from "../lib/jsonc.ts"

const MCP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type McpServerType = "local" | "remote"

export type McpSummary = {
  id: string
  name: string
  type: McpServerType
  description: string
  enabled: boolean
  updatedAt?: number
}

export type McpDetail = McpSummary & {
  command?: string[]
  url?: string
  environment?: Record<string, string>
  headers?: Record<string, string>
  oauth?: boolean
  cwd?: string
}

export type McpInput = {
  id?: string
  name: string
  type: McpServerType
  enabled?: boolean
  command?: string[]
  url?: string
  environment?: Record<string, string>
  headers?: Record<string, string>
  oauth?: boolean
  cwd?: string
}

type McpServerRecord = {
  type: "local" | "remote"
  command?: string[]
  url?: string
  environment?: Record<string, string>
  headers?: Record<string, string>
  oauth?: boolean | false
  cwd?: string
  disabled?: boolean
}

function validateMcpId(id: string): string {
  const normalized = id.trim()
  if (!normalized) throw new Error("L'identifiant du serveur MCP est requis.")
  if (!MCP_ID_RE.test(normalized)) {
    throw new Error("Identifiant invalide (minuscules, chiffres et tirets uniquement).")
  }
  return normalized
}

function describe(server: McpServerRecord): string {
  if (server.type === "local") return (server.command ?? []).join(" ") || "Commande locale"
  if (server.url) {
    try {
      return new URL(server.url).host
    } catch {
      return server.url
    }
  }
  return "Serveur distant"
}

/** Normalize V2 `{ servers: {...} }` and legacy flat `{ id: server }` shapes. */
function readServers(config: Record<string, unknown>): Record<string, McpServerRecord> {
  const mcp = config.mcp
  if (!mcp || typeof mcp !== "object") return {}
  const obj = mcp as Record<string, unknown>
  if (obj.servers && typeof obj.servers === "object") {
    return { ...(obj.servers as Record<string, McpServerRecord>) }
  }
  const flat: Record<string, McpServerRecord> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === "timeout" || key === "servers") continue
    if (value && typeof value === "object" && "type" in (value as object)) {
      flat[key] = value as McpServerRecord
    }
  }
  return flat
}

function toSummary(id: string, server: McpServerRecord, updatedAt?: number): McpSummary {
  return {
    id,
    name: id,
    type: server.type,
    description: describe(server),
    enabled: server.disabled !== true,
    updatedAt,
  }
}

function toDetail(id: string, server: McpServerRecord, updatedAt?: number): McpDetail {
  return {
    ...toSummary(id, server, updatedAt),
    command: server.command,
    url: server.url,
    environment: server.environment,
    headers: server.headers,
    oauth: server.oauth === false ? false : Boolean(server.oauth),
    cwd: server.cwd,
  }
}

function writeServers(servers: Record<string, McpServerRecord>): void {
  const { text } = readOpencodeConfig()
  if (Object.keys(servers).length === 0) {
    writeOpencodeConfigText(removeObjectKey(text, "mcp"))
    return
  }
  const next = replaceOrInsertObjectKey(text, "mcp", { servers })
  writeOpencodeConfigText(next)
}

function buildServer(input: McpInput): McpServerRecord {
  const enabled = input.enabled ?? true
  if (input.type === "local") {
    const command = (input.command ?? []).map((e) => e.trim()).filter(Boolean)
    if (!command.length) throw new Error("La commande est requise pour un serveur MCP local.")
    const server: McpServerRecord = { type: "local", command, disabled: !enabled }
    if (input.environment && Object.keys(input.environment).length) {
      server.environment = input.environment
    }
    if (input.cwd?.trim()) server.cwd = input.cwd.trim()
    return server
  }
  const url = input.url?.trim()
  if (!url) throw new Error("L'URL est requise pour un serveur MCP distant.")
  const server: McpServerRecord = { type: "remote", url, disabled: !enabled }
  if (input.headers && Object.keys(input.headers).length) server.headers = input.headers
  if (input.oauth === false) server.oauth = false
  if (input.cwd?.trim()) server.cwd = input.cwd.trim()
  return server
}

export function listMcps(): McpSummary[] {
  try {
    const { config, mtimeMs } = readOpencodeConfigSafe()
    return Object.entries(readServers(config))
      .map(([id, server]) => toSummary(id, server, mtimeMs))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  } catch {
    return []
  }
}

export function getMcp(mcpId: string): McpDetail {
  const validated = validateMcpId(mcpId)
  const { config, mtimeMs } = readOpencodeConfig()
  const server = readServers(config)[validated]
  if (!server) throw new Error(`Serveur MCP « ${validated} » introuvable.`)
  return toDetail(validated, server, mtimeMs)
}

export function upsertMcp(input: McpInput): McpDetail {
  const mcpId = validateMcpId(input.id ?? input.name)
  const { config } = readOpencodeConfig()
  const servers = { ...readServers(config) }
  servers[mcpId] = buildServer({ ...input, id: mcpId, name: mcpId })
  writeServers(servers)
  return getMcp(mcpId)
}

export function deleteMcp(mcpId: string): McpSummary[] {
  const validated = validateMcpId(mcpId)
  const { config } = readOpencodeConfig()
  const servers = { ...readServers(config) }
  if (!servers[validated]) throw new Error(`Serveur MCP « ${validated} » introuvable.`)
  delete servers[validated]
  writeServers(servers)
  return listMcps()
}
