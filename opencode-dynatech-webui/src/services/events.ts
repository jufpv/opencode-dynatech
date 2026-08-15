import type { IncomingMessage, ServerResponse } from "node:http"
import {
  opencodeAuthHeader,
  readOpencodeService,
} from "../lib/opencode-service.ts"

/** OpenCode SSE event types we forward to the chat UI. */
const FORWARDED = new Set([
  "session.text.started",
  "session.text.delta",
  "session.text.ended",
  "session.reasoning.started",
  "session.reasoning.delta",
  "session.reasoning.ended",
  "session.tool.input.started",
  "session.tool.called",
  "session.tool.success",
  "session.tool.failed",
  "session.execution.started",
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted",
  "session.step.ended",
  "session.idle",
  "session.status",
])

function sessionIdFromEvent(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null
  const data = (parsed as { data?: unknown }).data
  if (!data || typeof data !== "object") return null
  const sessionID = (data as { sessionID?: unknown }).sessionID
  return typeof sessionID === "string" ? sessionID : null
}

function eventType(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null
  const type = (parsed as { type?: unknown }).type
  return typeof type === "string" ? type : null
}

/**
 * Proxy OpenCode `/api/event` SSE to the browser (keeps OpenCode auth server-side).
 * Optional `?session=ses_…` filters to one session.
 */
export async function proxyOpencodeEventStream(
  req: IncomingMessage,
  res: ServerResponse,
  sessionFilter: string | null,
): Promise<void> {
  const service = readOpencodeService()
  if (!service) {
    res.writeHead(503, { "content-type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ error: "Service OpenCode indisponible" }))
    return
  }

  let upstream: Response
  try {
    upstream = await fetch(`${service.url}/api/event`, {
      headers: {
        authorization: opencodeAuthHeader(service.password),
        accept: "text/event-stream",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ error: `Flux OpenCode indisponible: ${message}` }))
    return
  }

  if (!upstream.ok || !upstream.body) {
    res.writeHead(upstream.status || 502, {
      "content-type": "application/json; charset=utf-8",
    })
    res.end(JSON.stringify({ error: "Impossible d'ouvrir le flux d'événements" }))
    return
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  })
  res.write(": connected\n\n")

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let closed = false

  const close = () => {
    if (closed) return
    closed = true
    try {
      reader.cancel().catch(() => {})
    } catch {
      // ignore
    }
    try {
      res.end()
    } catch {
      // ignore
    }
  }

  req.on("close", close)
  req.on("aborted", close)

  const heartbeat = setInterval(() => {
    if (closed) return
    try {
      res.write(": ping\n\n")
    } catch {
      close()
    }
  }, 15000)

  try {
    while (!closed) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let split = buffer.indexOf("\n\n")
      while (split !== -1) {
        const raw = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        split = buffer.indexOf("\n\n")

        const dataLines: string[] = []
        for (const line of raw.split("\n")) {
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
        }
        if (!dataLines.length) continue

        const payload = dataLines.join("\n")
        let parsed: unknown
        try {
          parsed = JSON.parse(payload)
        } catch {
          continue
        }

        const type = eventType(parsed)
        if (!type || !FORWARDED.has(type)) continue

        if (sessionFilter) {
          const sid = sessionIdFromEvent(parsed)
          if (sid && sid !== sessionFilter) continue
        }

        if (closed) return
        res.write(`data: ${JSON.stringify(parsed)}\n\n`)
        if (typeof (res as ServerResponse & { flush?: () => void }).flush === "function") {
          ;(res as ServerResponse & { flush: () => void }).flush()
        }
      }
    }
  } catch {
    // client or upstream closed
  } finally {
    clearInterval(heartbeat)
    close()
  }
}
