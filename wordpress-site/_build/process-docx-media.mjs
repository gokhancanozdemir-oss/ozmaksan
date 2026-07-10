/* Değişiklikler.docx görselleri: NNB_6101 → home-factory, bayrak → contact-flags */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "..", "_wetransfer_extract");
const MEDIA = path.join(ROOT, "assets", "media");

async function run() {
  // Ana sayfa hakkımızda görseli
  await sharp(path.join(SRC, "NNB_6101.jpg"))
    .rotate()
    .resize(1200, 900, { fit: "cover", position: "attention" })
    .sharpen({ sigma: 0.8 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(MEDIA, "home-factory.jpg"));
  console.log("home-factory.jpg yazıldı");

  // İletişim sayfası bandı (bayraklar)
  await sharp(path.join(ROOT, "bayrak.jpg"))
    .rotate()
    .resize(1920, 640, { fit: "cover", position: "centre" })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(MEDIA, "contact-flags.jpg"));
  console.log("contact-flags.jpg yazıldı");
}

run().catch((e) => { console.error(e); process.exit(1); });
