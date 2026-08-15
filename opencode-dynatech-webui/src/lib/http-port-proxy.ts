import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http"

/**
 * Reverse-proxy on a public port (typically 80) toward the UI port,
 * so http://alfred.local/ works without :9877 in the URL.
 * Binding port 80 usually needs admin rights on macOS/Linux.
 */
export async function startHttpPortProxy(options: {
  listenPort: number
  targetPort: number
  listenHost?: string
}): Promise<{ server: Server; stop: () => Promise<void> } | null> {
  const listenPort = options.listenPort
  const targetPort = options.targetPort
  if (!listenPort || listenPort <= 0) return null
  if (listenPort === targetPort) return null

  const listenHost = options.listenHost || "0.0.0.0"

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` }
    const upstream = httpRequest(
      {
        hostname: "127.0.0.1",
        port: targetPort,
        path: req.url || "/",
        method: req.method,
        headers,
      },
      (upRes) => {
        res.writeHead(upRes.statusCode || 502, upRes.headers)
        upRes.pipe(res)
      },
    )
    upstream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "text/plain; charset=utf-8" })
      }
      res.end("UI indisponible")
    })
    req.pipe(upstream)
  })

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(listenPort, listenHost, () => resolve())
    })
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    const code = err?.code || ""
    if (code === "EACCES") {
      console.warn(
        `[opencode-webui] Port ${listenPort} refusé (permissions). ` +
          `http://alfred.local/ sans numéro de port nécessite les droits admin ` +
          `(ou laissez http://alfred.local:${targetPort}/).`,
      )
    } else if (code === "EADDRINUSE") {
      console.warn(
        `[opencode-webui] Port ${listenPort} déjà utilisé — ` +
          `impossible d'exposer alfred.local sans :${targetPort}.`,
      )
    } else {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[opencode-webui] Proxy :${listenPort}: ${message}`)
    }
    try {
      server.close()
    } catch {
      // ignore
    }
    return null
  }

  return {
    server,
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
      }),
  }
}
