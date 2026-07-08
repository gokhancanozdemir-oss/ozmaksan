/**
 * content/* Decap CMS dosyalarını yükler.
 * Build her zaman buradan beslenir (statik site + Netlify).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as defaults from "./data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(__dirname, "..", "content");

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  let raw = fs.readFileSync(file, "utf8");
  // PowerShell / Windows BOM
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

/** Decap bazen "/assets/..." yazar; build göreli "assets/..." bekler */
function normalizeAssetPath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/^\/+/, "").replace(/\\/g, "/");
}

function normalizeProduct(p) {
  if (!p || typeof p !== "object") return p;
  const out = { ...p };
  out.image = normalizeAssetPath(out.image);
  out.pdf = normalizeAssetPath(out.pdf);
  if (typeof out.specs === "string") {
    try {
      out.specs = JSON.parse(out.specs);
    } catch {
      delete out.specs;
    }
  }
  if (!Array.isArray(out.intro)) out.intro = out.intro ? [String(out.intro)] : [];
  if (!Array.isArray(out.features)) out.features = out.features ? [String(out.features)] : [];
  return out;
}

function normalizeNews(n) {
  if (!n || typeof n !== "object") return n;
  return {
    ...n,
    image: normalizeAssetPath(n.image),
    dateLabel: n.dateLabel || n.date || "",
  };
}

function loadFolderJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(path.join(dir, f)))
    .filter(Boolean);
}

const site = readJson(path.join(CONTENT, "site.json"));

const productDir = path.join(CONTENT, "products");
let products = loadFolderJson(productDir).map(normalizeProduct);
if (!products.length) products = (defaults.products || []).map(normalizeProduct);

const newsDir = path.join(CONTENT, "news");
let news = loadFolderJson(newsDir).map(normalizeNews);
// Eski tek dosya uyumluluğu
const newsArrayFile = path.join(CONTENT, "news.json");
if (!news.length && fs.existsSync(newsArrayFile)) {
  const arr = readJson(newsArrayFile);
  if (Array.isArray(arr)) news = arr.map(normalizeNews);
}
news.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

export const company = site?.company ?? defaults.company;
export const about = site?.about ?? defaults.about;
export const faq = site?.faq ?? defaults.faq;
export const references = site?.references ?? defaults.references;
export const certs = site?.certs ?? defaults.certs;
export const sectors = site?.sectors ?? defaults.sectors;
export const exportCountries = site?.exportCountries ?? defaults.exportCountries;
export const auxiliaries = site?.auxiliaries ?? defaults.auxiliaries;
export const nav = defaults.nav;
export const categories = defaults.categories;
export { products, news };
