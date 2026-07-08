import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  company, nav, categories, products, auxiliaries, certs, sectors,
  references, faq, about, exportCountries, news,
} from "./content-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const exportSvg = fs.readFileSync(path.join(ROOT, "export-map-generated.svg"), "utf8")
  .replace(/<\?xml[^>]*\?>\s*/i, "");

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Statik site + Netlify: göreli varlık yolu (Decap "/assets/..." yazsa da normalize edilir) */
const asset = (_mode, p) => String(p || "").replace(/^\/+/, "");
function link(_mode, slug) {
  return slug === "index" ? "index.html" : `${slug}.html`;
}
const productSlug = (p) => `urun-${p.slug}`;
const newsSlug = (n) => `haber-${n.slug}`;

const MONTH_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
function formatNewsDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTH_TR[Number(m) - 1]} ${y}`;
}

const ICON = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 002.5 6 2.5 2.5 0 005 8.5 2.5 2.5 0 007.5 6 2.5 2.5 0 004.98 3.5zM3 9h4v12H3zM10 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 00-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 001.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 001.8-1.8C23 15.2 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>',
  fax: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 9V2h12v7M6 18h12v4H6zM6 14h12M4 9h16a2 2 0 012 2v5a2 2 0 01-2 2h-1"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>',
};

function sectionHead(label, titleHtml, desc = "", center = true) {
  return `<div class="section-head ${center ? "center" : ""} reveal">
    <span class="section-label">${esc(label)}</span>
    <h2 class="section-title">${titleHtml}</h2>
    ${desc ? `<p class="section-desc">${esc(desc)}</p>` : ""}
  </div>`;
}

/* ---------- chrome ---------- */
function header(mode, active) {
  const links = nav
    .map((n) => `<a href="${link(mode, n.href)}"${n.href === active ? ' class="active"' : ""}>${esc(n.label)}</a>`)
    .join("\n        ");
  return `<header class="site-header" id="top">
    <div class="header-inner">
      <a href="${link(mode, "index")}" class="logo">
        <img src="${asset(mode, "ozmaksan-logo.png")}" alt="${esc(company.brand)} — ${esc(company.slogan)}" width="240" height="143" />
      </a>
      <nav class="main-nav" aria-label="Ana menü">
        ${links}
      </nav>
      <a href="${link(mode, "iletisim")}" class="btn btn-primary btn-sm">Teklif Al</a>
      <button class="menu-toggle" aria-label="Menü" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </header>
  <div class="nav-overlay" aria-hidden="true"></div>`;
}

function footer(mode) {
  const s = company.social;
  const social = `<div class="footer-social">
        <a href="${s.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
        <a href="${s.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a>
        <a href="${s.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>
        <a href="${s.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${ICON.youtube}</a>
      </div>`;
  const catLinks = categories
    .map((c) => `<li><a href="${link(mode, "urunler")}#${c.key}">${esc(c.label)}</a></li>`)
    .join("\n          ");
  const quick = nav.slice(1)
    .map((n) => `<li><a href="${link(mode, n.href)}">${esc(n.label)}</a></li>`)
    .join("\n          ");
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <img src="${asset(mode, "ozmaksan-logo.png")}" alt="${esc(company.brand)}" width="170" height="68" style="filter:brightness(0) invert(1)" />
        <p>${company.founded}'dan beri Gaziantep'te yüksek basınçlı buhar, kızgın su, kızgın yağ kazanları ve enerji geri kazanım ekipmanları üretiyoruz.</p>
        ${social}
      </div>
      <div>
        <h4>Kurumsal</h4>
        <ul>${quick}</ul>
      </div>
      <div>
        <h4>Ürün Grupları</h4>
        <ul>${catLinks}</ul>
      </div>
      <div>
        <h4>İletişim</h4>
        <ul class="footer-contact">
          <li>${ICON.pin}<span>${esc(company.address)}</span></li>
          <li>${ICON.phone}<a href="tel:${company.phones[0].replace(/\s/g, "")}">${esc(company.phones[0])}</a></li>
          <li>${ICON.mail}<a href="mailto:${company.email}">${esc(company.email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>© ${new Date().getFullYear()} ${esc(company.legalName)} — Tüm hakları saklıdır.</p>
        <p>${esc(company.slogan)} · <span>${esc(company.sloganEn)}</span></p>
      </div>
    </div>
  </footer>`;
}

