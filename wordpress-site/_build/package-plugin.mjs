/**
 * WordPress Linux sunucuları için zip oluşturur (ileri slash /).
 * Windows Compress-Archive ters slash kullandığı için WP.com'da bozuk kuruluma yol açar.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_ZIP = path.join(ROOT, "ozmaksan-assets.zip");
const OUT_LITE = path.join(ROOT, "ozmaksan-plugin-lite.zip");
const PS1 = path.join(__dirname, "package-plugin.ps1");

execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${PS1}"`, { stdio: "inherit" });

function listPhpEntry(zipPath) {
  const buf = fs.readFileSync(zipPath);
  const name = buf.toString("binary").match(/ozmaksan-assets\/ozmaksan-assets\.php/);
  return name ? name[0] : "NOT FOUND";
}

console.log("Full zip:", OUT_ZIP, "— entry:", listPhpEntry(OUT_ZIP));
console.log("Lite zip (PHP only):", OUT_LITE, "— entry:", listPhpEntry(OUT_LITE));
