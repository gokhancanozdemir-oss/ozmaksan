/**
 * Hafif markdown: **kalın**, *italik*, [metin](url)
 * CMS markdown widget çıktısını güvenli HTML'e çevirir.
 */
export function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function mdInline(s) {
  let t = escHtml(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  t = t.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return t;
}

/** Boş satırla ayrılmış paragraflar → <p>…</p> */
export function mdBlocks(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return "";
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${mdInline(p.replace(/\n/g, " "))}</p>`)
    .join("\n");
}
