import type { Scheduler } from "./scheduler.ts"

type ToolDraft = {
  add: ((tool: Record<string, unknown>) => void) &
    ((name: string, def: Record<string, unknown>, options?: Record<string, unknown>) => void)
}

export type CronToolAccess = {
  scheduler: Scheduler
  /** When false, mutate via the leader HTTP API to avoid duplicate cron jobs. */
  leader: boolean
  apiBase: string
}

function addTool(tools: ToolDraft, tool: Record<string, unknown>) {
  try {
    tools.add(tool)
  } catch {
    const { name, options, ...rest } = tool
    tools.add(String(name), rest, options as Record<string, unknown> | undefined)
  }
}

function ok(payload: unknown, prefix?: string) {
  const body = JSON.stringify(payload, null, 2)
  return { content: prefix ? `${prefix}\n${body}` : body }
}

async function api<T>(
  access: CronToolAccess,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${access.apiBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? String(data.error)
        : `HTTP ${res.status}`,
    )
  }
  return data
}

function summarizeTask(scheduler: Scheduler, task: ReturnType<Scheduler["list"]>[number]) {
  return {
    id: task.id,
    name: task.name,
    cron: task.cron,
    message: task.message,
    agent: task.agent,
    enabled: task.enabled,
    nextRunAt: scheduler.nextRun(task.id),
    lastRunAt: task.lastRunAt ?? null,
    lastSessionID: task.lastSessionID ?? null,
    lastError: task.lastError ?? null,
  }
}

export function registerCronTools(tools: ToolDraft, access: CronToolAccess) {
  const timezone = access.scheduler.getTimezone()
  const directory = access.scheduler.getDirectory() ?? null

  addTool(tools, {
    name: "list",
    description:
      "Lister les tâches cron planifiées (récapitulatifs récurrents, rappels, etc.). " +
      "Utilise cet outil quand l'utilisateur demande ce qui est planifié, ou avant de modifier/supprimer une tâche.",
    options: { namespace: "cron", codemode: false },
    input: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      if (!access.leader) {
        return ok(
          await api<{
            tasks: unknown[]
            timezone: string
            directory: string | null
          }>(access, "/api/tasks"),
        )
      }
      return ok({
        timezone,
        directory,
        tasks: access.scheduler.list().map((task) => summarizeTask(access.scheduler, task)),
      })
    },
  })

  addTool(tools, {
    name: "preview",
    description:
      "Valider une expression cron 5 champs et indiquer la prochaine exécution. " +
      "Timezone: " +
      timezone +
      ". Exemples: '0 9 * * *' = tous les jours à 09:00, '0 9 * * 1-5' = lun–ven à 09:00, '*/30 * * * *' = toutes les 30 min.",
    options: { namespace: "cron", codemode: false },
    input: {
      type: "object",
      properties: {
        cron: {
          type: "string",
          description: "Expression cron à 5 champs (minute heure jour mois jour-semaine)",
        },
      },
      required: ["cron"],
      additionalProperties: false,
    },
    execute: async ({ cron }: { cron: string }) => {
      if (!access.leader) {
        return ok(
          await api<Record<string, unknown>>(access, "/api/tasks/preview", {
            method: "POST",
            body: JSON.stringify({ cron }),
          }),
        )
      }
      const preview = access.scheduler.preview(cron)
      return ok({ ok: true, timezone, ...preview })
    },
  })

  addTool(tools, {
    name: "create",
    description:
      "Créer une tâche récurrente qui enverra automatiquement un message à un agent OpenCode. " +
      "Convertis les formulations naturelles en cron 5 champs (ex. « tous les matins à 9h » → '0 9 * * *'). " +
      "Le champ message est le prompt envoyé à l'agent à chaque déclenchement. " +
      "Confirme à l'utilisateur le nom, le cron, la prochaine exécution et le message.",
    options: { namespace: "cron", codemode: false },
    input: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nom court de la tâche (ex. « Récap matin »)",
        },
        cron: {
          type: "string",
          description: "Expression cron 5 champs, timezone " + timezone,
        },
        message: {
          type: "string",
          description: "Message/prompt envoyé à l'agent à chaque exécution",
        },
        agent: {
          type: "string",
          description: "Agent OpenCode optionnel (ex. build). Sinon agent par défaut du plugin.",
        },
        enabled: {
          type: "boolean",
          description: "Activer immédiatement (défaut true)",
        },
      },
      required: ["name", "cron", "message"],
      additionalProperties: false,
    },
    execute: async (input: {
      name: string
      cron: string
      message: string
      agent?: string
      enabled?: boolean
    }) => {
      if (!access.leader) {
        const data = await api<{ task: unknown }>(access, "/api/tasks", {
          method: "POST",
          body: JSON.stringify(input),
        })
        return ok(data.task, "Tâche créée.")
      }
      const task = await access.scheduler.create(input)
      return ok(summarizeTask(access.scheduler, task), "Tâche créée.")
    },
  })

  addTool(tools, {
    name: "update",
    description:
      "Modifier une tâche cron existante (nom, cron, message, agent, enabled). " +
      "Utilise cron.list pour trouver l'id si besoin.",
    options: { namespace: "cron", codemode: false },
    input: {
      type: "object",
      properties: {
        id: { type: "string", description: "Identifiant de la tâche" },
        name: { type: "string" },
        cron: { type: "string", description: "Nouvelle expression cron 5 champs" },
        message: { type: "string" },
        agent: { type: "string" },
        enabled: { type: "boolean" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    execute: async (input: {
      id: string
      name?: string
      cron?: string
      message?: string
      agent?: string
      enabled?: boolean
    }) => {
      const { id, ...patch } = input
      if (!access.leader) {
        const data = await api<{ task: unknown }>(access, "/api/tasks/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(patch),
        })
        return ok(data.task, "Tâche mise à jour.")
      }
      const task = await access.scheduler.update(id, patch)
      return ok(summarizeTask(access.scheduler, task), "Tâche mise à jour.")
    },
  })

  addTool(tools, {
    name: "delete",
    description: "Supprimer définitivement une tâche cron par son id.",
    options: { namespace: "cron", codemode: false },
    input: {
      type: "object",
      properties: {
        id: { type: "string", description: "Identifiant de la tâche à supprimer" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    execute: async ({ id }: { id: string }) => {
      if (!access.leader) {
        const data = await api<{ task: unknown }>(access, "/api/tasks/" + encodeURIComponent(id), {
          method: "DELETE",
        })
        return ok(data.task, "Tâche supprimée.")
      }
      const task = await access.scheduler.remove(id)
      return ok(task, "Tâche supprimée.")
    },
  })

  addTool(tools, {
    name: "run",
    description: "Exécuter immédiatement une tâche cron (crée une session et envoie le message).",
    options: { namespace: "cron", codemode: false },
    input: {
      type: "object",
      properties: {
        id: { type: "string", description: "Identifiant de la tâche" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    execute: async ({ id }: { id: string }) => {
      if (!access.leader) {
        return ok(
          await api<Record<string, unknown>>(
            access,
            "/api/tasks/" + encodeURIComponent(id) + "/run",
            { method: "POST" },
          ),
        )
      }
      return ok(await access.scheduler.runNow(id))
    },
  })
}
