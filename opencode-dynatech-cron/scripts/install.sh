#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${OPENCODE_PLUGIN_DEST:-$HOME/.config/opencode/plugins/opencode-dynatech-cron}"
CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.jsonc}"
ENTRY="$DEST/src/index.ts"
OLD_NESTED="$HOME/.config/opencode/plugins/opencode-dynatech/opencode-cron"

echo "==> Installing opencode-dynatech-cron into:"
echo "    $DEST"

mkdir -p "$DEST/src"
rm -rf "$DEST/src" "$DEST/package.json" "$DEST/package-lock.json"
mkdir -p "$DEST/src"

cp "$ROOT/package.json" "$DEST/package.json"
cp "$ROOT/package-lock.json" "$DEST/package-lock.json"
cp -R "$ROOT/src/." "$DEST/src/"

# Remove legacy nested install path if present.
if [[ -d "$OLD_NESTED" ]]; then
  echo "==> Removing legacy install: $OLD_NESTED"
  rm -rf "$OLD_NESTED"
  PARENT="$(dirname "$OLD_NESTED")"
  if [[ -d "$PARENT" ]] && [[ -z "$(ls -A "$PARENT" 2>/dev/null || true)" ]]; then
    rmdir "$PARENT" || true
  fi
fi

echo "==> Installing production dependencies"
(
  cd "$DEST"
  npm install --omit=dev --no-fund --no-audit
)

echo "==> Ensuring OpenCode config references this plugin"
python3 - "$CONFIG" "$ENTRY" <<'PY'
import json
import re
import sys
from pathlib import Path

config_path = Path(sys.argv[1]).expanduser()
entry = sys.argv[2]
config_path.parent.mkdir(parents=True, exist_ok=True)

if config_path.exists():
    text = config_path.read_text()
else:
    text = "{}"

without_line_comments = re.sub(r"(?m)^\s*//.*$", "", text)
without_block = re.sub(r"/\*.*?\*/", "", without_line_comments, flags=re.S)
data = json.loads(without_block or "{}")

plugins = data.get("plugins")
if not isinstance(plugins, list):
    plugins = []

options = {
    "timezone": "Europe/Paris",
    "defaultAgent": "build",
    "apiPort": 8788,
    "directory": str(Path.home() / "Documents" / "Default Project"),
}

def is_cron_plugin(item):
    if isinstance(item, str):
        return "opencode-cron" in item or "opencode-dynatech-cron" in item
    if isinstance(item, dict):
        pkg = str(item.get("package", ""))
        return "opencode-cron" in pkg or "opencode-dynatech-cron" in pkg
    return False

for item in plugins:
    if isinstance(item, dict) and is_cron_plugin(item) and isinstance(item.get("options"), dict):
        prev = dict(item["options"])
        # Migrate uiPort -> ignored; prefer apiPort.
        prev.pop("uiPort", None)
        options = {**options, **prev}
        if "apiPort" not in item["options"] and "uiPort" in item["options"]:
            options["apiPort"] = 8788
        break

data["plugins"] = [item for item in plugins if not is_cron_plugin(item)] + [
    {"package": entry, "options": options}
]
data.setdefault("$schema", "https://opencode.ai/config.json")
data.setdefault("model", "opencode/deepseek-v4-flash-free")
data.setdefault(
    "providers",
    {"opencode": {"name": "OpenCode Zen", "env": ["OPENCODE_API_KEY"]}},
)

lines = [
    "{",
    '  "$schema": ' + json.dumps(data["$schema"]) + ",",
    "",
    "  // OpenCode Zen — DeepSeek V4 Flash Free",
    '  "model": ' + json.dumps(data["model"]) + ",",
    "",
    '  "providers": '
    + json.dumps(data["providers"], indent=2, ensure_ascii=False).replace("\n", "\n  ")
    + ",",
    "",
    "  // Dynatech plugins (runtime install paths)",
    '  "plugins": '
    + json.dumps(data["plugins"], indent=2, ensure_ascii=False).replace("\n", "\n  "),
    "}",
    "",
]
config_path.write_text("\n".join(lines))
print(f"Updated {config_path}")
print(f"Plugin entry: {entry}")
PY

echo
echo "Install complete."
echo "Also install opencode-dynatech-webui for the browser UI."
echo "Restart OpenCode Beta (or: opencode-cli service restart)"
echo "API: http://127.0.0.1:8788/api/tasks"
echo "Data: ~/.local/share/opencode/opencode-cron/tasks.json"
