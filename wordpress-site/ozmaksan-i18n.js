/**
 * ÖZMAKSAN — Anlık istemci çevirisi + dil tercihi (localStorage)
 * Sayfa her zaman görünür; önbellek anında, eksikler arka planda çevrilir.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "ozmaksan_lang";
  var LOCALES = ["tr", "en", "ru", "ar"];
  var RTL = { ar: true };
  var MYMEMORY = { en: "tr|en", ru: "tr|ru", ar: "tr|ar" };
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var ATTRS = ["title", "placeholder", "aria-label", "alt"];

  var maps = {};
  var liveCache = {};
  var originals = new WeakMap();
  var queue = Promise.resolve();
  var liveDelay = 200;

  function getLang() {
    try {
      var l = localStorage.getItem(STORAGE_KEY) || "tr";
      return LOCALES.indexOf(l) !== -1 ? l : "tr";
    } catch (e) {
      return "tr";
    }
  }

  function setLang(code) {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {}
  }

  function readQueryLang() {
    var params = new URLSearchParams(location.search);
    var q = params.get("lang");
    if (q && LOCALES.indexOf(q) !== -1) {
      setLang(q);
      params.delete("lang");
      var qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }
  }

  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function decodeEntities(s) {
    return String(s || "")
      .replace(/&uuml;/g, "ü").replace(/&Uuml;/g, "Ü")
      .replace(/&ouml;/g, "ö").replace(/&Ouml;/g, "Ö")
      .replace(/&ccedil;/g, "ç").replace(/&Ccedil;/g, "Ç")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }

  function shouldSkipText(text) {
    var t = norm(text);
    if (!t || t.length < 2) return true;
    if (/^[\d\s+().\-–—%°/,]+$/.test(t)) return true;
    if (/^https?:\/\//i.test(t)) return true;
    return false;
  }

  function lookup(map, text) {
    if (!map) return null;
    if (map[text]) return map[text];
    var d = decodeEntities(text);
    if (map[d]) return map[d];
    var n = norm(text);
    if (map[n]) return map[n];
    if (map[decodeEntities(n)]) return map[decodeEntities(n)];
    return null;
  }

  function mapPath(lang) {
    var root = document.documentElement.getAttribute("data-oz-root") || "";
    return root + "content/i18n/text." + lang + ".json";
  }

  function loadMap(lang) {
    if (lang === "tr") return Promise.resolve({});
    if (maps[lang]) return Promise.resolve(maps[lang]);
    return fetch(mapPath(lang), { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("text map " + lang);
        return res.json();
      })
      .then(function (data) {
        maps[lang] = data || {};
        return maps[lang];
      })
      .catch(function () {
        maps[lang] = {};
        return maps[lang];
      });
  }

  function enqueue(task) {
    var run = queue.then(function () {
      return new Promise(function (resolve) {
        setTimeout(resolve, liveDelay);
      });
    }).then(task);
    queue = run.catch(function () {});
    return run;
  }

  function liveTranslate(text, lang) {
    var key = lang + "::" + text;
    if (liveCache[key]) return Promise.resolve(liveCache[key]);
    var pair = MYMEMORY[lang];
    if (!pair) return Promise.resolve(text);
    return enqueue(function () {
      var url =
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(text) +
        "&langpair=" +
        pair;
      return fetch(url)
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          var out = data && data.responseData && data.responseData.translatedText;
          if (!out || out === text || /MYMEMORY WARNING/i.test(out)) return text;
          liveCache[key] = out;
          return out;
        })
        .catch(function () {
          return text;
        });
    });
  }

  function rememberOriginal(node, kind, value) {
    if (!originals.has(node)) originals.set(node, {});
    var bag = originals.get(node);
    if (bag[kind] === undefined) bag[kind] = value;
  }

  function getOriginal(node, kind) {
    var bag = originals.get(node);
    return bag && bag[kind] !== undefined ? bag[kind] : null;
  }

  function isSkippedEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest("[data-no-translate], .lang-switcher, .logo")) return true;
    if (el.hasAttribute("data-no-translate")) return true;
    return false;
  }

  function collectTargets(root) {
    var textNodes = [];
    var attrTargets = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !norm(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (!p || SKIP_TAGS[p.tagName] || isSkippedEl(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    root.querySelectorAll(ATTRS.map(function (a) { return "[" + a + "]"; }).join(",")).forEach(function (el) {
      if (isSkippedEl(el)) return;
      ATTRS.forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;
        var val = el.getAttribute(attr);
        if (!val || shouldSkipText(val)) return;
        attrTargets.push({ el: el, attr: attr, text: val });
      });
    });

    var titleEl = root.querySelector("title");
    if (titleEl && titleEl.textContent) {
      attrTargets.push({ el: titleEl, attr: "__title__", text: titleEl.textContent });
    }
    var meta = root.querySelector('meta[name="description"]');
    if (meta && meta.getAttribute("content")) {
      attrTargets.push({ el: meta, attr: "content", text: meta.getAttribute("content") });
    }

    return { textNodes: textNodes, attrTargets: attrTargets };
  }

  function setAttrTarget(t, value) {
    if (t.attr === "__title__") t.el.textContent = value;
    else t.el.setAttribute(t.attr, value);
  }

  function applyCached(lang, map) {
    var pending = [];
    var targets = collectTargets(document.body);

    targets.textNodes.forEach(function (node) {
      var raw = node.nodeValue;
      if (shouldSkipText(raw)) return;
      rememberOriginal(node, "text", raw);
      var hit = lookup(map, raw);
      if (hit) node.nodeValue = hit;
      else pending.push({ kind: "text", node: node, raw: raw });
    });

    targets.attrTargets.forEach(function (t) {
      rememberOriginal(t.el, t.attr, t.text);
      var hit = lookup(map, t.text);
      if (hit) setAttrTarget(t, hit);
      else pending.push({ kind: "attr", target: t, raw: t.text });
    });

    pending.forEach(function (item) {
      liveTranslate(item.raw, lang).then(function (out) {
        if (!out || out === item.raw) return;
        if (item.kind === "text") item.node.nodeValue = out;
        else setAttrTarget(item.target, out);
      });
    });
  }

  function applyToTurkish() {
    var targets = collectTargets(document.body);
    targets.textNodes.forEach(function (node) {
      var orig = getOriginal(node, "text");
      if (orig !== null) node.nodeValue = orig;
    });
    targets.attrTargets.forEach(function (t) {
      var orig = getOriginal(t.el, t.attr);
      if (orig !== null) setAttrTarget(t, orig);
    });
  }

  function updateSwitcher(lang) {
    document.querySelectorAll("[data-oz-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-oz-lang") === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function applyLanguage(lang) {
    var root = document.documentElement;
    root.lang = lang === "tr" ? "tr" : lang;
    root.dir = RTL[lang] ? "rtl" : "ltr";
    updateSwitcher(lang);

    if (lang === "tr") {
      applyToTurkish();
      return Promise.resolve();
    }

    return loadMap(lang).then(function (map) {
      applyCached(lang, map);
    });
  }

  function onLangClick(code) {
    if (!code || LOCALES.indexOf(code) === -1) return;
    setLang(code);
    if (code === "tr") {
      location.reload();
      return;
    }
    applyLanguage(code);
  }

  function bindSwitcher() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-oz-lang]");
      if (!btn) return;
      e.preventDefault();
      onLangClick(btn.getAttribute("data-oz-lang"));
    });
  }

  function init() {
    readQueryLang();
    bindSwitcher();
    var lang = getLang();
    document.documentElement.lang = lang === "tr" ? "tr" : lang;
    document.documentElement.dir = RTL[lang] ? "rtl" : "ltr";
    updateSwitcher(lang);
    if (lang !== "tr") applyLanguage(lang);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.OzI18n = { applyLanguage: applyLanguage, getLang: getLang, setLang: setLang };
})();
