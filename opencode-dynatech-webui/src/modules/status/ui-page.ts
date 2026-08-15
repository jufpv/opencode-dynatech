import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_CRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`

const ICON_AGENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`

const ICON_MODEL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M12 18v4"/></svg>`

export function renderStatusPage(theme: UiTheme): string {
  const colorScheme = themeColorScheme(theme.mode)
  const fontOverrides = `:root{--font:${theme.sans};--mono:${theme.mono};--font-size:${theme.fontSize}px}`
  return `<!DOCTYPE html>
<html lang="fr" data-theme="${theme.mode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="${colorScheme}">
  <title>Statut · OpenCode</title>
  <style>${BASE_CSS}${NAV_CSS}${STATUS_CSS}${fontOverrides}</style>
</head>
<body>
  ${renderShell(
    "status",
    `
    <section class="panel" aria-labelledby="status-title">
      <header class="page-chrome">
        <div class="entity-list-header">
          <div>
            <h2 id="status-title">Statut</h2>
          </div>
        </div>
        <div class="page-sep" role="separator" aria-hidden="true"></div>
      </header>
      <p class="status-blurb">Chaîne de fonctionnement : Cron, OpenCode et le modèle actif.</p>
      <div class="status-section">
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
    </section>
  `,
  )}
  <script>${STATUS_JS}</script>
</body>
</html>`
}

const STATUS_JS = `
(function () {
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
`

const STATUS_CSS = `
.status-blurb {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.status-section {
  width: min(22rem, 100%);
  min-width: 0;
  margin: 1.5rem auto 0.5rem;
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
