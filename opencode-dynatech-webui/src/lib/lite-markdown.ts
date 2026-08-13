/**
 * Minimal markdown → HTML for chat bubbles (no dependency).
 * Escapes first; supports paragraphs, lists, bold, links, images, code.
 */

/** Rewrite file:// (and bare absolute paths) to the webui local-file proxy. */
export function resolveImageSrc(href: string): string {
  const raw = String(href || "").trim()
  if (!raw) return raw
  if (raw.startsWith("file:") || (raw.startsWith("/") && !raw.startsWith("//"))) {
    return `/api/local-file?url=${encodeURIComponent(raw)}`
  }
  return raw
}

function imgTag(alt: string, href: string): string {
  const src = resolveImageSrc(href)
  return `<img class="msg-img" src="${src}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" />`
}

export function renderLiteMarkdown(src: string): string {
  const slots: string[] = []
  const park = (html: string) => {
    slots.push(html)
    return `§§${slots.length - 1}§§`
  }

  let text = String(src || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n/g, "\n")

  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, code: string) =>
    park(`<pre class="msg-pre"><code>${code.replace(/\n$/, "")}</code></pre>`),
  )
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => park(`<code>${code}</code>`))
  // Standard Markdown: ![alt](url) and ![](url)
  text = text.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+|file:\/\/\/[^)\s]+|\/[^)\s]+)\)/g,
    (_m, alt: string, href: string) => park(imgTag(alt, href)),
  )
  // Compact form: !(url)
  text = text.replace(
    /!\((https?:\/\/[^)\s]+|file:\/\/\/[^)\s]+|\/[^)\s]+)\)/g,
    (_m, href: string) => park(imgTag("", href)),
  )
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_m, label: string, href: string) =>
      park(
        `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
      ),
  )
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

  const lines = text.split("\n")
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i]!.trim()
    if (!trimmed) {
      i += 1
      continue
    }
    if (/^§§\d+§§$/.test(trimmed)) {
      out.push(trimmed)
      i += 1
      continue
    }
    if (/^\d+\.\s+/.test(lines[i]!)) {
      out.push("<ol>")
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        out.push(`<li>${lines[i]!.replace(/^\d+\.\s+/, "")}</li>`)
        i += 1
      }
      out.push("</ol>")
      continue
    }
    if (/^[-*]\s+/.test(lines[i]!)) {
      out.push("<ul>")
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        out.push(`<li>${lines[i]!.replace(/^[-*]\s+/, "")}</li>`)
        i += 1
      }
      out.push("</ul>")
      continue
    }
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^\d+\.\s+/.test(lines[i]!) &&
      !/^[-*]\s+/.test(lines[i]!)
    ) {
      para.push(lines[i]!)
      i += 1
    }
    out.push(`<p>${para.join("<br>")}</p>`)
  }

  return out
    .join("")
    .replace(/§§(\d+)§§/g, (_m, idx: string) => slots[Number(idx)] || "")
}

/** Browser copy for inline chat JS (no bundler). Uses RegExp to avoid backtick escaping. */
export const LITE_MARKDOWN_BROWSER_JS = String.raw`
function renderMarkdown(src) {
  var slots = [];
  function park(html) {
    slots.push(html);
    return "§§" + (slots.length - 1) + "§§";
  }
  var fence = new RegExp("\`\`\`[^\\n]*\\n([\\s\\S]*?)\`\`\`", "g");
  var inline = new RegExp("\`([^\`\\n]+)\`", "g");
  var text = String(src || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n/g, "\n");
  text = text.replace(fence, function (_, code) {
    return park('<pre class="msg-pre"><code>' + code.replace(/\n$/, "") + "</code></pre>");
  });
  text = text.replace(inline, function (_, code) {
    return park("<code>" + code + "</code>");
  });
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|file:\/\/\/[^)\s]+|\/[^)\s]+)\)/g, function (_, alt, href) {
    var src = href;
    if (href.indexOf("file:") === 0 || (href.charAt(0) === "/" && href.indexOf("//") !== 0)) {
      src = "/api/local-file?url=" + encodeURIComponent(href);
    }
    return park('<img class="msg-img" src="' + src + '" alt="' + alt + '" loading="lazy" referrerpolicy="no-referrer" />');
  });
  text = text.replace(/!\((https?:\/\/[^)\s]+|file:\/\/\/[^)\s]+|\/[^)\s]+)\)/g, function (_, href) {
    var src = href;
    if (href.indexOf("file:") === 0 || (href.charAt(0) === "/" && href.indexOf("//") !== 0)) {
      src = "/api/local-file?url=" + encodeURIComponent(href);
    }
    return park('<img class="msg-img" src="' + src + '" alt="" loading="lazy" referrerpolicy="no-referrer" />');
  });
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (_, label, href) {
    return park('<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + "</a>");
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  var lines = text.split("\n");
  var out = [];
  var i = 0;
  while (i < lines.length) {
    var trimmed = lines[i].trim();
    if (!trimmed) { i += 1; continue; }
    if (/^§§\d+§§$/.test(trimmed)) {
      out.push(trimmed);
      i += 1;
      continue;
    }
    if (/^\d+\.\s+/.test(lines[i])) {
      out.push("<ol>");
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        out.push("<li>" + lines[i].replace(/^\d+\.\s+/, "") + "</li>");
        i += 1;
      }
      out.push("</ol>");
      continue;
    }
    if (/^[-*]\s+/.test(lines[i])) {
      out.push("<ul>");
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        out.push("<li>" + lines[i].replace(/^[-*]\s+/, "") + "</li>");
        i += 1;
      }
      out.push("</ul>");
      continue;
    }
    var para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push("<p>" + para.join("<br>") + "</p>");
  }
  return out.join("").replace(/§§(\d+)§§/g, function (_, idx) {
    return slots[Number(idx)] || "";
  });
}
`
