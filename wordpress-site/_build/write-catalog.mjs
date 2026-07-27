/**
 * content/catalog.json — CMS deploy olmadan liste sayfalarının canlı besini
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");

function loadFolder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "catalog.json")
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeAsset(p) {
  if (!p) return "";
  return String(p).replace(/^\/+/, "");
}

const products = loadFolder(path.join(CONTENT, "products")).map((p) => ({
  slug: p.slug,
  name: p.name,
  tagline: p.tagline || "",
  image: normalizeAsset(p.image),
  category: p.category || "",
  series: p.series || "",
  fuel: p.fuel || "",
  capacity: p.capacity || "",
  pdf: normalizeAsset(p.pdf),
}));

const news = loadFolder(path.join(CONTENT, "news")).map((n) => ({
  slug: n.slug,
  title: n.title,
  excerpt: n.excerpt || "",
  date: n.date || "",
  dateLabel: n.dateLabel || "",
  image: normalizeAsset(n.image),
}));

products.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "tr"));
news.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

const catalog = {
  updatedAt: new Date().toISOString(),
  products,
  news,
};

const out = path.join(CONTENT, "catalog.json");
fs.writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`[catalog] products=${products.length} news=${news.length} → content/catalog.json`);
