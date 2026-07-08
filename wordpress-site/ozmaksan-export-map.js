/**
 * ÖZMAKSAN — İhracat dünya haritası (inline SVG, fetch yok)
 * export-map-generated.svg içeriği sayfaya gömülüdür; bu script sadece
 * okyanus + grid + rota/marker animasyon katmanını ekler.
 */
(function () {
  "use strict";

  const MAP_W = 1000;
  const MAP_H = 500;
  const SVGNS = "http://www.w3.org/2000/svg";
  const HUB = { name: "Gaziantep", lat: 37.07, lon: 37.38 };

  const EXPORT_COUNTRIES = [
    { name: "Irak", lat: 33, lon: 44 },
    { name: "Mısır", lat: 26.8, lon: 30.8 },
    { name: "Libya", lat: 27, lon: 17 },
    { name: "Lübnan", lat: 33.9, lon: 35.9 },
    { name: "Ürdün", lat: 31.2, lon: 36.5 },
    { name: "Birleşik Arap Emirlikleri", lat: 23.4, lon: 54 },
    { name: "Tunus", lat: 34, lon: 9.5 },
    { name: "Cezayir", lat: 28, lon: 3 },
    { name: "Fas", lat: 32, lon: -6 },
    { name: "Moldova", lat: 47.4, lon: 28.5 },
    { name: "Güney Afrika", lat: -29, lon: 24 },
    { name: "Azerbaycan", lat: 40.4, lon: 47.5 },
    { name: "Gürcistan", lat: 42.3, lon: 43.5 },
    { name: "Türkmenistan", lat: 39, lon: 59.5 },
    { name: "Kazakistan", lat: 48, lon: 68 },
    { name: "Özbekistan", lat: 41.3, lon: 64.5 },
    { name: "Kuzey Kıbrıs Türk Cumhuriyeti", lat: 35.3, lon: 33.4 },
    { name: "Yunanistan", lat: 39, lon: 22 },
    { name: "Pakistan", lat: 30.4, lon: 69.3 },
  ];

  function project(lat, lon) {
    return { x: ((lon + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H };
  }
  function arc(x1, y1, x2, y2, bend) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - bend;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }

  function build() {
    const container = document.getElementById("export-map");
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg || svg.dataset.enhanced) return;
    svg.dataset.enhanced = "true";
    svg.setAttribute("class", "export-map-svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // defs
    const defs = document.createElementNS(SVGNS, "defs");
    defs.innerHTML =
      '<linearGradient id="oz-ocean" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#eef4fb"/><stop offset="100%" stop-color="#dce8f5"/></linearGradient>' +
      '<filter id="oz-glow" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg.insertBefore(defs, svg.firstChild);

    // ocean behind everything
    const ocean = document.createElementNS(SVGNS, "rect");
    ocean.setAttribute("width", MAP_W);
    ocean.setAttribute("height", MAP_H);
    ocean.setAttribute("fill", "url(#oz-ocean)");
    ocean.setAttribute("class", "export-ocean");
    svg.insertBefore(ocean, defs.nextSibling);

    // graticule
    let grat = "";
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * MAP_W;
      grat += `<line class="export-graticule" x1="${x}" y1="0" x2="${x}" y2="${MAP_H}"/>`;
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * MAP_H;
      grat += `<line class="export-graticule" x1="0" y1="${y}" x2="${MAP_W}" y2="${y}"/>`;
    }
    const gNode = document.createElementNS(SVGNS, "g");
    gNode.innerHTML = grat;
    svg.insertBefore(gNode, ocean.nextSibling);

    // overlay (routes + markers) on top
    const hub = project(HUB.lat, HUB.lon);
    let routes = "", pulses = "", markers = "";
    EXPORT_COUNTRIES.forEach((c, i) => {
      const p = project(c.lat, c.lon);
      const d = Math.hypot(p.x - hub.x, p.y - hub.y);
      routes += `<path class="export-route" d="${arc(hub.x, hub.y, p.x, p.y, Math.min(d * 0.18, 80))}" style="animation-delay:${(i * 0.12).toFixed(2)}s"/>`;
      pulses += `<circle class="export-pulse" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" style="animation-delay:${(i * 0.15).toFixed(2)}s"/>`;
      markers += `<g class="export-marker" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><circle class="export-dot" r="5"/><title>${c.name}</title></g>`;
    });
    const overlay = document.createElementNS(SVGNS, "g");
    overlay.setAttribute("class", "export-map-overlay");
    overlay.innerHTML =
      routes + pulses + markers +
      `<circle class="export-hub-pulse" cx="${hub.x.toFixed(1)}" cy="${hub.y.toFixed(1)}"/>` +
      `<g class="export-hub" transform="translate(${hub.x.toFixed(1)},${hub.y.toFixed(1)})"><circle class="export-hub-ring"/><circle class="export-hub-dot" r="6"/><title>${HUB.name}, Türkiye</title></g>`;
    svg.appendChild(overlay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
