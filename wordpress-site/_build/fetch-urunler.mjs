/**
 * ozmaksan.com.tr → eksik ürünleri content/products/*.json olarak ekler.
 *
 * Çalıştır:
 *   node _build/fetch-urunler.mjs
 *
 * Notlar:
 * - Mevcut ürün JSON dosyalarına dokunmaz.
 * - Ürün görseli olarak sayfanın og:image'ını indirir (varsa).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "content", "products");
const ASSETS_PRODUCTS = path.join(ROOT, "assets", "products");

const BASE = "https://ozmaksan.com.tr";

const GROUP_URLS = [
  // Buhar & Kızgın su
  `${BASE}/urun-gruplarimiz/1001/buhar-kazanlar%C4%B1-k%C4%B1zg%C4%B1n-su-kazanlar%C4%B1.aspx`,
  // Sıvı/Gaz yakıtlı sıcak su
  `${BASE}/urun-gruplarimiz/1009/s%C4%B1v%C4%B1-gaz-yak%C4%B1tl%C4%B1-s%C4%B1cak-su-kazanlar%C4%B1.aspx`,
  // Katı yakıtlı sıcak su
  `${BASE}/urun-gruplarimiz/1010/kat%C4%B1-yak%C4%B1tl%C4%B1-s%C4%B1cak-su-kazanlar%C4%B1.aspx`,
  // Kızgın yağ
  `${BASE}/urun-gruplarimiz/1003/k%C4%B1zg%C4%B1n-ya%C4%9F-kazanlar%C4%B1.aspx`,
  // Enerji geri kazanım
  `${BASE}/urun-gruplarimiz/1008/enerji-geri-kazan%C4%B1m-ekipmanlar%C4%B1.aspx`,
  // Depolama tankları & basınçlı kaplar
  `${BASE}/urun-gruplarimiz/1007/depolama-tanklar%C4%B1-ve-bas%C4%B1n%C3%A7l%C4%B1-kaplar.aspx`,
  // Ön ocaklı buhar sistemleri
  `${BASE}/urun-gruplarimiz/1004/%C3%B6n-ocakl%C4%B1-buhar-sistemleri.aspx`,
];

// Grup sayfası hatalı olabiliyor; direkt ürün linki ekle
const EXTRA_PRODUCT_URLS = [
  `${BASE}/urunler/1013/mob%C4%B1l-buhar-odalar%C4%B1/1032/mob%C4%B1l-buhar-odalar%C4%B1.aspx`,
];

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function stripHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ouml;/gi, "ö")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function guessCategoryFromUrl(url) {
  const u = url.toLowerCase();
  if (u.includes("/1003/") || u.includes("kizgin-ya")) return "kizginyag";
  if (u.includes("/1008/") || u.includes("enerji-geri-kazan")) return "enerji";
  if (u.includes("/1007/") || u.includes("depolama-tank")) return "enerji";
  if (u.includes("/1004/") || u.includes("on-ocak")) return "buhar";
  if (u.includes("/1013/") || u.includes("mobil")) return "buhar";
  if (u.includes("/1001/") || u.includes("buhar-kazan")) return "buhar";
  if (u.includes("/1009/") || u.includes("sicak-su-kazan")) return "sicaksu";
  if (u.includes("/1010/") || u.includes("kati-yakit")) return "sicaksu";
  return "enerji";
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function extractProductUrlsFromGroup(html) {
  const urls = new Set();
  // absolute links (with or without www)
  for (const re of [
    /https:\/\/(?:www\.)?ozmaksan\.com\.tr\/urunler\/[^\s"'<>]+/g,
  ]) {
    let m;
    while ((m = re.exec(html))) urls.add(m[0].trim());
  }
  // relative links
  {
    const re = /href=['"](?:(?:https?:\/\/(?:www\.)?ozmaksan\.com\.tr))?(\/urunler\/[^'"]+?\.aspx)['"]/g;
    let m;
    while ((m = re.exec(html))) urls.add(`${BASE}${m[1]}`);
  }
  return [...urls];
}

function parseOgImage(html) {
  const m = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function parseTitle(html) {
  // Ürün sayfalarında kategori başlığı da var; ürün adı productDescription içindeki h2'dir.
  const m =
    html.match(/<div class=["']productDescription["'][\s\S]*?<h2>\s*([\s\S]*?)\s*<\/h2>/i) ||
    html.match(/<h2[^>]*class=["'][^"']*pro-title-desc[^"']*["'][^>]*>\s*([\s\S]*?)\s*<\/h2>/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
  if (!m) return "";
  const t = stripHtml(m[1]);
  if (t.toLowerCase().includes("özmaksan") && t.includes("|")) return t.split("|")[0].trim();
  return t;
}

function parseTagline(html) {
  // Ürün sayfasında productDescription'da başlığın hemen altında kısa açıklama var.
  const m = html.match(/<div class=["']productDescription["'][\s\S]*?<h2>[\s\S]*?<\/h2>([\s\S]*?)<\/div>/i);
  if (m) {
    const txt = stripHtml(m[1]);
    const first = txt.split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
    if (first) return first.slice(0, 180);
  }
  const m2 = html.match(/<div id=["']urunaciklamasi["'][\s\S]*?>([\s\S]*?)<\/div>/i);
  if (!m2) return "";
  const txt2 = stripHtml(m2[1]);
  const first2 = txt2.split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
  return first2.slice(0, 180);
}

function parseBodyParagraphs(html) {
  const m =
    html.match(/<div id=["']urunaciklamasi["'][\s\S]*?>([\s\S]*?)<\/div>/i) ||
    html.match(/<div class=["']editor["'][\s\S]*?>([\s\S]*?)<\/div>/i);
  if (!m) return [];
  const txt = stripHtml(m[1]);
  const parts = txt
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 20)
    .slice(0, 12);
  return parts;
}

async function downloadImage(url, slug) {
  if (!url) return "";
  const clean = url.startsWith("http") ? url : `${BASE}${url}`;
  const res = await fetch(clean);
  if (!res.ok) return "";
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(clean.split("?")[0]).toLowerCase() || ".jpg";
  const filename = `${slug}${ext === ".jpeg" ? ".jpg" : ext}`;
  fs.mkdirSync(ASSETS_PRODUCTS, { recursive: true });
  const out = path.join(ASSETS_PRODUCTS, filename);
  fs.writeFileSync(out, buf);
  return `assets/products/${filename}`;
}

function existingProductSlugs() {
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  return new Set(
    fs.readdirSync(PRODUCTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.basename(f, ".json")),
  );
}

async function main() {
  const existing = existingProductSlugs();
  const productUrls = new Set(EXTRA_PRODUCT_URLS);

  for (const g of GROUP_URLS) {
    const html = await fetchText(g);
    for (const u of extractProductUrlsFromGroup(html)) productUrls.add(u);
  }

  const urls = [...productUrls].sort();
  let added = 0;

  for (const url of urls) {
    const html = await fetchText(url);
    const name = parseTitle(html) || "Ürün";
    const urlSeg = (() => {
      try {
        const last = decodeURIComponent(url.split("/").pop() || "");
        return last.toLowerCase().endsWith(".aspx") ? last.slice(0, -5) : last;
      } catch {
        return "";
      }
    })();
    const rawSlug = slugify(urlSeg || name);
    const slug = existing.has(rawSlug) ? `${rawSlug}-${existing.size + 1}` : rawSlug;
    if (existing.has(slug)) continue;

    const category = guessCategoryFromUrl(url);
    const tagline = parseTagline(html) || "Detaylar için bize ulaşın.";
    const intro = parseBodyParagraphs(html);
    const ogImage = parseOgImage(html);
    const image = await downloadImage(ogImage, slug);

    const product = {
      slug,
      name,
      series: "",
      category,
      tagline,
      fuel: "—",
      type: "—",
      capacity: "Projeye özel",
      pressure: "—",
      efficiency: "—",
      image: image || "assets/products/factory-boilers.jpg",
      pdf: "",
      intro: intro.length ? intro.slice(0, 3) : [tagline],
      features: [],
      sourceUrl: url,
    };

    fs.writeFileSync(path.join(PRODUCTS_DIR, `${slug}.json`), JSON.stringify(product, null, 2) + "\n");
    existing.add(slug);
    added += 1;
  }

  console.log(`Toplam link: ${urls.length} | Yeni eklenen: ${added} | Ürün sayısı: ${existing.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

