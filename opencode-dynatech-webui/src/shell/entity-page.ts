import type { UiTheme } from "./theme.ts"
import { themeColorScheme } from "./theme.ts"
import { NAV_CSS, renderShell, type NavId } from "./nav.ts"

export type EntityKind = "skills" | "tools" | "mcps"

const META: Record<
  EntityKind,
  { title: string; heading: string; blurb: string; nav: NavId; api: string; empty: string }
> = {
  skills: {
    title: "Skills · OpenCode",
    heading: "Skills",
    blurb: "Compétences Markdown dans ~/.config/opencode/skills. Activation via permissions OpenCode.",
    nav: "skills",
    api: "/api/skills",
    empty: "Aucune skill. Cliquez sur « Ajouter » pour créer SKILL.md.",
  },
  tools: {
    title: "Tools · OpenCode",
    heading: "Tools",
    blurb: "Outils intégrés (permissions) et outils custom dans ~/.config/opencode/tools, enregistrés par le plugin webui.",
    nav: "tools",
    api: "/api/tools",
    empty: "Aucun outil custom. Les outils intégrés apparaissent ci-dessous.",
  },
  mcps: {
    title: "MCP · OpenCode",
    heading: "Serveurs MCP",
    blurb: "Configuration mcp.servers dans opencode.jsonc (local ou remote).",
    nav: "mcps",
    api: "/api/mcps",
    empty: "Aucun serveur MCP. Cliquez sur « Ajouter » pour en configurer un.",
  },
}

export function renderEntityPage(kind: EntityKind, theme: UiTheme): string {
  const meta = META[kind]
  const colorScheme = themeColorScheme(theme.mode)
  const fontOverrides = `:root{--font:${theme.sans};--mono:${theme.mono};--font-size:${theme.fontSize}px}`
  return `<!DOCTYPE html>
<html lang="fr" data-theme="${theme.mode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="${colorScheme}">
  <title>${meta.title}</title>
  <link rel="stylesheet" href="/code-editor.css">
  <style>${BASE_CSS}${NAV_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(
    meta.nav,
    `
    <div class="view" id="view-list">
      <section class="panel">
        <div class="entity-list-header">
          <div>
            <h2>${meta.heading}</h2>
            <p>${meta.blurb}</p>
          </div>
          <button type="button" class="entity-add-btn" id="btn-add">Ajouter</button>
        </div>
        <div class="banner-error hidden" id="list-error"></div>
        <div id="list" class="card-list"></div>
        <div class="empty hidden" id="empty">${meta.empty}</div>
      </section>
    </div>
    <div class="view hidden" id="view-editor">
      <section class="panel">
        <div class="entity-editor-header">
          <button type="button" class="entity-editor-back" id="btn-back">← Retour</button>
          <h2 id="editor-title">Nouveau</h2>
        </div>
        <div class="banner-error hidden" id="editor-error"></div>
        <form id="form" class="entity-form"></form>
      </section>
    </div>
  `,
  )}
  <script>window.__KIND__=${JSON.stringify(kind)};window.__API__=${JSON.stringify(meta.api)};</script>
  <script src="/code-editor.js"></script>
  <script>${CLIENT_JS}</script>
</body>
</html>`
}

