import { spawn, type ChildProcess } from "node:child_process"
import { networkInterfaces, platform } from "node:os"

export interface MdnsHandle {
  hostname: string
  url: string
  stop: () => void
}

/** First non-internal IPv4 address (LAN). */
export function pickLanIPv4(): string | null {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      const family = entry.family
      const isV4 = family === "IPv4" || family === 4
      if (!isV4 || entry.internal) continue
      if (entry.address) return entry.address
    }
  }
  return null
}

function normalizeHostname(raw: string): string | null {
  const host = raw.trim().replace(/\.local$/i, "")
  if (!host) return null
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(host)) return null
  return host.toLowerCase()
}

function stopChild(child: ChildProcess | undefined) {
  if (!child || child.killed) return
  try {
    child.kill("SIGTERM")
  } catch {
    // ignore
  }
}

/**
 * Advertise `<hostname>.local` on the LAN so phones/browsers can open
 * `http://alfred.local:9877/` without knowing the Mac IP.
 *
 * macOS: `dns-sd -P` (Bonjour). Linux: `avahi-publish-address` when available.
 */
export function startMdnsAdvertisement(options: {
  hostname: string
  port: number
  serviceName?: string
}): MdnsHandle | null {
  const hostname = normalizeHostname(options.hostname)
  if (!hostname) return null
  if (!options.port || options.port <= 0) return null

  const ip = pickLanIPv4()
  if (!ip) {
    console.warn("[opencode-webui] mDNS: aucune adresse LAN IPv4")
    return null
  }

  const fqdn = `${hostname}.local`
  const url =
    options.port === 80 ? `http://${fqdn}` : `http://${fqdn}:${options.port}`
  const serviceName = (options.serviceName || hostname).trim() || hostname
  const os = platform()
  const children: ChildProcess[] = []

  if (os === "darwin") {
    // Registers alfred.local → LAN IP and _http._tcp on the advertised port.
    const child = spawn(
      "dns-sd",
      [
        "-P",
        serviceName,
        "_http._tcp",
        "local",
        String(options.port),
        fqdn,
        ip,
      ],
      { stdio: "ignore" },
    )
    child.on("error", (err) => {
      console.warn(`[opencode-webui] mDNS dns-sd: ${err.message}`)
    })
    children.push(child)
  } else if (os === "linux") {
    const addr = spawn("avahi-publish-address", ["-R", fqdn, ip], {
      stdio: "ignore",
    })
    addr.on("error", (err) => {
      console.warn(`[opencode-webui] mDNS avahi-publish-address: ${err.message}`)
    })
    children.push(addr)

    const svc = spawn(
      "avahi-publish-service",
      [serviceName, "_http._tcp", String(options.port)],
      { stdio: "ignore" },
    )
    svc.on("error", () => {
      // optional
    })
    children.push(svc)
  } else {
    console.warn(`[opencode-webui] mDNS non supporté sur ${os}`)
    return null
  }

  return {
    hostname: fqdn,
    url,
    stop: () => {
      for (const child of children) stopChild(child)
    },
  }
}
