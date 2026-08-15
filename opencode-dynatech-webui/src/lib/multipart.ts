import type { IncomingMessage } from "node:http"

export interface MultipartFile {
  field: string
  filename: string
  mime: string
  data: Buffer
}

export interface MultipartForm {
  fields: Record<string, string>
  files: MultipartFile[]
}

function headerValue(headers: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\r?\\n)${name}\\s*:\\s*([^\\r\\n]+)`, "i")
  const m = re.exec(headers)
  return m ? m[1]!.trim() : null
}

function parseContentDisposition(value: string): { name: string; filename: string | null } {
  const nameMatch = /(?:^|;)\s*name="([^"]*)"/i.exec(value)
  const fileMatch = /(?:^|;)\s*filename\*?=(?:UTF-8''|")([^";]+)"?/i.exec(value)
  let filename: string | null = null
  if (fileMatch) {
    try {
      filename = decodeURIComponent(fileMatch[1]!.replace(/"/g, "").trim())
    } catch {
      filename = fileMatch[1]!.replace(/"/g, "").trim()
    }
  }
  // Prefer classic filename="..." when present
  const classic = /(?:^|;)\s*filename="([^"]*)"/i.exec(value)
  if (classic) filename = classic[1] || filename
  return {
    name: nameMatch?.[1] || "",
    filename,
  }
}

export async function readMultipartForm(
  req: IncomingMessage,
  maxBytes = 100 * 1024 * 1024,
): Promise<MultipartForm> {
  const contentType = String(req.headers["content-type"] || "")
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)
  if (!/multipart\/form-data/i.test(contentType) || !boundaryMatch) {
    throw new Error("multipart/form-data requis")
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2]!
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > maxBytes) throw new Error("Import trop volumineux")
    chunks.push(buf)
  }
  const body = Buffer.concat(chunks)
  const delim = Buffer.from(`--${boundary}`)
  const fields: Record<string, string> = {}
  const files: MultipartFile[] = []

  let start = body.indexOf(delim)
  if (start < 0) throw new Error("Formulaire invalide")
  start += delim.length
  // skip leading CRLF after opening boundary
  if (body[start] === 13 && body[start + 1] === 10) start += 2

  while (start < body.length) {
    // closing boundary `--${boundary}--`
    if (body[start] === 45 && body[start + 1] === 45) break

    const next = body.indexOf(delim, start)
    if (next < 0) break
    let part = body.subarray(start, next)
    // trim trailing CRLF before boundary
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.subarray(0, part.length - 2)
    }

    const headerEnd = part.indexOf("\r\n\r\n")
    if (headerEnd >= 0) {
      const headers = part.subarray(0, headerEnd).toString("utf8")
      const data = part.subarray(headerEnd + 4)
      const disposition = headerValue(headers, "Content-Disposition") || ""
      const { name, filename } = parseContentDisposition(disposition)
      if (filename != null) {
        files.push({
          field: name || "files",
          filename,
          mime: headerValue(headers, "Content-Type") || "application/octet-stream",
          data: Buffer.from(data),
        })
      } else if (name) {
        fields[name] = data.toString("utf8")
      }
    }

    start = next + delim.length
    if (body[start] === 13 && body[start + 1] === 10) start += 2
  }

  return { fields, files }
}
