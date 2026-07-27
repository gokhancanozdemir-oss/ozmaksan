/**
 * Teklif formu — FormSubmit (ücretsiz, Netlify Forms gerekmez)
 */
(function () {
  "use strict";

  var form = document.querySelector(".contact-form");
  if (!form) return;

  var statusEl = document.querySelector(".contact-form-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var defaultBtnHtml = submitBtn ? submitBtn.innerHTML : "";
  var email =
    form.getAttribute("data-form-email") ||
    "info@ozmaksan.com.tr";

  function msg(key, fallback) {
    var el = document.querySelector('[data-contact-msg="' + key + '"]');
    return el ? el.textContent.trim() : fallback;
  }

  function showStatus(type, text) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.className = "contact-form-status contact-form-status--" + type;
    statusEl.textContent = text;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!submitBtn) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = msg("sending", "Gönderiliyor…");
    if (statusEl) statusEl.hidden = true;

    var fd = new FormData(form);
    fd.append("_subject", "ÖZMAKSAN web teklif formu");
    fd.append("_template", "table");
    fd.append("_captcha", "false");

    fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("submit failed");
        return res.json();
      })
      .then(function () {
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
