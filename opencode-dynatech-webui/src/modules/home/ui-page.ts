import { LITE_MARKDOWN_BROWSER_JS } from "../../lib/lite-markdown.ts"
import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_CRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`

const ICON_AGENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`

const ICON_MODEL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M12 18v4"/></svg>`

const ICON_SETTINGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`

const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`

export function renderHomePage(theme: UiTheme): string {
  const colorScheme = themeColorScheme(theme.mode)
  const fontOverrides = `:root{--font:${theme.sans};--mono:${theme.mono};--font-size:${theme.fontSize}px}`
  return `<!DOCTYPE html>
<html lang="fr" data-theme="${theme.mode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="${colorScheme}">
  <title>Accueil · OpenCode</title>
  <link rel="stylesheet" href="/code-editor.css">
  <style>${BASE_CSS}${NAV_CSS}${HOME_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(
    null,
    `
    <div class="view" id="view-home">
      <section class="panel" aria-labelledby="readme-title">
        <header class="page-chrome">
          <div class="entity-list-header">
            <div>
              <h2 id="readme-title">Description du projet</h2>
            </div>
            <button type="button" class="entity-add-btn" id="readme-edit">Modifier</button>
          </div>
          <div class="page-sep" role="separator" aria-hidden="true"></div>
        </header>
        <div class="banner-error hidden" id="home-error"></div>
        <article class="readme-preview msg-md" id="readme-preview" aria-live="polite"></article>
        <div class="readme-empty hidden" id="readme-empty">Aucun README pour ce projet.</div>
        <div class="page-sep" role="separator" aria-hidden="true"></div>
        <div class="home-section home-status">
          <div class="status-chain" aria-label="Chaîne de fonctionnement">
            <div class="status-node">
              <span class="status-icon err" id="cron-icon" title="Cron">${ICON_CRON}</span>
              <span class="status-node-label">Cron</span>
            </div>
            <div class="status-chain-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <div class="status-node">
              <span class="status-icon err" id="opencode-icon" title="OpenCode">${ICON_AGENT}</span>
              <span class="status-node-label">OpenCode</span>
            </div>
            <div class="status-chain-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <div class="status-node status-node-model">
              <span class="status-icon err" id="model-icon" title="Modèle">${ICON_MODEL}</span>
              <span class="status-node-label model-name" id="model-name">—</span>
            </div>
          </div>
        </div>
        <div class="page-sep" role="separator" aria-hidden="true"></div>
        <a class="home-link" href="/skills">
          <span class="home-link-icon" aria-hidden="true">${ICON_SETTINGS}</span>
          <span class="home-link-title">Réglages</span>
          <span class="home-link-chevron" aria-hidden="true">${ICON_CHEVRON}</span>
        </a>
      </section>
    </div>
    <div class="view hidden" id="view-editor">
      <section class="panel">
        <div class="entity-editor-header">
          <button type="button" class="entity-editor-back" id="btn-back">← Retour</button>
          <h2 id="editor-title">Modifier README</h2>
        </div>
        <div class="banner-error hidden" id="editor-error"></div>
        <form id="readme-form" class="entity-form">
          <label>
            Contenu
            <textarea
              id="readme-input"
              class="readme-input"
              data-code-lang="markdown"
              data-code-min-height="18rem"
              rows="1"
              spellcheck="false"
              placeholder="Contenu du README racine du projet…"
            ></textarea>
          </label>
          <div class="entity-form-toolbar">
            <p class="readme-status" id="readme-status" aria-live="polite"></p>
            <div class="entity-form-actions">
              <button type="button" id="btn-cancel">Annuler</button>
              <button type="submit" id="readme-save">Enregistrer</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  `,
    "home",
  )}
  <script src="/code-editor.js"></script>
  <script>${LITE_MARKDOWN_BROWSER_JS}${HOME_JS}</script>
</body>
</html>`
}

