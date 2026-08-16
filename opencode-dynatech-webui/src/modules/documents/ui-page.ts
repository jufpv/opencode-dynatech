const ICON_FOLDER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`

const ICON_FILE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>`

const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`

const ICON_UPLOAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V6"/><path d="m8 9 4-4 4 4"/><path d="M4 18h16"/></svg>`

const ICON_FOLDER_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`

export function renderDocumentsInnerHtml(): string {
  return `
    <section class="panel" aria-labelledby="docs-title">
      <header class="page-chrome">
        <div class="entity-list-header">
          <div>
            <h2 id="docs-title">Documents</h2>
          </div>
          <div class="docs-header-actions">
            <button type="button" class="docs-icon-btn" id="docs-mkdir-btn" title="Nouveau dossier" aria-label="Nouveau dossier">${ICON_FOLDER_PLUS}</button>
            <button type="button" class="docs-icon-btn" id="docs-import-btn" title="Importer" aria-label="Importer">${ICON_UPLOAD}</button>
            <input type="file" id="docs-import-input" class="docs-import-input" multiple hidden>
          </div>
        </div>
        <div class="page-sep" role="separator" aria-hidden="true"></div>
      </header>

      <nav class="docs-crumb" id="docs-crumb" aria-label="Chemin"></nav>
      <div class="banner-error hidden" id="docs-error"></div>

      <div class="docs-list" id="docs-list" role="list"></div>
      <p class="docs-empty hidden" id="docs-empty">Ce dossier est vide.</p>
      <p class="docs-hint hidden" id="docs-hint"></p>

      <div class="docs-menu hidden" id="docs-menu" role="menu" hidden>
        <button type="button" class="docs-menu-item docs-menu-danger" role="menuitem" data-action="delete">Supprimer</button>
      </div>
    </section>
  `
}

const DOCS_JS = `
(function () {
  const ICON_FOLDER = ${JSON.stringify(ICON_FOLDER)};
  const ICON_FILE = ${JSON.stringify(ICON_FILE)};
  const ICON_CHEVRON = ${JSON.stringify(ICON_CHEVRON)};
  const LONG_PRESS_MS = 550;

  const crumbEl = document.getElementById("docs-crumb");
  const listEl = document.getElementById("docs-list");
  const emptyEl = document.getElementById("docs-empty");
  const hintEl = document.getElementById("docs-hint");
  const errorEl = document.getElementById("docs-error");
  const importBtn = document.getElementById("docs-import-btn");
  const importInput = document.getElementById("docs-import-input");
  const mkdirBtn = document.getElementById("docs-mkdir-btn");
  const menuEl = document.getElementById("docs-menu");

  if (!crumbEl || !listEl || !menuEl) return;

  let projectName = "Projet";
  let currentPath = "";
  let importing = false;
  let longPressTimer = null;
  let longPressTarget = null;
  let longPressFired = false;
  let menuTarget = null;

  function showError(message) {
    if (!errorEl) return;
    if (!message) {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  function formatSize(bytes) {
    if (bytes == null || !Number.isFinite(bytes)) return "";
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  }

  function pathFromQuery() {
    try {
      return new URLSearchParams(location.search).get("path") || "";
    } catch {
      return "";
    }
  }

  function setQueryPath(path, mode) {
    const url = new URL(location.href);
    if (path) url.searchParams.set("path", path);
    else url.searchParams.delete("path");
    const next = url.pathname + url.search;
    if (mode === "replace") history.replaceState({ path: path || "" }, "", next);
    else history.pushState({ path: path || "" }, "", next);
  }

  function fileUrl(path) {
    return "/api/project/file?path=" + encodeURIComponent(path || "") + "&raw=1";
  }

  function renderCrumb(path) {
    const parts = String(path || "").split("/").filter(Boolean);
    let html = '<button type="button" class="docs-crumb-item" data-path="">' +
      escapeHtml(projectName || "Projet") +
      "</button>";
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? acc + "/" + parts[i] : parts[i];
      html += '<span class="docs-crumb-sep" aria-hidden="true">' + ICON_CHEVRON + "</span>";
      if (i === parts.length - 1) {
        html += '<span class="docs-crumb-current">' + escapeHtml(parts[i]) + "</span>";
      } else {
        html += '<button type="button" class="docs-crumb-item" data-path="' + escapeAttr(acc) + '">' +
          escapeHtml(parts[i]) +
          "</button>";
      }
    }
    crumbEl.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressTarget = null;
  }

  function hideMenu() {
    menuTarget = null;
    menuEl.classList.add("hidden");
    menuEl.hidden = true;
  }

  function showMenuFor(btn) {
    menuTarget = {
      path: btn.dataset.path || "",
      type: btn.dataset.type || "file",
      name: btn.dataset.name || "",
    };
    const rect = btn.getBoundingClientRect();
    menuEl.classList.remove("hidden");
    menuEl.hidden = false;
    const menuW = menuEl.offsetWidth || 160;
    const menuH = menuEl.offsetHeight || 44;
    let left = rect.left + 12;
    let top = rect.bottom + 6;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - menuH - 8));
    menuEl.style.left = left + "px";
    menuEl.style.top = top + "px";
  }

  function renderList(data) {
    projectName = data.projectName || "Projet";
    currentPath = data.path || "";
    renderCrumb(currentPath);
    listEl.innerHTML = "";

    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (!entries.length) emptyEl.classList.remove("hidden");
    else emptyEl.classList.add("hidden");

    if (hintEl) {
      if (data.truncated) {
        hintEl.textContent = "Liste tronquée — trop d’éléments dans ce dossier.";
        hintEl.classList.remove("hidden");
      } else if (!hintEl.dataset.keep) {
        hintEl.textContent = "";
        hintEl.classList.add("hidden");
      }
      delete hintEl.dataset.keep;
    }

    for (const entry of entries) {
      const isDir = entry.type === "dir";
      const el = document.createElement(isDir ? "button" : "a");
      if (isDir) el.type = "button";
      else {
        el.href = fileUrl(entry.path);
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
      el.className = "docs-item";
      el.setAttribute("role", "listitem");
      el.dataset.path = entry.path;
      el.dataset.type = entry.type;
      el.dataset.name = entry.name;
      const meta = isDir
        ? "Dossier"
        : (formatSize(entry.size) || "Fichier");
      el.innerHTML =
        '<span class="docs-item-icon" aria-hidden="true">' +
        (isDir ? ICON_FOLDER : ICON_FILE) +
        "</span>" +
        '<span class="docs-item-main">' +
        '<span class="docs-item-name">' + escapeHtml(entry.name) + "</span>" +
        '<span class="docs-item-meta">' + escapeHtml(meta) + "</span>" +
        "</span>" +
        (isDir
          ? '<span class="docs-item-chevron" aria-hidden="true">' + ICON_CHEVRON + "</span>"
          : "");
      listEl.appendChild(el);
    }
    if (importBtn) {
      importBtn.disabled = importing;
      importBtn.title = currentPath
        ? "Importer dans « " + currentPath + " »"
        : "Importer à la racine du projet";
    }
    if (mkdirBtn) mkdirBtn.disabled = importing;
  }

  async function importFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || importing) return;
    importing = true;
    if (importBtn) importBtn.disabled = true;
    if (mkdirBtn) mkdirBtn.disabled = true;
    showError("");
    try {
      const form = new FormData();
      form.append("path", currentPath || "");
      for (const file of files) form.append("files", file, file.name);
      const res = await fetch("/api/project/files", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      if (hintEl) {
        const imported = Array.isArray(data.imported) ? data.imported.length : 0;
        const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
        const parts = [];
        if (imported) parts.push(imported + " fichier" + (imported > 1 ? "s" : "") + " importé" + (imported > 1 ? "s" : ""));
        if (skipped) parts.push(skipped + " ignoré" + (skipped > 1 ? "s" : ""));
        hintEl.textContent = parts.join(" · ");
        hintEl.classList.toggle("hidden", !parts.length);
        hintEl.dataset.keep = "1";
      }
      renderList(data);
      setQueryPath(data.path || "", "replace");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Import impossible");
    } finally {
      importing = false;
      if (importBtn) importBtn.disabled = false;
      if (mkdirBtn) mkdirBtn.disabled = false;
      if (importInput) importInput.value = "";
    }
  }

  async function createFolder() {
    const name = window.prompt("Nom du nouveau dossier");
    if (name == null) return;
    const trimmed = String(name).trim();
    if (!trimmed) {
      showError("Nom de dossier requis");
      return;
    }
    showError("");
    try {
      const res = await fetch("/api/project/mkdir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: currentPath || "", name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      renderList(data);
      setQueryPath(data.path || "", "replace");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Création impossible");
    }
  }

  async function deleteEntry(path, type, name) {
    const label = name || path;
    const kind = type === "dir" ? "le dossier" : "le fichier";
    const ok = window.confirm(
      "Supprimer " + kind + " « " + label + " » ?" +
      (type === "dir" ? "\\nSon contenu sera également supprimé." : "")
    );
    if (!ok) return;
    showError("");
    try {
      const res = await fetch("/api/project/file?path=" + encodeURIComponent(path), {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      hideMenu();
      renderList(data);
      setQueryPath(data.path || "", "replace");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  async function loadDir(path, historyMode) {
    showError("");
    try {
      const res = await fetch("/api/project/files?path=" + encodeURIComponent(path || ""), {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      renderList(data);
      if (historyMode !== "none") setQueryPath(data.path || "", historyMode || "push");
      return true;
    } catch (err) {
      listEl.innerHTML = "";
      emptyEl.classList.add("hidden");
      showError(err instanceof Error ? err.message : "Impossible de lister le dossier");
      return false;
    }
  }

  crumbEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-path]");
    if (!btn || !crumbEl.contains(btn)) return;
    void loadDir(btn.getAttribute("data-path") || "", "push");
  });

  listEl.addEventListener("pointerdown", (ev) => {
    const btn = ev.target.closest(".docs-item");
    if (!btn || !listEl.contains(btn) || ev.button !== 0) return;
    hideMenu();
    longPressFired = false;
    longPressTarget = btn;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      if (longPressTarget !== btn) return;
      longPressFired = true;
      showMenuFor(btn);
    }, LONG_PRESS_MS);
  });

  listEl.addEventListener("pointerup", clearLongPress);
  listEl.addEventListener("pointerleave", clearLongPress);
  listEl.addEventListener("pointercancel", clearLongPress);
  listEl.addEventListener("contextmenu", (ev) => {
    if (longPressFired || !menuEl.hidden) ev.preventDefault();
  });

  listEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".docs-item");
    if (!btn || !listEl.contains(btn)) return;
    if (longPressFired || !menuEl.hidden) {
      ev.preventDefault();
      ev.stopPropagation();
      longPressFired = false;
      return;
    }
    if (btn.dataset.type === "dir") {
      ev.preventDefault();
      void loadDir(btn.dataset.path || "", "push");
    }
    // files: native <a target="_blank">
  });

  menuEl.addEventListener("click", (ev) => {
    const item = ev.target.closest("[data-action]");
    if (!item || !menuEl.contains(item) || !menuTarget) return;
    ev.preventDefault();
    ev.stopPropagation();
    const action = item.getAttribute("data-action");
    const target = menuTarget;
    hideMenu();
    if (action === "delete") {
      void deleteEntry(target.path, target.type, target.name);
    }
  });

  document.addEventListener("pointerdown", (ev) => {
    if (menuEl.hidden) return;
    if (menuEl.contains(ev.target)) return;
    hideMenu();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") hideMenu();
  });

  window.addEventListener("scroll", hideMenu, true);
  window.addEventListener("resize", hideMenu);

  mkdirBtn?.addEventListener("click", () => {
    hideMenu();
    void createFolder();
  });

  importBtn?.addEventListener("click", () => {
    if (importing) return;
    importInput?.click();
  });

  importInput?.addEventListener("change", () => {
    void importFiles(importInput.files);
  });

  window.addEventListener("popstate", () => {
    void openFromQuery("none");
  });

  document.addEventListener("dynatech:project-changed", () => {
    void loadDir("", "replace");
  });

  async function openFromQuery(historyMode) {
    const path = pathFromQuery();
    if (!path) {
      await loadDir("", historyMode);
      return;
    }
    showError("");
    try {
      const res = await fetch("/api/project/files?path=" + encodeURIComponent(path), {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        renderList(data);
        if (historyMode !== "none") setQueryPath(data.path || "", historyMode || "push");
        return;
      }
    } catch {
      // fall through to parent
    }
    const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    await loadDir(parent, historyMode === "none" ? "none" : "replace");
  }

  void openFromQuery("replace");
})();

