import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { WebuiModule } from "./module.ts"

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(payload)
}

function sendHtml(res: ServerResponse, html: string) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(html)
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/**
 * Proxy mapping:
 *   /api/cron           -> ${cronApiUrl}/api/tasks
 *   /api/cron/preview   -> ${cronApiUrl}/api/tasks/preview
 *   /api/cron/:id       -> ${cronApiUrl}/api/tasks/:id
 *   /api/cron/:id/run   -> ${cronApiUrl}/api/tasks/:id/run
 */
function mapCronProxyPath(pathname: string): string | null {
  if (pathname === "/api/cron") return "/api/tasks"
  if (!pathname.startsWith("/api/cron/")) return null
  return "/api/tasks/" + pathname.slice("/api/cron/".length)
}

async function proxyToCron(
  cronApiUrl: string,
  req: IncomingMessage,
  res: ServerResponse,
  targetPath: string,
  search: string,
): Promise<void> {
  const method = (req.method || "GET").toUpperCase()
  const body =
    method === "GET" || method === "HEAD" || method === "DELETE"
      ? undefined
      : await readBody(req)

  let upstream: Response
  try {
    upstream = await fetch(`${cronApiUrl}${targetPath}${search}`, {
      method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
        accept: "application/json",
      },
      body: body && body.length ? body : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    sendJson(res, 502, {
      error: `API cron indisponible (${cronApiUrl}): ${message}`,
    })
    return
  }

  const text = await upstream.text()
  res.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(text)
}

function findModule(modules: readonly WebuiModule[], pathname: string): WebuiModule | undefined {
  const normalized = pathname.replace(/\/$/, "") || "/"
  for (const mod of modules) {
    const mounts = [mod.mountPath, ...(mod.aliases || [])]
    for (const mount of mounts) {
      const m = mount.replace(/\/$/, "") || "/"
      if (normalized === m) return mod
    }
  }
  return undefined
}

export async function startWebuiServer(options: {
  port: number
  cronApiUrl: string
  modules: readonly WebuiModule[]
}): Promise<{ server: Server; url: string }> {
  const { port, cronApiUrl, modules } = options

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`)
      const method = (req.method || "GET").toUpperCase()

      const cronPath = mapCronProxyPath(url.pathname)
      if (cronPath) {
        await proxyToCron(cronApiUrl, req, res, cronPath, url.search)
        return
      }

      if (method === "GET") {
        const mod = findModule(modules, url.pathname)
        if (mod) {
          sendHtml(res, await mod.renderPage())
          return
        }
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
