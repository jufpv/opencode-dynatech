import { LITE_MARKDOWN_BROWSER_JS } from "../../lib/lite-markdown.ts"
import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`

const ICON_ZAP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`

const ICON_CHEVRON = `<svg class="session-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`

const ICON_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`

function sessionPickerHtml(): string {
  return `<div class="session-picker" id="session-picker">
  <button type="button" class="session-trigger" id="session-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Session courante">
    <span class="session-name" id="session-name">Chargement…</span>
    ${ICON_CHEVRON}
  </button>
  <div class="session-menu" id="session-menu" role="listbox" hidden>
    <button type="button" class="session-action" id="session-add"><span class="session-action-icon" aria-hidden="true">+</span><span>Nouvelle session</span></button>
    <div class="session-sep" role="separator"></div>
    <div class="session-list" id="session-list"></div>
    <p class="session-empty hidden" id="session-empty">Aucune discussion pour ce projet.</p>
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
        <div class="context-wheel" id="context-wheel" title="Utilisation du contexte" aria-label="Utilisation du contexte" hidden>
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle class="context-wheel-track" cx="18" cy="18" r="14"></circle>
            <circle class="context-wheel-fill" id="context-wheel-fill" cx="18" cy="18" r="14"></circle>
          </svg>
        </div>
      </header>

      <div class="chat-messages" id="chat-messages" aria-live="polite">
        <p class="chat-empty" id="chat-empty">Sélectionnez ou créez une discussion.</p>
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
  const list = document.getElementById("session-list");
  const emptyEl = document.getElementById("session-empty");
  const messagesEl = document.getElementById("chat-messages");
  const contextWheel = document.getElementById("context-wheel");
  const contextWheelFill = document.getElementById("context-wheel-fill");
  const form = document.getElementById("chat-composer");
  const input = document.getElementById("chat-input");
  if (!picker || !trigger || !menu || !nameEl || !list || !messagesEl) return;

  let sessions = [];
  let currentId = "";
  const WHEEL_C = 2 * Math.PI * 14;

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  ${LITE_MARKDOWN_BROWSER_JS}

  function setOpen(open) {
    picker.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
  }

  function querySessionId() {
    try {
      return new URLSearchParams(location.search).get("session") || "";
    } catch {
      return "";
    }
  }

  function setUrlSession(id) {
    const url = new URL(location.href);
    if (id) url.searchParams.set("session", id);
    else url.searchParams.delete("session");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function renderList() {
    list.innerHTML = sessions.map((s) => {
      const selected = s.id === currentId;
      return (
        '<div class="session-row' + (selected ? " selected" : "") + '" role="option" data-id="' + escapeHtml(s.id) + '" data-name="' + escapeHtml(s.title) + '" aria-selected="' + (selected ? "true" : "false") + '">' +
          '<button type="button" class="session-option" data-id="' + escapeHtml(s.id) + '" data-name="' + escapeHtml(s.title) + '">' + escapeHtml(s.title) + "</button>" +
          '<button type="button" class="session-close" data-close="' + escapeHtml(s.id) + '" aria-label="Fermer la session" title="Fermer">×</button>' +
        "</div>"
      );
    }).join("");
    if (emptyEl) emptyEl.classList.toggle("hidden", sessions.length > 0);
  }

  function renderMessages(messages) {
    if (!messages || !messages.length) {
      messagesEl.innerHTML = '<p class="chat-empty" id="chat-empty">' +
        (currentId ? "Aucun message dans cette discussion." : "Sélectionnez ou créez une discussion.") +
        "</p>";
      return;
    }
    messagesEl.innerHTML = messages.map((m) => {
      const role = m.role === "user" ? "user" : "assistant";
      if (role === "user") {
        const text = escapeHtml(m.text).replace(/\\n/g, "<br>");
        return '<div class="msg msg-user"><p>' + text + "</p></div>";
      }
      return '<div class="msg msg-assistant msg-md">' + renderMarkdown(m.text || "") + "</div>";
    }).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatTokens(n) {
    if (!Number.isFinite(n) || n <= 0) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\\.0$/, "") + "k";
    return String(Math.round(n));
  }

  function setContextUsage(usage) {
    if (!contextWheel || !contextWheelFill) return;
    if (!usage || !usage.limit) {
      contextWheel.hidden = true;
      contextWheelFill.style.strokeDashoffset = String(WHEEL_C);
      contextWheel.classList.remove("is-warn", "is-hot");
      return;
    }
    const ratio = Math.max(0, Math.min(1, Number(usage.ratio) || 0));
    contextWheel.hidden = false;
    contextWheelFill.style.strokeDasharray = String(WHEEL_C);
    contextWheelFill.style.strokeDashoffset = String(WHEEL_C * (1 - ratio));
    contextWheel.classList.toggle("is-warn", ratio >= 0.7 && ratio < 0.9);
    contextWheel.classList.toggle("is-hot", ratio >= 0.9);
    const label =
      formatTokens(usage.used) + " / " + formatTokens(usage.limit) +
      " · " + (usage.percent || 0) + "%" +
      (usage.modelName ? " · " + usage.modelName : "");
    contextWheel.title = "Contexte : " + label;
    contextWheel.setAttribute("aria-label", "Utilisation du contexte : " + label);
  }

  async function loadContextUsage(id) {
    if (!id) {
      setContextUsage(null);
      return;
    }
    try {
      const res = await fetch("/api/sessions/" + encodeURIComponent(id) + "/context-usage", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      if (id !== currentId) return;
      setContextUsage(data.usage || null);
    } catch {
      if (id !== currentId) return;
      setContextUsage(null);
    }
  }

  async function loadMessages(id) {
    if (!id) {
      renderMessages([]);
      setContextUsage(null);
      return;
    }
    messagesEl.innerHTML = '<p class="chat-empty">Chargement…</p>';
    try {
      const res = await fetch("/api/sessions/" + encodeURIComponent(id) + "/messages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      if (id !== currentId) return;
      if (data.session && data.session.title) {
        nameEl.textContent = data.session.title;
        const idx = sessions.findIndex((s) => s.id === id);
        if (idx >= 0) sessions[idx].title = data.session.title;
        renderList();
      }
      renderMessages(Array.isArray(data.messages) ? data.messages : []);
      void loadContextUsage(id);
    } catch (err) {
      if (id !== currentId) return;
      messagesEl.innerHTML = '<p class="chat-empty">' + escapeHtml(err instanceof Error ? err.message : "Erreur de chargement") + "</p>";
      setContextUsage(null);
    }
  }

  async function selectSession(id, name, opts) {
    const options = opts || {};
    currentId = id || "";
    nameEl.textContent = name || (id ? "Session" : "Aucune discussion");
    if (!options.skipUrl) setUrlSession(currentId);
    renderList();
    if (!options.skipMessages) await loadMessages(currentId);
  }

  async function loadSessions(preferredId) {
    nameEl.textContent = "Chargement…";
    try {
      const res = await fetch("/api/sessions?limit=40", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      sessions = Array.isArray(data.sessions) ? data.sessions.map((s) => ({
        id: s.id,
        title: s.title || "Session",
      })) : [];
      const want = preferredId || querySessionId();
      const match = sessions.find((s) => s.id === want) || sessions[0] || null;
      if (match) {
        await selectSession(match.id, match.title, { skipUrl: false });
      } else {
        await selectSession("", "Aucune discussion");
      }
    } catch (err) {
      sessions = [];
      renderList();
      await selectSession("", "Erreur");
      messagesEl.innerHTML = '<p class="chat-empty">' + escapeHtml(err instanceof Error ? err.message : "Impossible de charger les discussions") + "</p>";
    }
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

  document.addEventListener("dynatech:project-changed", () => {
    setOpen(false);
    loadSessions("");
  });

  menu.addEventListener("click", async (ev) => {
    const close = ev.target.closest(".session-close");
    if (close) {
      ev.preventDefault();
      ev.stopPropagation();
      const id = close.getAttribute("data-close") || "";
      if (!id) return;
      try {
        const res = await fetch("/api/sessions/" + encodeURIComponent(id), { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        sessions = sessions.filter((s) => s.id !== id);
        if (currentId === id) {
          const next = sessions[0] || null;
          if (next) await selectSession(next.id, next.title);
          else await selectSession("", "Aucune discussion");
        } else {
          renderList();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Impossible de supprimer la discussion");
      }
      return;
    }

    const add = ev.target.closest("#session-add");
    if (add) {
      ev.stopPropagation();
      add.disabled = true;
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        const session = data.session;
        if (!session || !session.id) throw new Error("Session invalide");
        sessions = [{ id: session.id, title: session.title || "Nouvelle session" }].concat(
          sessions.filter((s) => s.id !== session.id),
        );
        await selectSession(session.id, session.title || "Nouvelle session");
        setOpen(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Impossible de créer la discussion");
      } finally {
        add.disabled = false;
      }
      return;
    }

    const opt = ev.target.closest(".session-option");
    if (!opt) return;
    const id = opt.getAttribute("data-id") || "";
    const name = opt.getAttribute("data-name") || opt.textContent || "";
    await selectSession(id, name);
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

  loadSessions(querySessionId());
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
  flex: 1 1 auto;
}
.context-wheel {
  flex: 0 0 auto;
  width: 1.55rem;
  height: 1.55rem;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg-elevated);
  color: var(--accent);
}
.context-wheel[hidden] {
  display: none;
}
.context-wheel svg {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
  transform: rotate(-90deg);
}
.context-wheel-track,
.context-wheel-fill {
  fill: none;
  stroke-width: 3.5;
}
.context-wheel-track {
  stroke: var(--border-strong);
  opacity: 0.55;
}
.context-wheel-fill {
  stroke: currentColor;
  stroke-linecap: round;
  stroke-dasharray: 87.96;
  stroke-dashoffset: 87.96;
  transition: stroke-dashoffset .25s ease, stroke .15s;
}
.context-wheel.is-warn {
  color: #d97706;
}
.context-wheel.is-hot {
  color: var(--err);
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
.session-empty {
  margin: 0;
  padding: 0.55rem 0.6rem;
  font-size: 0.82rem;
  color: var(--text-muted);
}
.session-empty.hidden {
  display: none;
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
.chat-empty {
  margin: auto 0;
  padding: 1rem 0.5rem;
  text-align: center;
  font-size: 0.88rem;
  color: var(--text-muted);
}
.msg {
  max-width: min(38rem, 92%);
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--text);
}
.msg p + p {
  margin-top: 0.55rem;
}
.msg-assistant {
  align-self: flex-start;
  padding: 0 0.15rem;
}
.msg-user {
  align-self: flex-end;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: var(--bg-muted);
  color: var(--text);
}
.msg-md > :first-child {
  margin-top: 0;
}
.msg-md > :last-child {
  margin-bottom: 0;
}
.msg-md p {
  margin: 0.45rem 0;
}
.msg-md strong {
  font-weight: 650;
}
.msg-md a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-word;
}
.msg-md .msg-img {
  display: block;
  max-width: min(100%, 28rem);
  width: auto;
  height: auto;
  margin: 0.55rem 0;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
}
.msg-md ol,
.msg-md ul {
  margin: 0.45rem 0;
  padding-left: 1.35rem;
}
.msg-md li {
  margin: 0.2rem 0;
}
.msg-md li + li {
  margin-top: 0.35rem;
}
.msg-md code {
  font-family: var(--mono);
  font-size: 0.84em;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: var(--bg-muted);
}
.msg-pre {
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
.msg-pre code {
  padding: 0;
  background: transparent;
}
.chat-composer {
  flex: 0 0 auto;
  position: relative;
  z-index: 2;
  margin: 0;
  padding: 0.65rem 0.85rem 0.7rem;
  border: none;
  border-top: 1px solid var(--border);
  border-radius: 0;
  background: var(--bg-elevated);
  box-shadow: none;
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
  /* iOS Safari zooms focused inputs under 16px — keep at least 16px. */
  font-size: max(16px, 0.9rem);
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
