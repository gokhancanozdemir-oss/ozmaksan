/**
 * Türkçe içeriği EN / RU / AR'ye çevirir, önbelleğe yazar.
 * Netlify: DEEPL_API_KEY ortam değişkeni (önerilen).
 * Yoksa MyMemory (günlük limit) kullanılır; önbellek git'te tutulur.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { TARGET_LOCALES } from "./locales.mjs";
import * as trData from "./content-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const I18N_DIR = path.join(ROOT, "content", "i18n");
const UI_TR = JSON.parse(fs.readFileSync(path.join(__dirname, "i18n", "ui.tr.json"), "utf8"));

const MYMEMORY = {
  en: "tr|en",
  ru: "tr|ru",
  ar: "tr|ar",
};

const DEEPL_LANG = { en: "EN", ru: "RU", ar: "AR" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hashKey(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex").slice(0, 16);
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&uuml;/g, "ü").replace(/&Uuml;/g, "Ü")
    .replace(/&ouml;/g, "ö").replace(/&Ouml;/g, "Ö")
    .replace(/&ccedil;/g, "ç").replace(/&Ccedil;/g, "Ç")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function shouldSkip(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 2) return true;
  if (/^[\d\s+().\-–—%°/,]+$/.test(t)) return true;
  if (/^\+?\d/.test(t) && t.includes("@")) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^[A-Z0-9][A-Z0-9\-./ ]{2,}$/.test(t) && !/[ğüşıöçĞÜŞİÖÇ]/.test(t)) return true;
  return false;
}

function collectStrings() {
  const set = new Set();
  const add = (v) => {
    const d = decodeEntities(v);
    if (!shouldSkip(d)) set.add(d);
  };

  for (const v of Object.values(UI_TR)) add(v);

  for (const n of trData.nav) add(n.label);
  for (const c of trData.categories) {
    add(c.label);
    add(c.desc);
  }
  for (const p of trData.about?.intro || []) add(p);
  for (const s of trData.about?.stats || []) add(s.label);
  for (const f of trData.faq || []) {
    add(f.q);
    add(f.a);
  }
  for (const c of trData.certs || []) add(c.note);
  for (const s of trData.sectors || []) add(s);
  for (const c of trData.exportCountries || []) add(c);
  for (const a of trData.auxiliaries || []) add(a);

  for (const p of trData.products) {
    add(p.tagline);
    for (const t of p.intro || []) add(t);
    for (const f of p.features || []) add(f);
    for (const u of p.usage || []) add(u);
    if (p.specs?.columns) for (const col of p.specs.columns) add(col);
    if (p.fuel && p.fuel !== "—") add(p.fuel);
    if (p.type && p.type !== "—") add(p.type);
    if (p.capacity && !/^projeye/i.test(p.capacity)) add(p.capacity);
    if (p.pressure && p.pressure !== "—") add(p.pressure);
    if (p.efficiency && p.efficiency !== "—") add(p.efficiency);
  }

  for (const n of trData.news) {
    add(n.title);
    add(n.excerpt);
    add(n.body);
    if (n.dateLabel) add(n.dateLabel);
  }

  return [...set];
}

async function deeplTranslate(text, lang) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  const target = DEEPL_LANG[lang];
  const base = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const res = await fetch(`${base}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], target_lang: target, source_lang: "TR" }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.translations?.[0]?.text || null;
}

async function myMemoryTranslate(text, lang) {
  const pair = MYMEMORY[lang];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const out = data.responseData?.translatedText;
  if (!out || out === text) return null;
  if (/MYMEMORY WARNING/i.test(out)) return null;
  return out;
}

async function translateOne(text, lang) {
  return (await deeplTranslate(text, lang)) || (await myMemoryTranslate(text, lang)) || text;
}

function loadCache(lang) {
  const file = path.join(I18N_DIR, `cache.${lang}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveCache(lang, cache) {
  fs.mkdirSync(I18N_DIR, { recursive: true });
  fs.writeFileSync(path.join(I18N_DIR, `cache.${lang}.json`), JSON.stringify(cache, null, 2), "utf8");
}

function buildUi(lang, cache) {
  const out = {};
  for (const [key, tr] of Object.entries(UI_TR)) {
    out[key] = cache[hashKey(tr)] || tr;
  }
  return out;
}

async function main() {
  const strings = collectStrings();
  console.log("Translate: unique strings:", strings.length);

  let pending = 0;
  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    pending += strings.filter((t) => !cache[hashKey(t)]).length;
  }
  if (pending === 0) {
    console.log("Translate: önbellek güncel, API çağrısı yok.");
    for (const lang of TARGET_LOCALES) {
      const cache = loadCache(lang);
      fs.writeFileSync(path.join(I18N_DIR, `ui.${lang}.json`), JSON.stringify(buildUi(lang, cache), null, 2), "utf8");
    }
    return;
  }
  console.log("Translate: çevrilecek yeni metin:", pending);

  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    let added = 0;
    for (const text of strings) {
      const hk = hashKey(text);
      if (cache[hk]) continue;
      const translated = await translateOne(text, lang);
      cache[hk] = translated;
      added += 1;
      if (added % 5 === 0) process.stdout.write(`  ${lang}: ${added} new…\r`);
      await sleep(process.env.DEEPL_API_KEY ? 120 : 350);
    }
    saveCache(lang, cache);
    fs.writeFileSync(path.join(I18N_DIR, `ui.${lang}.json`), JSON.stringify(buildUi(lang, cache), null, 2), "utf8");
    console.log(`\n${lang}: cache ${Object.keys(cache).length} entries (+${added} new)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
