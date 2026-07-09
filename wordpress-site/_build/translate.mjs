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
  ru_en: "en|ru",
  ar_en: "en|ar",
};

const DEEPL_LANG = { en: "EN", ru: "RU", ar: "AR" };
const TURKISH_CHARS = /[ğüşıöçĞÜŞİÖÇ]/;
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
  if (/^[A-Z0-9][A-Z0-9\-./ ]{2,}$/.test(t) && !TURKISH_CHARS.test(t)) return true;
  return false;
}

function isValidTranslation(source, translated, lang) {
  if (!translated || translated === source) return false;
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) return false;
  if (lang === "en" && TURKISH_CHARS.test(translated) && TURKISH_CHARS.test(source)) return false;
  if ((lang === "ru" || lang === "ar") && TURKISH_CHARS.test(translated)) return false;
  return true;
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

async function deeplTranslate(text, lang, sourceLang = "TR") {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  const target = DEEPL_LANG[lang];
  const base = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const res = await fetch(`${base}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], target_lang: target, source_lang: sourceLang }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.translations?.[0]?.text || null;
}

async function myMemoryTranslate(text, pair) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const out = data.responseData?.translatedText;
  if (!out || out === text) return null;
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
  return out;
}

async function googleTranslate(text, targetLang) {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=" +
      targetLang +
      "&dt=t&q=" +
      encodeURIComponent(text);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OzmaksanBuild/1.0)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = Array.isArray(data?.[0]) ? data[0].map((p) => p[0]).join("") : null;
    return out || null;
  } catch {
    return null;
  }
}

async function translateDirect(text, lang) {
  const pair = MYMEMORY[lang];
  return (
    (await deeplTranslate(text, lang)) ||
    (await myMemoryTranslate(text, pair)) ||
    (await googleTranslate(text, lang)) ||
    null
  );
}

async function translateViaEnglish(text, lang, enText) {
  const pivotPair = MYMEMORY[lang === "ru" ? "ru_en" : "ar_en"];
  return (
    (await deeplTranslate(enText, lang, "EN")) ||
    (await myMemoryTranslate(enText, pivotPair)) ||
    (await googleTranslate(enText, lang)) ||
    null
  );
}

async function translateOne(text, lang, enCache) {
  let out = await translateDirect(text, lang);
  if (isValidTranslation(text, out, lang)) return out;

  if ((lang === "ru" || lang === "ar") && enCache) {
    const en = enCache[hashKey(text)];
    if (en && en !== text) {
      out = await translateViaEnglish(text, lang, en);
      if (isValidTranslation(text, out, lang)) return out;
    }
  }

  return null;
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

function exportTextMaps(strings) {
  const all = new Set(strings);
  for (const tr of Object.values(UI_TR)) all.add(tr);

  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    const map = {};
    for (const text of all) {
      const hk = hashKey(text);
      const translated = cache[hk];
      if (isValidTranslation(text, translated, lang)) map[text] = translated;
    }
    fs.writeFileSync(
      path.join(I18N_DIR, `text.${lang}.json`),
      JSON.stringify(map, null, 2),
      "utf8"
    );
    console.log(`Translate: text.${lang}.json → ${Object.keys(map).length} entries`);
  }
}

function finalizeLocales(strings) {
  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    fs.writeFileSync(path.join(I18N_DIR, `ui.${lang}.json`), JSON.stringify(buildUi(lang, cache), null, 2), "utf8");
  }
  exportTextMaps(strings);
}

function purgeBad(cache, strings, lang) {
  let removed = 0;
  for (const text of strings) {
    const hk = hashKey(text);
    const v = cache[hk];
    if (v !== undefined && !isValidTranslation(text, v, lang)) {
      delete cache[hk];
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  const strings = collectStrings();
  console.log("Translate: unique strings:", strings.length);

  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    const removed = purgeBad(cache, strings, lang);
    if (removed) {
      saveCache(lang, cache);
      console.log(`Translate: ${lang} — ${removed} hatalı girdi silindi`);
    }
  }

  let pending = 0;
  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    pending += strings.filter((t) => !cache[hashKey(t)]).length;
  }

  if (pending === 0) {
    console.log("Translate: önbellek güncel.");
    finalizeLocales(strings);
    return;
  }

  console.log("Translate: çevrilecek metin:", pending);
  const delay = process.env.DEEPL_API_KEY ? 120 : 250;

  for (const lang of TARGET_LOCALES) {
    const cache = loadCache(lang);
    const enCache = lang === "ru" || lang === "ar" ? loadCache("en") : null;
    let added = 0;
    let failed = 0;
    for (const text of strings) {
      const hk = hashKey(text);
      if (cache[hk]) continue;
      const translated = await translateOne(text, lang, enCache);
      if (translated) {
        cache[hk] = translated;
        added += 1;
      } else {
        failed += 1;
      }
      if ((added + failed) % 5 === 0) {
        process.stdout.write(`  ${lang}: ${added} ok, ${failed} skip…\r`);
      }
      await sleep(delay);
    }
    saveCache(lang, cache);
    console.log(`\n${lang}: ${Object.keys(cache).length} cache (+${added} new, ${failed} failed)`);
  }

  finalizeLocales(strings);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
