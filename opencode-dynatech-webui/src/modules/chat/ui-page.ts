import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`

const ICON_ZAP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`

const ICON_CHEVRON = `<svg class="session-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`

const ICON_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`

const SESSIONS = [
  { id: "1", name: "Capacité d'orchestrateur et délégation" },
  { id: "2", name: "Cron · Bonjour" },
  { id: "3", name: "Nouvelle session" },
] as const

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sessionOptionHtml(session: { id: string; name: string }, currentId: string): string {
  const selected = session.id === currentId
  return `<div class="session-row${selected ? " selected" : ""}" role="option" data-id="${escapeHtml(session.id)}" data-name="${escapeHtml(session.name)}" aria-selected="${selected ? "true" : "false"}">
  <button type="button" class="session-option" data-id="${escapeHtml(session.id)}" data-name="${escapeHtml(session.name)}">${escapeHtml(session.name)}</button>
  <button type="button" class="session-close" data-close="${escapeHtml(session.id)}" aria-label="Fermer la session" title="Fermer">×</button>
</div>`
}

function sessionPickerHtml(): string {
  const current = SESSIONS[0]!
  const options = SESSIONS.map((session) => sessionOptionHtml(session, current.id)).join("")

  return `<div class="session-picker" id="session-picker">
  <button type="button" class="session-trigger" id="session-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Session courante">
    <span class="session-name" id="session-name">${escapeHtml(current.name)}</span>
    ${ICON_CHEVRON}
  </button>
  <div class="session-menu" id="session-menu" role="listbox" hidden>
    <button type="button" class="session-action" id="session-add"><span class="session-action-icon" aria-hidden="true">+</span><span>Nouvelle session</span></button>
    <div class="session-sep" role="separator"></div>
    <div class="session-list" id="session-list">${options}</div>
  </div>
</div>`
}

export function renderChatPage(theme: UiTheme): string {
  const colorScheme = themeColorScheme(theme.mode)
  const fontOverrides = `:root{--font:${theme.sans};--mono:${theme.mono};--font-size:${theme.fontSize}px}`
  return `<!DOCTYPE html>
<html lang="fr" data-theme="${theme.mode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="${colorScheme}">
  <title>Chat · OpenCode</title>
  <style>${BASE_CSS}${NAV_CSS}${CHAT_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(
    null,
    `
    <div class="chat-root">
      <header class="chat-toolbar">
        ${sessionPickerHtml()}
      </header>

      <div class="chat-messages" id="chat-messages" aria-live="polite">
        <div class="msg msg-assistant">
          <p>Voici une structure de chat factice, calquée sur OpenCode Desktop.</p>
          <p>Les messages assistant restent en texte libre ; les messages utilisateur passent dans une bulle grise.</p>
        </div>
        <div class="msg msg-user">
          <pre class="msg-pre">OPENCODE_WEBUI_OPENED
http://127.0.0.1:9877/chat</pre>
        </div>
        <div class="msg msg-assistant">
          <p>La page des tâches planifiées a été ouverte dans votre navigateur.</p>
        </div>
        <div class="msg msg-user">
          <p>Peux-tu résumer la capacité d'orchestrateur et de délégation ?</p>
        </div>
        <div class="msg msg-assistant">
          <p>L'orchestrateur coordonne plusieurs agents spécialisés. La délégation consiste à leur confier des sous-tâches ciblées, puis à agréger les résultats.</p>
        </div>
      </div>

      <form class="chat-composer" id="chat-composer" autocomplete="off">
        <textarea class="chat-composer-input" id="chat-input" rows="2" placeholder="Demandez n'importe quoi, / pour les commandes, @ pour le contexte..."></textarea>
        <div class="chat-composer-bar">
          <div class="chat-composer-left">
            <button type="button" class="chat-icon-btn" title="Joindre" aria-label="Joindre">${ICON_PLUS}</button>
            <button type="button" class="chat-icon-btn" title="Mode" aria-label="Mode">${ICON_ZAP}</button>
            <button type="button" class="chat-chip" title="Modèle">
              <span>DeepSeek V4 Flash Free</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button type="button" class="chat-chip" title="Agent">
              <span>Default</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <button type="submit" class="chat-send" title="Envoyer" aria-label="Envoyer">${ICON_SEND}</button>
        </div>
      </form>
    </div>
  `,
    "chat",
    { shellClass: "is-chat" },
  )}
  <script>${CHAT_JS}</script>
