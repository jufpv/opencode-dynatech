import { getProjectsPayload } from "../services/projects.ts"

export type NavId = "status" | "skills" | "tools" | "mcps"
export type RailId = "home" | "chat" | "documents" | "cron" | "settings"

const ITEMS: Array<{ id: NavId; href: string; label: string }> = [
  { id: "status", href: "/status", label: "Statut" },
  { id: "skills", href: "/skills", label: "Skills" },
  { id: "tools", href: "/tools", label: "Tools" },
  { id: "mcps", href: "/mcps", label: "MCP" },
]

const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`

const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`

const ICON_DOCUMENTS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`

/** Alfred sidebar icon for « Automatisations ». */
const ICON_CRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`

const ICON_MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`

const ICON_SETTINGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`

/** Shared plus icon for circular add buttons (same stroke as rail icons). */
export const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`

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

export function renderRail(active: RailId | null): string {
  return `<aside class="app-rail" aria-label="Navigation principale">
  <nav class="app-rail-bubble" aria-label="Espace de travail">
    <a class="app-rail-btn${active === "home" ? " active" : ""}" href="/" title="Informations" aria-label="Informations" data-rail="home">
      ${ICON_INFO}
    </a>
    <a class="app-rail-btn${active === "chat" ? " active" : ""}" href="/chat" title="Chat" aria-label="Chat" data-rail="chat">
      ${ICON_CHAT}
    </a>
    <a class="app-rail-btn${active === "documents" ? " active" : ""}" href="/documents" title="Documents" aria-label="Documents" data-rail="documents">
      ${ICON_DOCUMENTS}
    </a>
    <a class="app-rail-btn${active === "cron" ? " active" : ""}" href="/cron" title="Automatisations" aria-label="Automatisations" data-rail="cron">
      ${ICON_CRON}
    </a>
  </nav>
</aside>`
}

function renderProjectOption(
  project: { id: string; name: string },
  currentId: string,
): string {
  const selected = project.id === currentId
  return `<button type="button" class="project-option${selected ? " selected" : ""}" role="option" data-id="${escapeHtml(project.id)}" data-name="${escapeHtml(project.name)}" aria-selected="${selected ? "true" : "false"}">${escapeHtml(project.name)}</button>`
}

function renderDrawerProjects(): string {
  const { projects, defaultProject, others, current } = getProjectsPayload()
  const currentId = current?.id || ""
  const parts: string[] = []

  if (defaultProject) {
    parts.push(renderProjectOption(defaultProject, currentId))
  } else if (!projects.length) {
    parts.push(`<div class="project-empty">Aucun projet</div>`)
  }

  if (others.length) {
    for (const project of others) {
      parts.push(renderProjectOption(project, currentId))
    }
  }

  return parts.join("")
}

function renderDrawer(settingsActive = false): string {
  return `<aside class="shell-drawer" id="shell-drawer" aria-label="Menu">
  <div class="shell-drawer-body">
    <div class="shell-drawer-section">
      <div class="shell-drawer-heading">
        <div class="shell-drawer-title">Projets</div>
        <button type="button" class="project-add-btn" id="project-add" title="Ajouter un projet" aria-label="Ajouter un projet">
          <span class="project-add-btn-icon" aria-hidden="true">${ICON_PLUS}</span>
        </button>
      </div>
      <div class="shell-drawer-projects" id="shell-drawer-projects" role="listbox">
        ${renderDrawerProjects()}
      </div>
    </div>
    <div class="shell-drawer-footer">
      <a class="shell-drawer-settings${settingsActive ? " is-active" : ""}" href="/status" data-rail="settings">
        <span class="shell-drawer-settings-icon" aria-hidden="true">${ICON_SETTINGS}</span>
        <span>Réglages</span>
      </a>
    </div>
  </div>
</aside>`
}

function renderProjectBar(): string {
  const { current } = getProjectsPayload()
  const currentName = current?.name || "Projet"

  return `<div class="shell-topbar">
  <button type="button" class="shell-menu-trigger" id="shell-menu-btn" aria-controls="shell-drawer" aria-expanded="false" title="Menu" aria-label="Ouvrir le menu">
    <span class="shell-menu-icon" aria-hidden="true">${ICON_MENU}</span>
    <span class="project-name" id="project-name">${escapeHtml(currentName)}</span>
  </button>