`

export const DOCS_PAGE_JS = DOCS_JS

const BASE_CSS = `
:root,:root[data-theme="light"]{color-scheme:light;--bg:#fafafa;--bg-elevated:#fff;--bg-muted:#f4f4f5;--bg-hover:#f4f4f5;--border:#e4e4e7;--border-strong:#d4d4d8;--text:#18181b;--text-muted:#71717a;--text-faint:#a1a1aa;--accent:#2563eb;--ok:#16a34a;--ok-bg:#dcfce7;--ok-fg:#166534;--err:#dc2626;--err-bg:#fef2f2;--err-border:#fecaca;--primary:#18181b;--primary-hover:#27272a;--primary-fg:#fff;--toggle-off:rgba(120,120,128,.22);--toggle-on:#34c759;--shadow:0 1px 2px rgba(0,0,0,.04);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;--font-size:14px}
@media (prefers-color-scheme:dark){:root[data-theme="system"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111113;--bg-elevated:#18181b;--bg-muted:#1c1c1f;--bg-hover:#27272a;--border:#27272a;--border-strong:#3f3f46;--text:#fafafa;--text-muted:#a1a1aa;--text-faint:#71717a;--accent:#60a5fa;--ok:#4ade80;--ok-bg:#14532d;--ok-fg:#bbf7d0;--err:#f87171;--err-bg:#3f1d1d;--err-border:#7f1d1d;--primary:#fafafa;--primary-hover:#e4e4e7;--primary-fg:#18181b;--toggle-off:rgba(120,120,128,.32);--shadow:none}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);font-size:var(--font-size);background:var(--bg);color:var(--text);min-height:100dvh;-webkit-font-smoothing:antialiased}
.view.hidden,.hidden{display:none!important}
`

const DOCS_CSS = `
.docs-import-input {
  display: none !important;
}
.docs-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}
.docs-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  padding: 0;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: var(--primary-fg);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s, opacity 0.15s;
}
.docs-icon-btn svg {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}
.docs-icon-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}
.docs-icon-btn:active:not(:disabled) {
  transform: scale(0.96);
}
.docs-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.docs-crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.1rem;
  margin: 0 0 0.65rem;
  min-width: 0;
}
.docs-crumb-item {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  padding: 0.15rem 0.3rem;
  border-radius: 5px;
  cursor: pointer;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-crumb-item:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.docs-crumb-current {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  padding: 0.15rem 0.3rem;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-crumb-meta {
  margin-left: 0.35rem;
  font-size: 0.75rem;
  color: var(--text-faint);
  white-space: nowrap;
}
.docs-crumb-sep {
  width: 0.75rem;
  height: 0.75rem;
  color: var(--text-faint);
  display: inline-flex;
  flex: 0 0 auto;
}
.docs-crumb-sep svg {
  width: 100%;
  height: 100%;
  display: block;
}
.banner-error {
  margin: 0 0 0.65rem;
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
.docs-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.docs-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.45rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
a.docs-item:visited {
  color: inherit;
}
.docs-item:hover {
  background: var(--bg-muted);
}
.docs-item-icon {
  flex: 0 0 auto;
  width: 1.15rem;
  height: 1.15rem;
  color: var(--text-muted);
  display: inline-flex;
}
.docs-item-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.docs-item-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.docs-item-name {
  font-size: 0.9rem;
  font-weight: 550;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-item-meta {
  font-size: 0.72rem;
  color: var(--text-faint);
}
.docs-item-chevron {
  flex: 0 0 auto;
  width: 0.85rem;
  height: 0.85rem;
  color: var(--text-faint);
  display: inline-flex;
}
.docs-item-chevron svg {
  width: 100%;
  height: 100%;
  display: block;
}
.docs-menu {
  position: fixed;
  z-index: 80;
  min-width: 10.5rem;
  padding: 0.3rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.docs-menu.hidden {
  display: none !important;
}
.docs-menu-item {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.7rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.docs-menu-item:hover {
  background: var(--bg-muted);
}
.docs-menu-danger {
  color: var(--err);
}
.docs-menu-danger:hover {
  background: var(--err-bg);
}
.docs-empty,
.docs-hint {
  margin: 0;
  padding: 0.75rem 0.15rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.docs-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
}

`

export const DOCS_PAGE_CSS = DOCS_CSS
