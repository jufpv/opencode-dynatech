import {
  fetchOpencodeJson,
  opencodeAuthHeader,
  readOpencodeService,
} from "../lib/opencode-service.ts"
import { getCurrentProject } from "./projects.ts"

export type PermissionReply = "once" | "always" | "reject"

export interface PermissionRequest {
  id: string
  sessionID: string
  action: string
  resources: string[]
  save?: string[]
  metadata?: Record<string, unknown>
  source?: { type: "tool"; messageID: string; id: string }
}

export interface QuestionOption {
  value: string
  label: string
  description: string
}

export interface QuestionInfo {
  key: string
  question: string
  header: string
  options: QuestionOption[]
  multiple?: boolean
}

/** User questions are OpenCode session forms with metadata.kind === "question". */
export interface QuestionRequest {
  id: string
  sessionID: string
  title?: string
  questions: QuestionInfo[]
  tool?: { messageID: string; id: string }
}

export type FormAnswer = Record<string, string | string[]>

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
  if (directory) {
    headers["x-opencode-directory"] = encodeURIComponent(directory)
  }
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

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = String((data as { error?: unknown }).error || "")
    if (err) return err
  }
  if (data && typeof data === "object" && "message" in data) {
    const msg = String((data as { message?: unknown }).message || "")
    if (msg) return msg
  }
  return fallback
}

function normalizePermission(raw: unknown): PermissionRequest | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === "string" ? row.id : ""
  const sessionID = typeof row.sessionID === "string" ? row.sessionID : ""
  if (!id || !sessionID) return null

  const action =
    typeof row.action === "string"
      ? row.action
      : typeof row.permission === "string"
        ? row.permission
        : "permission"
  const resources = Array.isArray(row.resources)
    ? row.resources.filter((x): x is string => typeof x === "string")
    : Array.isArray(row.patterns)
      ? row.patterns.filter((x): x is string => typeof x === "string")
      : []

  return {
    id,
    sessionID,
    action,
    resources,
    save: Array.isArray(row.save)
      ? row.save.filter((x): x is string => typeof x === "string")
      : Array.isArray(row.always)
        ? row.always.filter((x): x is string => typeof x === "string")
        : undefined,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    source:
      row.source && typeof row.source === "object"
        ? (row.source as PermissionRequest["source"])
        : undefined,
  }
}

function normalizeFormOption(raw: unknown): QuestionOption | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const value =
    typeof o.value === "string"
      ? o.value
      : typeof o.label === "string"
        ? o.label
        : ""
  const label = typeof o.label === "string" ? o.label : value
  if (!value && !label) return null
  return {
    value: value || label,
    label: label || value,
    description: typeof o.description === "string" ? o.description : "",
  }
}

/** Normalize an OpenCode form (or legacy question request) into UI shape. */
export function normalizeQuestion(raw: unknown): QuestionRequest | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === "string" ? row.id : ""
  const sessionID = typeof row.sessionID === "string" ? row.sessionID : ""
  if (!id || !sessionID) return null

  // Form API (current OpenCode desktop)
  if (Array.isArray(row.fields)) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined
    const kind = typeof meta?.kind === "string" ? meta.kind : "question"
    if (kind && kind !== "question") return null

    const questions = row.fields
      .map((field, index) => {
        if (!field || typeof field !== "object") return null
        const f = field as Record<string, unknown>
        const key =
          typeof f.key === "string" && f.key.trim()
            ? f.key.trim()
            : `q${index}`
        const header =
          typeof f.title === "string"
            ? f.title
            : typeof f.header === "string"
              ? f.header
              : ""
        const question =
          typeof f.description === "string"
            ? f.description
            : typeof f.question === "string"
              ? f.question
              : header
        if (!question && !header) return null
        const options = Array.isArray(f.options)
          ? (f.options.map(normalizeFormOption).filter(Boolean) as QuestionOption[])
          : []
        return {
          key,
          question: question || header,
          header: header || question,
          options,
          multiple: f.type === "multiselect" || Boolean(f.multiple),
        } satisfies QuestionInfo
      })
      .filter(Boolean) as QuestionInfo[]

    const tool =
      meta?.tool && typeof meta.tool === "object"
        ? (meta.tool as QuestionRequest["tool"])
        : undefined

    return {
      id,
      sessionID,
      title: typeof row.title === "string" ? row.title : undefined,
      questions,
      tool,
    }
  }

  // Legacy question.* API
  const questions = Array.isArray(row.questions)
    ? (row.questions
        .map((q, index) => {
          if (!q || typeof q !== "object") return null
          const item = q as Record<string, unknown>
          const question = typeof item.question === "string" ? item.question : ""
          const header = typeof item.header === "string" ? item.header : question
          if (!question && !header) return null
          const options = Array.isArray(item.options)
            ? (item.options
                .map((opt) => {
                  const normalized = normalizeFormOption(opt)
                  if (normalized) return normalized
                  if (!opt || typeof opt !== "object") return null
                  const o = opt as Record<string, unknown>
                  const label = typeof o.label === "string" ? o.label : ""
                  if (!label) return null
                  return {
                    value: label,
                    label,
                    description: typeof o.description === "string" ? o.description : "",
                  }
                })
                .filter(Boolean) as QuestionOption[])
            : []
          return {
            key: `q${index}`,
            question: question || header,
            header: header || question,
            options,
            multiple: Boolean(item.multiple),
          } satisfies QuestionInfo
        })
        .filter(Boolean) as QuestionInfo[])
    : []

  return {
    id,
    sessionID,
    questions,
    tool:
      row.tool && typeof row.tool === "object"
        ? (row.tool as QuestionRequest["tool"])
        : undefined,
  }
}