</div>`
}

/** Parks the horizontal scroller on main before paint — must stay sync & behavior:auto. */
const SHELL_SCROLL_BOOT = `(function(){var s=document.getElementById("shell-scroller");var d=document.getElementById("shell-drawer");if(!s||!d)return;s.style.scrollBehavior="auto";s.style.scrollSnapType="none";function park(){var w=d.offsetWidth||0;if(!w){requestAnimationFrame(park);return;}s.scrollLeft=w;s.classList.add("is-ready");s.style.opacity="";}park();requestAnimationFrame(park);})();`

const PROJECT_BAR_JS = `
(function () {
  const scroller = document.getElementById("shell-scroller");
  const drawer = document.getElementById("shell-drawer");
  const main = document.getElementById("shell-main");
  const menuBtn = document.getElementById("shell-menu-btn");
  const projectList = document.getElementById("shell-drawer-projects");
  const nameEl = document.getElementById("project-name");
  if (!scroller || !drawer || !main || !menuBtn || !projectList || !nameEl) return;

  let drawerOpen = false;
  let scrolling = false;
  let snapRestoreTimer = 0;

  function drawerWidth() {
    return drawer.getBoundingClientRect().width || Math.round(scroller.scrollWidth - scroller.clientWidth) || 0;
  }

  function setExpanded(open) {
    drawerOpen = !!open;
    menuBtn.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
    menuBtn.setAttribute("aria-label", drawerOpen ? "Fermer le menu" : "Ouvrir le menu");
    menuBtn.title = drawerOpen ? "Fermer le menu" : "Menu";
    document.documentElement.classList.toggle("shell-drawer-open", drawerOpen);
  }

  function withInstantScroll(run) {
    scroller.style.scrollSnapType = "none";
    scroller.style.scrollBehavior = "auto";
    run();
    window.clearTimeout(snapRestoreTimer);
    snapRestoreTimer = window.setTimeout(function () {
      scroller.style.scrollSnapType = "";
      scroller.style.scrollBehavior = "";
    }, 480);
  }

  function scrollToPanel(open, behavior) {
    const left = open ? 0 : drawerWidth();
    const mode = behavior || "smooth";
    scrolling = true;
    if (mode === "auto") {
      withInstantScroll(function () { scroller.scrollLeft = left; });
    } else {
      scroller.style.scrollSnapType = "none";
      scroller.scrollTo({ left: left, behavior: "smooth" });
      window.clearTimeout(snapRestoreTimer);
      snapRestoreTimer = window.setTimeout(function () {
        scroller.style.scrollSnapType = "";
      }, 480);
    }
    setExpanded(open);
    window.setTimeout(function () {
      scrolling = false;
      syncFromScroll();
    }, mode === "auto" ? 0 : 450);
  }

  function syncFromScroll() {
    if (scrolling) return;
    const mid = drawerWidth() / 2;
    setExpanded(scroller.scrollLeft < mid);
  }

  function openDrawer() { scrollToPanel(true, "smooth"); }
  function closeDrawer() { scrollToPanel(false, "smooth"); }
  function toggleDrawer() { scrollToPanel(!drawerOpen, "smooth"); }

  // Re-assert closed position without animation (layout may have settled).
  withInstantScroll(function () {
    scroller.scrollLeft = drawerWidth();
    setExpanded(false);
    scroller.classList.add("is-ready");
    scroller.style.opacity = "";
  });

  menuBtn.addEventListener("click", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    toggleDrawer();
  });

  main.addEventListener("click", function () {
    if (!drawerOpen) return;
    closeDrawer();
  });

  function lockMainScroll(ev) {
    if (!drawerOpen) return;
    ev.preventDefault();
  }
  main.addEventListener("wheel", lockMainScroll, { passive: false });
  main.addEventListener("touchmove", lockMainScroll, { passive: false });

  scroller.addEventListener("scroll", syncFromScroll, { passive: true });
  window.addEventListener("resize", function () {
    scrollToPanel(drawerOpen, "auto");
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && drawerOpen) closeDrawer();
  });

  const addBtn = document.getElementById("project-add");
  if (addBtn) {
    addBtn.addEventListener("click", async function (ev) {
      ev.stopPropagation();
      const name = window.prompt("Nom du projet");
      if (!name || !name.trim()) return;
      addBtn.disabled = true;
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
        addBtn.disabled = false;
      }
    });
  }

  projectList.addEventListener("click", async function (ev) {
    const btn = ev.target.closest(".project-option");
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute("data-id");
    const name = btn.getAttribute("data-name") || "";
    if (!id) return;
    btn.disabled = true;
    try {
      const res = await fetch("/api/projects/current", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      nameEl.textContent = (data.current && data.current.name) || name;
      projectList.querySelectorAll(".project-option").forEach(function (el) {
        const on = el.getAttribute("data-id") === id;
        el.classList.toggle("selected", on);
        el.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.dispatchEvent(
        new CustomEvent("dynatech:project-changed", {
          detail: data.current || { id: id, name: name },
        }),
      );
      closeDrawer();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Impossible de changer de projet");
    } finally {
      btn.disabled = false;
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
  /** When set, fill every tools panel (fluid swipe, no empty neighbors). */
  toolBodies?: Partial<Record<Exclude<RailId, "settings">, string>>
}

export type ToolRailId = Exclude<RailId, "settings">

const TOOL_RAILS: Array<{ id: ToolRailId; href: string; title: string }> = [
  { id: "home", href: "/", title: "Accueil · OpenCode" },
  { id: "chat", href: "/chat", title: "Chat · OpenCode" },
  { id: "documents", href: "/documents", title: "Documents · OpenCode" },
  { id: "cron", href: "/cron", title: "Automatisations · OpenCode" },
]

export function toolRailFromPath(pathname: string): ToolRailId | null {
  const normalized = pathname.replace(/\/$/, "") || "/"
  for (const tool of TOOL_RAILS) {
    const href = tool.href.replace(/\/$/, "") || "/"
    if (normalized === href) return tool.id
  }
  return null
}

export function toolHref(rail: ToolRailId): string {
  return TOOL_RAILS.find((t) => t.id === rail)?.href || "/"
}

export function toolTitle(rail: ToolRailId): string {
  return TOOL_RAILS.find((t) => t.id === rail)?.title || "OpenCode"
}

function isToolRail(rail: RailId | null): rail is ToolRailId {
  return rail === "home" || rail === "chat" || rail === "documents" || rail === "cron"
}

function renderShellBody(tabs: string, tabClass: string, stackExtra: string, innerHtml: string): string {
  return `<div class="shell-body">
  <div class="shell-stack${tabClass}${stackExtra}">
    ${tabs}
    <div class="shell-box">
      <main class="app">${innerHtml}</main>
    </div>
  </div>
</div>`
}

function renderToolsCarousel(
  activeRail: ToolRailId,
  activeBodyHtml: string,
  toolBodies?: Partial<Record<ToolRailId, string>>,
): string {
  const panels = TOOL_RAILS.map((tool) => {
    const active = tool.id === activeRail
    const inner = toolBodies?.[tool.id] ?? (active ? activeBodyHtml : "")
    const body = inner ? renderShellBody("", "", "", inner) : ""
    return `<section class="tool-panel${active ? " is-active" : ""}" data-rail="${tool.id}" data-href="${tool.href}" data-title="${escapeHtml(tool.title)}"${active ? "" : ' aria-hidden="true"'}>
      ${body}
    </section>`
  }).join("")
  return `<div class="tools-scroller" id="tools-scroller" data-active-rail="${activeRail}" style="opacity:0">
  ${panels}
</div>`
}

/** Parks tools carousel on the active panel before paint. */
const TOOLS_SCROLL_BOOT = `(function(){var t=document.getElementById("tools-scroller");if(!t)return;var rail=t.getAttribute("data-active-rail");var panels=t.querySelectorAll(".tool-panel");var idx=0;for(var i=0;i<panels.length;i++){if(panels[i].getAttribute("data-rail")===rail){idx=i;break;}}t.style.scrollBehavior="auto";t.style.scrollSnapType="none";function park(){var w=t.clientWidth||0;if(!w){requestAnimationFrame(park);return;}t.scrollLeft=idx*w;t.classList.add("is-ready");t.style.opacity="";}park();requestAnimationFrame(park);})();`

const TOOLS_SCROLL_JS = `
(function () {
  const tools = document.getElementById("tools-scroller");
  if (!tools) return;
  let activeRail = tools.getAttribute("data-active-rail") || "";
  const panels = Array.prototype.slice.call(tools.querySelectorAll(".tool-panel"));
  let programmatic = false;
  let settleTimer = 0;

  function panelFor(rail) {
    return tools.querySelector('.tool-panel[data-rail="' + rail + '"]');
  }

  function panelWidth() {
    return tools.clientWidth || 1;
  }

  function scrollLeftFor(railOrPanel) {
    const panel = typeof railOrPanel === "string" ? panelFor(railOrPanel) : railOrPanel;
    if (!panel) return 0;
    return panels.indexOf(panel) * panelWidth();
  }

  function nearestPanel() {
    const w = panelWidth();
    const idx = Math.round(tools.scrollLeft / w);
    return panels[Math.max(0, Math.min(panels.length - 1, idx))] || panels[0];
  }

  function setRailActive(rail) {
    document.querySelectorAll(".app-rail-btn[data-rail]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-rail") === rail);
    });
  }

  function setPanelActive(rail) {
    panels.forEach(function (p) {
      const on = p.getAttribute("data-rail") === rail;
      p.classList.toggle("is-active", on);
      if (on) p.removeAttribute("aria-hidden");
      else p.setAttribute("aria-hidden", "true");
    });
  }

  function syncShellMode(rail) {
    const shell = document.querySelector(".shell");
    if (!shell) return;
    const inChatRoom = document.documentElement.classList.contains("is-chat-room");
    shell.classList.toggle("is-chat", rail === "chat" && inChatRoom);
    const editor = document.getElementById("view-editor");
    const editorOpen = !!(editor && !editor.classList.contains("hidden"));
    shell.classList.toggle("is-editor", rail === "home" && editorOpen);
  }

  function activateRail(rail, href, title, push) {
    if (!rail) return;
    activeRail = rail;
    tools.setAttribute("data-active-rail", rail);
    setRailActive(rail);
    setPanelActive(rail);
    syncShellMode(rail);
    if (title) document.title = title;
    if (push && href) {
      if (location.pathname !== href) {
        history.pushState({ toolRail: rail }, title || "", href);
      }
    }
  }

  function parkInstant(rail) {
    programmatic = true;
    tools.style.scrollSnapType = "none";
    tools.style.scrollBehavior = "auto";
    tools.scrollLeft = scrollLeftFor(rail || activeRail);
    tools.classList.add("is-ready");
    tools.style.opacity = "";
    requestAnimationFrame(function () {
      tools.style.scrollSnapType = "";
      programmatic = false;
    });
  }

  function onSettled() {
    if (programmatic) return;
    if (document.documentElement.classList.contains("shell-drawer-open")) {
      parkInstant(activeRail);
      setRailActive(activeRail);
      return;
    }
    const panel = nearestPanel();
    if (!panel) return;
    const rail = panel.getAttribute("data-rail") || "";
    const href = panel.getAttribute("data-href") || "";
    const title = panel.getAttribute("data-title") || "";
    if (rail && rail !== activeRail) {
      activateRail(rail, href, title, true);
    } else {
      setRailActive(rail || activeRail);
    }
  }

  function scheduleSettle() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(onSettled, 90);
  }

  parkInstant(activeRail);
  syncShellMode(activeRail);

  tools.addEventListener("scroll", function () {
    if (programmatic) return;
    const panel = nearestPanel();
    if (panel) setRailActive(panel.getAttribute("data-rail"));
    scheduleSettle();
  }, { passive: true });

  tools.addEventListener("scrollend", onSettled);

  document.querySelectorAll(".app-rail-btn[data-rail]").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      const rail = btn.getAttribute("data-rail");
      const panel = rail ? panelFor(rail) : null;
      if (!panel) return;
      ev.preventDefault();
      if (document.documentElement.classList.contains("shell-drawer-open")) return;
      const href = panel.getAttribute("data-href") || "";
      const title = panel.getAttribute("data-title") || "";
      if (rail === activeRail) {
        parkInstant(activeRail);
        return;
      }
      programmatic = true;
      setRailActive(rail);
      tools.style.scrollSnapType = "none";
      tools.scrollTo({ left: scrollLeftFor(panel), behavior: "smooth" });
      window.setTimeout(function () {
        programmatic = false;
        tools.style.scrollSnapType = "";
        activateRail(rail, href, title, true);
        parkInstant(rail);
      }, 400);
    });
  });

  window.addEventListener("popstate", function () {
    const path = location.pathname.replace(/\\/$/, "") || "/";
    let rail = activeRail;
    panels.forEach(function (p) {
      const href = (p.getAttribute("data-href") || "").replace(/\\/$/, "") || "/";
      if (href === path) rail = p.getAttribute("data-rail") || rail;
    });
    const panel = panelFor(rail);
    activateRail(rail, panel && panel.getAttribute("data-href"), panel && panel.getAttribute("data-title"), false);
    parkInstant(rail);
  });

  window.addEventListener("resize", function () {
    parkInstant(activeRail);
  });
})();
`

/** Wrap page content; top bar (project + horizontal rail) + centered box. */
export function renderShell(
  active: NavId | null,
  innerHtml: string,
  rail: RailId | null = null,
  options: ShellOptions = {},
): string {
  const tabClass = active ? ` tab-${active}` : ""
  const stackExtra = options.stackClass ? ` ${options.stackClass}` : ""
  const useTools = isToolRail(rail)
  const shellExtra = `${options.shellClass ? ` ${options.shellClass}` : ""}${useTools ? " has-tools" : ""}`
  // Skills/Tools/MCP pages pass NavId as `active` and leave rail unset → highlight Réglages.
  const railActive: RailId | null = rail ?? (active ? "settings" : null)
  const tabs = options.tabsHtml ?? renderNav(active)
  const bodyHtml = renderShellBody(tabs, tabClass, stackExtra, innerHtml)

  const mainInner = useTools
    ? `<div class="shell-top-wrap">
      <div class="shell-cluster shell-cluster--top">
        <div class="shell-top-row">
          ${renderProjectBar()}
          ${renderRail(railActive)}
        </div>
      </div>
    </div>
    ${renderToolsCarousel(rail, bodyHtml, options.toolBodies)}`
    : `<div class="shell-cluster">
      <div class="shell-top-row">
        ${renderProjectBar()}
        ${renderRail(railActive)}
      </div>
      ${bodyHtml}
    </div>`

  return `<div class="shell${shellExtra}">
  <div class="shell-scroller" id="shell-scroller" style="opacity:0">
    ${renderDrawer(railActive === "settings")}
    <div class="shell-main${useTools ? " is-tools" : ""}" id="shell-main">
      ${mainInner}
    </div>
  </div>
  <script>${SHELL_SCROLL_BOOT}</script>
  ${useTools ? `<script>${TOOLS_SCROLL_BOOT}</script>` : ""}
</div>
<script>${PROJECT_BAR_JS}</script>
${useTools ? `<script>${TOOLS_SCROLL_JS}</script>` : ""}`
}

export const NAV_CSS = `
.shell {
  --content-max: 720px;
  --rail-size: 2.5rem;
  --drawer-width: min(18rem, 78vw);
  /* Même courbure que les extrémités de la bulle de navigation */
  --shell-radius: calc(var(--rail-size) / 2);
  --rail-gap: 0.55rem;
  --shell-pad: 0.5rem;
  --cluster-gap: 0.55rem;
  --topbar-height: var(--rail-size);
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  justify-content: stretch;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
  background: var(--bg);
  overflow: hidden;
}
.shell-scroller {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  /* Keep auto here — smooth is only used via scrollTo({behavior:"smooth"}).
     CSS smooth would animate the initial park-on-main and flash the drawer. */
  scroll-behavior: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.shell-scroller:not(.is-ready) {
  opacity: 0;
}
.shell-scroller.is-ready {
  opacity: 1;
}
.shell-scroller::-webkit-scrollbar {
  display: none;
}
.shell-drawer {
  flex: 0 0 var(--drawer-width);
  width: var(--drawer-width);
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  scroll-snap-align: start;
  box-sizing: border-box;
  padding: var(--shell-pad);
  background: var(--bg);
}
.shell-drawer-body {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - (2 * var(--shell-pad)));
  min-height: 0;
  background: transparent;
  overflow: hidden;
}
.shell-drawer-section {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.35rem 0.15rem 0.55rem;
}
.shell-drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 0 0.55rem;
  padding: 0 0.2rem 0.55rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
}
.shell-drawer-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.project-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--text);
  color: var(--bg);
  cursor: pointer;
  flex-shrink: 0;
}
.project-add-btn:hover {
  opacity: 0.85;
}
.project-add-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.project-add-btn-icon {
  display: inline-flex;
  width: 0.78rem;
  height: 0.78rem;
}
.project-add-btn-icon svg {
  width: 100%;
  height: 100%;
  display: block;
  stroke-width: 2.25;
}
.shell-drawer-projects {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.shell-drawer-footer {
  flex: 0 0 auto;
  padding: 0.55rem 0.15rem 0.35rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
}
.shell-drawer-settings {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.6rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  text-decoration: none;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 550;
  box-sizing: border-box;
}
.shell-drawer-settings:hover {
  background: var(--bg-muted);
}
.shell-drawer-settings.is-active {
  background: color-mix(in srgb, var(--primary) 12%, var(--bg-elevated));
  border-color: color-mix(in srgb, var(--primary) 28%, transparent);
}
.shell-drawer-settings-icon {
  display: inline-flex;
  width: 1.15rem;
  height: 1.15rem;
  color: var(--text-muted);
}
.shell-drawer-settings-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.shell-main {
  flex: 0 0 100%;
  width: 100%;
  min-width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  scroll-snap-align: start;
  box-sizing: border-box;
  /* No top padding: sticky header must sit flush with the scrollport top,
     otherwise scrolled content peeks through the pad gap. */
  padding: 0 var(--shell-pad) 1.5rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  /* Vertical scroll lives here so .shell-top-row sticky keeps working
     (any overflow on .shell-scroller would break viewport sticky). */
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  position: relative;
}
.shell-main::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 200;
  background: var(--bg);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease;
}
html.shell-drawer-open .shell-main::after {
  opacity: 0.72;
  pointer-events: auto;
  cursor: pointer;
}
html.shell-drawer-open .shell-main {
  overflow: hidden !important;
}
html.shell-drawer-open .shell-main .shell-top-wrap,
html.shell-drawer-open .shell-main .shell-cluster,
html.shell-drawer-open .shell-main .tools-scroller,
html.shell-drawer-open .shell-main .tool-panel {
  pointer-events: none;
  touch-action: none;
}
html.shell-drawer-open .shell-main .tools-scroller,
html.shell-drawer-open .shell-main .tool-panel {
  overflow: hidden !important;
}
.shell-main.is-tools {
  position: relative;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  padding: 0;
  overflow: hidden;
}
.shell-top-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 0 var(--shell-pad) 0.95rem;
  margin: 0;
  box-sizing: border-box;
  background: linear-gradient(
    to bottom,
    var(--bg) 0%,
    var(--bg) 58%,
    color-mix(in srgb, var(--bg) 70%, transparent) 84%,
    transparent 100%
  );
  z-index: 50;
  pointer-events: none;
}
.shell-top-wrap > * {
  pointer-events: auto;
}
.shell-top-wrap .shell-cluster--top {
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  margin-inline: 0;
}
.tools-scroller {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
  overscroll-behavior-x: contain;
}
.tools-scroller:not(.is-ready) {
  opacity: 0;
}
.tools-scroller.is-ready {
  opacity: 1;
}
.tools-scroller::-webkit-scrollbar {
  display: none;
}
.tool-panel {
  flex: 0 0 100%;
  width: 100%;
  min-width: 100%;
  height: 100%;
  min-height: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  box-sizing: border-box;
  /* Leave room for the overlay header; content scrolls underneath it. */
  padding: calc(var(--shell-pad) + var(--rail-size) + 0.85rem) var(--shell-pad) 1.5rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: var(--bg);
}
.tool-panel .shell-body {
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  min-width: 0;
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
  margin: 0 0 calc(-0.6rem);
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
.shell-main.is-tools .shell-top-row {
  position: relative;
  top: auto;
  margin: 0;
  padding: var(--shell-pad) 0 0.2rem;
  background: transparent;
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
.shell-topbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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
.shell-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0.1rem 0.35rem 0.1rem 0.05rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}
.shell-menu-trigger:hover {
  background: color-mix(in srgb, var(--bg-muted) 70%, transparent);
}
.shell-menu-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 1.45rem;
  height: 1.45rem;
  color: #000;
}
.shell-menu-icon svg {
  width: 100%;
  height: 100%;
  display: block;
  stroke-width: 2.15;
}
@media (prefers-color-scheme: dark) {
  :root[data-theme="system"] .shell-menu-icon {
    color: #fff;
  }
}
:root[data-theme="dark"] .shell-menu-icon {
  color: #fff;
}
.project-name {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--text);
}
.project-option {
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
.project-option:hover {
  background: var(--bg-muted);
}
.project-option.selected {
  font-weight: 600;
  color: var(--text);
  background: var(--bg-muted);
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
/* Menu principal : 3 bulles (Accueil · espace de travail · Réglages) */
.app-rail {
  flex: 0 0 auto;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: transparent;
}
.app-rail-bubble {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.05rem;
  height: var(--rail-size);
  padding: 0.18rem;
  box-sizing: border-box;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-strong, var(--border)) 65%, transparent);
  background: color-mix(in srgb, var(--bg-elevated) 72%, transparent);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow:
    var(--shadow, 0 1px 2px rgba(0, 0, 0, 0.04)),
    inset 0 1px 0 color-mix(in srgb, var(--bg-elevated) 35%, #fff 65%),
    inset 0 -0.5px 0 color-mix(in srgb, var(--text) 8%, transparent);
}
@media (prefers-color-scheme: dark) {
  :root[data-theme="system"] .app-rail-bubble {
    background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
}
:root[data-theme="dark"] .app-rail-bubble {
  background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.app-rail-btn {
  box-sizing: border-box;
  width: calc(var(--rail-size) - 0.36rem);
  height: calc(var(--rail-size) - 0.36rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
  box-shadow: none;
  transition: background .15s, color .15s, transform .12s;
}
.app-rail-btn svg {
  width: 1.12rem;
  height: 1.12rem;
  display: block;
}
.app-rail-btn:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--bg-muted) 88%, transparent);
}
.app-rail-btn.active {
  color: var(--primary-fg);
  background: var(--primary);
  box-shadow: none;
}
.app-rail-btn:active {
  transform: scale(0.96);
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
  border-radius: var(--shell-radius);
  box-shadow: none;
  overflow: clip;
}
/* Premier onglet actif : le coin haut-gauche de la box se fond dans l'onglet */
.shell-stack.tab-status .shell-box {
  border-top-left-radius: 0;
}
.app {
  width: 100%;
  min-height: 0;
}
/* Même marge latérale pour les pages listes */
.shell-box .panel {
  padding: 0.85rem 0.75rem 1rem;
}
/* En-tête partagé Accueil / Discussions / Documents / Automatisations */
.page-chrome .entity-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0;
}
.page-chrome .entity-list-header > div:first-child {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}
.page-chrome .entity-list-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.page-sep {
  width: 100%;
  height: 1px;
  margin: 0.75rem 0;
  background: var(--border);
}
.entity-add-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  padding: 0;
  font: inherit;
  line-height: 0;
  background: var(--primary);
  color: var(--primary-fg);
  border: 1px solid var(--primary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s, opacity 0.15s;
}
.entity-add-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}
.entity-add-btn:active:not(:disabled) {
  transform: scale(0.96);
}
.entity-add-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.entity-add-btn svg {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}
/* Chat : colonne centrée, viewport figé — seuls les messages scrollent */
.shell.is-chat {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  justify-content: stretch;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
}
.shell.is-chat .shell-scroller {
  min-height: 100dvh;
  height: 100dvh;
  overflow-y: hidden;
}
.shell.is-chat .shell-drawer {
  min-height: 100dvh;
  height: 100dvh;
}
.shell.is-chat .shell-main {
  min-height: 100dvh;
  height: 100dvh;
  padding: 0;
  box-sizing: border-box;
  align-items: stretch;
  overflow: hidden;
}
.shell.is-chat .shell-top-wrap {
  padding: var(--shell-pad) var(--shell-pad) 0.55rem;
  background: var(--bg);
  pointer-events: auto;
}
.shell.is-chat .tool-panel {
  padding: calc(var(--shell-pad) + var(--rail-size) + 0.95rem) var(--shell-pad) var(--shell-pad);
  overflow: hidden;
  align-items: stretch;
}
.shell.is-chat .shell-cluster,
.shell.is-chat .shell-cluster--top {
  /* Ne pas s'étirer en largeur (sinon le menu part à droite de l'écran). */
  flex: 0 1 auto;
  align-self: stretch;
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  min-height: 0;
}
.shell.is-chat.has-tools .shell-cluster--top {
  height: auto;
  overflow: visible;
}
.shell.is-chat .tools-scroller {
  min-height: 0;
  overflow-y: hidden;
}
.shell.is-chat .tool-panel.is-active {
  display: flex;
  flex-direction: column;
}
.shell.is-chat .tool-panel .shell-body {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: min(var(--content-max), 100%);
  max-width: var(--content-max);
  margin-inline: auto;
  align-self: center;
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
