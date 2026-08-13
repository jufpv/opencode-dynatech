import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { networkInterfaces } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { handleConfigApi } from "./api/router.ts"
import type { WebuiModule } from "./module.ts"

/** Bind all interfaces so LAN devices (e.g. iPhone) can reach the UI. */
const LISTEN_HOST = "0.0.0.0"

function lanUrls(port: number): string[] {
  const urls: string[] = []
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      const family = entry.family
      const isV4 = family === "IPv4" || family === 4
      if (!isV4 || entry.internal) continue
      urls.push(`http://${entry.address}:${port}`)
    }
  }
  return urls
}

const SHELL_DIR = join(dirname(fileURLToPath(import.meta.url)), "shell")

const STATIC_ASSETS: Record<string, { file: string; type: string }> = {
  "/code-editor.js": { file: "code-editor.js", type: "text/javascript; charset=utf-8" },
  "/code-editor.css": { file: "code-editor.css", type: "text/css; charset=utf-8" },
  "/logo.png": { file: "logo.png", type: "image/png" },
}

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
}): Promise<{ server: Server; url: string; lanUrls: string[] }> {
  const { port, cronApiUrl, modules } = options

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`)
      const method = (req.method || "GET").toUpperCase()

      if (await handleConfigApi(req, res, url)) return

      const cronPath = mapCronProxyPath(url.pathname)
      if (cronPath) {
        await proxyToCron(cronApiUrl, req, res, cronPath, url.search)
        return
      }

      if (method === "GET") {
        const asset = STATIC_ASSETS[url.pathname]
        if (asset) {
          const path = join(SHELL_DIR, asset.file)
          if (!existsSync(path)) {
            sendJson(res, 404, { error: "Not found" })
            return
          }
          res.writeHead(200, {
            "content-type": asset.type,
            "cache-control": "no-store",
          })
          res.end(readFileSync(path))
          return
        }

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
    server.listen(port, LISTEN_HOST, () => resolve())
  })

  return {
    server,
    url: `http://127.0.0.1:${port}`,
    lanUrls: lanUrls(port),
  }
}
