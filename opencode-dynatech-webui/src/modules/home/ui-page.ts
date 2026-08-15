import { LITE_MARKDOWN_BROWSER_JS } from "../../lib/lite-markdown.ts"
import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`

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
              <h2 id="readme-title">Instructions personnalisées</h2>
            </div>
            <button type="button" class="entity-add-btn" id="readme-edit" title="Modifier" aria-label="Modifier">${ICON_EDIT}</button>
          </div>
          <div class="page-sep" role="separator" aria-hidden="true"></div>
        </header>
        <div class="banner-error hidden" id="home-error"></div>
        <article class="readme-preview msg-md" id="readme-preview" aria-live="polite"></article>
        <div class="readme-empty hidden" id="readme-empty">Aucun AGENTS.md pour ce projet.</div>
      </section>
    </div>
    <div class="view hidden" id="view-editor">
      <section class="panel editor-panel">
        <div class="entity-editor-header">
          <button type="button" class="entity-editor-back" id="btn-back">← Retour</button>
          <h2 id="editor-title">Modifier AGENTS.md</h2>
        </div>
        <div class="banner-error hidden" id="editor-error"></div>
        <form id="readme-form" class="entity-form">
          <div class="readme-editor-field">
            <textarea
              id="readme-input"
              class="readme-input"
              data-code-lang="markdown"
              rows="1"
              spellcheck="false"
              aria-label="Contenu AGENTS.md"
              placeholder="Contenu du fichier AGENTS.md racine du projet…"
            ></textarea>
          </div>
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
        ? "AGENTS.md est vide."
        : "Aucun AGENTS.md pour ce projet.";
      return;
    }
    emptyEl.classList.add("hidden");
    previewEl.classList.remove("hidden");
    previewEl.innerHTML = typeof renderMarkdown === "function" ? renderMarkdown(content) : "";
  }

  function showHome() {
    viewHome.classList.remove("hidden");
    viewEditor.classList.add("hidden");
    document.querySelector(".shell")?.classList.remove("is-editor");
    showError(editorError, "");
    setStatus("");
  }

  function showEditor() {
    viewEditor.classList.remove("hidden");
    viewHome.classList.add("hidden");
    document.querySelector(".shell")?.classList.add("is-editor");
    showError(homeError, "");
    showError(editorError, "");
    input.value = loadedContent;
    setStatus(exists ? "" : "L’enregistrement créera AGENTS.md");
    if (!editorReady && window.CodeEditor) {
      window.CodeEditor.enhance(input, { lang: "markdown", fill: true });
      editorReady = true;
    } else if (window.CodeEditor) {
      window.CodeEditor.refresh(input);
    }
    input.focus();
  }

  async function loadReadme() {
    showError(homeError, "");
    try {
      const res = await fetch("/api/project/agents", { cache: "no-store" });
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
      showError(homeError, err instanceof Error ? err.message : "Impossible de charger AGENTS.md");
    }
  }

  async function saveReadme() {
    if (saving) return;
    saving = true;
    if (saveBtn) saveBtn.disabled = true;
    showError(editorError, "");
    setStatus("Enregistrement…");
    try {
      const res = await fetch("/api/project/agents", {
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
      showError(editorError, err instanceof Error ? err.message : "Impossible d'enregistrer AGENTS.md");
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
/* Mode édition : viewport figé, footer collé en bas, éditeur scrollable */
.shell.is-editor {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  justify-content: center;
  align-items: stretch;
  padding: var(--shell-pad);
  box-sizing: border-box;
}
.shell.is-editor .shell-cluster {
  flex: 0 1 auto;
  align-self: stretch;
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.shell.is-editor .shell-top-row {
  position: relative;
  top: auto;
  flex: 0 0 auto;
  margin: 0;
  padding: 0 0 0.55rem;
  background: var(--bg);
}
.shell.is-editor .shell-body,
.shell.is-editor .shell-stack {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.shell.is-editor .shell-box,
.shell.is-editor .app {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
#view-editor {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
#view-editor.hidden {
  display: none !important;
}
#view-editor .editor-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
  padding-bottom: 0.75rem;
}
.entity-editor-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  flex: 0 0 auto;
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
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
}
.readme-editor-field {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.entity-form-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0;
  padding: 0.55rem 0 0;
  flex: 0 0 auto;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}
.entity-form-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
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
  flex: 0 0 auto;
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
.readme-preview hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1rem 0;
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
.readme-editor-field .code-editor {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
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
  min-height: 0;
  height: 100%;
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
  resize: none;
  overflow: auto;
}
.readme-status {
  margin: 0;
  min-height: 1.1rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}
`
