import {
  fetchOpencodeJson,
  opencodeAuthHeader,
  readOpencodeService,
} from "../lib/opencode-service.ts"
import { getCurrentProject } from "./projects.ts"

export interface RecentSession {
  id: string
  title: string
  directory: string
  updatedAt: number
  href: string
}

export type ToolPartStatus = "streaming" | "running" | "completed" | "error"

export type SessionMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "tool"
      id: string
      name: string
      status: ToolPartStatus
      executed: boolean
      error?: string
      inputSummary?: string
    }

export interface SessionMessage {
  id: string
  role: "user" | "assistant"
  text: string
  parts: SessionMessagePart[]
  createdAt: number
}

export interface SessionContextUsage {
  used: number
  limit: number
  ratio: number
  percent: number
  modelId: string | null
  modelName: string | null
}

interface RawSession {
  id?: string
  title?: string
  projectID?: string
  model?: { id?: string; providerID?: string; variant?: string }
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
  time?: { created?: number; updated?: number }
  location?: { directory?: string }
}

interface RawModel {
  id?: string
  modelID?: string
  name?: string
  providerID?: string
  limit?: { context?: number }
}

interface RawToolState {
  status?: string
  input?: Record<string, unknown>
  error?: { message?: string; type?: string }
  content?: Array<{ type?: string; text?: string }>
  metadata?: Record<string, unknown>
}

interface RawContentPart {
  type?: string
  text?: string
  id?: string
  name?: string
  executed?: boolean
  state?: RawToolState
}

interface RawMessage {
  id?: string
  type?: string
  text?: string
  content?: RawContentPart[]
  time?: { created?: number; completed?: number }
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
  model?: { id?: string; providerID?: string }
}

function requireService() {
  const service = readOpencodeService()
  if (!service) throw new Error("Service OpenCode indisponible")
  return service
}

function requireCurrentDirectory(): string {
  const current = getCurrentProject()
  if (!current?.directory) throw new Error("Aucun projet sélectionné")
  return current.directory
}

function toRecentSession(row: RawSession, directory: string): RecentSession | null {
  if (!row?.id) return null
  const dir = (row.location?.directory || "").trim() || "/"
  if (dir !== directory) return null
  const title = (row.title || "").trim() || "Session"
  const updatedAt = Number(row.time?.updated || row.time?.created || 0)
  return {
    id: row.id,
    title,
    directory: dir,
    updatedAt,
    href: `/chat?session=${encodeURIComponent(row.id)}`,
  }
}

function authHeaders(password: string): HeadersInit {
  return {
    authorization: opencodeAuthHeader(password),
    accept: "application/json",
  }
}

export async function listProjectSessions(limit = 30): Promise<RecentSession[]> {
  const service = readOpencodeService()
  if (!service) return []

  let directory: string
  try {
    directory = requireCurrentDirectory()
  } catch {
    return []
  }

  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(limit, 50))),
    order: "desc",
    directory,
  })
  const result = await fetchOpencodeJson(
    `${service.url}/api/session?${params}`,
    { headers: authHeaders(service.password) },
    4000,
  )
  if (!result.ok || !result.data || typeof result.data !== "object") return []

  const rows = (result.data as { data?: RawSession[] }).data
  if (!Array.isArray(rows)) return []

  const out: RecentSession[] = []
  for (const row of rows) {
    const session = toRecentSession(row, directory)
    if (session) out.push(session)
  }
  return out
}

export async function listRecentSessions(limit = 8): Promise<RecentSession[]> {
  return listProjectSessions(limit)
}

