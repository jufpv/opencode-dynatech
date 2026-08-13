# opencode-dynatech-webui

Plugin OpenCode 2 (beta) : coquille HTTP locale pour les UIs Dynatech.

Runtime :

```text
~/.config/opencode/plugins/opencode-dynatech-webui/
```

Dépend de [`opencode-dynatech-cron`](../opencode-dynatech-cron) pour l’API JSON des tâches.

## Installation

```bash
# d’abord le cron (API :8788), puis :
./scripts/install.sh
```

## Utilisation

- Navigateur (Mac) : [http://127.0.0.1:9877/](http://127.0.0.1:9877/)
- Réseau local (téléphone) : `http://<ip-du-mac>:9877/`
- Pages : `/` (accueil), `/chat`, `/documents`, `/cron`, `/skills`, `/tools`, `/mcps`
- Slash chat : `/webui` (ouvre `/`), `/cron` (ouvre `/cron`)

### Gestion config (direct OpenCode)

Pas de relais / WebSocket. La webui lit/écrit directement :

| Page | Stockage |
|---|---|
| Skills | `~/.config/opencode/skills/<id>/SKILL.md` + `permissions` (action `skill`) |
| Tools | builtins via `permissions` ; custom `~/.config/opencode/tools/*.ts` (enregistrés par ce plugin) |
| MCP | `opencode.jsonc` → `mcp.servers` (`disabled` V2) |

### Proxy cron

| UI (webui) | Cron API |
|---|---|
| `GET/POST /api/cron` | `/api/tasks` |
| `POST /api/cron/preview` | `/api/tasks/preview` |
| `PUT/DELETE /api/cron/:id` | `/api/tasks/:id` |
| `POST /api/cron/:id/run` | `/api/tasks/:id/run` |

## Configuration

```jsonc
{
  "package": ".../opencode-dynatech-webui/src/index.ts",
  "options": {
    "uiPort": 9877,
    "cronApiUrl": "http://127.0.0.1:8788"
  }
}
```

| Option | Défaut | Description |
|---|---|---|
| `uiPort` | `9877` | Port UI (`0` pour désactiver). Écoute sur `0.0.0.0` (LAN). |
| `cronApiUrl` | `http://127.0.0.1:8788` | Base de l’API cron |

## Développement

```bash
npm install
./scripts/install.sh
```
