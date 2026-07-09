import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalizedData } from "./i18n-loader.mjs";
import { LOCALES, getLocale } from "./locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const localeCode = process.env.BUILD_LOCALE || "tr";
const locale = getLocale(localeCode);
const {
  company, nav, categories, products, auxiliaries, certs, sectors,
  references, faq, about, exportCountries, news, t, trText,
} = loadLocalizedData(localeCode);
const relRoot = localeCode === "tr" ? "" : "..";
const outRoot = localeCode === "tr" ? ROOT : path.join(ROOT, localeCode);
if (localeCode !== "tr") fs.mkdirSync(outRoot, { recursive: true });

const exportSvg = fs.readFileSync(path.join(ROOT, "export-map-generated.svg"), "utf8")
  .replace(/<\?xml[^>]*\?>\s*/i, "");

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Statik site: göreli varlık yolu; alt dil klasörlerinde ../ ile köke çıkar */
const asset = (_mode, p) => {
  const clean = String(p || "").replace(/^\/+/, "");
  return relRoot ? `${relRoot}/${clean}` : clean;
};
function link(_mode, slug) {
  return slug === "index" ? "index.html" : `${slug}.html`;
}
function langHref(targetLocale, slug) {
  const file = slug === "index" ? "index.html" : `${slug}.html`;
  if (targetLocale === "tr") return localeCode === "tr" ? file : `../${file}`;
  if (localeCode === "tr") return `${targetLocale}/${file}`;
  if (targetLocale === localeCode) return file;
  if (targetLocale === "tr") return `../${file}`;
  return `../${targetLocale}/${file}`;
}
function langSwitcher(pageSlug) {
  return LOCALES.map((loc) => {
    const href = langHref(loc.code, pageSlug);
    const active = loc.code === localeCode ? ' class="active" aria-current="true"' : "";
    return `<a href="${href}" hreflang="${loc.htmlLang}" lang="${loc.htmlLang}" data-oz-lang="${loc.code}"${active}>${loc.label}</a>`;
  }).join("\n        ");
}
const productSlug = (p) => `urun-${p.slug}`;
const newsSlug = (n) => `haber-${n.slug}`;

