# opencode-dynatech-cron

Plugin OpenCode 2 (beta) : planifie des tâches récurrentes qui envoient un message à un agent.

Ce dépôt sert **uniquement au développement**. Runtime :

```text
~/.config/opencode/plugins/opencode-dynatech-cron/
```

Données :

```text
~/.local/share/opencode/opencode-cron/tasks.json
```

L’UI navigateur est dans le plugin frère [`opencode-dynatech-webui`](../opencode-dynatech-webui).

## Installation

```bash
./scripts/install.sh
# puis installer aussi opencode-dynatech-webui
```

Redémarre OpenCode Beta / `opencode-cli service restart`.

## Utilisation

### Chat

- « Fais-moi un récap tous les matins à 09h00 »
- « Liste / désactive / supprime mes tâches cron »

Outils : `cron.list`, `cron.preview`, `cron.create`, `cron.update`, `cron.delete`, `cron.run`.

### API JSON

`http://127.0.0.1:8788/api/tasks` (leader = instance qui bind `apiPort`).

## Configuration

```jsonc
{
  "package": ".../opencode-dynatech-cron/src/index.ts",
  "options": {
    "timezone": "Europe/Paris",
    "defaultAgent": "build",
    "apiPort": 8788,
    "directory": "~/Documents/Default Project"
  }
}
```

| Option | Défaut | Description |
|---|---|---|
| `timezone` | TZ système | Fuseau des expressions cron |
| `defaultAgent` | — | Agent si non précisé |
| `apiPort` | `8788` | API JSON (`0` pour désactiver) |
| `directory` | Default Project | Projet des sessions cron |
| `dataDir` | `~/.local/share/opencode/opencode-cron` | Données |

## Développement

```bash
npm install
./scripts/install.sh
```
