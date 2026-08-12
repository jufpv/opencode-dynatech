#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${OPENCODE_PLUGIN_DEST:-$HOME/.config/opencode/plugins/opencode-dynatech-webui}"
CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.jsonc}"
ENTRY="$DEST/src/index.ts"

echo "==> Installing opencode-dynatech-webui into:"
echo "    $DEST"

mkdir -p "$DEST/src"
rm -rf "$DEST/src" "$DEST/package.json" "$DEST/package-lock.json"
mkdir -p "$DEST/src"

cp "$ROOT/package.json" "$DEST/package.json"
if [[ -f "$ROOT/package-lock.json" ]]; then
  cp "$ROOT/package-lock.json" "$DEST/package-lock.json"
fi
cp -R "$ROOT/src/." "$DEST/src/"

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
    "uiPort": 8787,
    "cronApiUrl": "http://127.0.0.1:8788",
}

def is_webui_plugin(item):
    if isinstance(item, str):
        return "opencode-dynatech-webui" in item
    if isinstance(item, dict):
        return "opencode-dynatech-webui" in str(item.get("package", ""))
    return False

for item in plugins:
    if isinstance(item, dict) and is_webui_plugin(item) and isinstance(item.get("options"), dict):
        options = {**options, **item["options"]}
        break

# Preserve non-webui plugins (including cron).
data["plugins"] = [item for item in plugins if not is_webui_plugin(item)] + [
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
echo "Requires opencode-dynatech-cron API on cronApiUrl (default :8788)."
echo "UI: http://127.0.0.1:8787/"
echo "Restart OpenCode Beta (or: opencode-cli service restart)"
