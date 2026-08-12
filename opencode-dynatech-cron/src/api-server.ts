import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { Scheduler } from "./scheduler.ts"

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  })
  res.end(payload)
}

function summarize(scheduler: Scheduler) {
  return scheduler.list().map((task) => ({
    ...task,
    nextRunAt: scheduler.nextRun(task.id),
    lastRunStatus: task.lastError ? "error" : task.lastRunAt ? "success" : "never",
  }))
}

async function handleApi(
  scheduler: Scheduler,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const { pathname } = url
  const method = (req.method || "GET").toUpperCase()

  if (method === "OPTIONS") {
    sendJson(res, 204, {})
    return
  }

  if (pathname === "/api/tasks" && method === "GET") {
    sendJson(res, 200, {
      tasks: summarize(scheduler),
      timezone: scheduler.getTimezone(),
      directory: scheduler.getDirectory() ?? null,
    })
    return
  }

  if (pathname === "/api/tasks/preview" && method === "POST") {
    const raw = await readBody(req)
    const body = raw ? JSON.parse(raw) : {}
    try {
      const preview = scheduler.preview(String(body.cron || ""))
      sendJson(res, 200, { ok: true, ...preview })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      sendJson(res, 400, { ok: false, error: message })
    }
    return
  }

  if (pathname === "/api/tasks" && method === "POST") {
    const raw = await readBody(req)
    const body = raw ? JSON.parse(raw) : {}
    const task = await scheduler.create({
      name: String(body.name || ""),
      cron: String(body.cron || ""),
      message: String(body.message || ""),
      agent: body.agent == null || body.agent === "" ? undefined : String(body.agent),
      enabled: body.enabled == null ? true : Boolean(body.enabled),
    })
    sendJson(res, 201, {
      ok: true,
      task: {
        ...task,
        nextRunAt: scheduler.nextRun(task.id),
        lastRunStatus: "never",
      },
      tasks: summarize(scheduler),
    })
    return
  }

  const match = pathname.match(/^\/api\/tasks\/([^/]+)(?:\/(run))?$/)
  if (!match) {
    sendJson(res, 404, { error: "Not found" })
    return
  }

  const id = decodeURIComponent(match[1] || "")
  const action = match[2]

  if (action === "run" && method === "POST") {
    const result = await scheduler.runNow(id)
    sendJson(res, result.error ? 500 : 200, result)
    return
  }

  if (method === "PUT" || method === "PATCH") {
    const raw = await readBody(req)
    const body = raw ? JSON.parse(raw) : {}
    const task = await scheduler.update(id, {
      name: body.name == null ? undefined : String(body.name),
      cron: body.cron == null ? undefined : String(body.cron),
      message: body.message == null ? undefined : String(body.message),
      agent:
        body.agent === undefined
          ? undefined
          : body.agent == null || body.agent === ""
            ? null
            : String(body.agent),
      enabled: body.enabled == null ? undefined : Boolean(body.enabled),
    })
    sendJson(res, 200, {
      ok: true,
      task: {
        ...task,
        nextRunAt: scheduler.nextRun(task.id),
        lastRunStatus: task.lastError ? "error" : task.lastRunAt ? "success" : "never",
      },
      tasks: summarize(scheduler),
    })
    return
  }

  if (method === "DELETE") {
    const task = await scheduler.remove(id)
    sendJson(res, 200, { ok: true, task, tasks: summarize(scheduler) })
    return
  }

  sendJson(res, 405, { error: "Method not allowed" })
}

export async function startApiServer(
  scheduler: Scheduler,
  port: number,
): Promise<{ server: Server; url: string }> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`)
      if (url.pathname.startsWith("/api/")) {
        await handleApi(scheduler, req, res, url)
        return
      }
      sendJson(res, 404, { error: "Not found" })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      sendJson(res, 500, { error: message })
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", () => resolve())
  })

  return {
    server,
    url: `http://127.0.0.1:${port}`,
  }
}
