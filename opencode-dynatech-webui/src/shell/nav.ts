import { getProjectsPayload } from "../services/projects.ts"

export type NavId = "skills" | "tools" | "mcps"
export type RailId = "chat" | "documents" | "cron" | "settings"

const ITEMS: Array<{ id: NavId; href: string; label: string }> = [
  { id: "skills", href: "/skills", label: "Skills" },
  { id: "tools", href: "/tools", label: "Tools" },
  { id: "mcps", href: "/mcps", label: "MCP" },
]

const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`

const ICON_DOCUMENTS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`

/** Alfred sidebar icon for « Tâches planifiées ». */
const ICON_CRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`

const ICON_SETTINGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderNav(active: NavId | null): string {
  if (!active) return ""
  return `<nav class="app-nav" aria-label="Sections">
  ${ITEMS.map(
    (item) =>
      `<a class="app-nav-link${item.id === active ? " active" : ""}" href="${item.href}">${item.label}</a>`,
  ).join("")}
</nav>`
}

function renderLogo(): string {
  return `<a class="app-logo" href="/chat" title="DynaTech" aria-label="DynaTech">
  <img src="/logo.png" alt="DynaTech" width="40" height="40" decoding="async">
</a>`
}

export function renderRail(active: RailId | null): string {
  return `<aside class="app-rail" aria-label="Navigation principale">
  <nav class="app-rail-nav">
    <a class="app-rail-btn${active === "chat" ? " active" : ""}" href="/chat" title="Chat" aria-label="Chat" data-rail="chat">
      ${ICON_CHAT}
    </a>
    <a class="app-rail-btn${active === "documents" ? " active" : ""}" href="/documents" title="Documents" aria-label="Documents" data-rail="documents">
      ${ICON_DOCUMENTS}
    </a>
    <a class="app-rail-btn${active === "cron" ? " active" : ""}" href="/cron" title="Tâches planifiées" aria-label="Tâches planifiées" data-rail="cron">
      ${ICON_CRON}
    </a>
    <span class="app-rail-sep" role="separator" aria-hidden="true"></span>
    <a class="app-rail-btn${active === "settings" ? " active" : ""}" href="/skills" title="Réglages" aria-label="Réglages" data-rail="settings">
      ${ICON_SETTINGS}
    </a>
  </nav>
</aside>`
}

const CHEVRON_SVG = `<svg class="project-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`

function renderProjectOption(
  project: { id: string; name: string },
  currentId: string,
): string {
  const selected = project.id === currentId
  return `<button type="button" class="project-option${selected ? " selected" : ""}" role="option" data-id="${escapeHtml(project.id)}" data-name="${escapeHtml(project.name)}" aria-selected="${selected ? "true" : "false"}">${escapeHtml(project.name)}</button>`
}

function renderProjectBar(): string {
  const { projects, defaultProject, others, current } = getProjectsPayload()
  const currentName = current?.name || "Projet"
  const currentId = current?.id || ""

  const parts: string[] = []
  if (defaultProject) {
    parts.push(renderProjectOption(defaultProject, currentId))
  } else if (!projects.length) {
    parts.push(`<div class="project-empty">Aucun projet</div>`)
  }

  parts.push(`<div class="project-sep" role="separator"></div>`)
  parts.push(
    `<button type="button" class="project-action" id="project-add" role="option"><span class="project-action-icon" aria-hidden="true">+</span><span>Ajouter un projet</span></button>`,
  )
  parts.push(`<div class="project-sep" role="separator"></div>`)

  if (others.length) {
    for (const project of others) {
      parts.push(renderProjectOption(project, currentId))
    }
  }

  return `<div class="shell-topbar">
  <div class="project-picker" id="project-picker">
    <button type="button" class="project-trigger" id="project-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Projet courant">
      <span class="project-name" id="project-name">${escapeHtml(currentName)}</span>
      ${CHEVRON_SVG}
    </button>
    <div class="project-menu" id="project-menu" role="listbox" hidden>
      ${parts.join("")}
    </div>
  </div>
</div>`
}

