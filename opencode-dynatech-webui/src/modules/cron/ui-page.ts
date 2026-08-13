import type { UiTheme } from "./theme.ts"
import { themeColorScheme } from "./theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

export function renderUiPage(timezone: string, theme: UiTheme): string {
  const tz = escapeHtml(timezone)
  const mode = theme.mode
  const colorScheme = themeColorScheme(mode)
  const fontOverrides = `:root{--font:${theme.sans};--mono:${theme.mono};--font-size:${theme.fontSize}px}`
  return `<!DOCTYPE html>
<html lang="fr" data-theme="${mode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="${colorScheme}">
  <title>Tâches planifiées · OpenCode</title>
  <style>${CSS}${NAV_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(
    null,
    `
    <div class="view view-tasks" id="view-tasks">
      <section class="tasks-panel" aria-labelledby="tasks-title">
        <div class="entity-list-header">
          <div>
            <div class="tasks-header">
              <h2 id="tasks-title">Tâches planifiées</h2>
              <p>Composez une planification champ par champ (minute, heure, jour, mois, semaine) ou en expression cron avancée.</p>
              <p class="tasks-directory" id="tasks-directory"></p>
            </div>
          </div>
          <button type="button" class="entity-add-btn" id="tasks-add-btn">Ajouter</button>
        </div>

        <div class="tasks-error hidden" id="tasks-error"></div>
        <div class="task-list" id="tasks-list"></div>
        <div class="tasks-empty hidden" id="tasks-empty">
          Aucune tâche planifiée.<br>
          Cliquez sur « Ajouter » pour envoyer un message automatique à OpenCode.
        </div>
      </section>
    </div>

    <div class="view view-task-editor hidden" id="view-task-editor">
      <section class="tasks-panel" aria-labelledby="task-editor-title">
        <div class="entity-editor-header">
          <button type="button" class="entity-editor-back" id="task-editor-back">← Retour</button>
          <h2 id="task-editor-title">Nouvelle tâche</h2>
        </div>

        <div class="tasks-error hidden" id="task-editor-error"></div>

        <form id="task-form" class="entity-form">
          <input type="hidden" id="task-id" value="">
          <label>
            <span class="visually-hidden">Nom</span>
            <input type="text" id="task-name" required maxlength="80" placeholder="Nom — Rapport du matin" aria-label="Nom">
          </label>
          <label>
            <span class="visually-hidden">Message envoyé à l'agent</span>
            <textarea id="task-message" required maxlength="4000" rows="3" placeholder="Message envoyé à l'agent — Fais un résumé des actualités tech…" aria-label="Message envoyé à l'agent"></textarea>
          </label>
          <fieldset class="schedule-builder" id="cron-panel">
            <legend class="visually-hidden">Planification</legend>
            <div class="schedule-preview-block">
              <p class="schedule-preview-text" id="schedule-preview-text">Tous les jours à 09:00</p>
              <p class="schedule-preview-next-line">
                Prochaine exécution : <span id="schedule-preview-next">—</span>
              </p>
              <p class="schedule-preview-timezone">Fuseau ${tz}</p>
              <p class="schedule-preview-error hidden" id="schedule-preview-error"></p>
            </div>
            <div class="cron-fields-grid" id="cron-fields-grid" role="tablist" aria-label="Champs cron"></div>
            <div class="cron-field-hint-bar" id="cron-field-hint-bar" hidden>
              <p class="cron-field-hint" id="cron-field-hint"></p>
            </div>
          </fieldset>
          <div class="entity-form-toolbar">
            <label class="entity-form-toggle">
              <input type="checkbox" id="task-enabled" checked>
              <span class="toggle-switch" aria-hidden="true"></span>
              <span class="toggle-label">Activer cette tâche</span>
            </label>
            <div class="entity-form-actions">
              <button type="button" id="task-form-cancel">Annuler</button>
              <button type="submit" id="task-form-submit">Ajouter</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  `,
    "cron",
  )}
  <script>${CLIENT_JS}</script>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

const CSS = `
:root,
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #fafafa;
  --bg-elevated: #ffffff;
  --bg-muted: #f4f4f5;
  --bg-hover: #f4f4f5;
  --border: #e4e4e7;
  --border-strong: #d4d4d8;
  --text: #18181b;
  --text-muted: #71717a;
  --text-faint: #a1a1aa;
  --accent: #2563eb;
  --accent-soft: #dbeafe;
  --ok: #16a34a;
  --ok-bg: #dcfce7;
  --ok-fg: #166534;
  --err: #dc2626;
  --err-bg: #fef2f2;
  --err-border: #fecaca;
  --warn-bg: #fef3c7;
  --warn-fg: #92400e;
  --primary: #18181b;
  --primary-hover: #27272a;
  --primary-fg: #ffffff;
  --disabled-bg: #f4f4f5;
  --toggle-off: rgba(120, 120, 128, 0.22);
  --toggle-on: #34c759;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  :root[data-theme="system"] {
    color-scheme: dark;
    --bg: #111113;
    --bg-elevated: #18181b;
    --bg-muted: #1c1c1f;
    --bg-hover: #27272a;
    --border: #27272a;
    --border-strong: #3f3f46;
    --text: #fafafa;
    --text-muted: #a1a1aa;
    --text-faint: #71717a;
    --accent: #60a5fa;
    --accent-soft: #1e3a5f;
    --ok: #4ade80;
    --ok-bg: #14532d;
    --ok-fg: #bbf7d0;
    --err: #f87171;
    --err-bg: #3f1d1d;
    --err-border: #7f1d1d;
    --warn-bg: #422006;
    --warn-fg: #fde68a;
    --primary: #fafafa;
    --primary-hover: #e4e4e7;
    --primary-fg: #18181b;
    --disabled-bg: #1c1c1f;
    --toggle-off: rgba(120, 120, 128, 0.32);
    --shadow: none;
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #111113;
  --bg-elevated: #18181b;
  --bg-muted: #1c1c1f;
  --bg-hover: #27272a;
  --border: #27272a;
  --border-strong: #3f3f46;
  --text: #fafafa;
  --text-muted: #a1a1aa;
  --text-faint: #71717a;
  --accent: #60a5fa;
  --accent-soft: #1e3a5f;
  --ok: #4ade80;
  --ok-bg: #14532d;
  --ok-fg: #bbf7d0;
  --err: #f87171;
  --err-bg: #3f1d1d;
  --err-border: #7f1d1d;
  --warn-bg: #422006;
  --warn-fg: #fde68a;
  --primary: #fafafa;
  --primary-hover: #e4e4e7;
  --primary-fg: #18181b;
  --disabled-bg: #1c1c1f;
  --toggle-off: rgba(120, 120, 128, 0.32);
  --shadow: none;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  font-size: var(--font-size);
  background: var(--bg);
  color: var(--text);
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}

