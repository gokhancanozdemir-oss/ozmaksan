import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES } from "./locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildScript = path.join(__dirname, "build.mjs");

function buildLocale(code) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Build locale: ${code} ===`);
    const child = spawn(process.execPath, [buildScript], {
      env: { ...process.env, BUILD_LOCALE: code },
      stdio: "inherit",
    });
    child.on("exit", (codeStatus) => {
      if (codeStatus === 0) resolve();
      else reject(new Error(`Build failed for ${code} (exit ${codeStatus})`));
    });
    child.on("error", reject);
  });
}

await Promise.all(LOCALES.map((loc) => buildLocale(loc.code)));
console.log("\nAll locales built.");
