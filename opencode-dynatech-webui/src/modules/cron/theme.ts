import { homedir } from "node:os"
import { join } from "node:path"
import { readFileSync, existsSync } from "node:fs"

export type ColorMode = "system" | "light" | "dark"

export interface UiTheme {
  mode: ColorMode
  sans: string
  mono: string
  fontSize: number
}

const DEFAULT_THEME: UiTheme = {
  mode: "system",
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 14,
}

function readJsonc(path: string): unknown {
  if (!existsSync(path)) return undefined
  const text = readFileSync(path, "utf8")
  const withoutLine = text.replace(/^\s*\/\/.*$/gm, "")
  const withoutBlock = withoutLine.replace(/\/\*[\s\S]*?\*\//g, "")
  try {
    return JSON.parse(withoutBlock || "{}")
  } catch {
    return undefined
  }
}

function readCliThemeMode(): ColorMode | undefined {
  const path = join(homedir(), ".config", "opencode", "cli.json")
  const data = readJsonc(path)
  if (!data || typeof data !== "object") return undefined
  const theme = (data as { theme?: { mode?: unknown } }).theme
  const mode = theme?.mode
  if (mode === "system" || mode === "light" || mode === "dark") return mode
  return undefined
}

function readDesktopAppearance(): Partial<UiTheme> | undefined {
  const candidates = [
    join(homedir(), "Library", "Application Support", "ai.opencode.desktop.beta", "default.dat"),
    join(homedir(), "Library", "Application Support", "ai.opencode.desktop", "default.dat"),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const outer = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
      const raw = outer["settings.v3"]
      if (typeof raw !== "string") continue
      const settings = JSON.parse(raw) as {
        appearance?: { fontSize?: number; sans?: string; mono?: string }
      }
      const appearance = settings.appearance
      if (!appearance) return undefined
      const out: Partial<UiTheme> = {}
      if (typeof appearance.fontSize === "number" && appearance.fontSize > 0) {
        out.fontSize = appearance.fontSize
      }
      if (typeof appearance.sans === "string" && appearance.sans.trim()) {
        out.sans = appearance.sans.trim()
      }
      if (typeof appearance.mono === "string" && appearance.mono.trim()) {
        out.mono = appearance.mono.trim()
      }
      return out
    } catch {
      // ignore unreadable desktop settings
    }
  }
  return undefined
}

/** Resolve light UI preferences from OpenCode config when available. */
export function resolveUiTheme(): UiTheme {
  const desktop = readDesktopAppearance()
  const mode = readCliThemeMode() ?? DEFAULT_THEME.mode
  return {
    mode,
    sans: desktop?.sans || DEFAULT_THEME.sans,
    mono: desktop?.mono || DEFAULT_THEME.mono,
    fontSize: desktop?.fontSize || DEFAULT_THEME.fontSize,
  }
}

export function themeColorScheme(mode: ColorMode): string {
  if (mode === "light") return "light"
  if (mode === "dark") return "dark"
  return "light dark"
}