.app {
  width: 100%;
}

.view.hidden { display: none; }

.tasks-panel {
  padding: 0; /* padding unifié via .shell-box .tasks-panel */
}

.entity-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.entity-list-header > div:first-child {
  flex: 1;
  min-width: 0;
}

.tasks-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 0.35rem;
}

.tasks-header p {
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 36rem;
}

.tasks-directory {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-faint);
  font-family: var(--mono);
  word-break: break-all;
}

.entity-add-btn {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  font-size: 0.84rem;
  font-weight: 600;
  background: var(--primary);
  color: var(--primary-fg);
  border: 1px solid var(--primary);
  cursor: pointer;
  font: inherit;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.entity-add-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.entity-add-btn:active:not(:disabled) { transform: scale(0.98); }

.entity-editor-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.entity-editor-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  padding: 0.4rem 0.75rem;
  font-size: 0.84rem;
  cursor: pointer;
  font: inherit;
}

.entity-editor-back:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.entity-editor-header h2 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}

.tasks-empty {
  padding: 1.5rem 1rem;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.55;
}

.tasks-empty.hidden,
.tasks-error.hidden,
.schedule-preview-error.hidden { display: none; }

.tasks-error {
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--err-border);
  background: var(--err-bg);
  color: var(--err);
  font-size: 0.88rem;
}

