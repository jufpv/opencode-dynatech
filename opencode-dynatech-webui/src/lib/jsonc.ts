import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { getOpencodeConfigPath } from "./paths.ts"

export type OpencodeConfig = Record<string, unknown>

export function stripJsoncComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

export function readOpencodeConfig(): {
  path: string
  text: string
  config: OpencodeConfig
  mtimeMs: number
} {
  const path = getOpencodeConfigPath()
  if (!existsSync(path)) {
    throw new Error("Fichier opencode.jsonc introuvable.")
  }
  const text = readFileSync(path, "utf8")
  const stat = statSync(path)
  return {
    path,
    text,
    config: JSON.parse(stripJsoncComments(text) || "{}") as OpencodeConfig,
    mtimeMs: stat.mtimeMs,
  }
}

export function readOpencodeConfigSafe(): {
  path: string
  text: string
  config: OpencodeConfig
  mtimeMs: number
} {
  const path = getOpencodeConfigPath()
  if (!existsSync(path)) {
    return { path, text: "{\n}\n", config: {}, mtimeMs: Date.now() }
  }
  return readOpencodeConfig()
}

/** Replace or insert a top-level `"key": { ... }` object block, preserving surrounding JSONC. */
export function replaceOrInsertObjectKey(
  text: string,
  key: string,
  value: unknown,
): string {
  const block = `"${key}": ${JSON.stringify(value, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n")}`

  const match = text.match(new RegExp(`"${key}"\\s*:`))
  if (match && match.index != null) {
    const braceStart = text.indexOf("{", match.index)
    if (braceStart < 0) throw new Error(`Section ${key} invalide dans opencode.jsonc.`)
    let depth = 0
    let end = braceStart
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === "{") depth++
      if (text[i] === "}") {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
    return `${text.slice(0, match.index)}${block}${text.slice(end)}`
  }

  const lastBrace = text.lastIndexOf("}")
  if (lastBrace < 0) throw new Error("Fichier opencode.jsonc invalide.")
  const before = text.slice(0, lastBrace).trimEnd()
  const needsComma = !/,\s*$/.test(before)
  return `${before}${needsComma ? "," : ""}\n  ${block.split("\n").join("\n  ")}\n${text.slice(lastBrace)}`
}

export function removeObjectKey(text: string, key: string): string {
  const match = text.match(new RegExp(`"${key}"\\s*:`))
  if (!match || match.index == null) return text
  const braceStart = text.indexOf("{", match.index)
  if (braceStart < 0) return text
  let depth = 0
  let end = braceStart
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === "{") depth++
    if (text[i] === "}") {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  let start = match.index
  while (start > 0 && /[ \t]/.test(text[start - 1]!)) start--
  if (start > 0 && text[start - 1] === ",") start--
  if (text[start] === ",") start++
  return `${text.slice(0, start).trimEnd()}\n${text.slice(end).replace(/^\s*,\s*/, "")}`
}

export function writeOpencodeConfigText(text: string): void {
  const path = getOpencodeConfigPath()
  writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`, "utf8")
}
