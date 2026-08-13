import type { IncomingMessage, ServerResponse } from "node:http"
import * as mcps from "../services/mcps.ts"
import * as projects from "../services/projects.ts"
import * as sessions from "../services/sessions.ts"
import * as skills from "../services/skills.ts"
import * as status from "../services/status.ts"
import * as tools from "../services/tools.ts"

export interface ConfigApiOptions {
  cronApiUrl: string
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(JSON.stringify(body))
}

export async function handleConfigApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  options: ConfigApiOptions,
): Promise<boolean> {
  const { pathname } = url
  const method = (req.method || "GET").toUpperCase()

  try {
    if (pathname === "/api/status" && method === "GET") {
      sendJson(res, 200, await status.getStatus(options.cronApiUrl))
      return true
    }

    if (pathname === "/api/sessions/recent" && method === "GET") {
      const limitRaw = url.searchParams.get("limit")
      const limit = limitRaw ? Number(limitRaw) : 8
      sendJson(res, 200, {
        sessions: await sessions.listRecentSessions(
          Number.isFinite(limit) ? limit : 8,
        ),
      })
      return true
    }

    // Projects
    if (pathname === "/api/projects" && method === "GET") {
      sendJson(res, 200, projects.getProjectsPayload())
      return true
    }
    if (pathname === "/api/projects" && method === "POST") {
      const body = (await readJson(req)) as { name?: string }
      if (!body.name || typeof body.name !== "string") {
        sendJson(res, 400, { error: "name requis" })
        return true
      }
      const project = projects.addDesktopProject(body.name)
      sendJson(res, 201, { ok: true, project, ...projects.getProjectsPayload() })
      return true
    }
    if (pathname === "/api/projects/current" && method === "GET") {
      sendJson(res, 200, { current: projects.getCurrentProject() })
      return true
    }
    if (pathname === "/api/projects/current" && (method === "PUT" || method === "POST")) {
      const body = (await readJson(req)) as { id?: string }
      if (!body.id || typeof body.id !== "string") {
        sendJson(res, 400, { error: "id requis" })
        return true
      }
      const current = projects.setCurrentProject(body.id)
      sendJson(res, 200, { ok: true, current, ...projects.getProjectsPayload() })
      return true
    }

    // Skills
    if (pathname === "/api/skills" && method === "GET") {
      sendJson(res, 200, { skills: skills.listSkills() })
      return true
    }
    if (pathname === "/api/skills" && method === "POST") {
      const body = (await readJson(req)) as skills.SkillInput
      const skill = skills.upsertSkill(body)
      sendJson(res, 201, { ok: true, skill, skills: skills.listSkills() })
      return true
    }
    {
      const m = pathname.match(/^\/api\/skills\/([^/]+)$/)
      if (m) {
        const id = decodeURIComponent(m[1]!)
        if (method === "GET") {
          sendJson(res, 200, { skill: skills.getSkill(id) })
          return true
        }
        if (method === "PUT" || method === "PATCH") {
          const body = (await readJson(req)) as skills.SkillInput
          const skill = skills.upsertSkill({ ...body, id })
          sendJson(res, 200, { ok: true, skill, skills: skills.listSkills() })
          return true
        }
        if (method === "DELETE") {
          sendJson(res, 200, { ok: true, skills: skills.deleteSkill(id) })
          return true
        }
      }
    }

    // Tools
    if (pathname === "/api/tools" && method === "GET") {
      sendJson(res, 200, {
        tools: tools.listTools(),
        template: tools.getDefaultToolTemplate(),
      })
      return true
    }
    if (pathname === "/api/tools" && method === "POST") {
      const body = (await readJson(req)) as tools.ToolInput
      const tool = tools.upsertTool(body)
      sendJson(res, 201, { ok: true, tool, tools: tools.listTools() })
      return true
    }
    {
      const enabled = pathname.match(/^\/api\/tools\/([^/]+)\/enabled$/)
      if (enabled && method === "PUT") {
        const id = decodeURIComponent(enabled[1]!)
        const body = (await readJson(req)) as { enabled?: boolean }
        sendJson(res, 200, {
          ok: true,
          tools: tools.setToolEnabled(id, Boolean(body.enabled)),
        })
        return true
      }
      const m = pathname.match(/^\/api\/tools\/([^/]+)$/)
      if (m) {
        const id = decodeURIComponent(m[1]!)
        if (method === "GET") {
          sendJson(res, 200, { tool: tools.getTool(id) })
          return true
        }
        if (method === "PUT" || method === "PATCH") {
          const body = (await readJson(req)) as tools.ToolInput
          const tool = tools.upsertTool({ ...body, id })
          sendJson(res, 200, { ok: true, tool, tools: tools.listTools() })
          return true
        }
        if (method === "DELETE") {
          sendJson(res, 200, { ok: true, tools: tools.deleteTool(id) })
          return true
        }
      }
    }

    // MCPs
    if (pathname === "/api/mcps" && method === "GET") {
      sendJson(res, 200, { mcps: mcps.listMcps() })
      return true
    }
    if (pathname === "/api/mcps" && method === "POST") {
      const body = (await readJson(req)) as mcps.McpInput
      const mcp = mcps.upsertMcp(body)
      sendJson(res, 201, { ok: true, mcp, mcps: mcps.listMcps() })
      return true
    }
    {
      const m = pathname.match(/^\/api\/mcps\/([^/]+)$/)
      if (m) {
        const id = decodeURIComponent(m[1]!)
        if (method === "GET") {
          sendJson(res, 200, { mcp: mcps.getMcp(id) })
          return true
        }
        if (method === "PUT" || method === "PATCH") {
          const body = (await readJson(req)) as mcps.McpInput
          const mcp = mcps.upsertMcp({ ...body, id })
          sendJson(res, 200, { ok: true, mcp, mcps: mcps.listMcps() })
          return true
        }
        if (method === "DELETE") {
          sendJson(res, 200, { ok: true, mcps: mcps.deleteMcp(id) })
          return true
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    sendJson(res, 400, { error: message })
    return true
  }

  return false
}
