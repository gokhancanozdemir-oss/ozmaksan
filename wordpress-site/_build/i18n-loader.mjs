/**
 * Türkçe kaynak + çeviri önbelleği → locale verisi
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as tr from "./content-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const I18N_DIR = path.join(ROOT, "content", "i18n");

function hashKey(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex").slice(0, 16);
}

function loadUi(locale) {
  const manual = path.join(__dirname, "i18n", `ui.${locale}.json`);
  if (fs.existsSync(manual)) return JSON.parse(fs.readFileSync(manual, "utf8"));
  const translated = path.join(I18N_DIR, `ui.${locale}.json`);
  if (fs.existsSync(translated)) return JSON.parse(fs.readFileSync(translated, "utf8"));
  return JSON.parse(fs.readFileSync(path.join(__dirname, "i18n", "ui.tr.json"), "utf8"));
}

function loadCache(locale) {
  if (locale === "tr") return null;
  const file = path.join(I18N_DIR, `cache.${locale}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function trText(cache, text) {
  if (!cache || !text) return text;
  const hk = hashKey(String(text));
  return cache[hk] || text;
}

function trList(cache, arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((x) => trText(cache, x));
}

function trNav(cache, ui) {
  const map = {
    index: ui["nav.home"],
    kurumsal: ui["nav.corporate"],
    urunler: ui["nav.products"],
    haberler: ui["nav.news"],
    referanslar: ui["nav.references"],
    sertifikalar: ui["nav.certs"],
    iletisim: ui["nav.contact"],
  };
  return tr.nav.map((n) => ({ ...n, label: map[n.href] || trText(cache, n.label) }));
}

function trCategories(cache, ui) {
  const keys = ["buhar", "kizginsu", "sicaksu", "kizginyag", "enerji"];
  return tr.categories.map((c, i) => ({
    ...c,
    label: ui[`cat.${keys[i]}`] || trText(cache, c.label),
    desc: ui[`cat.${keys[i]}Desc`] || trText(cache, c.desc),
  }));
}

function trProducts(cache) {
  return tr.products.map((p) => {
    const out = { ...p };
    out.tagline = trText(cache, p.tagline);
    out.intro = trList(cache, p.intro);
    out.features = trList(cache, p.features);
    out.usage = trList(cache, p.usage);
    if (p.fuel) out.fuel = trText(cache, p.fuel);
    if (p.type) out.type = trText(cache, p.type);
    if (p.capacity) out.capacity = trText(cache, p.capacity);
    if (p.pressure) out.pressure = trText(cache, p.pressure);
    if (p.efficiency) out.efficiency = trText(cache, p.efficiency);
    if (p.specs) {
      out.specs = {
        ...p.specs,
        columns: trList(cache, p.specs.columns),
      };
    }
    return out;
  });
}

function trNews(cache) {
  return tr.news.map((n) => ({
    ...n,
    title: trText(cache, n.title),
    excerpt: trText(cache, n.excerpt),
    body: trText(cache, n.body),
    dateLabel: trText(cache, n.dateLabel || n.date),
  }));
}

function trAbout(cache) {
  return {
    ...tr.about,
    intro: trList(cache, tr.about.intro),
    stats: (tr.about.stats || []).map((s) => ({ ...s, label: trText(cache, s.label) })),
  };
}

function trFaq(cache) {
  return (tr.faq || []).map((f) => ({ q: trText(cache, f.q), a: trText(cache, f.a) }));
}

function trCerts(cache) {
  return (tr.certs || []).map((c) => ({ ...c, note: trText(cache, c.note) }));
}

export function loadLocalizedData(locale = "tr") {
  const ui = loadUi(locale);
  const cache = loadCache(locale);

  return {
    locale,
    ui,
    company: tr.company,
    nav: locale === "tr" ? tr.nav : trNav(cache, ui),
    categories: locale === "tr" ? tr.categories : trCategories(cache, ui),
    products: locale === "tr" ? tr.products : trProducts(cache),
    news: locale === "tr" ? tr.news : trNews(cache),
    about: locale === "tr" ? tr.about : trAbout(cache),
    faq: locale === "tr" ? tr.faq : trFaq(cache),
    references: tr.references,
    certs: locale === "tr" ? tr.certs : trCerts(cache),
    sectors: locale === "tr" ? tr.sectors : trList(cache, tr.sectors),
    exportCountries: locale === "tr" ? tr.exportCountries : trList(cache, tr.exportCountries),
    auxiliaries: locale === "tr" ? tr.auxiliaries : trList(cache, tr.auxiliaries),
    t: (key, vars = {}) => {
      let s = ui[key] || key;
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    trText: (text) => (locale === "tr" ? text : trText(cache, text)),
  };
}
