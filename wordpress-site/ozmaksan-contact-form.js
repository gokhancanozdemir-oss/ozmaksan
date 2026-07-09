/**
 * Netlify Forms — teklif formu gönderimi ve başarı/hata mesajları
 */
(function () {
  "use strict";

  var form = document.querySelector(".contact-form[data-netlify]");
  if (!form) return;

  var statusEl = document.querySelector(".contact-form-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var defaultBtnHtml = submitBtn ? submitBtn.innerHTML : "";

  function msg(key, fallback) {
    var el = document.querySelector("[data-contact-msg=\"" + key + "\"]");
    return el ? el.textContent.trim() : fallback;
  }

  function showStatus(type, text) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.className = "contact-form-status contact-form-status--" + type;
    statusEl.textContent = text;
  }

  function clearSentParam() {
    var params = new URLSearchParams(location.search);
    if (!params.has("sent")) return;
    params.delete("sent");
    var qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  if (new URLSearchParams(location.search).get("sent") === "1") {
    showStatus("success", msg("success", "Teşekkürler! Talebiniz alındı."));
    clearSentParam();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!submitBtn) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = msg("sending", "Gönderiliyor…");
    if (statusEl) statusEl.hidden = true;

    var body = new URLSearchParams(new FormData(form)).toString();

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
    })
      .then(function (res) {
        if (!res.ok) throw new Error("submit failed");
        form.reset();
        showStatus("success", msg("success", "Teşekkürler! Talebiniz alındı."));
      })
      .catch(function () {
        showStatus("error", msg("error", "Gönderim başarısız oldu."));
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = defaultBtnHtml;
      });
  });
})();
