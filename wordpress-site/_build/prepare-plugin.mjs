/**
 * Eklenti klasörünü günceller ve zip paketler.
 * Çıktı: ozmaksan-wp.zip (tam), ozmaksan-wp-lite.zip (görselsiz)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGIN = path.join(ROOT, "ozmaksan");

const SYNC = [
  "ozmaksan-corporate.css",
  "ozmaksan-animations.js",
  "ozmaksan-export-map.js",
  "ozmaksan-logo.png",
];

for (const f of SYNC) {
  const src = path.join(ROOT, f);
  const dst = path.join(PLUGIN, f);
  if (!fs.existsSync(src)) throw new Error(`Eksik: ${f}`);
  fs.copyFileSync(src, dst);
}

function copyDirIfExists(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(dstDir, { recursive: true });
  // Node 20+: cpSync recursive is available
  fs.cpSync(srcDir, dstDir, { recursive: true, force: true });
}

// Site varlıkları: ürün görselleri + kataloglar + haber görselleri
copyDirIfExists(path.join(ROOT, "assets", "products"), path.join(PLUGIN, "assets", "products"));
copyDirIfExists(path.join(ROOT, "assets", "catalogs"), path.join(PLUGIN, "assets", "catalogs"));
copyDirIfExists(path.join(ROOT, "assets", "news"), path.join(PLUGIN, "assets", "news"));

const mainPhp = path.join(PLUGIN, "ozmaksan.php");
if (!fs.existsSync(mainPhp)) {
  throw new Error("ozmaksan/ozmaksan.php bulunamadı");
}

execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(__dirname, "package-plugin.ps1")}"`, {
  stdio: "inherit",
});

const zipPath = path.join(ROOT, "ozmaksan-wp.zip");
const buf = fs.readFileSync(zipPath);
const entries = [...buf.toString("binary").matchAll(/ozmaksan\/[^\x00]+?\.(?:php|css|js|png|jpg|pdf)/g)].map((m) =>
  m[0].replace(/\x00/g, ""),
);
const main = entries.find((e) => e === "ozmaksan/ozmaksan.php");
const nested = entries.some((e) => e.startsWith("ozmaksan/ozmaksan/"));

console.log("\n--- Zip doğrulama ---");
console.log("Ana dosya:", main ? "OK" : "HATA");
console.log("İç içe klasör:", nested ? "HATA" : "Yok");
console.log("Dosya sayısı:", entries.length);
console.log("Boyut:", (buf.length / 1024 / 1024).toFixed(2), "MB");
if (!main || nested) process.exit(1);
