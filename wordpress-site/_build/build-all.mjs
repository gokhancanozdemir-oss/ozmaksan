import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES } from "./locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const loc of LOCALES) {
  console.log(`\n=== Build locale: ${loc.code} ===`);
  const r = spawnSync(process.execPath, [path.join(__dirname, "build.mjs")], {
    env: { ...process.env, BUILD_LOCALE: loc.code },
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log("\nAll locales built.");