const MONTH_NAMES = {
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
function formatNewsDate(iso) {
  const [y, m, d] = iso.split("-");
  const months = MONTH_NAMES[localeCode] || MONTH_NAMES.tr;
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
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
function header(mode, active, pageSlug = active) {
  const links = nav
    .map((n) => `<a href="${link(mode, n.href)}"${n.href === active ? ' class="active"' : ""}>${esc(n.label)}</a>`)
    .join("\n        ");
  return `<header class="site-header" id="top">
    <div class="header-inner">
      <a href="${link(mode, "index")}" class="logo">
        <img src="${asset(mode, "ozmaksan-logo.png")}" alt="${esc(company.brand)} — ${esc(company.slogan)}" width="280" height="93" />
      </a>
      <nav class="main-nav" aria-label="${esc(t("aria.mainNav"))}">
        ${links}
      </nav>
      <div class="lang-switcher" aria-label="${esc(t("lang.switch"))}">
        ${langSwitcher(pageSlug)}
      </div>
      <a href="${link(mode, "iletisim")}" class="btn btn-primary btn-sm">${esc(t("cta.quote"))}</a>
      <button class="menu-toggle" aria-label="${esc(t("aria.menu"))}" aria-expanded="false"><span></span><span></span><span></span></button>
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
        <img src="${asset(mode, "ozmaksan-logo.png")}" alt="${esc(company.brand)}" width="200" height="66" />
        <p>${t("footer.blurb", { founded: company.founded })}</p>
        ${social}
      </div>
      <div>
        <h4>${esc(t("footer.corporate"))}</h4>
        <ul>${quick}</ul>
      </div>
      <div>
        <h4>${esc(t("footer.productGroups"))}</h4>
        <ul>${catLinks}</ul>
      </div>
      <div>
        <h4>${esc(t("footer.contact"))}</h4>
        <ul class="footer-contact">
          <li>${ICON.pin}<span>${esc(company.address)}</span></li>
          <li>${ICON.phone}<a href="tel:${company.phones[0].replace(/\s/g, "")}">${esc(company.phones[0])}</a></li>
          <li>${ICON.mail}<a href="mailto:${company.email}">${esc(company.email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>© ${new Date().getFullYear()} ${esc(company.legalName)} — ${esc(t("footer.rights"))}</p>
        <p>${esc(company.slogan)} · <span>${esc(company.sloganEn)}</span></p>
      </div>
    </div>
  </footer>`;
}

function bodyInner(mode, active, main, pageSlug = active) {
  return `<div class="cursor-dot" aria-hidden="true"></div>
  <div class="cursor-ring" aria-hidden="true"></div>
  ${header(mode, active, pageSlug)}
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
            <a href="${link(mode, productSlug(p))}" class="product-link">${esc(t("product.view"))} ${ICON.arrow}</a>
            ${p.pdf ? `<a href="${asset(mode, p.pdf)}" target="_blank" rel="noopener" class="product-pdf">${esc(t("product.catalog"))}</a>` : ""}
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
          <a href="${link(mode, newsSlug(n))}" class="news-link">${esc(t("news.readMore"))} ${ICON.arrow}</a>
        </div>
      </article>`;
}

function specTable(p) {
  if (!p.specs) return "";
  const head = p.specs.columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const rows = p.specs.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n            ");
  return `<div class="spec-table-wrap reveal">
        <h3 class="block-title">${esc(t("product.specTable"))}</h3>
        <table class="spec-table">
          <thead><tr>${head}</tr></thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p class="spec-note">${esc(t("product.specNote"))}</p>
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
          <span class="cat-more">${esc(t("cat.viewProducts"))} ${ICON.arrow}</span>
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
        <video class="hero-video" autoplay muted loop playsinline webkit-playsinline
          preload="auto"
          poster="${asset(mode, "assets/media/hero-poster.jpg")}">
          <source src="${asset(mode, "assets/media/hero-web-giris.mp4")}" type="video/mp4" />
        </video>
        <div class="hero-overlay"></div>
      </div>
      <div class="container hero-inner">
        <div class="hero-text reveal">
          <div class="hero-badge"><span class="hero-badge-dot"></span> ${t("hero.badge", { founded: company.founded, years: company.years })}</div>
          <h1>${t("hero.title")}</h1>
          <p class="hero-desc">${esc(t("hero.desc"))}</p>
          <div class="hero-actions">
            <a href="${link(mode, "urunler")}" class="btn btn-primary btn-lg">${esc(t("hero.products"))} ${ICON.arrow}</a>
            <a href="${link(mode, "iletisim")}" class="btn btn-outline btn-lg">${esc(t("cta.quoteFull"))}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section about">
      <div class="container about-grid">
        <div class="about-visual reveal-left">
          <div class="about-img-stack"><img src="${asset(mode, "assets/media/home-factory.jpg")}" alt="${esc(company.brand)} Gaziantep üretim tesisi ve kontrol panelleri" loading="lazy" /></div>
          <div class="about-float-card"><strong>${company.years}+</strong><span>${esc(t("home.experience"))}</span></div>
        </div>
        <div class="about-text reveal-right">
          <span class="section-label">${esc(t("home.aboutLabel"))}</span>
          <h2 class="section-title">${t("home.aboutTitle")}</h2>
          <p>${esc(about.intro[0])}</p>
          <p>${esc(about.intro[1])}</p>
          <div class="about-stats">${stats}</div>
          <a href="${link(mode, "kurumsal")}" class="btn btn-blue">${esc(t("nav.corporate"))} ${ICON.arrow}</a>
        </div>
      </div>
    </section>

    <section class="section" id="urunler">
      <div class="container">
        ${sectionHead(t("home.productGroups"), t("home.productGroupsTitle"), t("home.productGroupsDesc"))}
        <div class="cat-grid stagger-children reveal">
        ${catCards}
        </div>
        <div class="products-grid stagger-children reveal" style="margin-top:2rem">
        ${featured.map((p) => productCard(mode, p)).join("\n        ")}
        </div>
        <div class="center-cta reveal"><a href="${link(mode, "urunler")}" class="btn btn-primary btn-lg">${esc(t("home.allProducts"))} ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section sectors">
      <div class="container">${sectionHead(t("home.sectors"), t("home.sectorsTitle"))}</div>
      <div class="sectors-marquee reveal">
        <div class="sectors-marquee-wrap"><div class="sectors-marquee-track">
          ${sectorPills}
        </div></div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner reveal">
        <div><h2>${esc(t("home.engineering"))}</h2><p>${esc(t("home.engineeringDesc"))}</p></div>
        <a href="${link(mode, "iletisim")}" class="btn btn-ghost btn-lg">${esc(t("cta.quoteRequest"))} ${ICON.arrow}</a>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead(t("home.references"), t("home.referencesTitle"), t("home.referencesDesc"))}
        <div class="refs-marquee reveal"><div class="refs-marquee-wrap"><div class="refs-marquee-track">
            ${refItems}
        </div></div></div>
        <div class="center-cta reveal"><a href="${link(mode, "referanslar")}" class="btn btn-outline">${esc(t("home.allReferences"))} ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section news-home">
      <div class="container">
        ${sectionHead(t("home.news"), t("home.newsTitle"), t("home.newsDesc"))}
        <div class="news-grid stagger-children reveal">
        ${news.slice(0, 4).map((n) => newsCard(mode, n)).join("\n        ")}
        </div>
        <div class="center-cta reveal"><a href="${link(mode, "haberler")}" class="btn btn-outline">${esc(t("home.allNews"))} ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section sectors">
      <div class="container">
        ${sectionHead(t("home.certs"), t("home.certsTitle"))}
        <div class="certs-grid stagger-children reveal">
        ${certItems}
        </div>
        <div class="center-cta reveal"><a href="${link(mode, "sertifikalar")}" class="btn btn-outline">${esc(t("home.allCerts"))} ${ICON.arrow}</a></div>
      </div>
    </section>

    <section class="section export" id="ihracat">
      <div class="container">
        ${sectionHead(t("home.export"), t("home.exportTitle", { count: exportCountries.length }), t("home.exportDesc"))}
        <div class="export-map-wrap reveal-scale">
          <div id="export-map" class="export-map" role="img" aria-label="${esc(company.brand)} ihracat haritası">
            ${exportSvg}
          </div>
          <div class="export-map-legend">
            <span class="export-legend-item export-legend-hub"><i></i> ${esc(t("home.exportHub"))}</span>
            <span class="export-legend-item export-legend-country"><i></i> ${esc(t("home.exportCountry"))}</span>
            <span class="export-legend-item export-legend-route"><i></i> ${esc(t("home.exportRoute"))}</span>
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
          <span class="section-label">${esc(t("home.faqAbbr"))}</span>
          <h2 class="section-title">${t("home.faqTitle")}</h2>
          <p class="section-desc">${esc(t("home.faqDesc"))}</p>
          <a href="${link(mode, "iletisim")}" class="btn btn-blue">${esc(t("home.contactUs"))} ${ICON.arrow}</a>
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

  return `    ${pageHero(mode, t("page.products"), t("page.productsTitle"), t("page.productsDesc"), "marketing-boiler.png")}
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
    [t("spec.fuel"), p.fuel], [t("spec.type"), p.type], [t("spec.capacity"), p.capacity],
    [t("spec.pressure"), p.pressure], [t("spec.efficiency"), p.efficiency], [t("spec.series"), p.series],
  ].filter(([, v]) => v && v !== "—")
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  const features = p.features.map((f) => `<li>${ICON.check}<span>${esc(f)}</span></li>`).join("\n          ");
  const usage = p.usage
    ? `<div class="usage-block reveal"><h3 class="block-title">${esc(t("product.usage"))}</h3><div class="usage-chips">${p.usage.map((u) => `<span>${esc(u)}</span>`).join("")}</div></div>`
    : "";
  const relatedHtml = related.length
    ? `<section class="section sectors"><div class="container">
        ${sectionHead(t("product.similar"), `${esc(categories.find((c) => c.key === p.category).label)}`)}
        <div class="products-grid stagger-children reveal">${related.map((r) => productCard(mode, r)).join("")}</div>
      </div></section>`
    : "";
  const intro = p.intro.map((t) => `<p>${esc(t)}</p>`).join("\n          ");

  return `    <nav class="breadcrumb"><div class="container"><a href="${link(mode, "index")}">${esc(t("breadcrumb.home"))}</a> ${ICON.arrow} <a href="${link(mode, "urunler")}">${esc(t("breadcrumb.products"))}</a> ${ICON.arrow} <span>${esc(p.name)}</span></div></nav>
    <section class="section product-hero-sec">
      <div class="container product-hero">
        <div class="product-hero-media reveal-left"><img src="${asset(mode, p.image)}" alt="${esc(p.name)}" /></div>
        <div class="product-hero-info reveal-right">
          <span class="product-series">${esc(p.series)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="product-tagline">${esc(p.tagline)}</p>
          <dl class="quick-specs">${quick}</dl>
          <div class="product-hero-actions">
            <a href="${link(mode, "iletisim")}" class="btn btn-primary btn-lg">${esc(t("cta.quote"))} ${ICON.arrow}</a>
            ${p.pdf ? `<a href="${asset(mode, p.pdf)}" target="_blank" rel="noopener" class="btn btn-outline btn-lg">${esc(t("product.catalogDownload"))}</a>` : ""}
          </div>
        </div>
      </div>
    </section>
    <section class="section product-detail">
      <div class="container product-detail-grid">
        <div class="product-desc reveal">
          <h2 class="section-title">${esc(t("product.description"))}</h2>
          ${intro}
          ${usage}
        </div>
        <aside class="product-features reveal">
          <h3 class="block-title">${esc(t("product.features"))}</h3>
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
    [t("value.engineering"), t("value.engineeringDesc")],
    [t("value.quality"), t("value.qualityDesc")],
    [t("value.traceability"), t("value.traceabilityDesc")],
    [t("value.sustainability"), t("value.sustainabilityDesc")],
  ].map(([title, desc]) => `<div class="value-card reveal"><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`).join("\n        ");
  const steps = [
    ["01", t("process.1.title"), t("process.1.desc")],
    ["02", t("process.2.title"), t("process.2.desc")],
    ["03", t("process.3.title"), t("process.3.desc")],
    ["04", t("process.4.title"), t("process.4.desc")],
  ].map(([n, title, desc]) => `<div class="process-step"><div class="process-num">${n}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`).join("\n        ");

  return `    ${pageHero(mode, t("page.corporate"), t("page.corporateTitle"), t("page.corporateDesc"), "corporate-wide.jpg")}
    <section class="section about">
      <div class="container about-grid">
        <div class="about-visual reveal-left">
          <div class="about-img-stack"><img src="${asset(mode, "assets/media/factory-production.jpg")}" alt="${esc(company.brand)} üretim hattı" loading="lazy" /></div>
          <div class="about-float-card"><strong>14.000</strong><span>m² Üretim Alanı</span></div>
        </div>
        <div class="about-text reveal-right">
          <span class="section-label">${esc(t("home.aboutLabel"))}</span>
          <h2 class="section-title">${t("page.corporateProfile")}</h2>
          ${about.intro.map((para) => `<p>${esc(para)}</p>`).join("\n          ")}
          <div class="about-stats">${stats}</div>
        </div>
      </div>
    </section>
    <section class="section sectors">
      <div class="container">
        ${sectionHead(t("page.values"), t("page.valuesTitle"))}
        <div class="value-grid stagger-children reveal">
        ${values}
        </div>
      </div>
    </section>
    <section class="section process">
      <div class="container">
        ${sectionHead(t("page.process"), t("page.processTitle"))}
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
  return `    ${pageHero(mode, t("page.news"), t("page.newsTitle"), t("page.newsDesc"), "factory-aerial.jpg")}
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
          <a href="${link(mode, "index")}">${esc(t("breadcrumb.home"))}</a><span>/</span>
          <a href="${link(mode, "haberler")}">${esc(t("breadcrumb.news"))}</a><span>/</span>
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
          <h2 class="block-title">${esc(t("news.other"))}</h2>
          <div class="news-grid news-grid-compact">
          ${related.map((r) => newsCard(mode, r)).join("\n          ")}
          </div>
        </section>` : ""}
        <div class="news-back reveal"><a href="${link(mode, "haberler")}" class="btn btn-outline">${esc(t("news.allBack"))}</a></div>
      </div>
    </article>
    ${ctaBand(mode)}`;
}

/* ---------- page: referanslar ---------- */
function referanslarMain(mode) {
  const refGallery = [
    ["ref-abdi-ibrahim.jpg", "Abdi İbrahim — endüstriyel kazan tesisi"],
    ["ref-saka-holding.jpg", "Saka Holding — sıcak su kazanı projesi"],
    ["ref-oba-makarna.jpg", "Oba Makarna — kızgın su kazanı kurulumu"],
    ["site-logistics.jpg", "ÖZMAKSAN — sevkiyat ve lojistik operasyonu"],
    ["factory-welding.jpg", "Üretim hattı — kaynak ve imalat"],
    ["factory-assembly.jpg", "Tesis içi montaj ve kalite kontrol"],
  ].map(([file, alt]) => `<figure class="ref-photo reveal"><img src="${asset(mode, `assets/media/${file}`)}" alt="${esc(alt)}" loading="lazy" /><figcaption>${esc(alt)}</figcaption></figure>`).join("\n        ");
  const grid = references.map((r) => `<div class="ref-cell reveal">${esc(r)}</div>`).join("\n        ");
  return `    ${pageHero(mode, t("nav.references"), t("page.referencesTitle"), t("page.referencesDesc"), "corporate-hero.jpg")}
    <section class="section">
      <div class="container">
        <div class="ref-photo-grid stagger-children reveal">
        ${refGallery}
        </div>
        <div class="ref-grid stagger-children reveal" style="margin-top:3rem">
        ${grid}
        </div>
      </div>
    </section>
    ${ctaBand(mode)}`;
}

/* ---------- page: sertifikalar ---------- */
function sertifikalarMain(mode) {
  const grid = certs.map((c) => `<div class="cert-card lg reveal"><strong>${esc(c.code)}</strong><span>${esc(c.note)}</span></div>`).join("\n        ");
  return `    ${pageHero(mode, t("nav.certs"), t("page.certsTitle"), t("page.certsDesc"), "factory-hall.jpg")}
    <section class="section">
      <div class="container">
        <figure class="certs-banner reveal"><img src="${asset(mode, "assets/media/certs-banner.jpg")}" alt="${esc(company.brand)} sertifika ve onay logoları" loading="lazy" /></figure>
        <p class="lead reveal">${esc(t("page.certsLead"))}</p>
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
  return `    ${pageHero(mode, t("nav.contact"), t("page.contactTitle"), t("page.contactDesc"))}
    <section class="section contact">
      <div class="container contact-grid">
        <div class="contact-info reveal-left">
          <h3 class="contact-info-title">${esc(t("contact.info"))}</h3>
          <ul class="contact-list">
            <li><div class="contact-icon">${ICON.pin}</div><div><strong>${esc(t("contact.factory"))}</strong><span>${esc(company.address)}</span></div></li>
            <li><div class="contact-icon">${ICON.phone}</div><div><strong>${esc(t("contact.phone"))}</strong>${phones}</div></li>
            <li><div class="contact-icon">${ICON.fax}</div><div><strong>${esc(t("contact.fax"))}</strong><span>${esc(company.fax)}</span></div></li>
            <li><div class="contact-icon">${ICON.mail}</div><div><strong>${esc(t("contact.email"))}</strong><a href="mailto:${company.email}">${esc(company.email)}</a></div></li>
            <li><div class="contact-icon">${ICON.web}</div><div><strong>${esc(t("contact.web"))}</strong><a href="https://${company.web}" target="_blank" rel="noopener">${esc(company.web)}</a></div></li>
          </ul>
          <div class="footer-social dark">
            <a href="${s.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
            <a href="${s.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a>
            <a href="${s.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>
            <a href="${s.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${ICON.youtube}</a>
          </div>
        </div>
        <form class="contact-form reveal-right" name="teklif" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" action="${link(mode, "iletisim")}">
          <input type="hidden" name="form-name" value="teklif" />
          <input type="hidden" name="locale" value="${localeCode}" />
          <p class="contact-form-honeypot" hidden aria-hidden="true">
            <label>Bot: <input name="bot-field" tabindex="-1" autocomplete="off" /></label>
          </p>
          <span hidden data-contact-msg="success">${esc(t("contact.success"))}</span>
          <span hidden data-contact-msg="error">${esc(t("contact.error"))}</span>
          <span hidden data-contact-msg="sending">${esc(t("contact.sending"))}</span>
          <div class="contact-form-status" hidden role="status" aria-live="polite"></div>
          <h3>${esc(t("contact.form"))}</h3>
          <div class="form-row">
            <label>${esc(t("contact.name"))}<input type="text" name="name" required placeholder="${esc(t("contact.namePh"))}" autocomplete="name" /></label>
            <label>${esc(t("contact.company"))}<input type="text" name="company" placeholder="${esc(t("contact.companyPh"))}" autocomplete="organization" /></label>
          </div>
          <div class="form-row">
            <label>${esc(t("contact.phone"))}<input type="tel" name="phone" required placeholder="${esc(t("contact.phonePh"))}" autocomplete="tel" /></label>
            <label>${esc(t("contact.email"))}<input type="email" name="email" required placeholder="${esc(t("contact.emailPh"))}" autocomplete="email" /></label>
          </div>
          <label>${esc(t("contact.subject"))}<input type="text" name="subject" placeholder="${esc(t("contact.subjectPh"))}" /></label>
          <label>${esc(t("contact.message"))}<textarea name="message" rows="4" placeholder="${esc(t("contact.messagePh"))}"></textarea></label>
          <button type="submit" class="btn btn-primary btn-lg btn-full">${esc(t("cta.sendQuote"))} ${ICON.arrow}</button>
        </form>
      </div>
      <div class="container map-wrap reveal">
        <iframe title="${esc(t("contact.mapTitle"))}" src="https://www.google.com/maps?q=${encodeURIComponent("ÖZMAKSAN 4. Organize Sanayi Bölgesi Başpınar Gaziantep")}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
    </section>`;
}

