import {
  fetchOpencodeJson,
  opencodeAuthHeader,
  readOpencodeService,
} from "../lib/opencode-service.ts"
import { getCurrentProject } from "./projects.ts"

export interface ModelVariant {
  id: string
  label: string
}

export interface ModelInfo {
  id: string
  name: string
  providerID: string
  variants: ModelVariant[]
}

export interface ModelSelection {
  id: string
  providerID: string
  variant?: string
}

function requireService() {
  const service = readOpencodeService()
  if (!service) throw new Error("Service OpenCode indisponible")
  return service
}

function authHeaders(password: string): HeadersInit {
  const headers: Record<string, string> = {
    authorization: opencodeAuthHeader(password),
    accept: "application/json",
  }
  const directory = getCurrentProject()?.directory?.trim()
  if (directory) headers["x-opencode-directory"] = encodeURIComponent(directory)
  return headers
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    const data = (value as { data?: unknown }).data
    if (Array.isArray(data)) return data
  }
  return []
}

function variantLabel(id: string): string {
  const labels: Record<string, string> = {
    none: "None",
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "XHigh",
    max: "Max",
    default: "Default",
  }
  return labels[id] || id
}

function normalizeModel(raw: unknown): ModelInfo | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id =
    typeof row.id === "string"
      ? row.id
      : typeof row.modelID === "string"
        ? row.modelID
        : ""
  const providerID = typeof row.providerID === "string" ? row.providerID : ""
  if (!id || !providerID) return null
  if (row.enabled === false) return null
  if (row.status != null && row.status !== "active") return null

  const variants = Array.isArray(row.variants)
    ? row.variants
        .map((v) => {
          if (!v || typeof v !== "object") return null
          const id =
            typeof (v as { id?: unknown }).id === "string"
              ? (v as { id: string }).id
              : ""
          if (!id) return null
          return { id, label: variantLabel(id) }
        })
        .filter(Boolean) as ModelVariant[]
    : []

  return {
    id,
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : id,
    providerID,
    variants,
  }
}

export async function listModels(): Promise<ModelInfo[]> {
  const service = requireService()
  const result = await fetchOpencodeJson(
    `${service.url}/api/model`,
    { headers: authHeaders(service.password) },
    10000,
  )
  if (!result.ok) throw new Error(`Modèles indisponibles (HTTP ${result.status})`)
  const models = asArray(result.data).map(normalizeModel).filter(Boolean) as ModelInfo[]
  // Prefer OpenCode Zen free models near the top, then alpha by name.
  models.sort((a, b) => {
    const aOc = a.providerID === "opencode" ? 0 : 1
    const bOc = b.providerID === "opencode" ? 0 : 1
    if (aOc !== bOc) return aOc - bOc
    return a.name.localeCompare(b.name, "fr")
  })
  return models
}

export async function getDefaultModel(): Promise<ModelInfo | null> {
  const service = requireService()
  const result = await fetchOpencodeJson(
    `${service.url}/api/model/default`,
    { headers: authHeaders(service.password) },
    5000,
  )
  if (!result.ok) return null
  const data =
    result.data && typeof result.data === "object" && "data" in result.data
      ? (result.data as { data: unknown }).data
      : result.data
  return normalizeModel(data)
}

export async function switchSessionModel(
  sessionID: string,
  model: ModelSelection,
): Promise<void> {
  if (!model.id || !model.providerID) throw new Error("Modèle invalide")
  const service = requireService()
  const body: { model: ModelSelection } = {
    model: {
      id: model.id,
      providerID: model.providerID,
    },
  }
  if (model.variant) body.model.variant = model.variant

  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/model`,
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
  if (!result.ok && result.status !== 204) {
    const message =
      result.data && typeof result.data === "object" && "message" in result.data
        ? String((result.data as { message?: unknown }).message || "")
        : ""
    throw new Error(message || `Impossible de changer de modèle (HTTP ${result.status})`)
  }
}