const BASE_CSS = `
:root,:root[data-theme="light"]{color-scheme:light;--bg:#fafafa;--bg-elevated:#fff;--bg-muted:#f4f4f5;--bg-hover:#f4f4f5;--border:#e4e4e7;--border-strong:#d4d4d8;--text:#18181b;--text-muted:#71717a;--text-faint:#a1a1aa;--accent:#2563eb;--ok:#16a34a;--ok-bg:#dcfce7;--ok-fg:#166534;--err:#dc2626;--err-bg:#fef2f2;--err-border:#fecaca;--primary:#18181b;--primary-hover:#27272a;--primary-fg:#fff;--toggle-off:rgba(120,120,128,.22);--toggle-on:#34c759;--shadow:0 1px 2px rgba(0,0,0,.04);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;--font-size:14px}
@media (prefers-color-scheme:dark){:root[data-theme="system"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);font-size:var(--font-size);background:var(--bg);color:var(--text);min-height:100dvh;-webkit-font-smoothing:antialiased}
.app{width:100%}
.view.hidden,.hidden{display:none!important}
.panel{padding:0} /* padding unifié via .shell-box .panel */
.entity-list-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}
.entity-list-header h2{font-size:1.125rem;font-weight:600;letter-spacing:-.01em;margin-bottom:.35rem}
.entity-list-header p{font-size:.875rem;color:var(--text-muted);line-height:1.5;max-width:36rem}
.entity-add-btn{flex-shrink:0;border-radius:999px;padding:.45rem .95rem;font-size:.84rem;font-weight:600;background:var(--primary);color:var(--primary-fg);border:1px solid var(--primary);cursor:pointer;font:inherit}
.entity-add-btn:hover{background:var(--primary-hover)}
.entity-editor-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem}
.entity-editor-back{border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-muted);padding:.4rem .75rem;font-size:.84rem;cursor:pointer;font:inherit}
.entity-editor-back:hover{background:var(--bg-hover);color:var(--text)}
.entity-editor-header h2{font-size:1.05rem;font-weight:600}
.empty{padding:1.5rem 1rem;border:1px dashed var(--border-strong);border-radius:8px;background:var(--bg-elevated);color:var(--text-muted);font-size:.9rem;text-align:center;line-height:1.55}
.banner-error{margin-bottom:1rem;padding:.65rem .85rem;border-radius:6px;background:var(--err-bg);border:1px solid var(--err-border);color:var(--err);font-size:.875rem}
.card-list{display:flex;flex-direction:column;gap:.5rem}
.card{border:none;border-radius:8px;background:var(--bg-muted);padding:.75rem .85rem}
.card.disabled{background:var(--bg-elevated);border:1px dashed var(--border-strong);color:var(--text-muted)}
.card-head{display:flex;flex-direction:column;align-items:flex-start;gap:.3rem;margin-bottom:.35rem}
.card-title{font-weight:600;font-size:.95rem}
.card-meta{font-size:.78rem;color:var(--text-faint);font-family:var(--mono)}
.card-chips{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center}
.card-desc{font-size:.875rem;color:var(--text-muted);line-height:1.45;margin:.25rem 0 .65rem}
.card-actions{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.35rem;padding-top:.55rem;border-top:1px solid var(--border)}
.chip{font-size:.72rem;font-weight:600;padding:.15rem .45rem;border-radius:999px}
.chip-on{background:var(--ok-bg);color:var(--ok-fg)}
.chip-off{background:var(--bg-muted);color:var(--text-muted)}
.chip-type{background:var(--bg-muted);color:var(--text-muted)}
.btn{border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text);padding:.35rem .65rem;font-size:.8rem;cursor:pointer;font:inherit}
.btn:hover{background:var(--bg-hover)}
.btn-danger{color:var(--err);border-color:var(--err-border)}
.entity-form{display:flex;flex-direction:column;gap:.75rem}
.entity-form label{display:flex;flex-direction:column;gap:.35rem;font-size:.8rem;color:var(--text-muted)}
.entity-form input,.entity-form textarea:not(.code-editor-input),.entity-form select{border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);padding:.55rem .7rem;font:inherit;font-size:.9rem}
.entity-form textarea:not(.code-editor-input){min-height:8rem;font-family:var(--mono);line-height:1.45;resize:vertical}
.entity-form .code-editor{background:var(--bg)}
.entity-form .code-editor-input::placeholder{color:var(--text-muted);opacity:.85;-webkit-text-fill-color:var(--text-muted)}
.entity-form-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:.5rem;flex-wrap:wrap}
.entity-form-toggle{display:flex;align-items:center;gap:.55rem;color:var(--text);font-size:.875rem;cursor:pointer}
.entity-form-toggle input{position:absolute;opacity:0;pointer-events:none}
.toggle-switch{width:42px;height:26px;border-radius:999px;background:var(--toggle-off);position:relative;transition:background .15s}
.toggle-switch::after{content:"";position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s}
.entity-form-toggle input:checked + .toggle-switch{background:var(--toggle-on)}
.entity-form-toggle input:checked + .toggle-switch::after{transform:translateX(16px)}
.entity-form-actions{display:flex;gap:.5rem}
.entity-form-actions button{border-radius:999px;padding:.45rem .95rem;font-size:.84rem;font-weight:600;cursor:pointer;font:inherit;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text)}
.entity-form-actions button[type=submit]{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
.section-label{font-size:.78rem;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.04em;margin:1rem 0 .5rem}
.kv-help{font-size:.75rem;color:var(--text-faint)}
`