.skill-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
}

.skill-status.enabled { background: var(--ok-bg); color: var(--ok-fg); }
.skill-status.disabled { background: var(--bg-muted); color: var(--text-muted); }

.entity-form {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  overflow: hidden;
}

.entity-form > label:not(.entity-form-toggle) {
  display: block;
  margin: 0;
  border-bottom: 1px solid var(--border);
}

.entity-form input[type="text"],
.entity-form textarea {
  display: block;
  width: 100%;
  margin: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  color: var(--text);
  padding: 0.75rem 0.9rem;
  font: inherit;
  font-size: 0.92rem;
  outline: none;
  box-shadow: none;
}

.entity-form textarea {
  min-height: 5.5rem;
  resize: vertical;
}

.entity-form input::placeholder,
.entity-form textarea::placeholder {
  color: var(--text-faint);
}

.entity-form .schedule-builder {
  display: grid;
  gap: 0.85rem;
  padding: 0.9rem;
  margin: 0;
  border: none;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  min-width: 0;
}

.entity-form-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  flex-wrap: wrap;
}

.entity-form-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.entity-form-actions button {
  border-radius: 999px;
  padding: 0.48rem 1rem;
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  font: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
}

.entity-form-actions button[type="button"] {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.entity-form-actions button[type="button"]:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.entity-form-actions button[type="submit"] {
  background: var(--primary);
  color: var(--primary-fg);
  border: 1px solid var(--primary);
  font-weight: 600;
  min-width: 6.5rem;
}

.entity-form-actions button[type="submit"]:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.entity-form-actions button:active:not(:disabled) { transform: scale(0.98); }
.entity-form-actions button:disabled { opacity: 0.5; cursor: not-allowed; }

.entity-form-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  font-size: 0.86rem;
  color: var(--text);
  user-select: none;
  min-width: 0;
}

.entity-form-toggle input[type="checkbox"] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.entity-form-toggle .toggle-switch {
  position: relative;
  width: 44px;
  height: 26px;
  flex-shrink: 0;
  background: var(--toggle-off);
  border-radius: 999px;
  transition: background 0.22s ease;
}

.entity-form-toggle .toggle-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.14), 0 0 1px rgba(0, 0, 0, 0.18);
  transition: transform 0.22s ease;
}

.entity-form-toggle input:checked + .toggle-switch { background: var(--toggle-on); }
.entity-form-toggle input:checked + .toggle-switch::after { transform: translateX(18px); }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.cron-fields-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
}

.cron-field-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.5rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-muted);
  cursor: pointer;
  text-align: center;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.cron-field-cell:hover:not(.active) {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.cron-field-cell.active {
  border-color: var(--accent);
  cursor: text;
  background: var(--bg-elevated);
}

.cron-field-value,
.cron-field-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cron-field-value { color: var(--text); }

.cron-field-cell.active .cron-field-value,
.cron-field-input { color: var(--accent); }

.cron-field-input {
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
  margin: 0;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  font: inherit;
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 600;
}

.cron-field-label {
  display: block;
  width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cron-field-cell.active .cron-field-label { color: var(--accent); }

.cron-field-hint-bar {
  padding: 0.35rem 0.75rem 0.65rem;
  text-align: center;
}

.cron-field-hint {
  margin: 0;
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.cron-field-hint code {
  font-family: var(--mono);
  font-size: 0.74rem;
}

.schedule-preview-block {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: center;
}

.schedule-builder .schedule-preview-text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text);
}

.schedule-preview-next-line,
.schedule-preview-timezone {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.25;
}

.schedule-preview-timezone { font-size: 0.72rem; }

.schedule-builder.invalid .schedule-preview-text { color: var(--err); }

.schedule-preview-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--err);
  text-align: center;
}

