import { homedir } from "node:os"
import { join } from "node:path"

export function getOpencodeConfigDir(): string {
  return join(homedir(), ".config", "opencode")
}

export function getOpencodeConfigPath(): string {
  return join(getOpencodeConfigDir(), "opencode.jsonc")
}

export function getSkillsDir(): string {
  return join(getOpencodeConfigDir(), "skills")
}

export function getToolsDir(): string {
  return join(getOpencodeConfigDir(), "tools")
}