const HOME_JS = `
(function () {
  const viewHome = document.getElementById("view-home");
  const viewEditor = document.getElementById("view-editor");
  const previewEl = document.getElementById("readme-preview");
  const emptyEl = document.getElementById("readme-empty");
  const homeError = document.getElementById("home-error");
  const editorError = document.getElementById("editor-error");
  const editBtn = document.getElementById("readme-edit");
  const backBtn = document.getElementById("btn-back");
  const cancelBtn = document.getElementById("btn-cancel");
  const form = document.getElementById("readme-form");
  const input = document.getElementById("readme-input");
  const saveBtn = document.getElementById("readme-save");
  const statusEl = document.getElementById("readme-status");
  if (!viewHome || !viewEditor || !previewEl || !emptyEl || !input || !form) return;

  let loadedContent = "";
  let exists = false;
  let saving = false;
  let editorReady = false;

  function showError(el, message) {
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.classList.add("hidden");
      return;
    }
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message || "";
  }

  function renderPreview(content) {
    const text = String(content || "").trim();
    if (!text) {
      previewEl.innerHTML = "";
      previewEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      emptyEl.textContent = exists
        ? "Le README est vide."
        : "Aucun README pour ce projet.";
      return;
    }
    emptyEl.classList.add("hidden");
    previewEl.classList.remove("hidden");
    previewEl.innerHTML = typeof renderMarkdown === "function" ? renderMarkdown(content) : "";
  }

  function showHome() {
    viewHome.classList.remove("hidden");
    viewEditor.classList.add("hidden");
    showError(editorError, "");
    setStatus("");
  }

  function showEditor() {
    viewEditor.classList.remove("hidden");
    viewHome.classList.add("hidden");
    showError(homeError, "");
    showError(editorError, "");
    input.value = loadedContent;
    setStatus(exists ? "" : "L’enregistrement créera README.md");
    if (!editorReady && window.CodeEditor) {
      window.CodeEditor.enhance(input, { lang: "markdown", minHeight: "18rem" });
      editorReady = true;
    } else if (window.CodeEditor) {
      window.CodeEditor.refresh(input);
    }
    input.focus();
  }

  async function loadReadme() {
    showError(homeError, "");
    try {
      const res = await fetch("/api/project/readme", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      loadedContent = typeof data.content === "string" ? data.content : "";
      exists = Boolean(data.exists);
      renderPreview(loadedContent);
      if (!viewEditor.classList.contains("hidden")) {
        input.value = loadedContent;
        if (window.CodeEditor) window.CodeEditor.refresh(input);
      }
    } catch (err) {
      loadedContent = "";
      exists = false;
      renderPreview("");
      showError(homeError, err instanceof Error ? err.message : "Impossible de charger le README");
    }
  }

  async function saveReadme() {
    if (saving) return;
    saving = true;
    if (saveBtn) saveBtn.disabled = true;
    showError(editorError, "");
    setStatus("Enregistrement…");
    try {
      const res = await fetch("/api/project/readme", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: input.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      loadedContent = typeof data.content === "string" ? data.content : input.value;
      exists = true;
      renderPreview(loadedContent);
      setStatus("Enregistré");
      showHome();
    } catch (err) {
      showError(editorError, err instanceof Error ? err.message : "Impossible d'enregistrer le README");
      setStatus("");
    } finally {
      saving = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  editBtn?.addEventListener("click", () => showEditor());
  backBtn?.addEventListener("click", () => showHome());
  cancelBtn?.addEventListener("click", () => showHome());

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    void saveReadme();
  });

  document.addEventListener("keydown", (ev) => {
    if (viewEditor.classList.contains("hidden")) return;
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      void saveReadme();
    }
  });

  document.addEventListener("dynatech:project-changed", () => {
    void loadReadme();
  });

  void loadReadme();

  const cronIcon = document.getElementById("cron-icon");
  const opencodeIcon = document.getElementById("opencode-icon");
  const modelIcon = document.getElementById("model-icon");
  const modelNameEl = document.getElementById("model-name");

  function setIcon(el, ok) {
    if (!el) return;
    el.classList.toggle("ok", ok);
    el.classList.toggle("err", !ok);
  }

  function shortModelName(name) {
    if (!name) return "—";
    return name.length > 28 ? name.slice(0, 27) + "…" : name;
  }

  async function pollStatus() {
    if (!cronIcon || !opencodeIcon || !modelIcon || !modelNameEl) return;
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      setIcon(cronIcon, Boolean(data.cronConnected));
      setIcon(opencodeIcon, Boolean(data.opencodeConnected));
      setIcon(modelIcon, Boolean(data.modelConnected));
      modelNameEl.textContent = shortModelName(data.modelName);
      modelNameEl.title = data.modelName || "Modèle";
    } catch {
      setIcon(cronIcon, false);
      setIcon(opencodeIcon, false);
      setIcon(modelIcon, false);
      modelNameEl.textContent = "—";
      modelNameEl.title = "Modèle";
    }
  }

  pollStatus();
  setInterval(pollStatus, 2000);
})();
`

const BASE_CSS = `
:root,:root[data-theme="light"]{color-scheme:light;--bg:#fafafa;--bg-elevated:#fff;--bg-muted:#f4f4f5;--bg-hover:#f4f4f5;--border:#e4e4e7;--border-strong:#d4d4d8;--text:#18181b;--text-muted:#71717a;--text-faint:#a1a1aa;--accent:#2563eb;--ok:#16a34a;--ok-bg:#dcfce7;--ok-fg:#166534;--err:#dc2626;--err-bg:#fef2f2;--err-border:#fecaca;--primary:#18181b;--primary-hover:#27272a;--primary-fg:#fff;--toggle-off:rgba(120,120,128,.22);--toggle-on:#34c759;--shadow:0 1px 2px rgba(0,0,0,.04);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;--font-size:14px}
@media (prefers-color-scheme:dark){:root[data-theme="system"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);font-size:var(--font-size);background:var(--bg);color:var(--text);min-height:100dvh;-webkit-font-smoothing:antialiased}
.view.hidden,.hidden{display:none!important}
`