.task-list { display: grid; gap: 0.5rem; }

.task-card {
  border: none;
  border-radius: 8px;
  background: var(--bg-muted);
  padding: 0.7rem 0.8rem;
  display: grid;
  gap: 0.35rem;
}

.task-card.disabled {
  background: var(--bg-elevated);
  border: 1px dashed var(--border-strong);
  color: var(--text-muted);
}

.task-card.disabled .task-card-title {
  color: var(--text-muted);
  font-weight: 500;
}

.task-card.disabled .task-card-message,
.task-card.disabled .task-card-meta { color: var(--text-faint); }

.task-card.disabled .task-card-meta code {
  background: var(--bg-muted);
  color: var(--text-muted);
}

.task-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.task-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.task-card-title {
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.task-card-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.35rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--border);
}

.task-card-actions button {
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  cursor: pointer;
  font: inherit;
}

.task-card-actions button:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.task-card-actions button.danger:hover:not(:disabled) {
  color: var(--err);
  border-color: var(--err-border);
  background: var(--err-bg);
}

.task-card-message {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.task-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.3;
  word-break: break-word;
}

.task-card-meta code {
  font-family: var(--mono);
  font-size: 0.78rem;
  background: var(--bg-muted);
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
}

.task-schedule-label {
  font-weight: 500;
  color: var(--text);
}

.task-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
}

.task-status.success { background: var(--ok-bg); color: var(--ok-fg); }
.task-status.error { background: var(--err-bg); color: var(--err); }
.task-status.never { background: var(--bg-muted); color: var(--text-muted); }

@media (max-width: 768px) {
  .cron-fields-grid { gap: 0.25rem; }
  .cron-field-cell { padding: 0.45rem 0.2rem; }
}
`

const CLIENT_JS = `
const viewTasks = document.getElementById("view-tasks");
const viewEditor = document.getElementById("view-task-editor");
const tasksErrorEl = document.getElementById("tasks-error");
const taskEditorErrorEl = document.getElementById("task-editor-error");
const tasksListEl = document.getElementById("tasks-list");
const tasksEmptyEl = document.getElementById("tasks-empty");
const tasksAddBtn = document.getElementById("tasks-add-btn");
const taskEditorBack = document.getElementById("task-editor-back");
const taskEditorTitle = document.getElementById("task-editor-title");
const taskForm = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const taskNameInput = document.getElementById("task-name");
const taskMessageInput = document.getElementById("task-message");
const taskEnabledInput = document.getElementById("task-enabled");
const cronPanel = document.getElementById("cron-panel");
const cronFieldsGrid = document.getElementById("cron-fields-grid");
const cronFieldHint = document.getElementById("cron-field-hint");
const cronFieldHintBar = document.getElementById("cron-field-hint-bar");
const schedulePreviewText = document.getElementById("schedule-preview-text");
const schedulePreviewNext = document.getElementById("schedule-preview-next");
const schedulePreviewError = document.getElementById("schedule-preview-error");
const taskFormSubmit = document.getElementById("task-form-submit");
const taskFormCancel = document.getElementById("task-form-cancel");

let scheduledTasks = [];
let editorOpen = false;
let schedulePreviewTimer = null;
let schedulePreviewRequest = 0;
let activeCronField = null;

