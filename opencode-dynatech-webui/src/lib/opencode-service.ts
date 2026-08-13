import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

export interface OpencodeServiceInfo {
  url: string
  password: string
}

export function readOpencodeService(): OpencodeServiceInfo | null {
  const path = join(homedir(), ".local", "state", "opencode", "service.json")
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as {
      url?: string
      password?: string
    }
    if (!data.url || !data.password) return null
    return { url: data.url.replace(/\/$/, ""), password: data.password }
  } catch {
    return null
  }
}

export function opencodeAuthHeader(password: string): string {
  return `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`
}

export async function fetchOpencodeJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 2500,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  } finally {
    clearTimeout(timer)
  }
}
