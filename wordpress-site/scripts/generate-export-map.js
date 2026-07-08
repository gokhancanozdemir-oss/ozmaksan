const fs = require("fs");
const path = require("path");

const geo = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../temp-world.geojson"), "utf8") // dev-only source
);

const W = 1000;
const H = 500;
const project = (lon, lat) => [
  ((lon + 180) / 360) * W,
  ((90 - lat) / 180) * H,
];

const EXPORT = new Set([
  "IRQ", "EGY", "LBY", "LBN", "JOR", "ARE", "TUN", "DZA", "MAR", "MDA",
  "ZAF", "AZE", "GEO", "TKM", "KAZ", "UZB", "GRC", "PAK",
]);
const HUB = "TUR";

function ringPath(ring) {
  return (
    ring
      .map((c, i) => {
        const [x, y] = project(c[0], c[1]);
        return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

function featurePaths(feature) {
  const g = feature.geometry;
  const paths = [];
  if (g.type === "Polygon") paths.push(ringPath(g.coordinates[0]));
  else if (g.type === "MultiPolygon")
    g.coordinates.forEach((p) => paths.push(ringPath(p[0])));
  return paths;
}

let land = "";
let exportPaths = "";
let hubPaths = "";

geo.features.forEach((feature) => {
  const id = feature.id;
  featurePaths(feature).forEach((d) => {
    if (id === HUB)
      hubPaths += `<path class="map-hub" fill="rgba(215,25,32,0.22)" stroke="#d71920" stroke-width="0.8" d="${d}"/>`;
    else if (EXPORT.has(id))
      exportPaths += `<path class="map-export" fill="rgba(26,84,144,0.55)" stroke="#1a5490" stroke-width="0.6" data-iso="${id}" d="${d}"/>`;
    else
      land += `<path class="map-land" fill="#d8e2ed" stroke="#c5d3e3" stroke-width="0.4" d="${d}"/>`;
  });
});

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
<g class="map-land-group">${land}</g>
<g class="map-export-group">${exportPaths}</g>
<g class="map-hub-group">${hubPaths}</g>
</svg>`;

fs.writeFileSync(path.join(__dirname, "../export-map-generated.svg"), svg);
console.log("Generated export-map-generated.svg");