const CRON_FIELDS = ["minute", "hour", "dom", "month", "dow"];
const DOW_NAMES = {
  0: "dimanche", 1: "lundi", 2: "mardi", 3: "mercredi",
  4: "jeudi", 5: "vendredi", 6: "samedi",
};
const CRON_FIELD_DEFS = {
  minute: {
    shortLabel: "Minute",
    hint: "Valeurs 0–59<br><code>*</code> = chaque minute<br><code>*/5</code> = toutes les 5 min",
  },
  hour: {
    shortLabel: "Heure",
    hint: "Valeurs 0–23<br><code>9</code> = à 9h<br><code>*/2</code> = toutes les 2 h",
  },
  dom: {
    shortLabel: "Jour",
    hint: "Jour 1–31<br><code>*</code> = chaque jour<br><code>15</code> = le 15 du mois",
  },
  month: {
    shortLabel: "Mois",
    hint: "Mois 1–12<br><code>*</code> = chaque mois<br><code>1,7</code> = janvier et juillet",
  },
  dow: {
    shortLabel: "Semaine",
    hint: "0=dim, 1=lun … 6=sam<br><code>*</code> = chaque jour<br><code>1-5</code> = lun–ven",
  },
};

function defaultCronFieldValues() {
  return { minute: "0", hour: "9", dom: "*", month: "*", dow: "*" };
}
const cronFieldValues = defaultCronFieldValues();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function describeCronExpression(cron) {
  const parts = cron.trim().split(/\\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;

  if (min.startsWith("*/") && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    const n = min.slice(2);
    return n === "1" ? "Chaque minute" : "Toutes les " + n + " minutes";
  }
  if (/^\\d+$/.test(min) && hour.startsWith("*/") && dom === "*" && mon === "*" && dow === "*") {
    const n = hour.slice(2);
    const minute = parseInt(min, 10);
    const minuteLabel = minute === 0 ? "" : " (minute " + minute + ")";
    return n === "1"
      ? "Toutes les heures" + minuteLabel
      : "Toutes les " + n + " heures" + minuteLabel;
  }

  const clock =
    /^\\d+$/.test(hour) && /^\\d+$/.test(min)
      ? String(parseInt(hour, 10)).padStart(2, "0") + ":" + String(parseInt(min, 10)).padStart(2, "0")
      : null;

  if (clock && dom === "*" && mon === "*" && dow === "*") return "Tous les jours à " + clock;
  if (clock && dom === "*" && mon === "*" && dow === "1-5") return "Du lundi au vendredi à " + clock;

  if (clock && dom === "*" && mon === "*" && dow !== "*" && dow !== "?") {
    if (dow.includes("-")) {
      const [start, end] = dow.split("-");
      const startName = DOW_NAMES[start.trim()];
      const endName = DOW_NAMES[end.trim()];
      if (startName && endName) return "Du " + startName + " au " + endName + " à " + clock;
    }
    const days = dow.split(",").map((part) => DOW_NAMES[part.trim()] ?? part.trim()).filter(Boolean);
    if (days.length === 1) return "Chaque " + days[0] + " à " + clock;
    if (days.length === 2) return "Chaque " + days[0] + " et " + days[1] + " à " + clock;
    if (days.length > 2) {
      return "Chaque " + days.slice(0, -1).join(", ") + " et " + days[days.length - 1] + " à " + clock;
    }
  }

  if (clock && /^\\d+$/.test(dom) && mon === "*" && dow === "*") {
    return "Le " + dom + " de chaque mois à " + clock;
  }
  return cron;
}

function buildCronFromScheduleUI() {
  return CRON_FIELDS.map((field) => {
    const value = cronFieldValues[field]?.trim();
    return value || "*";
  }).join(" ");
}

function parseCronToScheduleUI(cron) {
  const parts = cron.trim().split(/\\s+/).filter(Boolean);
  const defaults = defaultCronFieldValues();
  CRON_FIELDS.forEach((field, index) => {
    cronFieldValues[field] = parts[index] ?? defaults[field];
  });
  activeCronField = null;
  updateCronUI();
}

function resetCronFieldState() {
  Object.assign(cronFieldValues, defaultCronFieldValues());
  activeCronField = null;
  updateCronUI();
}

function setActiveCronField(field) {
  if (!CRON_FIELDS.includes(field)) return;
  if (field === activeCronField) {
    const activeInput = cronFieldsGrid?.querySelector(".cron-field-input");
    activeInput?.focus();
    activeInput?.select();
    return;
  }
  const activeInput = cronFieldsGrid?.querySelector(".cron-field-input");
  if (activeInput && activeCronField) cronFieldValues[activeCronField] = activeInput.value;
  activeCronField = field;
  updateCronUI({ focus: true, select: true });
}

function renderCronFields(options = {}) {
  const { focus = false, select = false } = options;
  if (!cronFieldsGrid) return;
  cronFieldsGrid.innerHTML = "";

  for (const field of CRON_FIELDS) {
    const def = CRON_FIELD_DEFS[field];
    const isActive = field === activeCronField;
    const cell = document.createElement("div");
    cell.className = "cron-field-cell" + (isActive ? " active" : "");
    cell.dataset.field = field;
    cell.setAttribute("role", "tab");
    cell.setAttribute("aria-selected", isActive ? "true" : "false");

    if (isActive) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "cron-field-input";
      input.spellcheck = false;
      input.autocomplete = "off";
      input.placeholder = "*";
      input.value = cronFieldValues[field] ?? "*";
      input.setAttribute("aria-label", def.shortLabel);
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("input", () => {
        cronFieldValues[field] = input.value;
        queueSchedulePreview();
      });
      cell.appendChild(input);
    } else {
      const value = document.createElement("span");
      value.className = "cron-field-value";
      value.textContent = cronFieldValues[field]?.trim() || "*";
      cell.appendChild(value);
    }

    const label = document.createElement("span");
    label.className = "cron-field-label";
    label.textContent = def.shortLabel;
    cell.appendChild(label);
    cell.addEventListener("click", () => setActiveCronField(field));
    cronFieldsGrid.appendChild(cell);
  }

  if (cronFieldHintBar) cronFieldHintBar.hidden = !activeCronField;
  if (cronFieldHint) {
    cronFieldHint.innerHTML = activeCronField ? (CRON_FIELD_DEFS[activeCronField]?.hint ?? "") : "";
  }

  if (focus && editorOpen) {
    const activeInput = cronFieldsGrid.querySelector(".cron-field-input");
    if (activeInput) {
      activeInput.focus({ preventScroll: true });
      if (select) activeInput.select();
    }
  }
}

