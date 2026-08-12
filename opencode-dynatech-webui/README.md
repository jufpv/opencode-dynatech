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

- Navigateur : [http://127.0.0.1:8787/](http://127.0.0.1:8787/) ou `/cron`
- Slash chat : `/cron`

### Proxy API

| UI (webui) | Cron API |
|---|---|
| `GET/POST /api/cron` | `/api/tasks` |
| `POST /api/cron/preview` | `/api/tasks/preview` |
| `PUT/DELETE /api/cron/:id` | `/api/tasks/:id` |
| `POST /api/cron/:id/run` | `/api/tasks/:id/run` |

## Modules

v1 : module `cron` monté sur `/` et `/cron`. D’autres modules pourront s’enregistrer sur la coquille plus tard.

## Configuration

```jsonc
{
  "package": ".../opencode-dynatech-webui/src/index.ts",
  "options": {
    "uiPort": 8787,
    "cronApiUrl": "http://127.0.0.1:8788"
  }
}
```

| Option | Défaut | Description |
|---|---|---|
| `uiPort` | `8787` | Port UI (`0` pour désactiver) |
| `cronApiUrl` | `http://127.0.0.1:8788` | Base de l’API cron |

## Développement

```bash
npm install
./scripts/install.sh
```
