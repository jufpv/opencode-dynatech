import {
  fetchOpencodeJson,
  opencodeAuthHeader,
  readOpencodeService,
} from "../lib/opencode-service.ts"

export interface StatusPayload {
  cronConnected: boolean
  opencodeConnected: boolean
  modelConnected: boolean
  modelName: string | null
}

async function checkCron(cronApiUrl: string): Promise<boolean> {
  const base = cronApiUrl.replace(/\/$/, "")
  const result = await fetchOpencodeJson(`${base}/api/tasks`)
  return result.ok
}

async function checkOpencode(
  url: string,
  password: string,
): Promise<boolean> {
  const result = await fetchOpencodeJson(`${url}/api/health`, {
    headers: {
      authorization: opencodeAuthHeader(password),
      accept: "application/json",
    },
  })
  if (!result.ok || !result.data || typeof result.data !== "object") return false
  const healthy = (result.data as { healthy?: unknown }).healthy
  return healthy === true || healthy === undefined
}

async function checkModel(
  url: string,
  password: string,
): Promise<{ ok: boolean; name: string | null }> {
  const result = await fetchOpencodeJson(`${url}/api/model/default`, {
    headers: {
      authorization: opencodeAuthHeader(password),
      accept: "application/json",
    },
  })
  if (!result.ok || !result.data || typeof result.data !== "object") {
    return { ok: false, name: null }
  }
  const payload = result.data as {
    data?: { name?: string; id?: string; status?: string; enabled?: boolean }
  }
  const model = payload.data
  if (!model) return { ok: false, name: null }
  const name = (model.name || model.id || "").trim() || null
  const ok =
    model.enabled !== false && (model.status == null || model.status === "active")
  return { ok: ok && Boolean(name), name }
}

export async function getStatus(cronApiUrl: string): Promise<StatusPayload> {
  const service = readOpencodeService()
  const cronConnected = await checkCron(cronApiUrl)

  if (!service) {
    return {
      cronConnected,
      opencodeConnected: false,
      modelConnected: false,
      modelName: null,
    }
  }

  const opencodeConnected = await checkOpencode(service.url, service.password)
  if (!opencodeConnected) {
    return {
      cronConnected,
      opencodeConnected: false,
      modelConnected: false,
      modelName: null,
    }
  }

  const model = await checkModel(service.url, service.password)
  return {
    cronConnected,
    opencodeConnected: true,
    modelConnected: model.ok,
    modelName: model.name,
  }
}