function updateCronUI(options = {}) {
  renderCronFields(options);
  queueSchedulePreview();
}

function setSchedulePreviewState({ valid, text, nextLabel, error }) {
  if (schedulePreviewText) schedulePreviewText.textContent = text;
  if (schedulePreviewNext) schedulePreviewNext.textContent = nextLabel;
  if (cronPanel) {
    cronPanel.classList.toggle("valid", valid === true);
    cronPanel.classList.toggle("invalid", valid === false);
  }
  if (schedulePreviewError) {
    if (error) {
      schedulePreviewError.textContent = error;
      schedulePreviewError.classList.remove("hidden");
    } else {
      schedulePreviewError.textContent = "";
      schedulePreviewError.classList.add("hidden");
    }
  }
}

async function refreshSchedulePreview() {
  const cron = buildCronFromScheduleUI();
  const requestId = ++schedulePreviewRequest;
  if (!cron.trim()) {
    setSchedulePreviewState({
      valid: false,
      text: "Planification incomplète",
      nextLabel: "—",
      error: "Choisissez une répétition ou saisissez une expression cron.",
    });
    return;
  }

  setSchedulePreviewState({
    valid: null,
    text: describeCronExpression(cron),
    nextLabel: "…",
    error: "",
  });

  try {
    const res = await fetch("/api/cron/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cron }),
    });
    const data = await res.json();
    if (requestId !== schedulePreviewRequest) return;
    if (!res.ok || !data.ok) {
      setSchedulePreviewState({
        valid: false,
        text: describeCronExpression(cron),
        nextLabel: "—",
        error: data.error ?? "Expression cron invalide.",
      });
      return;
    }
    setSchedulePreviewState({
      valid: true,
      text: describeCronExpression(data.cron ?? cron),
      nextLabel: formatDateTime(data.nextRunAt),
      error: "",
    });
  } catch {
    if (requestId !== schedulePreviewRequest) return;
    setSchedulePreviewState({
      valid: null,
      text: describeCronExpression(cron),
      nextLabel: "—",
      error: "",
    });
  }
}