const PROJECT_BAR_JS = `
(function () {
  const picker = document.getElementById("project-picker");
  const trigger = document.getElementById("project-trigger");
  const menu = document.getElementById("project-menu");
  const nameEl = document.getElementById("project-name");
  if (!picker || !trigger || !menu || !nameEl) return;

  function setOpen(open) {
    picker.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
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

  const addBtn = document.getElementById("project-add");
  if (addBtn) {
    addBtn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const name = window.prompt("Nom du projet");
      if (!name || !name.trim()) return;
      setOpen(false);
      trigger.disabled = true;
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Impossible d'ajouter le projet");
        trigger.disabled = false;
      }
    });
  }

  menu.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".project-option");
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute("data-id");
    const name = btn.getAttribute("data-name") || "";
    if (!id) return;
    setOpen(false);
    trigger.disabled = true;
    try {
      const res = await fetch("/api/projects/current", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      nameEl.textContent = (data.current && data.current.name) || name;
      menu.querySelectorAll(".project-option").forEach((el) => {
        const on = el.getAttribute("data-id") === id;
        el.classList.toggle("selected", on);
        el.setAttribute("aria-selected", on ? "true" : "false");
      });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Impossible de changer de projet");
    } finally {
      trigger.disabled = false;
    }
  });
})();
`

export interface ShellOptions {
  /** Replace the default settings tabs (Skills/Tools/MCP). */
  tabsHtml?: string
  /** Extra classes on `.shell-stack` (e.g. `is-chat tab-session`). */
  stackClass?: string
  /** Extra classes on `.shell` (e.g. `is-chat`). */
  shellClass?: string
}

/** Wrap page content; top bar (logo + project + horizontal rail) + centered box. */
export function renderShell(
  active: NavId | null,
  innerHtml: string,
  rail: RailId | null = null,
  options: ShellOptions = {},
): string {
  const tabClass = active ? ` tab-${active}` : ""
  const stackExtra = options.stackClass ? ` ${options.stackClass}` : ""
  const shellExtra = options.shellClass ? ` ${options.shellClass}` : ""
  // Skills / Tools / MCP live under Réglages.
  const railActive: RailId | null = rail ?? (active ? "settings" : null)
  const tabs = options.tabsHtml ?? renderNav(active)
  return `<div class="shell${shellExtra}">
  <div class="shell-cluster">
    <div class="shell-top-row">
      ${renderLogo()}
      ${renderProjectBar()}
      ${renderRail(railActive)}
    </div>
    <div class="shell-body">
      <div class="shell-stack${tabClass}${stackExtra}">
        ${tabs}
        <div class="shell-box">
          <main class="app">${innerHtml}</main>
        </div>
      </div>
    </div>
  </div>
</div>
<script>${PROJECT_BAR_JS}</script>`
}