const HOME_CSS = `
.entity-editor-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}
.entity-editor-back {
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
}
.entity-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.entity-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.entity-form-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.55rem;
  flex-wrap: wrap;
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--bg-elevated) 0%, transparent) 0%,
    var(--bg-elevated) 28%
  );
}
.entity-form-actions {
  display: flex;
  gap: 0.5rem;
}
.entity-form-actions button {
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  font: inherit;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
}
.entity-form-actions button[type=submit] {
  background: var(--primary);
  color: var(--primary-fg);
  border-color: var(--primary);
}
.banner-error {
  margin: 0;
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  color: var(--err);
  font-size: 0.875rem;
}
.banner-error.hidden {
  display: none;
}
.readme-preview {
  min-width: 0;
  line-height: 1.55;
  color: var(--text);
}
.readme-preview > :first-child {
  margin-top: 0;
}
.readme-preview > :last-child {
  margin-bottom: 0;
}
.readme-preview h1,
.readme-preview h2,
.readme-preview h3,
.readme-preview h4,
.readme-preview h5,
.readme-preview h6 {
  margin: 1.1rem 0 0.45rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--text);
}
.readme-preview h1 { font-size: 1.45rem; }
.readme-preview h2 { font-size: 1.2rem; }
.readme-preview h3 { font-size: 1.05rem; }
.readme-preview h4,
.readme-preview h5,
.readme-preview h6 { font-size: 0.95rem; }
.readme-preview p {
  margin: 0.55rem 0;
}
.readme-preview a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-word;
}
.readme-preview .msg-img {
  display: block;
  max-width: min(100%, 28rem);
  width: auto;
  height: auto;
  margin: 0.55rem 0;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
}
.readme-preview ol,
.readme-preview ul {
  margin: 0.45rem 0;
  padding-left: 1.35rem;
}
.readme-preview li {
  margin: 0.2rem 0;
}
.readme-preview li + li {
  margin-top: 0.35rem;
}
.readme-preview code {
  font-family: var(--mono);
  font-size: 0.84em;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: var(--bg-muted);
}
.readme-preview .msg-pre {
  margin: 0.5rem 0;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  background: var(--bg-muted);
  font-family: var(--mono);
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
  overflow-x: auto;
}
.readme-preview .msg-pre code {
  padding: 0;
  background: transparent;
}
.readme-empty {
  padding: 1.35rem 1rem;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.55;
}
.entity-form .code-editor {
  background: var(--bg);
}
/* Opaque .readme-input styles must not cover the highlight layer behind the textarea. */
.readme-input.code-editor-input {
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: var(--text);
}
.readme-input:not(.code-editor-input) {
  width: 100%;
  min-height: 18rem;
  margin: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-family: var(--mono);
  font-size: 0.86rem;
  line-height: 1.5;
  resize: vertical;
}
.readme-status {
  margin: 0;
  min-height: 1.1rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.home-status {
  width: min(22rem, 100%);
  min-width: 0;
  margin-inline: auto;
}
.home-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  margin: 0 auto;
  padding: 0.2rem 0.35rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  text-decoration: none;
  font: inherit;
  transition: color .15s, background .15s;
}
.home-link:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.home-link-icon {
  flex: 0 0 auto;
  width: 0.95rem;
  height: 0.95rem;
  display: inline-flex;
  opacity: 0.85;
}
.home-link-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.home-link-title {
  font-size: 0.9rem;
  font-weight: 500;
}
.home-link-chevron {
  flex: 0 0 auto;
  width: 0.85rem;
  height: 0.85rem;
  display: inline-flex;
  opacity: 0.7;
}
.home-link-chevron svg {
  width: 100%;
  height: 100%;
  display: block;
}
.status-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
}
.status-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}
.status-node-model {
  max-width: 8.5rem;
}
.status-icon {
  width: 1.55rem;
  height: 1.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--err);
  transition: color .2s;
}
.status-icon.ok {
  color: var(--ok);
}
.status-icon.err {
  color: var(--err);
}
.status-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.status-node-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-chain-dots {
  display: flex;
  align-items: center;
  gap: 0.22rem;
  padding: 0 0.1rem 1.05rem;
  flex: 0 0 auto;
}
.status-chain-dots span {
  width: 0.22rem;
  height: 0.22rem;
  border-radius: 999px;
  background: var(--border-strong);
  opacity: 0.85;
}
`
