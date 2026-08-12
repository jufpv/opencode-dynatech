#!/usr/bin/env bash
set -euo pipefail

DEST="${OPENCODE_PLUGIN_DEST:-$HOME/.config/opencode/plugins/opencode-dynatech-webui}"
CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.jsonc}"

echo "==> Removing installed plugin:"
echo "    $DEST"
rm -rf "$DEST"

if [[ -f "$CONFIG" ]]; then
  python3 - "$CONFIG" <<'PY'
import json, re, sys
from pathlib import Path
path = Path(sys.argv[1])
text = path.read_text()
without_line_comments = re.sub(r"(?m)^\s*//.*$", "", text)
without_block = re.sub(r"/\*.*?\*/", "", without_line_comments, flags=re.S)
data = json.loads(without_block)

def is_webui_plugin(item):
    if isinstance(item, str):
        return "opencode-dynatech-webui" in item
    if isinstance(item, dict):
        return "opencode-dynatech-webui" in str(item.get("package", ""))
    return False

plugins = data.get("plugins") or []
data["plugins"] = [item for item in plugins if not is_webui_plugin(item)]
out = {"$schema": data.get("$schema", "https://opencode.ai/config.json")}
for key in ("model", "providers", "plugins"):
    if key in data:
        out[key] = data[key]
path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(f"Removed webui plugin entry from {path}")
PY
fi

echo "Uninstall complete. Restart OpenCode Beta."
