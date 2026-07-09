import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "..", "_wetransfer_extract");
const OUT = path.join(ROOT, "assets", "media", "hero-web-giris.mp4");
const POSTER = path.join(ROOT, "assets", "media", "hero-poster.jpg");
const TMP = OUT + ".tmp.mp4";

const inputName = fs.readdirSync(SRC).find((f) => /web.*\.mp4$/i.test(f));
if (!inputName) {
  console.error("Kaynak video bulunamadı.");
  process.exit(1);
}
const input = path.join(SRC, inputName);

console.log("Kaynak:", input);
const args = [
  "-y", "-i", input,
  "-c:v", "libx264",
  "-profile:v", "main",
  "-level", "4.0",
  "-pix_fmt", "yuv420p",
  "-preset", "medium",
  "-crf", "28",
  "-r", "30",
  "-g", "60",
  "-movflags", "+faststart",
  "-an",
  "-vf", "scale='min(1280,iw)':-2:flags=lanczos",
  TMP,
];
const enc = spawnSync(ffmpegPath, args, { stdio: "inherit" });
if (enc.status !== 0) process.exit(1);

const verify = spawnSync(ffmpegPath, ["-v", "error", "-i", TMP, "-f", "null", "-"], { encoding: "utf8" });
if (verify.status !== 0) {
  console.error("Doğrulama hatası:", verify.stderr);
  fs.unlinkSync(TMP);
  process.exit(1);
}

fs.renameSync(TMP, OUT);
spawnSync(ffmpegPath, ["-y", "-ss", "1", "-i", OUT, "-vframes", "1", "-q:v", "3", POSTER], { stdio: "inherit" });
console.log("Tamam:", (fs.statSync(OUT).size / 1024 / 1024).toFixed(1), "MB");