function bodyInner(mode, active, main) {
  return `<div class="cursor-dot" aria-hidden="true"></div>
  <div class="cursor-ring" aria-hidden="true"></div>
  ${header(mode, active)}
  <main>
${main}
  </main>
  ${footer(mode)}`;
}

function productCard(mode, p) {
  const chips = [p.fuel, p.capacity].filter((x) => x && x !== "—").slice(0, 2)
    .map((c) => `<span>${esc(c)}</span>`).join("");
  return `<article class="product-card reveal">
        <a class="product-card-media" href="${link(mode, productSlug(p))}">
          <img src="${asset(mode, p.image)}" alt="${esc(p.name)}" loading="lazy" />
        </a>
        <div class="product-card-body">
          <span class="product-series">${esc(p.series)}</span>
          <h3><a href="${link(mode, productSlug(p))}">${esc(p.name)}</a></h3>
          <p>${esc(p.tagline)}</p>
          <div class="product-chips">${chips}</div>
          <div class="product-card-actions">
            <a href="${link(mode, productSlug(p))}" class="product-link">İncele ${ICON.arrow}</a>
            ${p.pdf ? `<a href="${asset(mode, p.pdf)}" target="_blank" rel="noopener" class="product-pdf">Katalog (PDF)</a>` : ""}
          </div>
        </div>
      </article>`;
}

function newsCard(mode, n, featured = false) {
  const img = n.image
    ? `<img src="${asset(mode, n.image)}" alt="${esc(n.title)}" loading="lazy" />`
    : `<div class="news-card-placeholder">${ICON.web}</div>`;
  return `<article class="news-card reveal${featured ? " news-card-featured" : ""}">
        <a class="news-card-media" href="${link(mode, newsSlug(n))}">${img}</a>
        <div class="news-card-body">
          <time class="news-date" datetime="${esc(n.date)}">${esc(n.dateLabel || formatNewsDate(n.date))}</time>
          <h3><a href="${link(mode, newsSlug(n))}">${esc(n.title)}</a></h3>
          <p>${esc(n.excerpt)}</p>
          <a href="${link(mode, newsSlug(n))}" class="news-link">Devamını Oku ${ICON.arrow}</a>
        </div>
      </article>`;
}

function specTable(p) {
  if (!p.specs) return "";
  const head = p.specs.columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const rows = p.specs.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n            ");
  return `<div class="spec-table-wrap reveal">
        <h3 class="block-title">Model & Kapasite Tablosu</h3>
        <table class="spec-table">
          <thead><tr>${head}</tr></thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p class="spec-note">* Tabloda örnek modeller gösterilmiştir. Tam kapasite ve boyut listesi için ürün kataloğunu inceleyin.</p>
      </div>`;
}