export async function listSessionPermissions(sessionID: string): Promise<PermissionRequest[]> {
  const service = requireService()
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/permission`,
    { headers: authHeaders(service.password) },
    5000,
  )
  if (!result.ok) {
    throw new Error(errorMessage(result.data, `Permissions indisponibles (HTTP ${result.status})`))
  }
  return asArray(result.data).map(normalizePermission).filter(Boolean) as PermissionRequest[]
}

export async function replySessionPermission(
  sessionID: string,
  requestID: string,
  reply: PermissionReply,
  message?: string,
): Promise<void> {
  if (reply !== "once" && reply !== "always" && reply !== "reject") {
    throw new Error("Réponse invalide")
  }
  const service = requireService()
  const body: { reply: PermissionReply; message?: string } = { reply }
  if (typeof message === "string" && message.trim()) body.message = message.trim()
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/permission/${encodeURIComponent(requestID)}/reply`,
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
  if (!result.ok) {
    throw new Error(errorMessage(result.data, `Impossible de répondre (HTTP ${result.status})`))
  }
}

export async function listSessionQuestions(sessionID: string): Promise<QuestionRequest[]> {
  const service = requireService()
  const headers = authHeaders(service.password)

  // Prefer Form API (what OpenCode Desktop uses for user questions).
  const formResult = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/form`,
    { headers },
    5000,
  )
  if (formResult.ok) {
    return asArray(formResult.data).map(normalizeQuestion).filter(Boolean) as QuestionRequest[]
  }

  // Fallback: legacy question requests
  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/question`,
    { headers },
    5000,
  )
  if (!result.ok) {
    throw new Error(errorMessage(result.data, `Questions indisponibles (HTTP ${result.status})`))
  }
  return asArray(result.data).map(normalizeQuestion).filter(Boolean) as QuestionRequest[]
}

export async function replySessionQuestion(
  sessionID: string,
  requestID: string,
  answer: FormAnswer | string[][],
): Promise<void> {
  const service = requireService()
  const headers = {
    ...authHeaders(service.password),
    "content-type": "application/json",
  }

  // Form IDs start with frm_
  if (requestID.startsWith("frm_")) {
    const body =
      answer && !Array.isArray(answer)
        ? { answer }
        : {
            answer: Object.fromEntries(
              (answer as string[][]).map((row, i) => [
                `q${i}`,
                row.length <= 1 ? row[0] || "" : row,
              ]),
            ),
          }
    const result = await fetchOpencodeJson(
      `${service.url}/api/session/${encodeURIComponent(sessionID)}/form/${encodeURIComponent(requestID)}/reply`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
      8000,
    )
    // 204 No Content is success
    if (!result.ok && result.status !== 204) {
      throw new Error(errorMessage(result.data, `Impossible de répondre (HTTP ${result.status})`))
    }
    return
  }

  if (!Array.isArray(answer)) {
    const answers = Object.keys(answer)
      .sort()
      .map((key) => {
        const value = answer[key]
        return Array.isArray(value) ? value.map(String) : [String(value ?? "")]
      })
    return replySessionQuestion(sessionID, requestID, answers)
  }

  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/question/${encodeURIComponent(requestID)}/reply`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ answers: answer }),
    },
    8000,
  )
  if (!result.ok) {
    throw new Error(errorMessage(result.data, `Impossible de répondre (HTTP ${result.status})`))
  }
}

export async function rejectSessionQuestion(
  sessionID: string,
  requestID: string,
): Promise<void> {
  const service = requireService()
  const headers = authHeaders(service.password)

  if (requestID.startsWith("frm_")) {
    const result = await fetchOpencodeJson(
      `${service.url}/api/session/${encodeURIComponent(sessionID)}/form/${encodeURIComponent(requestID)}/cancel`,
      { method: "POST", headers },
      8000,
    )
    if (!result.ok && result.status !== 204) {
      throw new Error(errorMessage(result.data, `Impossible d'ignorer (HTTP ${result.status})`))
    }
    return
  }

  const result = await fetchOpencodeJson(
    `${service.url}/api/session/${encodeURIComponent(sessionID)}/question/${encodeURIComponent(requestID)}/reject`,
    { method: "POST", headers },
    8000,
  )
  if (!result.ok) {
    throw new Error(errorMessage(result.data, `Impossible de refuser (HTTP ${result.status})`))
  }
}
