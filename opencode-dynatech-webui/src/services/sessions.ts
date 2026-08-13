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

interface RawSession {
  id?: string
  title?: string
  projectID?: string
  time?: { created?: number; updated?: number }
  location?: { directory?: string }
}

export async function listRecentSessions(limit = 8): Promise<RecentSession[]> {
  const service = readOpencodeService()
  if (!service) return []

  const current = getCurrentProject()
  if (!current?.directory) return []

  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(limit, 30))),
    order: "desc",
    directory: current.directory,
  })
  const result = await fetchOpencodeJson(
    `${service.url}/api/session?${params}`,
    {
      headers: {
        authorization: opencodeAuthHeader(service.password),
        accept: "application/json",
      },
    },
    4000,
  )
  if (!result.ok || !result.data || typeof result.data !== "object") return []

  const rows = (result.data as { data?: RawSession[] }).data
  if (!Array.isArray(rows)) return []

  const out: RecentSession[] = []
  for (const row of rows) {
    if (!row?.id) continue
    const directory = (row.location?.directory || "").trim() || "/"
    if (directory !== current.directory) continue
    const title = (row.title || "").trim() || "Session"
    const updatedAt = Number(row.time?.updated || row.time?.created || 0)
    out.push({
      id: row.id,
      title,
      directory,
      updatedAt,
      href: `/chat?session=${encodeURIComponent(row.id)}`,
    })
  }
  return out
}
