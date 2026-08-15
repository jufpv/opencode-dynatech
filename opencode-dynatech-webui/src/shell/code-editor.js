(function (global) {
  "use strict";

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const TS_KEYWORD_RE =
    /\b(import|export|default|from|async|await|const|let|var|function|return|throw|new|typeof|if|else|switch|case|break|try|catch|finally|class|interface|type|enum|null|undefined|true|false)\b/g;
  const TS_TOKEN_RE =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;
  const SHELL_BIN_RE = /^(npx|node|npm|yarn|pnpm|python|python3|bash|sh|uvx)$/;

  function highlightTypeScript(code) {
    const parts = code.split(TS_TOKEN_RE);
    return parts
      .map((part) => {
        if (!part) return "";
        if (part.startsWith("//") || part.startsWith("/*")) {
          return `<span class="hl-cmt">${escapeHtml(part)}</span>`;
        }
        if (/^["'`]/.test(part)) {
          return `<span class="hl-str">${escapeHtml(part)}</span>`;
        }
        return escapeHtml(part).replace(TS_KEYWORD_RE, '<span class="hl-kw">$1</span>');
      })
      .join("");
  }

  function highlightKeyValue(code) {
    return code
      .split("\n")
      .map((line) => {
        if (!line) return "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return `<span class="hl-cmt">${escapeHtml(line)}</span>`;
        }
        const eq = line.indexOf("=");
        if (eq <= 0) return escapeHtml(line);
        const key = line.slice(0, eq);
        const value = line.slice(eq + 1);
        return `<span class="hl-key">${escapeHtml(key)}</span><span class="hl-op">=</span><span class="hl-val">${escapeHtml(value)}</span>`;
      })
      .join("\n");
  }

  function highlightShell(code) {
    return code
      .split("\n")
      .map((line) => {
        if (!line) return "";
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) {
          return `<span class="hl-cmt">${escapeHtml(line)}</span>`;
        }

        return line
          .split(/(\s+|--?[A-Za-z0-9_-]+)/g)
          .filter((part) => part.length > 0)
          .map((part) => {
            if (/^--?[A-Za-z0-9_-]+$/.test(part)) {
              return `<span class="hl-flag">${escapeHtml(part)}</span>`;
            }
            if (SHELL_BIN_RE.test(part)) {
              return `<span class="hl-kw">${escapeHtml(part)}</span>`;
            }
            if (/^https?:\/\//.test(part)) {
              return `<span class="hl-url">${escapeHtml(part)}</span>`;
            }
            return escapeHtml(part);
          })
          .join("");
      })
      .join("\n");
  }

  function highlightMarkdownInline(line) {
    const parts = line.split(/(`[^`\n]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*\n]+\*\*)/g);
    return parts
      .map((part) => {
        if (!part) return "";
        if (/^`[^`\n]+`$/.test(part)) {
          return `<span class="hl-md-code">${escapeHtml(part)}</span>`;
        }
        if (/^\[[^\]]+\]\([^)]+\)$/.test(part)) {
          return `<span class="hl-md-link">${escapeHtml(part)}</span>`;
        }
        if (/^\*\*[^*\n]+\*\*$/.test(part)) {
          return `<span class="hl-md-bold">${escapeHtml(part)}</span>`;
        }
        return escapeHtml(part);
      })
      .join("");
  }

  function highlightMarkdown(code) {
    const lines = code.split("\n");
    let inFence = false;

    return lines
      .map((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("```")) {
          inFence = !inFence;
          return `<span class="hl-fence">${escapeHtml(line)}</span>`;
        }

        if (inFence) {
          return `<span class="hl-codeblock">${escapeHtml(line)}</span>`;
        }

        const heading = line.match(/^(#{1,6})(\s+.*)$/);
        if (heading) {
          return `<span class="hl-md-h">${escapeHtml(heading[1])}</span>${highlightMarkdownInline(heading[2])}`;
        }

        if (/^>\s?/.test(line)) {
          return `<span class="hl-md-quote">${escapeHtml(line.slice(0, 1))}</span>${highlightMarkdownInline(line.slice(1))}`;
        }

        const list = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/);
        if (list) {
          return `<span class="hl-md-list">${escapeHtml(list[1])}</span>${highlightMarkdownInline(list[2])}`;
        }

        return highlightMarkdownInline(line);
      })
      .join("\n");
  }

  function highlightPlain(code) {
    return escapeHtml(code);
  }

  const HIGHLIGHTERS = {
    typescript: highlightTypeScript,
    keyvalue: highlightKeyValue,
    shell: highlightShell,
    markdown: highlightMarkdown,
    plaintext: highlightPlain,
  };

  function resolveHighlighter(textarea, options = {}) {
    if (typeof options.highlight === "function") {
      return options.highlight;
    }
    const lang = options.lang ?? textarea.dataset.codeLang ?? "plaintext";
    return HIGHLIGHTERS[lang] ?? highlightPlain;
  }

  function parseMinHeightPx(textarea, value) {
    if (value) {
      if (value.endsWith("rem")) {
        const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        return parseFloat(value) * rootSize;
      }
      if (value.endsWith("px")) {
        return parseFloat(value);
      }
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const styles = getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    return lineHeight * 3 + paddingTop + paddingBottom;
  }

  function refresh(textarea) {
    textarea?._codeEditorRefresh?.();
  }

  function enhance(textarea, options = {}) {
    if (!textarea || textarea.closest(".code-editor")) {
      return textarea;
    }

    const highlight = resolveHighlighter(textarea, options);
    const minHeightOption = options.minHeight ?? textarea.dataset.codeMinHeight;
    const fill = Boolean(options.fill) || textarea.dataset.codeFill === "true";

    const wrap = document.createElement("div");
    wrap.className = fill ? "code-editor code-editor-fill" : "code-editor";

    const pre = document.createElement("pre");
    pre.className = "code-editor-highlight";
    pre.setAttribute("aria-hidden", "true");

    const code = document.createElement("code");
    pre.appendChild(code);

    textarea.classList.add("code-editor-input");
    textarea.style.resize = "none";
    textarea.style.overflowX = "auto";
    textarea.style.overflowY = fill ? "auto" : "hidden";
    if (fill) {
      textarea.style.height = "100%";
    }

    textarea.parentNode?.insertBefore(wrap, textarea);
    wrap.appendChild(pre);
    wrap.appendChild(textarea);

    textarea._codeEditorMinHeightPx = parseMinHeightPx(textarea, minHeightOption);
    textarea._codeEditorFill = fill;
    let syncingHeight = false;

    function syncHeight() {
      if (fill || syncingHeight) return;
      syncingHeight = true;
      try {
        const minPx = textarea._codeEditorMinHeightPx ?? 72;
        // Collapsing to 0 to measure scrollHeight resets page scroll; preserve it.
        const pageX = window.scrollX;
        const pageY = window.scrollY;
        textarea.style.height = "0px";
        const next = Math.max(minPx, textarea.scrollHeight);
        textarea.style.height = `${next}px`;
        if (window.scrollX !== pageX || window.scrollY !== pageY) {
          window.scrollTo(pageX, pageY);
        }
      } finally {
        syncingHeight = false;
      }
    }

    function syncHighlight() {
      const value = textarea.value;
      code.innerHTML = highlight(value);
      if (value.endsWith("\n")) {
        code.appendChild(document.createElement("br"));
      }
      syncHeight();
      syncScroll();
    }

    function syncScroll() {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    }

    textarea._codeEditorRefresh = syncHighlight;
    textarea.addEventListener("input", syncHighlight);
    textarea.addEventListener("scroll", syncScroll, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        if (syncingHeight) return;
        if (!fill) syncHeight();
        syncScroll();
      });
      resizeObserver.observe(fill ? wrap : textarea);
      textarea._codeEditorResizeObserver = resizeObserver;
    }

    syncHighlight();
    return textarea;
  }

  function enhanceAll(selector = "textarea[data-code-lang]") {
    document.querySelectorAll(selector).forEach((textarea) => {
      enhance(textarea);
    });
  }

  function registerLanguage(name, highlighter) {
    HIGHLIGHTERS[name] = highlighter;
  }

  global.CodeEditor = {
    enhance,
    enhanceAll,
    refresh,
    registerLanguage,
    HIGHLIGHTERS,
  };
})(typeof window !== "undefined" ? window : globalThis);
