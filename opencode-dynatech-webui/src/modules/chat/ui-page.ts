import { LITE_MARKDOWN_BROWSER_JS } from "../../lib/lite-markdown.ts"
import type { UiTheme } from "../../shell/theme.ts"
import { themeColorScheme } from "../../shell/theme.ts"
import { NAV_CSS, renderShell } from "../../shell/nav.ts"

const ICON_ATTACH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.88 18.09a2 2 0 0 1-2.83-2.83l8.49-8.49"/></svg>`

const ICON_CHEVRON = `<svg class="session-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`

const ICON_CHIP_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`

const ICON_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`

const ICON_STOP = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>`

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

function modelEffortHtml(): string {
  return `<div class="chat-model-bar" aria-label="Modèle et effort">
  <button type="button" class="chat-chip" title="Modèle" aria-label="Modèle">
    <span>DeepSeek V4 Flash Free</span>
    ${ICON_CHIP_CHEVRON}
  </button>
  <button type="button" class="chat-chip" title="Effort" aria-label="Effort">
    <span>Default</span>
    ${ICON_CHIP_CHEVRON}
  </button>
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
        <div class="chat-toolbar-right">
          ${modelEffortHtml()}
          <div class="context-wheel" id="context-wheel" title="Utilisation du contexte" aria-label="Utilisation du contexte" hidden>
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle class="context-wheel-track" cx="18" cy="18" r="14"></circle>
              <circle class="context-wheel-fill" id="context-wheel-fill" cx="18" cy="18" r="14"></circle>
            </svg>
          </div>
        </div>
      </header>

      <div class="chat-messages" id="chat-messages" aria-live="polite">
        <p class="chat-empty" id="chat-empty">Sélectionnez ou créez une discussion.</p>
      </div>

      <div class="chat-bottom">
        <div class="chat-interrupted" id="chat-interrupted" hidden role="status" aria-live="polite">
          <span>Interrompu</span>
        </div>

        <form class="chat-composer" id="chat-composer" autocomplete="off">
          <button type="button" class="chat-attach-btn" title="Joindre une image ou un document" aria-label="Joindre un fichier">${ICON_ATTACH}</button>
          <textarea class="chat-composer-input" id="chat-input" rows="1" placeholder="Demandez n'importe quoi..."></textarea>
          <button type="submit" class="chat-send" title="Envoyer" aria-label="Envoyer">${ICON_SEND}</button>
        </form>
      </div>
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
  const interruptedEl = document.getElementById("chat-interrupted");
  const contextWheel = document.getElementById("context-wheel");
  const contextWheelFill = document.getElementById("context-wheel-fill");
  const form = document.getElementById("chat-composer");
  const input = document.getElementById("chat-input");
  if (!picker || !trigger || !menu || !nameEl || !list || !messagesEl) return;

  let sessions = [];
  let currentId = "";
  let liveMessages = [];
  let sending = false;
  let streamSessionId = "";
  let pendingUserText = "";
  let turnStarted = false;
  let finishLock = false;
  let finishTimer = null;
  let sendGeneration = 0;
  let showInterrupted = false;
  const WHEEL_C = 2 * Math.PI * 14;

  function setInterrupted(on) {
    showInterrupted = !!on;
    if (!interruptedEl) return;
    interruptedEl.hidden = !showInterrupted;
  }

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

  function toolLabel(name) {
    const labels = {
      websearch: "Recherche Web",
      webfetch: "Lecture Web",
      read: "Lecture",
      edit: "Édition",
      shell: "Shell",
      glob: "Glob",
      grep: "Grep",
      question: "Question",
      skill: "Skill",
      subagent: "Sous-agent",
    };
    return labels[name] || name || "Outil";
  }

  function toolTitle(part) {
    const label = toolLabel(part.name);
    if (part.status === "error") return label + " Échec";
    if (part.status === "running" || part.status === "streaming") return label + "…";
    return label;
  }

  function renderToolPart(part) {
    const status = part.status || "running";
    const title = escapeHtml(toolTitle(part));
    const detail = escapeHtml(part.error || part.inputSummary || "");
    return (
      '<div class="msg-tool is-' + escapeHtml(status) + '">' +
        '<span class="msg-tool-rail" aria-hidden="true"></span>' +
        '<span class="msg-tool-icon" aria-hidden="true"></span>' +
        '<div class="msg-tool-body">' +
          '<div class="msg-tool-title">' + title + "</div>" +
          (detail ? '<div class="msg-tool-detail">' + detail + "</div>" : "") +
        "</div>" +
      "</div>"
    );
  }

  function renderReasoningPart(part) {
    const text = String(part.text || "");
    // Idle label before the first reasoning token.
    if (!text.trim() && (part.thinking || part.streaming)) {
      return '<div class="msg-thinking is-active" aria-live="polite">Réflexion</div>';
    }
    if (!text.trim()) {
      return '<div class="msg-thinking">Réflexion</div>';
    }
    const body = escapeHtml(text).replace(/\\n/g, "<br>");
    const openAttr = part.streaming || part.open ? " open" : "";
    const bodyCls = part.streaming ? "msg-reasoning-body is-streaming" : "msg-reasoning-body";
    return (
      '<details class="msg-reasoning"' + openAttr + '>' +
        "<summary>Réflexion</summary>" +
        '<div class="' + bodyCls + '">' + body + "</div>" +
      "</details>"
    );
  }

  function renderAssistantParts(parts) {
    const list = Array.isArray(parts) && parts.length
      ? parts
      : [];
    if (!list.length) return "";
    return list.map((part) => {
      if (part.type === "reasoning") return renderReasoningPart(part);
      if (part.type === "tool") return renderToolPart(part);
      if (part.type === "text") {
        const cls = part.streaming ? "msg-md is-streaming" : "msg-md";
        const body = part.streaming
          ? escapeHtml(part.text || "").replace(/\\n/g, "<br>")
          : renderMarkdown(part.text || "");
        return '<div class="' + cls + '">' + body + "</div>";
      }
      return "";
    }).join("");
  }

  function renderMessages(messages) {
    liveMessages = Array.isArray(messages) ? messages.slice() : [];
    paintTranscript();
  }

  function formatMessageTime(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return "";
    try {
      return new Date(n).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function renderMsgTime(ts) {
    const label = formatMessageTime(ts);
    if (!label) return "";
    return '<time class="msg-time" datetime="' + escapeHtml(new Date(Number(ts)).toISOString()) + '">' +
      escapeHtml(label) +
      "</time>";
  }

  function paintTranscript() {
    if (!liveMessages.length) {
      messagesEl.innerHTML = '<p class="chat-empty" id="chat-empty">' +
        (currentId ? "Aucun message dans cette discussion." : "Sélectionnez ou créez une discussion.") +
        "</p>";
      return;
    }
    messagesEl.innerHTML = liveMessages.map((m) => {
      const role = m.role === "user" ? "user" : "assistant";
      const timeHtml = renderMsgTime(m.createdAt);
      if (role === "user") {
        const text = escapeHtml(m.text).replace(/\\n/g, "<br>");
        return '<div class="msg msg-user"><div class="msg-body"><p>' + text + "</p></div>" + timeHtml + "</div>";
      }
      const partsHtml = renderAssistantParts(m.parts && m.parts.length ? m.parts : (
        m.text ? [{ type: "text", text: m.text }] : []
      ));
      if (!partsHtml) return "";
      return '<div class="msg msg-assistant"><div class="msg-body">' + partsHtml + "</div>" + timeHtml + "</div>";
    }).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sameUserText(a, b) {
    return String(a || "").trim() === String(b || "").trim();
  }

  /** Keep the pending user bubble if the server snapshot is still missing it. */
  function adoptServerMessages(serverMessages, pendingText) {
    const server = Array.isArray(serverMessages) ? serverMessages.slice() : [];
    const pending = String(pendingText || pendingUserText || "").trim();
    if (pending) {
      const hasPending = server.some((m) => m.role === "user" && sameUserText(m.text, pending));
      if (!hasPending) {
        server.push({
          id: "local-user-" + Date.now(),
          role: "user",
          text: pending,
          parts: [{ type: "text", text: pending }],
          createdAt: Date.now(),
        });
      }
    }
    // Preserve any live user bubbles not yet present server-side (optimistic send).
    for (const msg of liveMessages) {
      if (msg.role !== "user") continue;
      const exists = server.some((m) =>
        (m.id && msg.id && m.id === msg.id) ||
        (m.role === "user" && sameUserText(m.text, msg.text))
      );
      if (!exists) server.push(msg);
    }
    // Preserve in-flight assistant parts (streaming) not yet reflected server-side.
    const serverIds = new Set(server.map((m) => m.id));
    for (const msg of liveMessages) {
      if (msg.role !== "assistant" || !msg.id || serverIds.has(msg.id)) continue;
      if (!msg.parts || !msg.parts.length) continue;
      server.push(msg);
    }
    // Merge parts into existing assistant rows when server has a stub.
    for (const live of liveMessages) {
      if (live.role !== "assistant" || !live.id) continue;
      const idx = server.findIndex((m) => m.id === live.id);
      if (idx < 0) continue;
      const remote = server[idx];
      const liveParts = live.parts || [];
      const remoteParts = remote.parts || [];
      if (liveParts.length > remoteParts.length || liveParts.some((p) => p.streaming)) {
        server[idx] = {
          ...remote,
          parts: liveParts,
          text: live.text || remote.text || "",
        };
      }
    }
    liveMessages = server;
    paintTranscript();
  }

  let paintTimer = 0;
  function paintLive() {
    // Avoid rAF: background/webview tabs often throttle it and freeze token streaming.
    if (paintTimer) return;
    paintTimer = setTimeout(() => {
      paintTimer = 0;
      paintTranscript();
    }, 0);
  }

  function summarizeToolInput(input) {
    if (!input || typeof input !== "object") return "";
    for (const key of ["query", "url", "path", "command", "pattern", "objective"]) {
      const value = input[key];
      if (typeof value === "string" && value.trim()) {
        const trimmed = value.trim();
        return trimmed.length > 120 ? trimmed.slice(0, 117) + "…" : trimmed;
      }
    }
    return "";
  }

  function ensureAssistantMessage(msgId) {
    if (msgId) {
      const local = liveMessages.find((m) => m.id === "local-thinking");
      if (local) local.id = msgId;
    }
    const id = msgId || "local-thinking";
    let msg = liveMessages.find((m) => m.id === id);
    if (msg) return msg;
    msg = { id: id, role: "assistant", text: "", parts: [], createdAt: Date.now() };
    liveMessages.push(msg);
    return msg;
  }

  function ensureThinkingPlaceholder() {
    const msg = ensureAssistantMessage("local-thinking");
    let part = findPart(msg, (p) => p.type === "reasoning" && (p.thinking || p.ordinal === -1));
    if (!part) {
      part = { type: "reasoning", text: "", ordinal: -1, open: true, thinking: true };
      msg.parts.unshift(part);
    } else {
      part.thinking = true;
      part.open = true;
    }
    paintLive();
  }

  function clearEmptyThinking(msg) {
    if (!msg || !Array.isArray(msg.parts)) return;
    msg.parts = msg.parts.filter((p) => !(p.type === "reasoning" && p.thinking && !String(p.text || "").trim()));
  }

  function findPart(msg, pred) {
    return (msg.parts || []).find(pred);
  }

  function upsertTextPart(msg, ordinal, text, streaming) {
    clearEmptyThinking(msg);
    let part = findPart(msg, (p) => p.type === "text" && p.ordinal === ordinal);
    if (!part) {
      part = { type: "text", text: text || "", ordinal: ordinal, streaming: !!streaming };
      msg.parts.push(part);
    } else {
      part.text = text || "";
      part.streaming = !!streaming;
    }
    msg.text = (msg.parts || []).filter((p) => p.type === "text").map((p) => p.text).join("\\n\\n");
  }

  function appendTextDelta(msgId, ordinal, delta) {
    const msg = ensureAssistantMessage(msgId);
    clearEmptyThinking(msg);
    let part = findPart(msg, (p) => p.type === "text" && p.ordinal === ordinal);
    if (!part) {
      part = { type: "text", text: "", ordinal: ordinal, streaming: true };
      msg.parts.push(part);
    }
    part.text = (part.text || "") + (delta || "");
    part.streaming = true;
    msg.text = (msg.parts || []).filter((p) => p.type === "text").map((p) => p.text).join("\\n\\n");
  }

  function upsertReasoningPart(msg, ordinal, text, open, streaming) {
    let part = findPart(msg, (p) => p.type === "reasoning" && (p.ordinal === ordinal || p.thinking || p.streaming));
    if (!part) {
      part = {
        type: "reasoning",
        text: text || "",
        ordinal: ordinal,
        open: open != null ? !!open : true,
        thinking: !String(text || "").trim(),
        streaming: streaming != null ? !!streaming : !String(text || "").trim(),
      };
      msg.parts.push(part);
    } else {
      part.text = text || "";
      part.ordinal = ordinal;
      if (String(text || "").trim()) part.thinking = false;
      if (open != null) part.open = !!open;
      if (streaming != null) part.streaming = !!streaming;
    }
  }

  function appendReasoningDelta(msgId, ordinal, delta) {
    const msg = ensureAssistantMessage(msgId);
    let part = findPart(msg, (p) => p.type === "reasoning" && (p.ordinal === ordinal || p.thinking || p.streaming));
    if (!part) {
      part = { type: "reasoning", text: "", ordinal: ordinal, open: true, thinking: false, streaming: true };
      msg.parts.push(part);
    }
    part.ordinal = ordinal;
    part.thinking = false;
    part.streaming = true;
    part.open = true;
    part.text = (part.text || "") + (delta || "");
  }

  function upsertToolPart(msgId, toolId, patch) {
    const msg = ensureAssistantMessage(msgId);
    clearEmptyThinking(msg);
    let part = findPart(msg, (p) => p.type === "tool" && p.id === toolId);
    if (!part) {
      part = {
        type: "tool",
        id: toolId,
        name: patch.name || "tool",
        status: patch.status || "running",
        executed: !!patch.executed,
        error: patch.error || "",
        inputSummary: patch.inputSummary || "",
      };
      msg.parts.push(part);
    } else {
      Object.assign(part, patch);
    }
  }

  function clearFinishTimer() {
    if (finishTimer) {
      clearTimeout(finishTimer);
      finishTimer = null;
    }
  }

  async function finishStream(sessionId, opts) {
    const force = !!(opts && opts.force);
    const gen = opts && opts.generation != null ? opts.generation : sendGeneration;
    if (!sending && !force) return;
    if (gen !== sendGeneration) return;
    if (sessionId && currentId && sessionId !== currentId) return;
    // Ignore premature completion before the agent produced any work.
    if (!force && !turnStarted) return;
    if (finishLock) return;
    finishLock = true;
    clearFinishTimer();
    const sid = sessionId || currentId || streamSessionId;
    turnStarted = false;
    if (opts && opts.interrupted) setInterrupted(true);
    try {
      if (sid) {
        await loadMessages(sid, { quiet: true, replace: true });
        void loadContextUsage(sid);
      }
    } finally {
      streamSessionId = "";
      pendingUserText = "";
      if (typeof window.__dynatechSetSending === "function") window.__dynatechSetSending(false);
      else sending = false;
      finishLock = false;
      if (input) input.focus();
    }
  }

  function markTurnStarted() {
    turnStarted = true;
  }

  function scheduleFinishFallback(sessionId, generation) {
    clearFinishTimer();
    finishTimer = setTimeout(() => {
      void finishStream(sessionId, { force: true, generation: generation });
    }, 180000);
  }

  function handleStreamEvent(evt) {
    if (!evt || typeof evt !== "object") return;
    const type = evt.type;
    const data = evt.data || {};
    const sid = data.sessionID || "";
    if (sid && currentId && sid !== currentId) return;
    // Accept live tokens for the active send (or matching stream session).
    const live = sending || (streamSessionId && sid && sid === streamSessionId);
    if (!live && type !== "session.execution.succeeded" && type !== "session.execution.failed" && type !== "session.execution.interrupted" && type !== "session.idle") {
      return;
    }

    if (type === "session.execution.started") {
      markTurnStarted();
      ensureThinkingPlaceholder();
      return;
    }
    if (type === "session.text.started") {
      markTurnStarted();
      upsertTextPart(ensureAssistantMessage(data.assistantMessageID), data.ordinal, "", true);
      paintLive();
      return;
    }
    if (type === "session.text.delta") {
      markTurnStarted();
      appendTextDelta(data.assistantMessageID, data.ordinal, data.delta || "");
      paintLive();
      return;
    }
    if (type === "session.text.ended") {
      upsertTextPart(ensureAssistantMessage(data.assistantMessageID), data.ordinal, data.text || "", false);
      paintLive();
      return;
    }
    if (type === "session.reasoning.started") {
      markTurnStarted();
      upsertReasoningPart(ensureAssistantMessage(data.assistantMessageID), data.ordinal, "", true, true);
      paintLive();
      return;
    }
    if (type === "session.reasoning.delta") {
      markTurnStarted();
      appendReasoningDelta(data.assistantMessageID, data.ordinal, data.delta || "");
      paintLive();
      return;
    }
    if (type === "session.reasoning.ended") {
      upsertReasoningPart(ensureAssistantMessage(data.assistantMessageID), data.ordinal, data.text || "", false, false);
      paintLive();
      return;
    }
    if (type === "session.tool.input.started") {
      markTurnStarted();
      upsertToolPart(data.assistantMessageID, data.id, {
        name: data.name || "tool",
        status: "streaming",
        executed: false,
      });
      paintLive();
      return;
    }
    if (type === "session.tool.called") {
      markTurnStarted();
      upsertToolPart(data.assistantMessageID, data.id, {
        status: "running",
        executed: !!data.executed,
        inputSummary: summarizeToolInput(data.input),
      });
      paintLive();
      return;
    }
    if (type === "session.tool.success") {
      upsertToolPart(data.assistantMessageID, data.id, {
        status: "completed",
        executed: true,
        error: "",
      });
      paintLive();
      return;
    }
    if (type === "session.tool.failed") {
      const err = data.error && typeof data.error.message === "string" ? data.error.message : "Échec";
      upsertToolPart(data.assistantMessageID, data.id, {
        status: "error",
        executed: false,
        error: err,
      });
      paintLive();
      return;
    }
    if (
      type === "session.execution.succeeded" ||
      type === "session.execution.failed" ||
      type === "session.execution.interrupted" ||
      type === "session.idle"
    ) {
      if (type === "session.execution.interrupted") setInterrupted(true);
      void finishStream(sid || currentId, {
        interrupted: type === "session.execution.interrupted",
      });
    }
  }

  function connectEvents() {
    if (window.__dynatechChatEvents) {
      try {
        if (window.__dynatechChatEvents.readyState !== 2) return;
        window.__dynatechChatEvents.close();
      } catch (_) {}
    }
    let es;
    try {
      es = new EventSource("/api/events");
    } catch (err) {
      console.error(err);
      return;
    }
    window.__dynatechChatEvents = es;
    es.onmessage = (ev) => {
      try {
        handleStreamEvent(JSON.parse(ev.data));
      } catch (_) {}
    };
    es.onerror = () => {
      // Browser auto-reconnects EventSource while CONNECTING/OPEN.
    };
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

  async function loadMessages(id, opts) {
    const options = opts || {};
    if (!id) {
      renderMessages([]);
      setContextUsage(null);
      return;
    }
    // Never wipe the pane while streaming / when we already have content.
    if (!options.quiet && !sending && !liveMessages.length) {
      messagesEl.innerHTML = '<p class="chat-empty">Chargement…</p>';
    }
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
      const serverMessages = Array.isArray(data.messages) ? data.messages : [];
      if (options.replace) {
        renderMessages(serverMessages);
      } else if (sending || options.preserveLive) {
        adoptServerMessages(serverMessages, pendingUserText);
      } else {
        renderMessages(serverMessages);
      }
      void loadContextUsage(id);
    } catch (err) {
      if (id !== currentId) return;
      if (sending || liveMessages.length) return;
      messagesEl.innerHTML = '<p class="chat-empty">' + escapeHtml(err instanceof Error ? err.message : "Erreur de chargement") + "</p>";
      setContextUsage(null);
    }
  }

  async function selectSession(id, name, opts) {
    const options = opts || {};
    currentId = id || "";
    setInterrupted(false);
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
    const sendBtn = form.querySelector(".chat-send");
    const ICON_SEND_SVG = ${JSON.stringify(ICON_SEND)};
    const ICON_STOP_SVG = ${JSON.stringify(ICON_STOP)};

    function setSending(on) {
      sending = on;
      input.disabled = on;
      form.classList.toggle("is-sending", on);
      if (!sendBtn) return;
      sendBtn.disabled = false;
      sendBtn.type = on ? "button" : "submit";
      sendBtn.classList.toggle("is-stop", on);
      sendBtn.title = on ? "Arrêter" : "Envoyer";
      sendBtn.setAttribute("aria-label", on ? "Arrêter" : "Envoyer");
      sendBtn.innerHTML = on ? ICON_STOP_SVG : ICON_SEND_SVG;
    }

    // Expose for stream finish handler defined above.
    window.__dynatechSetSending = setSending;

    async function stopGeneration() {
      const sessionId = streamSessionId || currentId;
      const gen = sendGeneration;
      setInterrupted(true);
      if (!sessionId) {
        setSending(false);
        return;
      }
      try {
        await fetch("/api/sessions/" + encodeURIComponent(sessionId) + "/interrupt", {
          method: "POST",
        });
      } catch (err) {
        console.error(err);
      } finally {
        await finishStream(sessionId, { force: true, generation: gen, interrupted: true });
      }
    }

    if (sendBtn) {
      sendBtn.addEventListener("click", (ev) => {
        if (!sending) return;
        ev.preventDefault();
        ev.stopPropagation();
        void stopGeneration();
      });
    }

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (sending) {
        void stopGeneration();
        return;
      }
      const text = String(input.value || "").trim();
      if (!text) return;

      let sessionId = currentId;
      const generation = ++sendGeneration;
      setInterrupted(false);
      setSending(true);
      streamSessionId = sessionId || "";
      pendingUserText = text;
      turnStarted = false;
      finishLock = false;
      try {
        if (!sessionId) {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
          if (!data.session || !data.session.id) throw new Error("Session invalide");
          sessions = [{ id: data.session.id, title: data.session.title || "Nouvelle session" }].concat(
            sessions.filter((s) => s.id !== data.session.id),
          );
          await selectSession(data.session.id, data.session.title || "Nouvelle session", { skipMessages: true });
          sessionId = data.session.id;
          streamSessionId = sessionId;
          renderMessages([]);
        }

        streamSessionId = sessionId;
        scheduleFinishFallback(sessionId, generation);

        const empty = messagesEl.querySelector(".chat-empty");
        if (empty) empty.remove();
        liveMessages = liveMessages.concat([{
          id: "local-user-" + Date.now(),
          role: "user",
          text: text,
          parts: [{ type: "text", text: text }],
          createdAt: Date.now(),
        }]);
        renderMessages(liveMessages);
        ensureThinkingPlaceholder();
        input.value = "";

        const res = await fetch("/api/sessions/" + encodeURIComponent(sessionId) + "/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        if (generation !== sendGeneration || sessionId !== currentId) return;
        if (data.session && data.session.title) {
          nameEl.textContent = data.session.title;
          const idx = sessions.findIndex((s) => s.id === sessionId);
          if (idx >= 0) sessions[idx].title = data.session.title;
          renderList();
        }
        // Keep the optimistic user bubble + live SSE parts; a POST snapshot can
        // briefly omit the user message and wipe it from the transcript.
        paintTranscript();
        void fetch("/api/sessions/" + encodeURIComponent(sessionId) + "/wait", {
          method: "POST",
        }).then(async (waitRes) => {
          if (generation !== sendGeneration || sessionId !== currentId || !sending) return;
          // Failed/early wait must not kill the token stream — SSE finishes the turn.
          if (!waitRes.ok) return;
          await finishStream(sessionId, { generation: generation });
        }).catch(() => {
          // Rely on session.execution.* / session.idle from SSE.
        });
      } catch (err) {
        if (generation !== sendGeneration) return;
        clearFinishTimer();
        streamSessionId = "";
        pendingUserText = "";
        turnStarted = false;
        alert(err instanceof Error ? err.message : "Impossible d'envoyer le message");
        if (currentId) await loadMessages(currentId);
        setSending(false);
        input.focus();
      }
    });

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        form.requestSubmit();
      }
    });
  }

  connectEvents();
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
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-elevated);
}
.chat-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem 1.65rem;
  border: none;
  background: linear-gradient(
    180deg,
    var(--bg-elevated) 0%,
    var(--bg-elevated) 48%,
    color-mix(in srgb, var(--bg-elevated) 78%, transparent) 72%,
    color-mix(in srgb, var(--bg-elevated) 28%, transparent) 88%,
    transparent 100%
  );
  pointer-events: none;
  min-width: 0;
}
.chat-toolbar > * {
  pointer-events: auto;
}
.session-picker {
  position: relative;
  min-width: 0;
  max-width: 100%;
  flex: 1 1 auto;
}
.chat-toolbar-right {
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-left: auto;
  min-width: 0;
}
.chat-model-bar {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  min-width: 0;
}
.context-wheel {
  flex: 0 0 auto;
  width: 1.55rem;
  height: 1.55rem;
  margin-left: 0;
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
.chat-attach-btn {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-muted) 88%, #fff 12%);
  color: var(--text-muted);
  cursor: pointer;
  transition: background .15s, color .15s;
}
.chat-attach-btn svg {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
}
.chat-attach-btn:hover {
  background: var(--bg-muted);
  color: var(--text);
}
.chat-attach-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.chat-messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 3.1rem 1rem 4.6rem;
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
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}
.msg-body {
  min-width: 0;
}
.msg p + p {
  margin-top: 0.55rem;
}
.msg-time {
  display: block;
  font-size: 0.68rem;
  line-height: 1;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.msg-user .msg-time {
  align-self: flex-end;
  padding-right: 0.15rem;
}
.msg-assistant .msg-time {
  align-self: flex-start;
  padding-left: 0.15rem;
}
.msg-assistant {
  align-self: flex-start;
  padding: 0 0.15rem;
  max-width: min(40rem, 96%);
}
.msg-assistant .msg-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.msg-user {
  align-self: flex-end;
}
.msg-user .msg-body {
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: var(--bg-muted);
  color: var(--text);
}
.msg-thinking {
  align-self: flex-start;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding: 0.1rem 0.15rem;
  user-select: none;
}
.msg-thinking.is-active {
  animation: msg-thinking-pulse 1.5s ease-in-out infinite;
}
@keyframes msg-thinking-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
.msg-reasoning {
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-muted) 88%, transparent);
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  overflow: hidden;
}
.msg-reasoning summary {
  cursor: pointer;
  list-style: none;
  padding: 0.4rem 0.65rem;
  font-weight: 550;
  color: var(--text-muted);
  user-select: none;
}
.msg-reasoning summary::-webkit-details-marker {
  display: none;
}
.msg-reasoning summary::before {
  content: "›";
  display: inline-block;
  width: 0.85rem;
  margin-right: 0.2rem;
  transform: translateY(-0.5px);
  transition: transform .15s;
  color: var(--text-faint);
}
.msg-reasoning[open] summary::before {
  transform: rotate(90deg);
}
.msg-reasoning-body {
  padding: 0 0.65rem 0.55rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-tool {
  display: grid;
  grid-template-columns: 3px 1rem minmax(0, 1fr);
  align-items: start;
  gap: 0.45rem;
  padding: 0.15rem 0;
  font-size: 0.84rem;
  line-height: 1.35;
  color: var(--text-muted);
}
.msg-tool-rail {
  width: 3px;
  min-height: 1.15rem;
  margin-top: 0.15rem;
  border-radius: 999px;
  background: var(--border-strong);
  align-self: stretch;
}
.msg-tool-icon {
  width: 1rem;
  height: 1rem;
  margin-top: 0.12rem;
  border-radius: 999px;
  border: 1.5px solid var(--border-strong);
  box-sizing: border-box;
  position: relative;
}
.msg-tool-title {
  color: var(--text);
  font-weight: 550;
}
.msg-tool-detail {
  margin-top: 0.12rem;
  color: var(--text-faint);
  font-size: 0.78rem;
  word-break: break-word;
}
.msg-tool.is-error {
  color: var(--err);
}
.msg-tool.is-error .msg-tool-rail {
  background: var(--err);
}
.msg-tool.is-error .msg-tool-icon {
  border-color: var(--err);
}
.msg-tool.is-error .msg-tool-icon::before,
.msg-tool.is-error .msg-tool-icon::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.55rem;
  height: 1.5px;
  background: var(--err);
  transform-origin: center;
}
.msg-tool.is-error .msg-tool-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}
.msg-tool.is-error .msg-tool-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}
.msg-tool.is-completed .msg-tool-rail {
  background: var(--ok);
}
.msg-tool.is-completed .msg-tool-icon {
  border-color: var(--ok);
}
.msg-tool.is-completed .msg-tool-icon::before {
  content: "";
  position: absolute;
  left: 0.22rem;
  top: 0.08rem;
  width: 0.28rem;
  height: 0.48rem;
  border-right: 1.5px solid var(--ok);
  border-bottom: 1.5px solid var(--ok);
  transform: rotate(40deg);
}
.msg-tool.is-running .msg-tool-icon,
.msg-tool.is-streaming .msg-tool-icon {
  border-color: var(--text-faint);
  border-top-color: var(--text-muted);
  animation: msg-tool-spin 0.8s linear infinite;
}
@keyframes msg-tool-spin {
  to { transform: rotate(360deg); }
}
.msg-md.is-streaming::after {
  content: "";
  display: inline-block;
  width: 0.4rem;
  height: 1em;
  margin-left: 0.12rem;
  vertical-align: text-bottom;
  background: var(--text-muted);
  border-radius: 1px;
  animation: msg-caret 1s steps(1) infinite;
}
@keyframes msg-caret {
  50% { opacity: 0; }
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
.chat-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.75rem 0 0;
  background: linear-gradient(
    0deg,
    var(--bg-elevated) 0%,
    var(--bg-elevated) 48%,
    color-mix(in srgb, var(--bg-elevated) 78%, transparent) 72%,
    color-mix(in srgb, var(--bg-elevated) 28%, transparent) 88%,
    transparent 100%
  );
  pointer-events: none;
}
.chat-bottom > * {
  pointer-events: auto;
}
.chat-composer {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  margin: 0;
  padding: 0.35rem 0.85rem 0.7rem;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.chat-interrupted {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0;
  padding: 0.15rem 1rem 0.35rem;
  color: var(--text-faint);
  font-size: 0.72rem;
  letter-spacing: 0.01em;
  user-select: none;
}
.chat-interrupted[hidden] {
  display: none;
}
.chat-interrupted::before,
.chat-interrupted::after {
  content: "";
  flex: 1 1 auto;
  height: 1px;
  background: color-mix(in srgb, var(--border) 70%, transparent);
}
.chat-interrupted span {
  flex: 0 0 auto;
}
.chat-composer.is-sending {
  opacity: 0.72;
}
.chat-composer.is-sending .chat-composer-input,
.chat-composer.is-sending .chat-attach-btn {
  pointer-events: none;
}
.chat-composer.is-sending .chat-send {
  pointer-events: auto;
  cursor: pointer;
  opacity: 1;
}
.chat-composer-input:disabled {
  opacity: 0.7;
}
.chat-pending {
  margin: 0.25rem 0 0;
  text-align: left;
  font-style: italic;
}
.chat-send:disabled {
  opacity: 0.55;
  cursor: wait;
}
.chat-send.is-stop {
  background: var(--text);
  color: var(--bg-elevated);
}
.chat-send.is-stop:hover {
  background: var(--text-muted);
}
.chat-send.is-stop svg {
  width: 0.85rem;
  height: 0.85rem;
}
.chat-composer-input {
  flex: 1 1 auto;
  display: block;
  width: auto;
  min-width: 0;
  min-height: 2rem;
  max-height: 8rem;
  margin: 0;
  padding: 0.35rem 0.15rem;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  /* ≥16px : évite le zoom auto de Safari iOS au focus */
  font-size: 16px;
  line-height: 1.45;
}
.chat-composer-input::placeholder {
  color: var(--text-faint);
}
.chat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 11rem;
  margin: 0;
  padding: 0.22rem 0.4rem;
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
  border-radius: 999px;
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
    max-width: 4.5rem;
  }
  .chat-messages {
    padding: 3rem 0.75rem 4.4rem;
  }
}
`