export const NAV_CSS = `
.shell {
  --content-max: 720px;
  --rail-size: 2.5rem;
  --rail-gap: 0.55rem;
  --shell-pad: 0.5rem;
  --cluster-gap: 0.55rem;
  --topbar-height: var(--rail-size);
  width: 100%;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--shell-pad) var(--shell-pad) 1.5rem;
  box-sizing: border-box;
  background: var(--bg);
}
.shell-cluster {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 0 1 auto;
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  margin-inline: auto;
  box-sizing: border-box;
}
.shell-top-row {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--rail-gap);
  width: 100%;
  min-width: 0;
  padding: var(--shell-pad) 0 1.15rem;
  margin: calc(-1 * var(--shell-pad)) 0 calc(-0.6rem);
  background: linear-gradient(
    to bottom,
    var(--bg) 0%,
    var(--bg) 58%,
    color-mix(in srgb, var(--bg) 72%, transparent) 78%,
    transparent 100%
  );
  box-sizing: border-box;
  pointer-events: none;
}
.shell-top-row > * {
  pointer-events: auto;
}
.shell-body {
  display: flex;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
}
.app-logo {
  flex: 0 0 var(--rail-size);
  width: var(--rail-size);
  height: var(--rail-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.app-logo img {
  display: block;
  width: var(--rail-size);
  height: var(--rail-size);
  object-fit: contain;
}
.shell-topbar {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--content-max);
  width: 100%;
  min-height: var(--rail-size);
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-sizing: border-box;
}
.project-picker {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.project-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  margin: 0;
  padding: 0.2rem 0;
  border: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-align: left;
}
.project-trigger:hover:not(:disabled) {
  color: var(--text-muted);
}
.project-trigger:disabled {
  opacity: 0.55;
  cursor: default;
}
.project-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-chevron {
  flex-shrink: 0;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--text-faint);
  transition: transform .15s;
}
.project-picker.open .project-chevron {
  transform: rotate(180deg);
}
.project-menu {
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
.project-option,
.project-action {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
}
.project-option:hover,
.project-action:hover {
  background: var(--bg-muted);
}
.project-option.selected {
  font-weight: 600;
  color: var(--text);
  background: var(--bg-muted);
}
.project-action {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text);
  font-weight: 500;
}
.project-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  flex-shrink: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1;
  color: var(--text);
}
.project-sep {
  height: 1px;
  margin: 0.3rem 0.35rem;
  background: var(--border);
}
.project-empty {
  padding: 0.55rem 0.65rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
/* Menu principal : horizontal, à droite de la barre projet */
.app-rail {
  flex: 0 0 auto;
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
}
.app-rail-nav {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}
.app-rail-sep {
  width: 1px;
  height: 1.15rem;
  margin: 0 0.15rem;
  background: var(--border);
  flex-shrink: 0;
}
.app-rail-btn {
  box-sizing: border-box;
  width: var(--rail-size);
  height: var(--rail-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
  box-shadow: var(--shadow, 0 1px 2px rgba(0,0,0,.04));
  transition: background .15s, color .15s, border-color .15s;
}
.app-rail-btn svg {
  width: 1.15rem;
  height: 1.15rem;
  display: block;
}
.app-rail-btn:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.app-rail-btn.active {
  color: var(--text);
  background: var(--bg-muted);
  border-color: var(--border-strong, var(--border));
}
.shell-stack {
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--content-max);
  width: 100%;
}
.app-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0;
  background: transparent;
  border: none;
  position: relative;
  z-index: 2;
}
.app-nav-link {
  text-decoration: none;
  color: var(--text-muted);
  font-size: 0.84rem;
  font-weight: 500;
  padding: 0.4rem 0.75rem;
  border-radius: 6px 6px 0 0;
  border: 1px solid transparent;
  background: transparent;
  position: relative;
  z-index: 1;
  font: inherit;
  cursor: pointer;
}
.app-nav-link:hover {
  color: var(--text);
}
.app-nav-link.active {
  color: var(--text);
  background: var(--bg-elevated);
  border-color: var(--border);
  border-bottom-color: var(--bg-elevated);
  margin-bottom: -1px;
  z-index: 3;
}
.shell-box {
  position: relative;
  z-index: 1;
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: none;
  overflow: clip;
}
/* Premier onglet actif : le coin haut-gauche de la box se fond dans l'onglet */
.shell-stack.tab-skills .shell-box {
  border-top-left-radius: 0;
}
.app {
  width: 100%;
  min-height: 0;
}
/* Même marge latérale pour Cron / Skills / Tools / MCP */
.shell-box .panel,
.shell-box .tasks-panel {
  padding: 0.85rem 0.75rem 1rem;
}
/* Chat : colonne centrée, viewport figé — seuls les messages scrollent */
.shell.is-chat {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  justify-content: center;
  align-items: stretch;
  padding: var(--shell-pad);
  box-sizing: border-box;
}
.shell.is-chat .shell-cluster {
  /* Ne pas s'étirer en largeur (sinon le menu part à droite de l'écran). */
  flex: 0 1 auto;
  align-self: stretch;
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  min-height: 0;
  overflow: hidden;
}
.shell.is-chat .shell-top-row {
  position: relative;
  top: auto;
  flex: 0 0 auto;
  margin: 0;
  padding: 0 0 0.55rem;
  background: var(--bg);
}
.shell.is-chat .shell-body,
.shell.is-chat .shell-stack {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.shell.is-chat .shell-box,
.shell.is-chat .app {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
`
