/**
 * WeTransfer medya paketini işler: video sıkıştırma, görsel AI-tarzı iyileştirme (sharp).
 * Kaynak: ../_wetransfer_extract/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "..", "_wetransfer_extract");
const OUT = path.join(ROOT, "assets", "media");

fs.mkdirSync(OUT, { recursive: true });

/** Dosya adı eşleştirme (Türkçe karakter toleranslı) */
function findSrc(name) {
  const files = fs.readdirSync(SRC);
  const norm = (s) => s.normalize("NFC").toLowerCase();
  const target = norm(name);
  return files.find((f) => norm(f) === target) || files.find((f) => norm(f).includes(norm(name.replace(/\.[^.]+$/, ""))));
}

async function enhanceImage(inputPath, outputPath, { width = 1920, quality = 82 } = {}) {
  await sharp(inputPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .normalize()
    .modulate({ brightness: 1.04, saturation: 1.08 })
    .sharpen({ sigma: 1.1, m1: 0.5, m2: 2 })
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toFile(outputPath);
  const stat = fs.statSync(outputPath);
  console.log(`  ✓ ${path.basename(outputPath)} (${(stat.size / 1024).toFixed(0)} KB)`);
}

function compressVideo(inputPath, outputPath) {
  if (!ffmpegPath) {
    fs.copyFileSync(inputPath, outputPath);
    console.log(`  ⚠ ffmpeg yok — video kopyalandı`);
    return;
  }
  const args = [
    "-y", "-i", inputPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "28",
    "-movflags", "+faststart",
    "-an",
    "-vf", "scale='min(1920,iw)':-2",
    outputPath,
  ];
  const r = spawnSync(ffmpegPath, args, { stdio: "inherit" });
  if (r.status !== 0) {
    fs.copyFileSync(inputPath, outputPath);
    console.log(`  ⚠ sıkıştırma başarısız — orijinal kopyalandı`);
  } else {
    const stat = fs.statSync(outputPath);
    console.log(`  ✓ ${path.basename(outputPath)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  }
}

function extractPoster(videoPath, posterPath) {
  if (!ffmpegPath) return false;
  const r = spawnSync(ffmpegPath, [
    "-y", "-ss", "2", "-i", videoPath,
    "-vframes", "1", "-q:v", "3",
    posterPath,
  ], { stdio: "pipe" });
  return r.status === 0;
}

/** [kaynak dosya adı, çıktı adı, genişlik?] */
const IMAGES = [
  ["1.jpg", "site-logistics.jpg", 1600],
  ["3. sayfaya için foto.jpg", "home-factory.jpg", 1400],
  ["4.jpg", "corporate-wide.jpg", 1920],
  ["8.JPG", "factory-hall.jpg", 1600],
  ["son kopya.jpg", "corporate-hero.jpg", 1920],
  ["NNB_6101.jpg", "factory-production.jpg", 1600],
  ["NNB_6122.jpg", "factory-welding.jpg", 1600],
  ["NNB_6095.tif", "factory-assembly.jpg", 1600],
  ["2.tif", "factory-aerial.jpg", 1920],
  ["12 TPH STEAM BOILER (1).jpg", "product-steam-12tph.jpg", 1200],
  ["27 tph steam bo\u0131ler.jpg", "product-steam-27tph.jpg", 1200],
  ["5 tph 25 bar .jpg", "product-steam-5tph.jpg", 1200],
  ["buhar.jpg", "product-steam-buhar.jpg", 1200],
  ["buhar1.jpg", "product-steam-buhar2.jpg", 1200],
  ["OZM_ECONOX_2017_baskiKONV-min-1 copy.jpg", "product-econox.jpg", 1200],
  ["EHWB -1.jpg", "product-ehwb-1.jpg", 1200],
  ["EHWB 3 .jpg", "product-ehwb-3.jpg", 1200],
  ["KATALOK- 2024- Electrical hot water boiler.jpg", "product-ehwb-catalog.jpg", 1200],
  ["kondens degaz\u00f6r.jpg", "product-degazor.jpg", 1200],
  ["kondens ve deg. tank\u0131.jpg", "product-condens-tank.jpg", 1200],
  ["OBA 10000000 kcalh k\u0131zg\u0131n su kazan\u0131.jpg", "product-hot-water-oba.jpg", 1200],
  ["k\u0131zg\u0131n su kazan\u0131- oba makarna.JPG", "ref-oba-makarna.jpg", 1400],
  ["abdi ibrahim kazanlar.jpg", "ref-abdi-ibrahim.jpg", 1400],
  ["saka hold\u0131ng.jpg", "ref-saka-holding.jpg", 1400],
  ["sertifika logolar\u0131 copy - Kopya copy.jpg", "certs-banner.jpg", 1600],
  ["ChatGPT Image 2 Tem 2026 15_24_27.png", "marketing-visual.png", 1600],
  ["6874f1ff-cf91-4ac9-b09e-e5deda9f45ac.png", "marketing-boiler.png", 1200],
  ["png.png", "marketing-accent.png", 800],
];

console.log("ÖZMAKSAN medya işleme başlıyor…\n");

/* Video */
const videoSrc = findSrc("web giriş.mp4") || findSrc("web giris.mp4");
if (videoSrc) {
  console.log("Video:");
  const videoIn = path.join(SRC, videoSrc);
  const videoOut = path.join(OUT, "hero-web-giris.mp4");
  compressVideo(videoIn, videoOut);
  const posterOut = path.join(OUT, "hero-poster.jpg");
  if (extractPoster(videoOut, posterOut)) {
    sharp(posterOut)
      .modulate({ brightness: 1.05, saturation: 1.05 })
      .jpeg({ quality: 80, progressive: true })
      .toFile(posterOut + ".tmp")
      .then(() => {
        fs.renameSync(posterOut + ".tmp", posterOut);
        console.log(`  ✓ hero-poster.jpg`);
      });
  }
}

console.log("\nGörseller:");
for (const [srcName, outName, width] of IMAGES) {
  const found = findSrc(srcName) || findSrc(srcName.replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u"));
  if (!found) {
    console.log(`  ✗ bulunamadı: ${srcName}`);
    continue;
  }
  const input = path.join(SRC, found);
  const outFinal = path.join(OUT, outName);

  if (outName.endsWith(".png")) {
    await sharp(input).rotate().resize({ width, withoutEnlargement: true }).normalize()
      .modulate({ brightness: 1.04, saturation: 1.08 }).png({ quality: 85 }).toFile(outFinal);
    const stat = fs.statSync(outFinal);
    console.log(`  ✓ ${outName} (${(stat.size / 1024).toFixed(0)} KB)`);
  } else {
    await enhanceImage(input, outFinal, { width });
  }
}

console.log("\nTamamlandı.");