/* ---------- shared page pieces ---------- */
function pageHero(mode, label, titleHtml, desc, bgFile) {
  const bg = bgFile
    ? ` style="background-image:linear-gradient(105deg,rgba(255,255,255,0.94),rgba(232,240,248,0.88)),url('${asset(mode, `assets/media/${bgFile}`)}')"`
    : "";
  return `<section class="page-hero"${bg}>
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
        <div><h2>${esc(t("cta.title"))}</h2><p>${esc(t("cta.desc"))}</p></div>
        <a href="${link(mode, "iletisim")}" class="btn btn-ghost btn-lg">${esc(t("cta.quoteRequest"))} ${ICON.arrow}</a>
      </div>
    </section>`;
}

/* ---------- static HTML doc wrapper ---------- */
function staticDoc({ title, description, active, main, pageSlug = active }) {
  const cssHref = relRoot ? `${relRoot}/ozmaksan-corporate.css` : "ozmaksan-corporate.css";
  const animHref = relRoot ? `${relRoot}/ozmaksan-animations.js` : "ozmaksan-animations.js";
  const mapHref = relRoot ? `${relRoot}/ozmaksan-export-map.js` : "ozmaksan-export-map.js";
  const langScript = relRoot ? `${relRoot}/ozmaksan-lang.js` : "ozmaksan-lang.js";
  const contactScript =
    pageSlug === "iletisim"
      ? `<script src="${relRoot ? `${relRoot}/ozmaksan-contact-form.js` : "ozmaksan-contact-form.js"}"></script>`
      : "";
  const netlifyProbe =
    pageSlug === "index" && localeCode === "tr"
      ? `<form name="teklif" data-netlify="true" data-netlify-honeypot="bot-field" hidden><input type="hidden" name="form-name" value="teklif" /><input name="bot-field" /></form>`
      : "";
  const hreflangs = LOCALES.map((loc) => {
    const href = langHref(loc.code, pageSlug);
    return `<link rel="alternate" hreflang="${loc.htmlLang}" href="/${href.replace(/^\.\.\//, "").replace(/^index\.html$/, "")}" />`;
  }).join("\n  ");
  return `<!DOCTYPE html>
<html lang="${locale.htmlLang}" dir="${locale.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${hreflangs}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${cssHref}" />
  <script>
    (function () {
      var h = location.hash || "";
      if (/invite_token|confirmation_token|recovery_token|email_change_token|access_token/.test(h)) {
        location.replace("/admin/" + h);
      }
    })();
  </script>
  <script src="${langScript}"></script>
</head>
<body>
  ${netlifyProbe}
  ${bodyInner("static", active, main, pageSlug)}
  <script src="${animHref}"></script>
  <script src="${mapHref}"></script>
  ${contactScript}
</body>
</html>`;
}