function queueSchedulePreview() {
  if (schedulePreviewTimer) clearTimeout(schedulePreviewTimer);
  schedulePreviewTimer = setTimeout(() => { void refreshSchedulePreview(); }, 250);
}

function setTasksError(message, target = "auto") {
  const el = target === "editor" || (target === "auto" && editorOpen)
    ? taskEditorErrorEl
    : tasksErrorEl;
  if (!el) return;
  if (!message) {
    el.textContent = "";
    el.classList.add("hidden");
    return;
  }
  el.textContent = message;
  el.classList.remove("hidden");
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(status) {
  switch (status) {
    case "success": return "Succès";
    case "error": return "Erreur";
    default: return "Jamais";
  }
}

function statusClass(status) {
  return status ?? "never";
}

function showList() {
  editorOpen = false;
  viewEditor.classList.add("hidden");
  viewTasks.classList.remove("hidden");
}

function showEditor() {
  editorOpen = true;
  viewTasks.classList.add("hidden");
  viewEditor.classList.remove("hidden");
}

function resetTaskForm() {
  if (taskIdInput) taskIdInput.value = "";
  taskForm?.reset();
  if (taskEnabledInput) taskEnabledInput.checked = true;
  if (taskFormSubmit) taskFormSubmit.textContent = "Ajouter";
  if (taskEditorTitle) taskEditorTitle.textContent = "Nouvelle tâche";
  resetCronFieldState();
}

function closeTaskEditor() {
  showList();
  resetTaskForm();
  setTasksError("", "editor");
}

function openTaskEditorAdd() {
  resetTaskForm();
  setTasksError("", "editor");
  showEditor();
  taskNameInput?.focus();
}

function openTaskEditorEdit(task) {
  showEditor();
  if (taskIdInput) taskIdInput.value = task.id;
  if (taskNameInput) taskNameInput.value = task.name;
  if (taskMessageInput) taskMessageInput.value = task.message;
  if (taskEnabledInput) taskEnabledInput.checked = task.enabled !== false;
  parseCronToScheduleUI(task.cron);
  if (taskFormSubmit) taskFormSubmit.textContent = "Enregistrer";
  if (taskEditorTitle) taskEditorTitle.textContent = "Modifier — " + task.name;
  setTasksError("", "editor");
}

function renderScheduledTasks() {
  if (!tasksListEl || !tasksEmptyEl) return;
  tasksListEl.innerHTML = "";
  tasksEmptyEl.classList.toggle("hidden", scheduledTasks.length > 0);

  const ordered = [...scheduledTasks].sort(
    (a, b) => Number(!!b.enabled) - Number(!!a.enabled),
  );

  for (const task of ordered) {
    const card = document.createElement("article");
    card.className = "task-card" + (task.enabled ? "" : " disabled");
    const status = task.lastRunStatus;
    card.innerHTML =
      '<div class="task-card-header">' +
        '<div class="task-card-title">' + escapeHtml(task.name) + "</div>" +
        '<div class="task-card-badges">' +
          '<span class="skill-status ' + (task.enabled ? "enabled" : "disabled") + '">' +
            (task.enabled ? "Activée" : "Désactivée") +
          "</span>" +
          '<span class="task-status ' + statusClass(status) + '">' + statusLabel(status) + "</span>" +
        "</div>" +
      "</div>" +
      '<div class="task-card-message">' + escapeHtml(task.message) + "</div>" +
      '<div class="task-card-meta">' +
        '<span class="task-schedule-label">' + escapeHtml(describeCronExpression(task.cron)) + "</span>" +
        "<span>Cron : <code>" + escapeHtml(task.cron) + "</code></span>" +
        "<span>Prochaine exécution : " + formatDateTime(task.nextRunAt) + "</span>" +
        "<span>Dernière exécution : " + formatDateTime(task.lastRunAt) + "</span>" +
        (task.lastSessionID
          ? "<span>Session : <code>" + escapeHtml(task.lastSessionID) + "</code></span>"
          : "") +
        (task.lastError ? "<span>Détail : " + escapeHtml(task.lastError) + "</span>" : "") +
      "</div>" +
      '<div class="task-card-actions">' +
        '<button type="button" data-action="toggle">' + (task.enabled ? "Désactiver" : "Activer") + "</button>" +
        '<button type="button" data-action="edit">Modifier</button>' +
        '<button type="button" class="danger" data-action="delete">Supprimer</button>' +
      "</div>";

    card.querySelector('[data-action="edit"]')?.addEventListener("click", () => openTaskEditorEdit(task));
    card.querySelector('[data-action="delete"]')?.addEventListener("click", () => { void deleteScheduledTask(task.id); });
    card.querySelector('[data-action="toggle"]')?.addEventListener("click", () => {
      void saveScheduledTask({
        id: task.id,
        name: task.name,
        message: task.message,
        cron: task.cron,
        enabled: !task.enabled,
      });
    });
    tasksListEl.appendChild(card);
  }
}

async function loadScheduledTasks() {
  setTasksError("");
  try {
    const res = await fetch("/api/cron");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Impossible de charger les tâches planifiées.");
    scheduledTasks = data.tasks ?? [];
    const dirEl = document.getElementById("tasks-directory");
    if (dirEl) {
      dirEl.textContent = data.directory
        ? "Sessions créées dans : " + data.directory
        : "";
    }
    renderScheduledTasks();
  } catch (err) {
    setTasksError(err instanceof Error ? err.message : "Erreur inconnue");
  }
}

async function saveScheduledTask(payload, { closeEditor = false } = {}) {
  setTasksError("", closeEditor ? "editor" : "list");
  const isEdit = Boolean(payload.id);
  const url = isEdit ? "/api/cron/" + encodeURIComponent(payload.id) : "/api/cron";
  const method = isEdit ? "PUT" : "POST";
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error ?? "Enregistrement impossible.");
    scheduledTasks = data.tasks ?? [];
    renderScheduledTasks();
    if (closeEditor) closeTaskEditor();
  } catch (err) {
    setTasksError(err instanceof Error ? err.message : "Erreur inconnue", closeEditor ? "editor" : "list");
  }
}