async function fetchRawSession(id: string): Promise<RawSession | null> {
  const service = readOpencodeService()
  if (!service || !id) return null
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(id)}`,
    { headers: authHeaders(service.password) },
    4000,
  )
  if (!result.ok || !result.data || typeof result.data !== "object") return null
  const row = (result.data as { data?: RawSession }).data
  return row?.id ? row : null
}

export async function getSession(id: string): Promise<RecentSession | null> {
  const row = await fetchRawSession(id)
  if (!row?.id) return null

  const directory = (row.location?.directory || "").trim() || "/"
  const title = (row.title || "").trim() || "Session"
  return {
    id: row.id,
    title,
    directory,
    updatedAt: Number(row.time?.updated || row.time?.created || 0),
    href: `/chat?session=${encodeURIComponent(row.id)}`,
  }
}

async function fetchDefaultModel(): Promise<RawModel | null> {
  const service = readOpencodeService()
  if (!service) return null
  const result = await fetchOpencodeJson(
    `${service.url}/api/model/default`,
    { headers: authHeaders(service.password) },
    4000,
  )
  if (!result.ok || !result.data || typeof result.data !== "object") return null
  const row = (result.data as { data?: RawModel }).data
  return row && typeof row === "object" ? row : null
}

async function resolveModelContextLimit(
  modelId: string | undefined,
  providerID: string | undefined,
): Promise<{ limit: number; name: string | null; modelId: string | null }> {
  const service = readOpencodeService()
  if (!service) return { limit: 0, name: null, modelId: null }

  if (modelId) {
    const result = await fetchOpencodeJson(
      `${service.url}/api/model`,
      { headers: authHeaders(service.password) },
      5000,
    )
    if (result.ok && result.data && typeof result.data === "object") {
      const rows = (result.data as { data?: RawModel[] }).data
      if (Array.isArray(rows)) {
        const match =
          rows.find(
            (m) =>
              (m.id === modelId || m.modelID === modelId) &&
              (!providerID || m.providerID === providerID),
          ) || rows.find((m) => m.id === modelId || m.modelID === modelId)
        if (match) {
          return {
            limit: Number(match.limit?.context || 0),
            name: match.name?.trim() || null,
            modelId: match.id || match.modelID || modelId,
          }
        }
      }
    }
  }

  // Sessions without a stored model (older / imported) → default model window.
  const fallback = await fetchDefaultModel()
  if (!fallback) return { limit: 0, name: null, modelId: modelId || null }
  return {
    limit: Number(fallback.limit?.context || 0),
    name: fallback.name?.trim() || null,
    modelId: fallback.id || fallback.modelID || modelId || null,
  }
}

export async function getSessionContextUsage(
  id: string,
): Promise<SessionContextUsage | null> {
  const row = await fetchRawSession(id)
  if (!row?.id) return null

  // Match OpenCode Desktop: usage comes from the latest assistant message's
  // token breakdown (input+output+reasoning+cache), not session totals.
  let messages: RawMessage[] = []
  try {
    messages = await fetchSessionMessagesRaw(id, 30, "desc")
  } catch {
    messages = []
  }
  let used = 0
  let modelFromMessage: { id?: string; providerID?: string } | undefined
  for (const msg of messages) {
    if (msg?.type !== "assistant") continue
    const tokens = msg.tokens
    if (!tokens) continue
    used =
      Number(tokens.input || 0) +
      Number(tokens.output || 0) +
      Number(tokens.reasoning || 0) +
      Number(tokens.cache?.read || 0) +
      Number(tokens.cache?.write || 0)
    modelFromMessage = msg.model
    break
  }
  if (used <= 0) {
    used = Math.max(
      0,
      Number(row.tokens?.input || 0) +
        Number(row.tokens?.output || 0) +
        Number(row.tokens?.reasoning || 0) +
        Number(row.tokens?.cache?.read || 0) +
        Number(row.tokens?.cache?.write || 0),
    )
  }

  const resolved = await resolveModelContextLimit(
    modelFromMessage?.id || row.model?.id,
    modelFromMessage?.providerID || row.model?.providerID,
  )
  const safeLimit = resolved.limit > 0 ? resolved.limit : 0
  const ratio = safeLimit > 0 ? Math.min(1, used / safeLimit) : 0
  return {
    used,
    limit: safeLimit,
    ratio,
    percent: Math.round(ratio * 100),
    modelId: resolved.modelId,
    modelName: resolved.name,
  }
}

export async function createProjectSession(title?: string): Promise<RecentSession> {
  const service = requireService()
  const directory = requireCurrentDirectory()
  const body: { title?: string; location: { directory: string } } = {
    location: { directory },
  }
  const trimmed = (title || "").trim()
  if (trimmed) body.title = trimmed

  const result = await fetchOpencodeJson(
    `${service.url}/api/session`,
    {
      method: "POST",
      headers: {
        ...authHeaders(service.password),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
    8000,
  )
  if (!result.ok || !result.data || typeof result.data !== "object") {
    throw new Error("Impossible de créer la session")
  }
  const row = (result.data as { data?: RawSession }).data
  const session = row ? toRecentSession(row, directory) : null
  if (!session) throw new Error("Session créée hors du projet courant")
  return session
}

export async function deleteSession(id: string): Promise<void> {
  const service = requireService()
  if (!id) throw new Error("id requis")
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: authHeaders(service.password),
    },
    8000,
  )
  if (!result.ok && result.status !== 204) {
    throw new Error("Impossible de supprimer la session")
  }
}

function summarizeToolInput(input: Record<string, unknown> | undefined): string | undefined {
  if (!input || typeof input !== "object") return undefined
  for (const key of ["query", "url", "path", "command", "pattern", "objective"]) {
    const value = input[key]
    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim()
      return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
    }
  }
  return undefined
}

function normalizeToolStatus(status: string | undefined): ToolPartStatus {
  if (status === "completed" || status === "error" || status === "running" || status === "streaming") {
    return status
  }
  return "running"
}

function extractAssistantParts(msg: RawMessage): SessionMessagePart[] {
  if (!Array.isArray(msg.content)) return []
  const parts: SessionMessagePart[] = []
  for (const part of msg.content) {
    if (!part || typeof part !== "object") continue
    if (part.type === "text" && typeof part.text === "string") {
      const text = part.text.trim()
      if (text) parts.push({ type: "text", text })
      continue
    }
    if (part.type === "reasoning" && typeof part.text === "string") {
      const text = part.text.trim()
      if (text) parts.push({ type: "reasoning", text })
      continue
    }
    if (part.type === "tool" && typeof part.name === "string" && part.name.trim()) {
      const state = part.state && typeof part.state === "object" ? part.state : undefined
      const errorMessage =
        state?.error && typeof state.error.message === "string"
          ? state.error.message.trim()
          : undefined
      parts.push({
        type: "tool",
        id: typeof part.id === "string" ? part.id : `${part.name}-${parts.length}`,
        name: part.name.trim(),
        status: normalizeToolStatus(state?.status),
        executed: Boolean(part.executed),
        error: errorMessage || undefined,
        inputSummary: summarizeToolInput(state?.input),
      })
    }
  }
  return parts
}

function extractMessageText(msg: RawMessage, parts: SessionMessagePart[]): string {
  if (msg.type === "user") return (msg.text || "").trim()
  return parts
    .filter((part): part is Extract<SessionMessagePart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
}

async function fetchSessionMessagesRaw(
  id: string,
  limit = 50,
  order: "asc" | "desc" = "asc",
): Promise<RawMessage[]> {
  const service = requireService()
  if (!id) return []
  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(limit, 200))),
    order,
  })
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(id)}/message?${params}`,
    { headers: authHeaders(service.password) },
    8000,
  )
  if (!result.ok || !result.data || typeof result.data !== "object") {
    throw new Error("Impossible de charger les messages")
  }
  const rows = (result.data as { data?: RawMessage[] }).data
  return Array.isArray(rows) ? rows : []
}