/* ---------- page registry ---------- */
const pages = [
  { slug: "index", title: t("meta.indexTitle", { brand: company.brand }), description: t("meta.indexDesc"), active: "index", main: homeMain, front: true },
  { slug: "kurumsal", title: `${t("nav.corporate")} | ${company.brand}`, description: trText("ÖZMAKSAN kurumsal: 1976'dan beri Gaziantep'te basınçlı kap ve kazan üretimi, 14.000 m² tesis, uzman mühendis kadrosu."), active: "kurumsal", main: kurumsalMain },
  { slug: "urunler", title: `${t("nav.products")} | ${company.brand}`, description: trText("Buhar kazanları, kızgın su ve kızgın yağ kazanları, sıcak su kazanları ve enerji geri kazanım ekipmanları."), active: "urunler", main: urunlerMain },
  { slug: "haberler", title: `${t("nav.news")} | ${company.brand}`, description: trText("ÖZMAKSAN haberleri: projeler, etkinlikler, AR-GE çalışmaları ve sektörel duyurular."), active: "haberler", main: haberlerMain },
  { slug: "referanslar", title: `${t("nav.references")} | ${company.brand}`, description: trText("Mercedes-Benz, Coca-Cola, Aygaz, Emirates, Weatherford, TPAO, TOKİ ve daha fazlası — yurt içi ve yurt dışı referanslar."), active: "referanslar", main: referanslarMain },
  { slug: "sertifikalar", title: `${t("nav.certs")} | ${company.brand}`, description: trText("CE, ISO 9001, TSE, ASME, AD 2000 Merkblatt, TÜV, EPDK, Türk Loydu ve daha fazlası."), active: "sertifikalar", main: sertifikalarMain },
  { slug: "iletisim", title: `${t("nav.contact")} | ${company.brand}`, description: trText("ÖZMAKSAN Gaziantep: 4. OSB Başpınar. Telefon, e-posta ve teklif formu."), active: "iletisim", main: iletisimMain },
];

/* ---------- write static site ---------- */
for (const pg of pages) {
  const html = staticDoc({ title: pg.title, description: pg.description, active: pg.active, main: pg.main("static"), pageSlug: pg.slug });
  fs.writeFileSync(path.join(outRoot, `${pg.slug}.html`), html);
}
for (const p of products) {
  const html = staticDoc({
    title: `${p.name} — ${categories.find((c) => c.key === p.category).label} | ${company.brand}`,
    description: `${p.name}: ${p.tagline}. ${p.capacity}. ${p.fuel}.`,
    active: "urunler",
    main: productMain("static", p),
    pageSlug: productSlug(p),
  });
  fs.writeFileSync(path.join(outRoot, `${productSlug(p)}.html`), html);
}
for (const n of news) {
  const html = staticDoc({
    title: `${n.title} | ${company.brand}`,
    description: n.excerpt,
    active: "haberler",
    main: newsDetailMain("static", n),
    pageSlug: newsSlug(n),
  });
  fs.writeFileSync(path.join(outRoot, `${newsSlug(n)}.html`), html);
}
console.log(`[${localeCode}] Static pages written:`, pages.length + products.length + news.length);
console.log(`[${localeCode}] Products:`, products.length, "| News:", news.length);