/* ---------- page: home ---------- */
function homeMain(mode) {
  const featured = ["steamax", "maxidens", "scotchsuper", "tempoil", "automass", "econox"]
    .map((s) => products.find((p) => p.slug === s));
  const stats = about.stats
    .map((s) => `<div class="stat"><strong data-count="${s.value}"${s.prefix ? ` data-prefix="${s.prefix}"` : ""} data-suffix="${s.suffix || ""}">0</strong><span>${esc(s.label)}</span></div>`)
    .join("");
  const catCards = categories
    .map((c) => `<a class="cat-card reveal" href="${link(mode, "urunler")}#${c.key}">
          <h3>${esc(c.label)}</h3>
          <p>${esc(c.desc)}</p>
          <span class="cat-more">Ürünleri Gör ${ICON.arrow}</span>
        </a>`).join("\n        ");
  const sectorPills = sectors.map((s) => `<span class="sector-pill">${esc(s)}</span>`).join("\n          ");
  const refItems = references.slice(0, 22)
    .map((r) => `<span class="refs-marquee-item"><span class="marquee-brand-name">${esc(r)}</span></span>`).join("\n            ");
  const certItems = certs.slice(0, 8)
    .map((c) => `<div class="cert-card"><strong>${esc(c.code)}</strong><span>${esc(c.note)}</span></div>`).join("\n        ");
  const countryChips = exportCountries.map((c) => `<span class="export-country-chip">${esc(c)}</span>`).join("\n        ");
  const faqItems = faq.map((f, i) => `<details class="faq-item"${i === 0 ? " open" : ""}>
          <summary>${esc(f.q)}</summary>
          <p>${esc(f.a)}</p>
        </details>`).join("\n        ");

  return `    <section class="hero" aria-label="Ana tanıtım">
      <div class="hero-media">
        <video class="hero-video" autoplay muted loop playsinline
          poster="https://images.pexels.com/photos/276553/pexels-photo-276553.jpeg?auto=compress&cs=tinysrgb&w=1920">
          <source src="https://videos.pexels.com/video-files/6046354/6046354-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>
        <div class="hero-overlay"></div>
      </div>
      <div class="container hero-inner">
        <div class="hero-text reveal">
          <div class="hero-badge"><span class="hero-badge-dot"></span> Gaziantep · ${company.founded}'dan Beri · ${company.years}. Yıl</div>
          <h1>Basınçlı Kap &amp;<br /><span>Buhar Sistemleri</span> Lideri</h1>
          <p class="hero-desc">Yüksek basınçlı buhar, kızgın su ve kızgın yağ kazanları, atık ısı ve enerji geri kazanım ekipmanları. Güneydoğu Anadolu'nun en geniş üretim kapasitesine sahip 14.000 m² tesisimizde.</p>
          <div class="hero-actions">
            <a href="${link(mode, "urunler")}" class="btn btn-primary btn-lg">Ürünlerimiz ${ICON.arrow}</a>
            <a href="${link(mode, "iletisim")}" class="btn btn-outline btn-lg">Teklif Alın</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section about">
      <div class="container about-grid">
        <div class="about-visual reveal-left">
          <div class="about-img-stack"><img src="${asset(mode, "assets/products/factory-plant.jpg")}" alt="${esc(company.brand)} Gaziantep üretim tesisi" loading="lazy" /></div>
          <div class="about-float-card"><strong>${company.years}+</strong><span>Yıllık Deneyim</span></div>
        </div>
        <div class="about-text reveal-right">
          <span class="section-label">Hakkımızda</span>
          <h2 class="section-title">Gaziantep'te <em>Isı &amp; Buhar</em> Teknolojisi Lideri</h2>
          <p>${esc(about.intro[0])}</p>
          <p>${esc(about.intro[1])}</p>
          <div class="about-stats">${stats}</div>
          <a href="${link(mode, "kurumsal")}" class="btn btn-blue">Kurumsal ${ICON.arrow}</a>
        </div>
      </div>
    </section>

    <section class="section" id="urunler">
      <div class="container">
        ${sectionHead("Ürün Gruplarımız", 'Basınçlı Kap &amp; <em>Enerji</em> Ekipmanları', "Endüstriyel ve domestik kullanım için geniş ürün yelpazesi.")}
        <div class="cat-grid stagger-children reveal">
        ${catCards}
        </div>
        <div class="products-grid stagger-children reveal" style="margin-top:2rem">
        ${featured.map((p) => productCard(mode, p)).join("\n        ")}
        </div>
        <div class="center-cta reveal"><a href="${link(mode, "urunler")}" class="btn btn-primary btn-lg">Tüm Ürünleri Gör ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section sectors">
      <div class="container">${sectionHead("Sektörler", 'Isınma ve Buhar İhtiyacı Olan <em>Her Alanda</em>')}</div>
      <div class="sectors-marquee reveal">
        <div class="sectors-marquee-wrap"><div class="sectors-marquee-track">
          ${sectorPills}
        </div></div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner reveal">
        <div><h2>Projeniz için mühendislik desteği alın</h2><p>Tüm proje ve hesaplar, yüksek makine mühendislerinden oluşan ekibimizce uluslararası standartlara uygun hazırlanır.</p></div>
        <a href="${link(mode, "iletisim")}" class="btn btn-ghost btn-lg">Teklif Talep Et ${ICON.arrow}</a>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead("Referanslarımız", "Türkiye'nin Dev <em>Sanayi</em> Kuruluşları", "Mercedes-Benz, Coca-Cola, Aygaz, Emirates, Weatherford, TPAO, TOKİ ve daha fazlası.")}
        <div class="refs-marquee reveal"><div class="refs-marquee-wrap"><div class="refs-marquee-track">
            ${refItems}
        </div></div></div>
        <div class="center-cta reveal"><a href="${link(mode, "referanslar")}" class="btn btn-outline">Tüm Referanslar ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section news-home">
      <div class="container">
        ${sectionHead("Haberler", "ÖZMAKSAN'dan <em>Güncel</em> Haberler", "Projeler, etkinlikler ve sektörel gelişmeler.")}
        <div class="news-grid stagger-children reveal">
        ${news.slice(0, 4).map((n) => newsCard(mode, n)).join("\n        ")}
        </div>
        <div class="center-cta reveal"><a href="${link(mode, "haberler")}" class="btn btn-outline">Tüm Haberler ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section sectors">
      <div class="container">
        ${sectionHead("Sertifikalar", "Uluslararası <em>Standartlar</em>")}
        <div class="certs-grid stagger-children reveal">
        ${certItems}
        </div>
        <div class="center-cta reveal"><a href="${link(mode, "sertifikalar")}" class="btn btn-outline">Tüm Sertifikalar ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section export" id="ihracat">
      <div class="container">
        ${sectionHead("Global Erişim", `${exportCountries.length} Ülkeye <em>Doğrudan</em> İhracat`, "Gaziantep merkezli üretimimiz Ortadoğu, Kuzey Afrika, Orta Asya ve daha ötesine ulaşıyor.")}
        <div class="export-map-wrap reveal-scale">
          <div id="export-map" class="export-map" role="img" aria-label="${esc(company.brand)} ihracat haritası">
            ${exportSvg}
          </div>
          <div class="export-map-legend">
            <span class="export-legend-item export-legend-hub"><i></i> Gaziantep — Merkez</span>
            <span class="export-legend-item export-legend-country"><i></i> İhracat Ülkesi</span>
            <span class="export-legend-item export-legend-route"><i></i> İhracat Hattı</span>
          </div>
        </div>
        <div class="export-countries stagger-children reveal">
        ${countryChips}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container faq-grid">
        <div class="faq-intro reveal-left">
          <span class="section-label">S.S.S.</span>
          <h2 class="section-title">Sık Sorulan <em>Sorular</em></h2>
          <p class="section-desc">Kazanlar, basınçlı kaplar ve montaj hizmetleri hakkında.</p>
          <a href="${link(mode, "iletisim")}" class="btn btn-blue">Bize Ulaşın ${ICON.arrow}</a>
        </div>
        <div class="faq-list reveal-right">
        ${faqItems}
        </div>
      </div>
    </section>`;
}