</body>
</html>`
}

const CHAT_JS = `
(function () {
  const picker = document.getElementById("session-picker");
  const trigger = document.getElementById("session-trigger");
  const menu = document.getElementById("session-menu");
  const nameEl = document.getElementById("session-name");
  const form = document.getElementById("chat-composer");
  const input = document.getElementById("chat-input");
  if (!picker || !trigger || !menu || !nameEl) return;

  function setOpen(open) {
    picker.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
  }

  const list = document.getElementById("session-list");

  function selectSession(id, name) {
    nameEl.textContent = name || "Session";
    menu.querySelectorAll(".session-row").forEach((el) => {
      const on = el.getAttribute("data-id") === id;
      el.classList.toggle("selected", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function makeRow(id, name) {
    const row = document.createElement("div");
    row.className = "session-row";
    row.setAttribute("role", "option");
    row.setAttribute("data-id", id);
    row.setAttribute("data-name", name);
    row.setAttribute("aria-selected", "false");
    row.innerHTML =
      '<button type="button" class="session-option" data-id="' + id + '" data-name="' + name.replace(/"/g, "&quot;") + '">' + name + "</button>" +
      '<button type="button" class="session-close" data-close="' + id + '" aria-label="Fermer la session" title="Fermer">×</button>';
    return row;
  }

  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setOpen(menu.hidden);
  });

  document.addEventListener("click", (ev) => {
    if (!picker.contains(ev.target)) setOpen(false);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") setOpen(false);
  });

  menu.addEventListener("click", (ev) => {
    const close = ev.target.closest(".session-close");
    if (close) {
      ev.preventDefault();
      ev.stopPropagation();
      const row = close.closest(".session-row");
      if (!row) return;
      const wasSelected = row.classList.contains("selected");
      row.remove();
      if (wasSelected) {
        const next = menu.querySelector(".session-row");
        if (next) {
          selectSession(next.getAttribute("data-id") || "", next.getAttribute("data-name") || "");
        } else {
          nameEl.textContent = "Aucune session";
        }
      }
      return;
    }

    const add = ev.target.closest("#session-add");
    if (add) {
      ev.stopPropagation();
      const id = String(Date.now());
      const name = "Nouvelle session";
      if (list) {
        list.insertBefore(makeRow(id, name), list.firstChild);
      }
      selectSession(id, name);
      setOpen(false);
      return;
    }

    const opt = ev.target.closest(".session-option");
    if (!opt) return;
    const id = opt.getAttribute("data-id") || "";
    const name = opt.getAttribute("data-name") || opt.textContent || "";
    selectSession(id, name);
    setOpen(false);
  });

  if (form && input) {
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      input.blur();
    });
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        form.requestSubmit();
      }
    });
  }
})();
`

const BASE_CSS = `
:root,:root[data-theme="light"]{color-scheme:light;--bg:#fafafa;--bg-elevated:#fff;--bg-muted:#f4f4f5;--bg-hover:#f4f4f5;--border:#e4e4e7;--border-strong:#d4d4d8;--text:#18181b;--text-muted:#71717a;--text-faint:#a1a1aa;--accent:#2563eb;--ok:#16a34a;--ok-bg:#dcfce7;--ok-fg:#166534;--err:#dc2626;--err-bg:#fef2f2;--err-border:#fecaca;--primary:#18181b;--primary-hover:#27272a;--primary-fg:#fff;--toggle-off:rgba(120,120,128,.22);--toggle-on:#34c759;--shadow:0 1px 2px rgba(0,0,0,.04);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;--font-size:14px}
@media (prefers-color-scheme:dark){:root[data-theme="system"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{font-family:var(--font);font-size:var(--font-size);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
`

const CHAT_CSS = `
.chat-root {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-elevated);
}
.chat-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
  min-width: 0;
}
.session-picker {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.session-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  margin: 0;
  padding: 0.15rem 0;
  border: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-align: left;
}
.session-trigger:hover {
  color: var(--text-muted);
}
.session-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-chevron {
  flex-shrink: 0;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--text-faint);
  transition: transform .15s;
}
.session-picker.open .session-chevron {
  transform: rotate(180deg);
}
.session-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  z-index: 50;
  min-width: max(14rem, 100%);
  max-width: min(22rem, 80vw);
  max-height: 18rem;
  overflow: auto;
  padding: 0.3rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  box-shadow: 0 10px 28px rgba(0,0,0,.12);
}
.session-action {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.session-action:hover {
  background: var(--bg-muted);
}
.session-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  flex-shrink: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1;
}
.session-sep {
  height: 1px;
  margin: 0.3rem 0.35rem;
  background: var(--border);
}
.session-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.session-row {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  border-radius: 6px;
  min-width: 0;
}
.session-row:hover,
.session-row.selected {
  background: var(--bg-muted);
}
.session-row.selected .session-option {
  font-weight: 600;
}
.session-option {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 0.45rem 0.45rem 0.45rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-close {
  flex: 0 0 auto;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.2rem 0 0;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-faint);
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.session-close:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--bg-elevated) 55%, var(--bg-muted));
}
.chat-icon-btn {
  width: 1.85rem;
  height: 1.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.chat-icon-btn svg {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
}
.chat-icon-btn:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--bg-elevated) 70%, var(--bg-muted));
}
.chat-messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  -webkit-overflow-scrolling: touch;
}
.msg {
  max-width: 100%;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--text);
}
.msg p + p {
  margin-top: 0.55rem;
}
.msg-assistant {
  padding: 0 0.15rem;
}
.msg-user {
  align-self: stretch;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: var(--bg-muted);
  color: var(--text);
}
.msg-pre {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
}
.chat-composer {
  flex: 0 0 auto;
  position: relative;
  z-index: 2;
  margin: 0 0.75rem 0.75rem;
  padding: 0.65rem 0.7rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
  box-shadow: 0 1px 2px rgba(0,0,0,.03);
}
.chat-composer-input {
  display: block;
  width: 100%;
  min-height: 2.6rem;
  max-height: 8rem;
  margin: 0;
  padding: 0.15rem 0.2rem 0.55rem;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.45;
}
.chat-composer-input::placeholder {
  color: var(--text-faint);
}
.chat-composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.chat-composer-left {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  flex-wrap: wrap;
}
.chat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 12rem;
  margin: 0;
  padding: 0.28rem 0.45rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
}
.chat-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-chip svg {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  opacity: 0.75;
}
.chat-chip:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.chat-send {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: var(--primary);
  color: var(--primary-fg);
  cursor: pointer;
}
.chat-send svg {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
}
.chat-send:hover {
  background: var(--primary-hover);
}
@media (max-width: 560px) {
  .chat-chip span {
    max-width: 5.5rem;
  }
  .chat-messages {
    padding: 0.85rem 0.75rem 1rem;
  }
}
`
