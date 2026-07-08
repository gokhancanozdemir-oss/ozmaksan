/**
 * ozmaksan.com.tr/haberler.aspx → content/news.json + assets/news/*
 * Çalıştır: node _build/fetch-haberler.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NEWS_DIR = path.join(ROOT, "assets", "news");
const BASE = "https://ozmaksan.com.tr";

const MONTHS = {
  Oca: "01", Şub: "02", Sub: "02", Mar: "03", Nis: "04", May: "05", Haz: "06",
  Tem: "07", Ağu: "08", Agu: "08", Eyl: "09", Eki: "10", Kas: "11", Ara: "12",
};

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function parseDate(raw) {
  const clean = raw.replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  const m = clean.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return "2016-07-27";
  const mon = MONTHS[m[2]] || "01";
  return `${m[3]}-${mon}-${m[1].padStart(2, "0")}`;
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ouml;/gi, "ö")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseListing(html) {
  const items = [];
  const re = /<div class="news-page">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    const block = m[1];
    const img = block.match(/href='(\/images\/haberler\/[^']+)'/);
    const title = block.match(/<h2>([\s\S]*?)<\/h2>/);
    const date = block.match(/<div class="news-date">[\s\S]*?<h4>([\s\S]*?)<\/h4>/);
    const excerpt = block.match(/<div class="news-text">([\s\S]*?)<\/div>/);
    const link = block.match(/href='(\/detaylar\/1\/haberler\/[^']+)'/);
    if (!title || !link) continue;
    items.push({
      title: stripHtml(title[1]),
      dateRaw: date ? stripHtml(date[1]) : "",
      excerpt: excerpt ? stripHtml(excerpt[1]) : "",
      imageUrl: img ? img[1] : "",
      detailPath: link[1],
    });
  }
  return items;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function downloadImage(relPath, destName) {
  const url = relPath.startsWith("http") ? relPath : BASE + relPath;
  const res = await fetch(url);
  if (!res.ok) return "";
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(relPath.split("?")[0]) || ".jpg";
  const file = destName + ext.toLowerCase().replace(".thumb.jpg", ".jpg").replace(".thumb.jpeg", ".jpg");
  const out = path.join(NEWS_DIR, path.basename(file));
  fs.writeFileSync(out, buf);
  return `assets/news/${path.basename(out)}`;
}

function parseDetailBody(html) {
  const m = html.match(/<div class="news-detail-text">([\s\S]*?)<\/div>/i)
    || html.match(/<div class="news-text[^"]*">([\s\S]*?)<\/div>/i)
    || html.match(/<div class="col-content[^"]*">[\s\S]*?<div class="news-text">([\s\S]*?)<\/div>/i);
  if (!m) return "";
  const text = stripHtml(m[1]);
  return text.length > 30 ? text : "";
}

async function main() {
  fs.mkdirSync(NEWS_DIR, { recursive: true });
  const listHtml = fs.existsSync(path.join(__dirname, "_haberler.html"))
    ? fs.readFileSync(path.join(__dirname, "_haberler.html"), "utf8")
    : await fetchText(`${BASE}/haberler.aspx`);

  const listing = parseListing(listHtml);
  const seen = new Set();
  const news = [];

  for (const item of listing) {
    const detailUrl = BASE + item.detailPath;
    let body = item.excerpt;
    try {
      const detailHtml = await fetchText(detailUrl);
      const full = parseDetailBody(detailHtml);
      if (full) body = full;
    } catch {
      /* excerpt yeterli */
    }

    let slug = slugify(item.title);
    if (seen.has(slug)) slug += `-${news.length + 1}`;
    seen.add(slug);

    let image = "";
    if (item.imageUrl && !item.imageUrl.includes(".thumb.")) {
      try {
        image = await downloadImage(item.imageUrl, slug);
      } catch { /* */ }
    } else if (item.imageUrl) {
      const fullImg = item.imageUrl.replace(/\.thumb\.(jpg|JPG|jpeg)/i, ".$1");
      try {
        image = await downloadImage(fullImg, slug);
      } catch {
        try {
          image = await downloadImage(item.imageUrl, slug + "-thumb");
        } catch { /* */ }
      }
    }

    news.push({
      slug,
      title: decodeEntities(item.title.trim()),
      date: parseDate(item.dateRaw),
      dateLabel: decodeEntities(item.dateRaw.replace(/&nbsp;/gi, " ")),
      excerpt: decodeEntities(item.excerpt.trim()),
      body: decodeEntities(body.trim() || item.excerpt.trim()),
      image,
      sourceUrl: detailUrl,
    });
  }

  // Sidebar'daki ek haberler (listede kart yok)
  const extra = [
    {
      detailPath: "/detaylar/1/haberler/1008/enerji-geri-kazanım-ekipmanları.aspx",
      title: "Enerji Geri Kazanım Ekipmanları",
      date: "2016-07-27",
      dateLabel: "27 Tem 2016",
    },
    {
      detailPath: "/detaylar/1/haberler/1009/sektör-günü-buluşması.aspx",
      title: "Sektör Günü Buluşması",
      date: "2016-07-27",
      dateLabel: "27 Tem 2016",
    },
    {
      detailPath: "/detaylar/1/haberler/1010/gaziantep-üniversitesi-makine-mühendisliği-bölümü-öğrencileri.aspx",
      title: "Gaziantep Üniversitesi Makine Mühendisliği Bölümü Öğrencileri",
      date: "2016-07-27",
      dateLabel: "27 Tem 2016",
    },
  ];

  for (const ex of extra) {
    const slug = slugify(ex.title);
    if (seen.has(slug)) continue;
    seen.add(slug);
    let body = "";
    let image = "";
    try {
      const html = await fetchText(BASE + ex.detailPath);
      body = parseDetailBody(html) || ex.title;
      const img = html.match(/\/images\/haberler\/[^"']+\.(?:jpg|JPG|jpeg)/);
      if (img) image = await downloadImage(img[0], slug);
    } catch {
      body = ex.title;
    }
    news.push({
      slug,
      title: ex.title,
      date: ex.date,
      dateLabel: ex.dateLabel,
      excerpt: body.slice(0, 180),
      body,
      image,
      sourceUrl: BASE + ex.detailPath,
    });
  }

  news.sort((a, b) => b.date.localeCompare(a.date));
  const newsDir = path.join(ROOT, "content", "news");
  fs.mkdirSync(newsDir, { recursive: true });

  // Eski tek dosya formatını kaldır
  const legacy = path.join(ROOT, "content", "news.json");
  if (fs.existsSync(legacy)) fs.unlinkSync(legacy);

  for (const n of news) {
    fs.writeFileSync(path.join(newsDir, `${n.slug}.json`), JSON.stringify(n, null, 2) + "\n");
  }
  console.log(`Haberler: ${news.length} → ${newsDir}/*.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
