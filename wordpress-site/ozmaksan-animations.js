/**
 * ÖZMAKSAN Corporate — Animations & Interactions
 * WordPress: wp_enqueue_script ile footer'a ekleyin
 */

(function () {
  "use strict";

  /* ── Header scroll ── */
  const header = document.querySelector(".site-header");
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 40);
    header?.classList.toggle("is-hidden", y > lastScroll && y > 400);
    lastScroll = y;
  }, { passive: true });

  /* ── Mobile nav ── */
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  const overlay = document.querySelector(".nav-overlay");

  function closeNav() {
    nav?.classList.remove("open");
    overlay?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  toggle?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    overlay?.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  });

  overlay?.addEventListener("click", closeNav);
  nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));

  /* ── Scroll reveal ── */
  const revealEls = document.querySelectorAll(
    ".reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children"
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  /* ── Counter animation ── */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 2000;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent =
        prefix +
        (decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString("tr-TR")) +
        suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

  /* ── Hero video pause on hidden tab ── */
  const video = document.querySelector(".hero-video");
  document.addEventListener("visibilitychange", () => {
    if (!video) return;
    document.hidden ? video.pause() : video.play().catch(() => {});
  });

  /* ── Smooth anchor offset for fixed header ── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = header?.offsetHeight ?? 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ── Logo & refs marquee duplicate for seamless loop ── */
  document.querySelectorAll(".refs-marquee-track, .sectors-marquee-track").forEach((track) => {
    if (!track.dataset.cloned) {
      track.insertAdjacentHTML("beforeend", track.innerHTML);
      track.dataset.cloned = "true";
    }
  });

  /* ── Custom cursor (masaüstü only) ── */
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  const canUseCursor =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canUseCursor && dot && ring) {
    document.body.classList.add("has-custom-cursor");

    let ringX = 0;
    let ringY = 0;
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    }, { passive: true });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    const hoverTargets = document.querySelectorAll(
      "a, button, .product-card, .refs-marquee-item, .cert-card, .sector-pill, .export-country-chip, .process-step, summary, input, textarea, label"
    );
    hoverTargets.forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
    });

    document.addEventListener("mousedown", () => document.body.classList.add("cursor-click"));
    document.addEventListener("mouseup", () => document.body.classList.remove("cursor-click"));
  }

  /* ── Active nav link on scroll ── */
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".main-nav a");

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${entry.target.id}`
            );
          });
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );

  sections.forEach((s) => sectionObserver.observe(s));

})();