/* ---------- page: urunler ---------- */
function urunlerMain(mode) {
  const byCat = categories.map((c) => {
    const list = products.filter((p) => p.category === c.key);
    const cards = list.map((p) => productCard(mode, p)).join("\n        ");
    const aux = c.key === "enerji"
      ? `<div class="aux-list reveal">${auxiliaries.map((a) => `<span>${ICON.check}${esc(a)}</span>`).join("")}</div>`
      : "";
    return `<div class="prod-cat" id="${c.key}">
      <div class="prod-cat-head reveal"><h2>${esc(c.label)}</h2><p>${esc(c.desc)}</p></div>
      <div class="products-grid stagger-children reveal">
        ${cards}
      </div>
      ${aux}
    </div>`;
  }).join("\n      ");

  return `    ${pageHero("Ürünler", "Tüm <em>Ürün</em> Grubumuz", "Buhar, kızgın su, sıcak su ve kızgın yağ kazanları ile enerji geri kazanım ekipmanları.")}
    <section class="section">
      <div class="container">
      ${byCat}
      </div>
    </section>
    ${ctaBand(mode)}`;
}

/* ---------- page: product detail ---------- */
function productMain(mode, p) {
  const related = products.filter((r) => r.category === p.category && r.slug !== p.slug).slice(0, 3);
  const quick = [
    ["Yakıt", p.fuel], ["Tip", p.type], ["Kapasite", p.capacity],
    ["Sıcaklık / Basınç", p.pressure], ["Verim", p.efficiency], ["Seri", p.series],
  ].filter(([, v]) => v && v !== "—")
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  const features = p.features.map((f) => `<li>${ICON.check}<span>${esc(f)}</span></li>`).join("\n          ");
  const usage = p.usage
    ? `<div class="usage-block reveal"><h3 class="block-title">Kullanım Alanları</h3><div class="usage-chips">${p.usage.map((u) => `<span>${esc(u)}</span>`).join("")}</div></div>`
    : "";
  const relatedHtml = related.length
    ? `<section class="section sectors"><div class="container">
        ${sectionHead("Benzer Ürünler", `${esc(categories.find((c) => c.key === p.category).label)}`)}
        <div class="products-grid stagger-children reveal">${related.map((r) => productCard(mode, r)).join("")}</div>
      </div></section>`
    : "";
  const intro = p.intro.map((t) => `<p>${esc(t)}</p>`).join("\n          ");

  return `    <nav class="breadcrumb"><div class="container"><a href="${link(mode, "index")}">Anasayfa</a> ${ICON.arrow} <a href="${link(mode, "urunler")}">Ürünler</a> ${ICON.arrow} <span>${esc(p.name)}</span></div></nav>
    <section class="section product-hero-sec">
      <div class="container product-hero">
        <div class="product-hero-media reveal-left"><img src="${asset(mode, p.image)}" alt="${esc(p.name)}" /></div>
        <div class="product-hero-info reveal-right">
          <span class="product-series">${esc(p.series)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="product-tagline">${esc(p.tagline)}</p>
          <dl class="quick-specs">${quick}</dl>
          <div class="product-hero-actions">
            <a href="${link(mode, "iletisim")}" class="btn btn-primary btn-lg">Teklif Al ${ICON.arrow}</a>
            ${p.pdf ? `<a href="${asset(mode, p.pdf)}" target="_blank" rel="noopener" class="btn btn-outline btn-lg">Katalog İndir (PDF)</a>` : ""}
          </div>
        </div>
      </div>
    </section>
    <section class="section product-detail">
      <div class="container product-detail-grid">
        <div class="product-desc reveal">
          <h2 class="section-title">Ürün Açıklaması</h2>
          ${intro}
          ${usage}
        </div>
        <aside class="product-features reveal">
          <h3 class="block-title">Öne Çıkan Özellikler</h3>
          <ul class="feature-list">
          ${features}
          </ul>
        </aside>
      </div>
      <div class="container">${specTable(p)}</div>
    </section>
    ${relatedHtml}
    ${ctaBand(mode)}`;
}

