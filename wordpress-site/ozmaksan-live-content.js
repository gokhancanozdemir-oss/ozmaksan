/**
 * ÖZMAKSAN — içerik GitHub'dan gelir; CMS Publish = deploy DEĞİL.
 * Metin + görseller raw.githubusercontent üzerinden güncellenir.
 */
(function () {
  "use strict";

  var OWNER = "gokhancanozdemir-oss";
  var REPO = "ozmaksan";
  var BRANCH = "main";
  var SITE_PREFIX = "wordpress-site/";
  var RAW =
    "https://raw.githubusercontent.com/" +
    OWNER +
    "/" +
    REPO +
    "/" +
    BRANCH +
    "/" +
    SITE_PREFIX;
  var CONTENT = RAW + "content";

  function bust(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now();
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function mdInline(s) {
    var t = esc(s);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return t;
  }

  function assetUrl(p) {
    if (!p) return "";
    var s = String(p);
    if (/^https?:\/\//i.test(s)) return s;
    s = s.replace(/^\/+/, "").replace(/^\.\.\//, "");
    return RAW + s;
  }

  function introHtml(intro) {
    var parts = [];
    if (typeof intro === "string") {
      parts = intro.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    } else if (Array.isArray(intro)) {
      parts = intro
        .map(function (x) {
          if (x && typeof x === "object") return String(x.paragraph || x.p || x.text || "");
          return String(x || "");
        })
        .filter(Boolean);
    }
    return parts.map(function (p) { return "<p>" + mdInline(p) + "</p>"; }).join("");
  }

  function featuresHtml(features) {
    var lines = [];
    if (typeof features === "string") {
      lines = features.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    } else if (Array.isArray(features)) {
      lines = features
        .map(function (x) {
          if (x && typeof x === "object") return String(x.feature || x.f || x.text || "");
          return String(x || "");
        })
        .filter(Boolean);
    }
    return lines.map(function (f) { return "<li><span>" + mdInline(f) + "</span></li>"; }).join("");
  }

  function bodyHtml(body) {
    var s = String(body || "").trim();
    if (!s) return "";
    if (/\n\s*\n/.test(s) || /\*\*/.test(s)) {
      return s
        .split(/\n\s*\n/)
        .map(function (p) { return p.trim(); })
        .filter(Boolean)
        .map(function (p) { return "<p>" + mdInline(p.replace(/\n/g, " ")) + "</p>"; })
        .join("");
    }
    return s
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .map(function (p) { return "<p>" + mdInline(p) + "</p>"; })
      .join("");
  }

  function fetchJson(url) {
    return fetch(bust(url), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
  }

  function applyProduct(root, data) {
    var name = root.querySelector("[data-live='name']");
    var tagline = root.querySelector("[data-live='tagline']");
    var intro = root.querySelector("[data-live='intro']");
    var features = root.querySelector("[data-live='features']");
    if (name && data.name) name.textContent = data.name;
    if (tagline && data.tagline != null) tagline.textContent = data.tagline;
    if (intro && data.intro != null) intro.innerHTML = introHtml(data.intro);
    if (features && data.features != null) {
      var html = featuresHtml(data.features);
      if (html) features.innerHTML = html;
    }
    if (data.image) {
      root.querySelectorAll(".product-hero-media img, .gallery-slide img").forEach(function (img, i) {
        if (i === 0) img.src = assetUrl(data.image);
      });
    }
  }

  function applyNews(root, data) {
    var title = root.querySelector("[data-live='title']");
    var body = root.querySelector("[data-live='body']");
    if (title && data.title) title.textContent = data.title;
    if (body && data.body != null) body.innerHTML = bodyHtml(data.body);
    if (data.image) {
      var img = root.querySelector(".news-detail-figure img, .gallery-slide img");
      if (img) img.src = assetUrl(data.image);
    }
  }

  function applyCard(el, item, kind) {
    if (!item) return;
    var title = el.querySelector("h3 a, h3");
    var p = el.querySelector("p");
    var img = el.querySelector("img");
    if (kind === "product") {
      if (title && item.name) {
        if (title.tagName === "A") title.textContent = item.name;
        else title.textContent = item.name;
      }
      if (p && item.tagline != null) p.textContent = item.tagline;
      if (img && item.image) img.src = assetUrl(item.image);
    } else {
      if (title && item.title) {
        if (title.tagName === "A") title.textContent = item.title;
        else title.textContent = item.title;
      }
      if (p && item.excerpt != null) p.innerHTML = mdInline(item.excerpt);
      if (img && item.image) img.src = assetUrl(item.image);
    }
  }

  /* Görseller CDN'de yoksa GitHub'dan dene */
  document.addEventListener(
    "error",
    function (e) {
      var t = e.target;
      if (!t || t.tagName !== "IMG" || t.dataset.ghTried) return;
      var src = t.getAttribute("src") || "";
      if (!src || /raw\.githubusercontent\.com/i.test(src)) return;
      t.dataset.ghTried = "1";
      var clean = src.replace(/^https?:\/\/[^/]+\//, "").replace(/^\.\.\//, "").replace(/^\/+/, "");
      if (clean.indexOf("assets/") === 0 || clean.indexOf("wordpress-site/") === 0) {
        t.src = assetUrl(clean.replace(/^wordpress-site\//, ""));
      } else if (clean) {
        t.src = assetUrl(clean);
      }
    },
    true,
  );

  var productRoot = document.querySelector("[data-live-product]");
  if (productRoot) {
    fetchJson(CONTENT + "/products/" + encodeURIComponent(productRoot.getAttribute("data-live-product")) + ".json")
      .then(function (data) { applyProduct(productRoot, data); })
      .catch(function () {});
  }

  var newsRoot = document.querySelector("[data-live-news]");
  if (newsRoot) {
    fetchJson(CONTENT + "/news/" + encodeURIComponent(newsRoot.getAttribute("data-live-news")) + ".json")
      .then(function (data) { applyNews(newsRoot, data); })
      .catch(function () {});
  }

  var needCatalog =
    document.querySelector("[data-product-slug], [data-news-slug], [data-live-catalog]");
  if (needCatalog) {
    fetchJson(CONTENT + "/catalog.json")
      .then(function (cat) {
        var byProduct = {};
        (cat.products || []).forEach(function (p) { if (p.slug) byProduct[p.slug] = p; });
        var byNews = {};
        (cat.news || []).forEach(function (n) { if (n.slug) byNews[n.slug] = n; });
        document.querySelectorAll("[data-product-slug]").forEach(function (el) {
          applyCard(el, byProduct[el.getAttribute("data-product-slug")], "product");
        });
        document.querySelectorAll("[data-news-slug]").forEach(function (el) {
          applyCard(el, byNews[el.getAttribute("data-news-slug")], "news");
        });
      })
      .catch(function () {});
  }
})();
