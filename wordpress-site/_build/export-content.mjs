/**
 * data.mjs → content/* (Decap CMS kaynakları)
 * Sıfırlamak için: node _build/export-content.mjs
 *
 * Not: Mevcut content/products ve content/news dosyalarını silmez;
 * sadece site.json yazar ve data.mjs ürünlerini eksikse ekler.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as data from "./data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");

fs.mkdirSync(path.join(CONTENT, "products"), { recursive: true });
fs.mkdirSync(path.join(CONTENT, "news"), { recursive: true });

const site = {
  company: data.company,
  about: data.about,
  faq: data.faq,
  references: data.references,
  certs: data.certs,
  sectors: data.sectors,
  exportCountries: data.exportCountries,
  auxiliaries: data.auxiliaries,
};

fs.writeFileSync(path.join(CONTENT, "site.json"), JSON.stringify(site, null, 2) + "\n");

let productWrote = 0;
for (const p of data.products) {
  const dest = path.join(CONTENT, "products", `${p.slug}.json`);
  if (fs.existsSync(dest)) continue;
  fs.writeFileSync(dest, JSON.stringify(p, null, 2) + "\n");
  productWrote += 1;
}

console.log("site.json güncellendi");
console.log(`Ürün: ${productWrote} yeni dosya (mevcutlara dokunulmadı)`);
console.log("Haberler: content/news/*.json (fetch-haberler.mjs ile yönetilir)");
