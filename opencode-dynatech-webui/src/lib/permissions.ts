import {
  readOpencodeConfig,
  replaceOrInsertObjectKey,
  writeOpencodeConfigText,
} from "./jsonc.ts"

export type PermissionRule = {
  action: string
  resource: string
  effect: "allow" | "deny" | "ask"
}

function asRules(raw: unknown): PermissionRule[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item): item is PermissionRule =>
        !!item &&
        typeof item === "object" &&
        typeof (item as PermissionRule).action === "string" &&
        typeof (item as PermissionRule).resource === "string" &&
        ["allow", "deny", "ask"].includes((item as PermissionRule).effect),
    )
    .map((item) => ({
      action: item.action,
      resource: item.resource,
      effect: item.effect,
    }))
}

export function listPermissionRules(): PermissionRule[] {
  try {
    return asRules(readOpencodeConfig().config.permissions)
  } catch {
    return []
  }
}

function writeRules(rules: PermissionRule[]): void {
  const { text } = readOpencodeConfig()
  const next = replaceOrInsertObjectKey(text, "permissions", rules)
  writeOpencodeConfigText(next)
}

/** Last matching rule wins (OpenCode V2). */
export function isActionAllowed(
  action: string,
  resource = "*",
  defaultAllowed = true,
): boolean {
  const rules = listPermissionRules()
  let effect: PermissionRule["effect"] | null = null
  for (const rule of rules) {
    if (rule.action !== action && rule.action !== "*") continue
    if (rule.resource !== resource && rule.resource !== "*") continue
    effect = rule.effect
  }
  if (effect === "deny") return false
  if (effect === "allow") return true
  return defaultAllowed
}

export function setActionEnabled(action: string, resource: string, enabled: boolean): void {
  const rules = listPermissionRules().filter(
    (rule) => !(rule.action === action && rule.resource === resource && rule.effect === "deny"),
  )

  if (!enabled) {
    rules.push({ action, resource, effect: "deny" })
  }

  writeRules(rules)
}

export function setSkillEnabled(skillId: string, enabled: boolean): void {
  setActionEnabled("skill", skillId, enabled)
}

export function isSkillEnabled(skillId: string): boolean {
  return isActionAllowed("skill", skillId, true)
}

export function setToolEnabled(toolId: string, enabled: boolean): void {
  // Builtin tools use action = tool id (read, edit, shell, …).
  setActionEnabled(toolId, "*", enabled)
}

export function isToolEnabled(toolId: string): boolean {
  return isActionAllowed(toolId, "*", true)
}