async function deleteScheduledTask(taskId) {
  if (!confirm("Supprimer cette tâche ?")) return;
  setTasksError("");
  try {
    const res = await fetch("/api/cron/" + encodeURIComponent(taskId), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error ?? "Suppression impossible.");
    scheduledTasks = data.tasks ?? [];
    renderScheduledTasks();
    if (taskIdInput?.value === taskId && editorOpen) closeTaskEditor();
  } catch (err) {
    setTasksError(err instanceof Error ? err.message : "Erreur inconnue");
  }
}

tasksAddBtn?.addEventListener("click", openTaskEditorAdd);
taskEditorBack?.addEventListener("click", closeTaskEditor);
taskFormCancel?.addEventListener("click", closeTaskEditor);
taskForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const cron = buildCronFromScheduleUI();
  void (async () => {
    try {
      const res = await fetch("/api/cron/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTasksError(data.error ?? "Expression cron invalide.", "editor");
        queueSchedulePreview();
        return;
      }
      await saveScheduledTask({
        id: taskIdInput?.value || undefined,
        name: taskNameInput?.value.trim() ?? "",
        message: taskMessageInput?.value.trim() ?? "",
        cron: data.cron ?? cron,
        enabled: taskEnabledInput?.checked ?? true,
      }, { closeEditor: true });
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : "Erreur inconnue", "editor");
    }
  })();
});

resetCronFieldState();
loadScheduledTasks();
`
