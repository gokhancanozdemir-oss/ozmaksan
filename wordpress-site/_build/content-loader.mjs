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

/**
 * Decap list alanları string veya {name: string} nesnesi olabilir.
 * Örn. phones: ["a"] veya [{phone:"a"}]
 */
function unwrapList(arr, preferredKeys = []) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (item == null) return "";
      if (typeof item === "string" || typeof item === "number") return String(item);
      if (typeof item === "object") {
        for (const k of preferredKeys) {
          if (item[k] != null && String(item[k]).trim()) return String(item[k]);
        }
        const vals = Object.values(item).filter((v) => typeof v === "string" || typeof v === "number");
        return vals.length ? String(vals[0]) : "";
      }
      return "";
    })
    .filter((s) => s.trim());
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
  out.intro = unwrapList(out.intro, ["paragraph", "p", "text"]);
  out.features = unwrapList(out.features, ["feature", "f", "text"]);
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

function normalizeSite(site) {
  if (!site) return null;
  const company = { ...(site.company || {}) };
  if (Array.isArray(company.phones)) {
    company.phones = unwrapList(company.phones, ["phone", "value", "label"]);
  }
  const about = { ...(site.about || {}) };
  if (Array.isArray(about.intro)) {
    about.intro = unwrapList(about.intro, ["paragraph", "p", "text"]);
  }
  return {
    ...site,
    company,
    about,
    references: unwrapList(site.references, ["company", "ref", "name", "firma"]),
    sectors: unwrapList(site.sectors, ["sector", "name"]),
    exportCountries: unwrapList(site.exportCountries, ["country", "name", "ulke"]),
    auxiliaries: unwrapList(site.auxiliaries, ["item", "name"]),
    faq: Array.isArray(site.faq) ? site.faq : [],
    certs: Array.isArray(site.certs) ? site.certs : [],
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

const site = normalizeSite(readJson(path.join(CONTENT, "site.json")));

const productDir = path.join(CONTENT, "products");
let products = loadFolderJson(productDir).map(normalizeProduct);
if (!products.length) products = (defaults.products || []).map(normalizeProduct);

const newsDir = path.join(CONTENT, "news");
let news = loadFolderJson(newsDir).map(normalizeNews);
const newsArrayFile = path.join(CONTENT, "news.json");
if (!news.length && fs.existsSync(newsArrayFile)) {
  const arr = readJson(newsArrayFile);
  if (Array.isArray(arr)) news = arr.map(normalizeNews);
}
news.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

export const company = site?.company ?? defaults.company;
export const about = site?.about ?? defaults.about;
export const faq = site?.faq ?? defaults.faq;
export const references = site?.references?.length ? site.references : defaults.references;
export const certs = site?.certs?.length ? site.certs : defaults.certs;
export const sectors = site?.sectors?.length ? site.sectors : defaults.sectors;
export const exportCountries = site?.exportCountries?.length ? site.exportCountries : defaults.exportCountries;
export const auxiliaries = site?.auxiliaries?.length ? site.auxiliaries : defaults.auxiliaries;
export const nav = defaults.nav;
export const categories = defaults.categories;
export { products, news };