export async function listSessionMessages(
  id: string,
  limit = 100,
): Promise<SessionMessage[]> {
  const rows = await fetchSessionMessagesRaw(id, limit, "asc")

  const out: SessionMessage[] = []
  for (const row of rows) {
    if (!row?.id) continue
    const role = row.type === "user" || row.type === "assistant" ? row.type : null
    if (!role) continue
    if (role === "user") {
      const text = extractMessageText(row, [])
      if (!text) continue
      out.push({
        id: row.id,
        role,
        text,
        parts: [{ type: "text", text }],
        createdAt: Number(row.time?.created || 0),
      })
      continue
    }
    const parts = extractAssistantParts(row)
    if (!parts.length) continue
    out.push({
      id: row.id,
      role,
      text: extractMessageText(row, parts),
      parts,
      createdAt: Number(row.time?.created || 0),
    })
  }
  return out
}

export async function startSessionPrompt(
  id: string,
  textInput: string,
): Promise<{ messages: SessionMessage[]; session: RecentSession | null }> {
  const service = requireService()
  if (!id) throw new Error("id requis")
  const text = textInput.trim()
  if (!text) throw new Error("Message vide")

  const prompt = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(id)}/prompt`,
    {
      method: "POST",
      headers: {
        ...authHeaders(service.password),
        "content-type": "application/json",
      },
      body: JSON.stringify({ text }),
    },
    30000,
  )
  if (!prompt.ok) {
    const err =
      prompt.data &&
      typeof prompt.data === "object" &&
      "message" in prompt.data &&
      typeof (prompt.data as { message?: unknown }).message === "string"
        ? (prompt.data as { message: string }).message
        : "Impossible d'envoyer le message"
    throw new Error(err)
  }

  // Do not wait — the chat UI streams tokens via /api/events.
  return {
    session: await getSession(id),
    messages: await listSessionMessages(id),
  }
}

/** Block until the session agent loop is idle (OpenCode `/wait`). */
export async function waitSession(id: string): Promise<void> {
  const service = requireService()
  if (!id) throw new Error("id requis")
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(id)}/wait`,
    {
      method: "POST",
      headers: authHeaders(service.password),
    },
    600_000,
  )
  // 204 No Content is the success response for wait.
  if (!result.ok && result.status !== 204) {
    throw new Error("Impossible d'attendre la fin de la génération")
  }
}

/** Interrupt the current agent turn for a session. */
export async function interruptSession(id: string): Promise<void> {
  const service = requireService()
  if (!id) throw new Error("id requis")
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(id)}/interrupt`,
    {
      method: "POST",
      headers: authHeaders(service.password),
    },
    15000,
  )
  if (!result.ok && result.status !== 204) {
    throw new Error("Impossible d'interrompre la génération")
  }
}
