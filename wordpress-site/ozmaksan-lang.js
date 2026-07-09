/**
 * Dil tercihi: localStorage + hazır çevrilmiş sayfa klasörleri (/en, /ru, /ar)
 */
(function () {
  "use strict";

  var KEY = "ozmaksan_lang";
  var LOCALES = ["tr", "en", "ru", "ar"];

  function localeFromPath() {
    var m = location.pathname.match(/^\/(en|ru|ar)(?:\/|$)/);
    return m ? m[1] : "tr";
  }

  function pageFile() {
    var parts = location.pathname.split("/").filter(Boolean);
    var last = parts[parts.length - 1] || "index.html";
    if (!last.endsWith(".html")) return "index.html";
    return last;
  }

  function setStored(code) {
    try {
      localStorage.setItem(KEY, code);
    } catch (e) {}
  }

  function redirectToStoredLocale() {
    if (localeFromPath() !== "tr") return;
    var stored;
    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {
      return;
    }
    if (!stored || stored === "tr" || LOCALES.indexOf(stored) === -1) return;
    location.replace("/" + stored + "/" + pageFile());
  }

  redirectToStoredLocale();

  function markActive() {
    var current = localeFromPath();
    setStored(current);
    document.querySelectorAll("[data-oz-lang]").forEach(function (el) {
      var code = el.getAttribute("data-oz-lang");
      var active = code === current;
      el.classList.toggle("active", active);
      el.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function bindSwitcher() {
    document.querySelectorAll("[data-oz-lang]").forEach(function (el) {
      el.addEventListener("click", function () {
        setStored(el.getAttribute("data-oz-lang") || "tr");
      });
    });
  }

  function init() {
    markActive();
    bindSwitcher();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
