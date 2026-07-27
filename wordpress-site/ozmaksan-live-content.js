/**
 * CMS Publish sonrası GitHub'daki JSON'u çeker; Netlify build bitmeden TR metinleri günceller.
 */
(function () {
  var REPO =
    "https://raw.githubusercontent.com/gokhancanozdemir-oss/ozmaksan/main/wordpress-site/content";

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

  function introHtml(intro) {
    var parts = [];
    if (typeof intro === "string") {
      parts = intro.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    } else if (Array.isArray(intro)) {
      parts = intro.map(function (x) {
        if (x && typeof x === "object") return String(x.paragraph || x.p || x.text || "");
        return String(x || "");
      }).filter(Boolean);
    }
    return parts.map(function (p) { return "<p>" + mdInline(p) + "</p>"; }).join("");
  }

  function featuresHtml(features) {
    var lines = [];
    if (typeof features === "string") {
      lines = features.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    } else if (Array.isArray(features)) {
      lines = features.map(function (x) {
        if (x && typeof x === "object") return String(x.feature || x.f || x.text || "");
        return String(x || "");
      }).filter(Boolean);
    }
    return lines
      .map(function (f) {
        return "<li><span>" + mdInline(f) + "</span></li>";
      })
      .join("");
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
  }

  function applyNews(root, data) {
    var title = root.querySelector("[data-live='title']");
    var body = root.querySelector("[data-live='body']");
    if (title && data.title) title.textContent = data.title;
    if (body && data.body != null) body.innerHTML = bodyHtml(data.body);
  }

  function load(kind, slug, apply) {
    var url = REPO + "/" + kind + "/" + encodeURIComponent(slug) + ".json?t=" + Date.now();
    fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(apply)
      .catch(function () {});
  }

  var productRoot = document.querySelector("[data-live-product]");
  if (productRoot) {
    load("products", productRoot.getAttribute("data-live-product"), function (data) {
      applyProduct(productRoot, data);
    });
  }

  var newsRoot = document.querySelector("[data-live-news]");
  if (newsRoot) {
    load("news", newsRoot.getAttribute("data-live-news"), function (data) {
      applyNews(newsRoot, data);
    });
  }
})();
