import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`

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
  <style>${BASE_CSS}${NAV_CSS}${HOME_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(
    null,
    `
    <section class="panel home-panel" aria-label="Accueil">
      <div class="home-section home-recent" aria-label="Dernières discussions">
        <div class="recent-list" id="recent-list" aria-live="polite"></div>
        <p class="recent-empty hidden" id="recent-empty">Aucune discussion récente.</p>
      </div>
      <div class="home-sep" role="separator" aria-hidden="true"></div>
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
      <div class="home-sep" role="separator" aria-hidden="true"></div>
      <a class="home-link" href="/skills">
        <span class="home-link-icon" aria-hidden="true">${ICON_SETTINGS}</span>
        <span class="home-link-title">Réglages</span>
        <span class="home-link-chevron" aria-hidden="true">${ICON_CHEVRON}</span>
      </a>
    </section>
  `,
    null,
  )}
  <script>${HOME_JS}</script>
</body>
</html>`
}

const HOME_JS = `
(function () {
  const ICON_CHAT = ${JSON.stringify(ICON_CHAT)};
  const cronIcon = document.getElementById("cron-icon");
  const opencodeIcon = document.getElementById("opencode-icon");
  const modelIcon = document.getElementById("model-icon");
  const modelNameEl = document.getElementById("model-name");
  const recentList = document.getElementById("recent-list");
  const recentEmpty = document.getElementById("recent-empty");

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setIcon(el, ok) {
    if (!el) return;
    el.classList.toggle("ok", ok);
    el.classList.toggle("err", !ok);
  }

  function shortModelName(name) {
    if (!name) return "—";
    return name.length > 28 ? name.slice(0, 27) + "…" : name;
  }

  async function loadRecent() {
    if (!recentList || !recentEmpty) return;
    try {
      const res = await fetch("/api/sessions/recent?limit=8", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      recentList.innerHTML = sessions.map((s) => {
        const href = s.href || ("/chat?session=" + encodeURIComponent(s.id || ""));
        return (
          '<a class="recent-item" href="' + escapeHtml(href) + '">' +
            '<span class="recent-session-row">' +
              '<span class="recent-icon" aria-hidden="true">' + ICON_CHAT + "</span>" +
              '<span class="recent-session">' + escapeHtml(s.title || "Session") + "</span>" +
              '<span class="recent-chevron" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
              "</span>" +
            "</span>" +
          "</a>"
        );
      }).join("");
      recentEmpty.classList.toggle("hidden", sessions.length > 0);
    } catch {
      recentList.innerHTML = "";
      recentEmpty.classList.remove("hidden");
    }
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

  loadRecent();
  document.addEventListener("dynatech:project-changed", () => {
    loadRecent();
  });
  pollStatus();
  setInterval(pollStatus, 2000);
})();
`

const BASE_CSS = `
:root,:root[data-theme="light"]{color-scheme:light;--bg:#fafafa;--bg-elevated:#fff;--bg-muted:#f4f4f5;--bg-hover:#f4f4f5;--border:#e4e4e7;--border-strong:#d4d4d8;--text:#18181b;--text-muted:#71717a;--text-faint:#a1a1aa;--accent:#2563eb;--ok:#16a34a;--ok-bg:#dcfce7;--ok-fg:#166534;--err:#dc2626;--err-bright:#ef4444;--err-bg:#fef2f2;--err-border:#fecaca;--primary:#18181b;--primary-hover:#27272a;--primary-fg:#fff;--toggle-off:rgba(120,120,128,.22);--toggle-on:#34c759;--shadow:0 1px 2px rgba(0,0,0,.04);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;--font-size:14px}
@media (prefers-color-scheme:dark){:root[data-theme="system"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bright:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bright:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);font-size:var(--font-size);background:var(--bg);color:var(--text);min-height:100dvh;-webkit-font-smoothing:antialiased}
`

const HOME_CSS = `
.home-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.9rem;
  padding: 0.85rem 1rem 0.9rem;
}
.home-recent {
  width: 100%;
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.recent-item {
  display: block;
  max-width: 100%;
  min-width: 0;
  padding: 0.4rem 0.45rem;
  margin: 0 -0.3rem;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-decoration: none;
  transition: background .15s;
}
.recent-item:hover {
  background: var(--bg-muted);
}
.recent-session-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 100%;
  min-width: 0;
}
.recent-icon {
  flex: 0 0 auto;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--text-muted);
  display: inline-flex;
  opacity: 0.9;
}
.recent-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.recent-session {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-chevron {
  flex: 0 0 auto;
  width: 0.85rem;
  height: 0.85rem;
  color: var(--text-faint);
  display: inline-flex;
}
.recent-chevron svg {
  width: 100%;
  height: 100%;
  display: block;
}
.recent-empty {
  margin: 0;
  padding: 0.55rem 0.15rem;
  font-size: 0.84rem;
  color: var(--text-muted);
}
.recent-empty.hidden {
  display: none;
}
.home-sep {
  width: 100%;
  height: 1px;
  margin: 0.15rem 0;
  background: var(--border);
}
.home-status {
  width: min(22rem, 100%);
  min-width: 0;
  align-self: center;
}
.home-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  align-self: center;
  margin: 0;
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
  font-size: 0.8rem;
  font-weight: 500;
}
.home-link-chevron {
  flex: 0 0 auto;
  width: 0.8rem;
  height: 0.8rem;
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
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: 0.15rem;
}
.status-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex: 1;
}
.status-node-model {
  flex: 1.35;
}
.status-node-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-muted);
  line-height: 1.2;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-chain-dots {
  display: flex;
  align-items: center;
  gap: 0.22rem;
  height: 18px;
  flex-shrink: 0;
  padding-top: 0;
}
.status-chain-dots span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-faint);
  opacity: 0.45;
}
.status-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--err-bright, var(--err));
  transition: color 0.2s ease;
  cursor: default;
}
.status-icon svg {
  width: 100%;
  height: 100%;
}
.status-icon.ok {
  color: var(--ok);
}
.status-icon.err {
  color: var(--err-bright, var(--err));
}
.status-icon.err::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 145%;
  height: 2.5px;
  background: currentColor;
  transform: translate(-50%, -50%) rotate(-45deg);
  border-radius: 2px;
  pointer-events: none;
}
`