/* ---------- page: kurumsal ---------- */
function kurumsalMain(mode) {
  const stats = about.stats
    .map((s) => `<div class="stat"><strong data-count="${s.value}"${s.prefix ? ` data-prefix="${s.prefix}"` : ""} data-suffix="${s.suffix || ""}">0</strong><span>${esc(s.label)}</span></div>`).join("");
  const values = [
    ["Mühendislik", "Yüksek makine mühendislerinden oluşan ekiple uluslararası standartlarda proje ve hesap."],
    ["Kalite", "97/23/EC, EN 12953/303-5, AD 2000, ASME ve TSE normlarına uygun üretim, bağımsız test."],
    ["İzlenebilirlik", "Hammaddeden markalamaya, LLOYD sertifikalı kaynakçılar ve onaylı WPS/PQR."],
    ["Sürdürülebilirlik", "Enerji geri kazanım, yoğuşmalı teknoloji ve TÜBİTAK destekli AR-GE."],
  ].map(([t, d]) => `<div class="value-card reveal"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("\n        ");
  const steps = [
    ["01", "Proje & Mühendislik", "ASME ve AD Merkblatt 2000 standartlarına uygun proje ve hesaplar."],
    ["02", "Kesim, Büküm & Kaynak", "LLOYD sertifikalı kaynakçılar. Hammaddeden markalamaya izlenebilirlik."],
    ["03", "Basınç & Güvenlik Testi", "Bağımsız gözetimde testler; verim oranları belgelendirilir."],
    ["04", "Montaj & Devreye Alma", "EPDK sertifikalı doğalgaz dönüşümü ve devreye alma hizmeti."],
  ].map(([n, t, d]) => `<div class="process-step"><div class="process-num">${n}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("\n        ");

  return `    ${pageHero("Kurumsal", "1976'dan Beri <em>Yüksek Isı</em> Teknolojisi", "Gaziantep merkezli, Güneydoğu Anadolu'nun en geniş üretim kapasitelerinden biri.")}
    <section class="section about">
      <div class="container about-grid">
        <div class="about-visual reveal-left">
          <div class="about-img-stack"><img src="${asset(mode, "assets/products/factory-boilers.jpg")}" alt="${esc(company.brand)} üretim hattı" loading="lazy" /></div>
          <div class="about-float-card"><strong>14.000</strong><span>m² Üretim Alanı</span></div>
        </div>
        <div class="about-text reveal-right">
          <span class="section-label">Hakkımızda</span>
          <h2 class="section-title">Kurumsal <em>Profil</em></h2>
          ${about.intro.map((t) => `<p>${esc(t)}</p>`).join("\n          ")}
          <div class="about-stats">${stats}</div>
        </div>
      </div>
    </section>
    <section class="section sectors">
      <div class="container">
        ${sectionHead("Değerlerimiz", "Neden <em>ÖZMAKSAN?</em>")}
        <div class="value-grid stagger-children reveal">
        ${values}
        </div>
      </div>
    </section>
    <section class="section process">
      <div class="container">
        ${sectionHead("Üretim Süreci", "Kalite Kontrollü <em>4 Adım</em>")}
        <div class="process-timeline stagger-children reveal">
        ${steps}
        </div>
      </div>
    </section>
    ${ctaBand(mode)}`;
}

/* ---------- page: haberler ---------- */
function haberlerMain(mode) {
  const cards = news.map((n) => newsCard(mode, n)).join("\n        ");
  return `    ${pageHero("Haberler", "ÖZMAKSAN'dan <em>Haberler</em> & Duyurular", "Projelerimiz, etkinliklerimiz ve sektörel gelişmeler hakkında güncel bilgiler.")}
    <section class="section">
      <div class="container">
        <div class="news-grid news-grid-all stagger-children reveal">
        ${cards}
        </div>
      </div>
    </section>
    ${ctaBand(mode)}`;
}

function newsDetailMain(mode, n) {
  const related = news.filter((x) => x.slug !== n.slug).slice(0, 3);
  const bodyParas = n.body.split(/(?<=[.!?])\s+/).filter(Boolean);
  const bodyHtml = bodyParas.map((p) => `<p>${esc(p)}</p>`).join("\n          ");
  const img = n.image
    ? `<figure class="news-detail-figure reveal"><img src="${asset(mode, n.image)}" alt="${esc(n.title)}" /></figure>`
    : "";
  return `    <article class="news-detail">
      <div class="container news-detail-inner">
        <nav class="breadcrumb reveal" aria-label="Konum">
          <a href="${link(mode, "index")}">Anasayfa</a><span>/</span>
          <a href="${link(mode, "haberler")}">Haberler</a><span>/</span>
          <span>${esc(n.title.length > 50 ? `${n.title.slice(0, 50)}…` : n.title)}</span>
        </nav>
        <header class="news-detail-head reveal">
          <time datetime="${esc(n.date)}">${esc(n.dateLabel || formatNewsDate(n.date))}</time>
          <h1>${esc(n.title)}</h1>
        </header>
        ${img}
        <div class="news-detail-body reveal">
          ${bodyHtml}
        </div>
        ${related.length ? `<section class="news-related reveal">
          <h2 class="block-title">Diğer Haberler</h2>
          <div class="news-grid news-grid-compact">
          ${related.map((r) => newsCard(mode, r)).join("\n          ")}
          </div>
        </section>` : ""}
        <div class="news-back reveal"><a href="${link(mode, "haberler")}" class="btn btn-outline">← Tüm Haberlere Dön</a></div>
      </div>
    </article>
    ${ctaBand(mode)}`;
}

/* ---------- page: referanslar ---------- */
function referanslarMain(mode) {
  const grid = references.map((r) => `<div class="ref-cell reveal">${esc(r)}</div>`).join("\n        ");
  return `    ${pageHero("Referanslar", "Yurt İçi ve Yurt Dışında <em>Güvenilir Çözüm Ortağı</em>", "Kamu ve özel sektörde çok sayıda üretim tesisinin basınçlı ekipman imalatını ve kazan dairesi kurulumunu gerçekleştirdik.")}
    <section class="section">
      <div class="container">
        <div class="ref-grid stagger-children reveal">
        ${grid}
        </div>
      </div>
    </section>
    ${ctaBand(mode)}`;
}

/* ---------- page: sertifikalar ---------- */
function sertifikalarMain(mode) {
  const grid = certs.map((c) => `<div class="cert-card lg reveal"><strong>${esc(c.code)}</strong><span>${esc(c.note)}</span></div>`).join("\n        ");
  return `    ${pageHero("Sertifikalar", "Uluslararası <em>Kalite Belgeleri</em>", "Tüm dünyada kabul gören güncel standartlara uygun üretimin kanıtı.")}
    <section class="section">
      <div class="container">
        <p class="lead reveal">Kuruluşumuz; üretim kalitesini etkileyen her koşulu sürekli iyileştirmeyi amaç edinir. Kalite belgelerimizi ve sertifikalarımızı aşağıda bulabilirsiniz.</p>
        <div class="certs-grid lg stagger-children reveal">
        ${grid}
        </div>
      </div>
    </section>
    ${ctaBand(mode)}`;
}

/* ---------- page: iletisim ---------- */
function iletisimMain(mode) {
  const phones = company.phones.map((p) => `<a href="tel:${p.replace(/\s/g, "")}">${esc(p)}</a>`).join("<br />");
  const s = company.social;
  return `    ${pageHero("İletişim", "Bize <em>Ulaşın</em>", "Proje ve teklif talepleriniz için ekibimiz yanınızda.")}
    <section class="section contact">
      <div class="container contact-grid">
        <div class="contact-info reveal-left">
          <ul class="contact-list">
            <li><div class="contact-icon">${ICON.pin}</div><div><strong>Fabrika</strong><span>${esc(company.address)}</span></div></li>
            <li><div class="contact-icon">${ICON.phone}</div><div><strong>Telefon</strong>${phones}</div></li>
            <li><div class="contact-icon">${ICON.fax}</div><div><strong>Faks</strong><span>${esc(company.fax)}</span></div></li>
            <li><div class="contact-icon">${ICON.mail}</div><div><strong>E-posta</strong><a href="mailto:${company.email}">${esc(company.email)}</a></div></li>
            <li><div class="contact-icon">${ICON.web}</div><div><strong>Web</strong><a href="https://${company.web}" target="_blank" rel="noopener">${esc(company.web)}</a></div></li>
          </ul>
          <div class="footer-social dark">
            <a href="${s.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
            <a href="${s.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a>
            <a href="${s.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>
            <a href="${s.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${ICON.youtube}</a>
          </div>
        </div>
        <form class="contact-form reveal-right" action="#" method="post">
          <h3>Teklif Formu</h3>
          <div class="form-row">
            <label>Ad Soyad<input type="text" name="name" required placeholder="Adınız Soyadınız" /></label>
            <label>Firma<input type="text" name="company" placeholder="Firma adı" /></label>
          </div>
          <div class="form-row">
            <label>Telefon<input type="tel" name="phone" required placeholder="05xx xxx xx xx" /></label>
            <label>E-posta<input type="email" name="email" required placeholder="ornek@firma.com" /></label>
          </div>
          <label>Ürün / Konu<input type="text" name="subject" placeholder="Örn. Buhar kazanı, kapasite, yakıt türü" /></label>
          <label>Mesajınız<textarea name="message" rows="4" placeholder="Proje detayı, kapasite, yakıt türü…"></textarea></label>
          <button type="submit" class="btn btn-primary btn-lg btn-full">Teklif Talebi Gönder ${ICON.arrow}</button>
        </form>
      </div>
      <div class="container map-wrap reveal">
        <iframe title="ÖZMAKSAN konum" src="https://www.google.com/maps?q=${encodeURIComponent("ÖZMAKSAN 4. Organize Sanayi Bölgesi Başpınar Gaziantep")}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
    </section>`;
}

/* ---------- shared page pieces ---------- */
function pageHero(label, titleHtml, desc) {
  return `<section class="page-hero">
      <div class="container">
        <span class="section-label">${esc(label)}</span>
        <h1>${titleHtml}</h1>
        <p>${esc(desc)}</p>
      </div>
    </section>`;
}
function ctaBand(mode) {
  return `<section class="cta-band">
      <div class="container cta-inner reveal">
        <div><h2>Doğru kazan çözümü için bize danışın</h2><p>Kapasite, yakıt türü ve proses ihtiyacınıza göre en uygun çözümü birlikte belirleyelim.</p></div>
        <a href="${link(mode, "iletisim")}" class="btn btn-ghost btn-lg">Teklif Talep Et ${ICON.arrow}</a>
      </div>
    </section>`;
}

/* ---------- static HTML doc wrapper ---------- */
function staticDoc({ title, description, active, main }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="ozmaksan-corporate.css" />
  <script>
    (function () {
      var h = location.hash || "";
      if (/invite_token|confirmation_token|recovery_token|email_change_token|access_token/.test(h)) {
        location.replace("/admin/" + h);
      }
    })();
  </script>
</head>
<body>
  ${bodyInner("static", active, main)}
  <script src="ozmaksan-animations.js"></script>
  <script src="ozmaksan-export-map.js"></script>
</body>
</html>`;
}

/* ---------- page registry ---------- */
const pages = [
  { slug: "index", wpSlug: "anasayfa", title: `${company.brand} | Yüksek Isı Teknolojisi — Buhar, Kızgın Su & Kızgın Yağ Kazanları`, description: "1976'dan beri Gaziantep'te yüksek basınçlı buhar kazanları, kızgın su/yağ kazanları ve enerji geri kazanım ekipmanları. CE, ISO 9001, ASME, TSE.", active: "index", main: homeMain, front: true },
  { slug: "kurumsal", wpSlug: "kurumsal", title: `Kurumsal | ${company.brand}`, description: "ÖZMAKSAN kurumsal: 1976'dan beri Gaziantep'te basınçlı kap ve kazan üretimi, 14.000 m² tesis, uzman mühendis kadrosu.", active: "kurumsal", main: kurumsalMain },
  { slug: "urunler", wpSlug: "urunler", title: `Ürünler | ${company.brand}`, description: "Buhar kazanları, kızgın su ve kızgın yağ kazanları, sıcak su kazanları ve enerji geri kazanım ekipmanları.", active: "urunler", main: urunlerMain },
  { slug: "haberler", wpSlug: "haberler", title: `Haberler | ${company.brand}`, description: "ÖZMAKSAN haberleri: projeler, etkinlikler, AR-GE çalışmaları ve sektörel duyurular.", active: "haberler", main: haberlerMain },
  { slug: "referanslar", wpSlug: "referanslar", title: `Referanslar | ${company.brand}`, description: "Mercedes-Benz, Coca-Cola, Aygaz, Emirates, Weatherford, TPAO, TOKİ ve daha fazlası — yurt içi ve yurt dışı referanslar.", active: "referanslar", main: referanslarMain },
  { slug: "sertifikalar", wpSlug: "sertifikalar", title: `Sertifikalar | ${company.brand}`, description: "CE, ISO 9001, TSE, ASME, AD 2000 Merkblatt, TÜV, EPDK, Türk Loydu ve daha fazlası.", active: "sertifikalar", main: sertifikalarMain },
  { slug: "iletisim", wpSlug: "iletisim", title: `İletişim | ${company.brand}`, description: "ÖZMAKSAN Gaziantep: 4. OSB Başpınar. Telefon, e-posta ve teklif formu.", active: "iletisim", main: iletisimMain },
];

/* ---------- write static site ---------- */
for (const pg of pages) {
  const html = staticDoc({ title: pg.title, description: pg.description, active: pg.active, main: pg.main("static") });
  fs.writeFileSync(path.join(ROOT, `${pg.slug}.html`), html);
}
for (const p of products) {
  const html = staticDoc({
    title: `${p.name} — ${categories.find((c) => c.key === p.category).label} | ${company.brand}`,
    description: `${p.name}: ${p.tagline}. ${p.capacity}. ${p.fuel}.`,
    active: "urunler",
    main: productMain("static", p),
  });
  fs.writeFileSync(path.join(ROOT, `${productSlug(p)}.html`), html);
}
for (const n of news) {
  const html = staticDoc({
    title: `${n.title} | ${company.brand}`,
    description: n.excerpt,
    active: "haberler",
    main: newsDetailMain("static", n),
  });
  fs.writeFileSync(path.join(ROOT, `${newsSlug(n)}.html`), html);
}
console.log("Static pages written:", pages.length + products.length + news.length);
console.log("Products:", products.length, "| News:", news.length);
