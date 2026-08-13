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

export interface SessionMessage {
  id: string
  role: "user" | "assistant"
  text: string
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
  model?: { id?: string; providerID?: string }
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

interface RawContentPart {
  type?: string
  text?: string
}

interface RawMessage {
  id?: string
  type?: string
  text?: string
  content?: RawContentPart[]
  time?: { created?: number; completed?: number }
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

  const used = Math.max(
    0,
    Number(row.tokens?.input || 0) + Number(row.tokens?.reasoning || 0),
  )
  const resolved = await resolveModelContextLimit(
    row.model?.id,
    row.model?.providerID,
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

function extractMessageText(msg: RawMessage): string {
  if (msg.type === "user") return (msg.text || "").trim()
  if (!Array.isArray(msg.content)) return ""
  return msg.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => (part.text || "").trim())
    .filter(Boolean)
    .join("\n\n")
}

export async function listSessionMessages(
  id: string,
  limit = 100,
): Promise<SessionMessage[]> {
  const service = requireService()
  if (!id) return []

  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(limit, 200))),
    order: "asc",
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
  if (!Array.isArray(rows)) return []

  const out: SessionMessage[] = []
  for (const row of rows) {
    if (!row?.id) continue
    const role = row.type === "user" || row.type === "assistant" ? row.type : null
    if (!role) continue
    const text = extractMessageText(row)
    if (!text) continue
    out.push({
      id: row.id,
      role,
      text,
      createdAt: Number(row.time?.created || 0),
    })
  }
  return out
}