const CLIENT_JS = `
const kind = window.__KIND__;
const apiBase = window.__API__;
const viewList = document.getElementById("view-list");
const viewEditor = document.getElementById("view-editor");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const listError = document.getElementById("list-error");
const editorError = document.getElementById("editor-error");
const form = document.getElementById("form");
const editorTitle = document.getElementById("editor-title");
let items = [];
let template = "";
let editingId = null;

function showError(el, msg) {
  if (!msg) { el.classList.add("hidden"); el.textContent = ""; return; }
  el.classList.remove("hidden");
  el.textContent = msg;
}

function showList() {
  viewList.classList.remove("hidden");
  viewEditor.classList.add("hidden");
}

function showEditor() {
  viewList.classList.add("hidden");
  viewEditor.classList.remove("hidden");
}

async function api(path, init) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(init && init.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return data;
}

function parseLines(text) {
  return String(text || "").split(/\\n/).map((l) => l.trim()).filter(Boolean);
}

function parseKv(text) {
  const out = {};
  for (const line of parseLines(text)) {
    const i = line.indexOf("=");
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function kvToText(obj) {
  if (!obj) return "";
  return Object.entries(obj).map(([k, v]) => k + "=" + v).join("\\n");
}

function byEnabledFirst(a, b) {
  return Number(!!b.enabled) - Number(!!a.enabled);
}

function renderCards() {
  const custom = items.filter((i) => !i.builtin).slice().sort(byEnabledFirst);
  const builtins = items.filter((i) => i.builtin).slice().sort(byEnabledFirst);
  const ordered = items.slice().sort(byEnabledFirst);
  const parts = [];
  if (kind === "tools" && custom.length) parts.push('<div class="section-label">Custom</div>');
  for (const item of (kind === "tools" ? custom : ordered)) parts.push(cardHtml(item));
  if (kind === "tools" && builtins.length) {
    parts.push('<div class="section-label">Intégrés — activation uniquement</div>');
    for (const item of builtins) parts.push(cardHtml(item));
  }
  listEl.innerHTML = parts.join("");
  emptyEl.classList.toggle("hidden", items.length > 0);
  listEl.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => onAction(btn.getAttribute("data-action"), btn.getAttribute("data-id")));
  });
}

function cardHtml(item) {
  const chip = item.enabled
    ? '<span class="chip chip-on">Activé</span>'
    : '<span class="chip chip-off">Désactivé</span>';
  const type = item.type ? '<span class="chip chip-type">' + item.type + '</span>' : '';
  const title = item.name && item.name !== item.id ? item.name : item.id;
  const showMeta = item.name && item.name !== item.id;
  const actions = item.builtin
    ? '<button type="button" class="btn" data-action="toggle" data-id="' + item.id + '">' + (item.enabled ? "Désactiver" : "Activer") + '</button>'
    : '<button type="button" class="btn" data-action="toggle" data-id="' + item.id + '">' + (item.enabled ? "Désactiver" : "Activer") + '</button>' +
      '<button type="button" class="btn" data-action="edit" data-id="' + item.id + '">Modifier</button>' +
      '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + item.id + '">Supprimer</button>';
  return '<article class="card' + (item.enabled ? '' : ' disabled') + '">' +
    '<div class="card-head">' +
      '<div class="card-title">' + escapeHtml(title) + '</div>' +
      (showMeta ? '<div class="card-meta">' + escapeHtml(item.id) + '</div>' : '') +
      '<div class="card-chips">' + chip + type + '</div>' +
    '</div>' +
    '<p class="card-desc">' + escapeHtml(item.description || "—") + '</p>' +
    '<div class="card-actions">' + actions + '</div></article>';
}

function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildForm(item) {
  editingId = item ? item.id : null;
  editorTitle.textContent = item ? "Modifier" : "Nouveau";
  if (kind === "skills") {
    form.innerHTML =
      '<label>Identifiant<input id="f-id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" ' + (item ? "readonly" : "") + ' value="' + escapeHtml(item && item.id || "") + '" placeholder="ma-skill"></label>' +
      '<label>Nom<input id="f-name" value="' + escapeHtml(item && item.name || "") + '" placeholder="Nom affiché"></label>' +
      '<label>Description<textarea id="f-desc" required rows="2">' + escapeHtml(item && item.description || "") + '</textarea></label>' +
      '<label>Corps Markdown<textarea id="f-body" data-code-lang="markdown" data-code-min-height="12rem" required rows="1" spellcheck="false">' + escapeHtml(item && item.body || "") + '</textarea></label>' +
      toolbarHtml(item ? item.enabled !== false : true);
  } else if (kind === "tools") {
    form.innerHTML =
      '<label>Identifiant<input id="f-id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" ' + (item ? "readonly" : "") + ' value="' + escapeHtml(item && item.id || "") + '" placeholder="mon-outil"></label>' +
      '<label>Source TypeScript<textarea id="f-source" data-code-lang="typescript" data-code-min-height="16rem" required rows="1" spellcheck="false">' + escapeHtml(item && item.source || template) + '</textarea></label>' +
      toolbarHtml(item ? item.enabled !== false : true);
  } else {
    const type = item && item.type || "local";
    form.innerHTML =
      '<label>Identifiant<input id="f-id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" ' + (item ? "readonly" : "") + ' value="' + escapeHtml(item && item.id || "") + '" placeholder="mon-mcp"></label>' +
      '<label>Type<select id="f-type"><option value="local"' + (type==="local"?" selected":"") + '>Local</option><option value="remote"' + (type==="remote"?" selected":"") + '>Remote</option></select></label>' +
      '<div id="local-fields">' +
      '<label>Commande (une ligne par argument)<textarea id="f-command" data-code-lang="shell" data-code-min-height="4.5rem" rows="1" spellcheck="false">' + escapeHtml((item && item.command || []).join("\\n")) + '</textarea></label>' +
      '<label>Variables d\\'environnement (KEY=value)<textarea id="f-env" data-code-lang="keyvalue" data-code-min-height="4.5rem" rows="1" spellcheck="false">' + escapeHtml(kvToText(item && item.environment)) + '</textarea><span class="kv-help">Une paire par ligne</span></label>' +
      '<label>cwd<input id="f-cwd" value="' + escapeHtml(item && item.cwd || "") + '"></label>' +
      '</div>' +
      '<div id="remote-fields">' +
      '<label>URL<input id="f-url" value="' + escapeHtml(item && item.url || "") + '" placeholder="https://..."></label>' +
      '<label>Headers (KEY=value)<textarea id="f-headers" data-code-lang="keyvalue" data-code-min-height="4.5rem" rows="1" spellcheck="false">' + escapeHtml(kvToText(item && item.headers)) + '</textarea></label>' +
      '<label class="entity-form-toggle" style="flex-direction:row"><input type="checkbox" id="f-oauth" ' + (item && item.oauth ? "checked" : "") + '><span class="toggle-switch"></span><span>OAuth</span></label>' +
      '</div>' +
      toolbarHtml(item ? item.enabled !== false : true);
    const syncType = () => {
      const t = document.getElementById("f-type").value;
      document.getElementById("local-fields").style.display = t === "local" ? "" : "none";
      document.getElementById("remote-fields").style.display = t === "remote" ? "" : "none";
    };
    document.getElementById("f-type").addEventListener("change", syncType);
    syncType();
  }
  if (window.CodeEditor) window.CodeEditor.enhanceAll("#form textarea[data-code-lang]");
  document.getElementById("btn-cancel").onclick = () => { showList(); showError(editorError, ""); };
}

function toolbarHtml(enabled) {
  return '<div class="entity-form-toolbar">' +
    '<label class="entity-form-toggle"><input type="checkbox" id="f-enabled" ' + (enabled ? "checked" : "") + '><span class="toggle-switch"></span><span class="toggle-label">Activer</span></label>' +
    '<div class="entity-form-actions"><button type="button" id="btn-cancel">Annuler</button><button type="submit">Enregistrer</button></div></div>';
}

async function load() {
  showError(listError, "");
  try {
    const data = await api(apiBase);
    items = data.skills || data.tools || data.mcps || [];
    if (data.template) template = data.template;
    renderCards();
  } catch (e) {
    showError(listError, e.message || String(e));
  }
}

async function onAction(action, id) {
  try {
    if (action === "edit") {
      const key = kind === "skills" ? "skill" : kind === "tools" ? "tool" : "mcp";
      const data = await api(apiBase + "/" + encodeURIComponent(id));
      buildForm(data[key]);
      showEditor();
      return;
    }
    if (action === "delete") {
      if (!confirm("Supprimer « " + id + " » ?")) return;
      const data = await api(apiBase + "/" + encodeURIComponent(id), { method: "DELETE" });
      items = data.skills || data.tools || data.mcps || [];
      renderCards();
      return;
    }
    if (action === "toggle") {
      const item = items.find((x) => x.id === id);
      const enabled = !(item && item.enabled);
      if (kind === "tools") {
        const data = await api(apiBase + "/" + encodeURIComponent(id) + "/enabled", {
          method: "PUT",
          body: JSON.stringify({ enabled }),
        });
        items = data.tools || [];
      } else {
        const key = kind === "skills" ? "skill" : "mcp";
        const detail = await api(apiBase + "/" + encodeURIComponent(id));
        const payload = { ...detail[key], enabled };
        const data = await api(apiBase + "/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        items = data.skills || data.mcps || [];
      }
      renderCards();
    }
  } catch (e) {
    showError(listError, e.message || String(e));
  }
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(editorError, "");
  try {
    let payload;
    if (kind === "skills") {
      payload = {
        id: document.getElementById("f-id").value.trim(),
        name: document.getElementById("f-name").value.trim() || document.getElementById("f-id").value.trim(),
        description: document.getElementById("f-desc").value,
        body: document.getElementById("f-body").value,
        enabled: document.getElementById("f-enabled").checked,
      };
    } else if (kind === "tools") {
      payload = {
        id: document.getElementById("f-id").value.trim(),
        name: document.getElementById("f-id").value.trim(),
        source: document.getElementById("f-source").value,
        enabled: document.getElementById("f-enabled").checked,
      };
    } else {
      const type = document.getElementById("f-type").value;
      payload = {
        id: document.getElementById("f-id").value.trim(),
        name: document.getElementById("f-id").value.trim(),
        type,
        enabled: document.getElementById("f-enabled").checked,
        command: type === "local" ? parseLines(document.getElementById("f-command").value) : undefined,
        environment: type === "local" ? parseKv(document.getElementById("f-env").value) : undefined,
        cwd: type === "local" ? document.getElementById("f-cwd").value.trim() || undefined : undefined,
        url: type === "remote" ? document.getElementById("f-url").value.trim() : undefined,
        headers: type === "remote" ? parseKv(document.getElementById("f-headers").value) : undefined,
        oauth: type === "remote" ? document.getElementById("f-oauth").checked : undefined,
      };
    }
    const url = editingId ? apiBase + "/" + encodeURIComponent(editingId) : apiBase;
    const data = await api(url, { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
    items = data.skills || data.tools || data.mcps || [];
    renderCards();
    showList();
  } catch (e) {
    showError(editorError, e.message || String(e));
  }
});

document.getElementById("btn-add").addEventListener("click", () => {
  if (kind === "tools") buildForm({ source: template, enabled: true });
  else buildForm(null);
  showEditor();
});
document.getElementById("btn-back").addEventListener("click", () => showList());
load();
`
