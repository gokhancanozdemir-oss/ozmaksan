/**
 * Stok Excel dosyalarından ürün içe aktarır.
 * Mevcut sarfiyat kayıtlarını ve ürünleri siler, ardından Excel'deki ürünleri ekler.
 *
 * Kullanım: npm run import:stock
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { parseAllStockExcels } from "../lib/import/parseStockExcels.mjs";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error(".env.local bulunamadı.");
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const DEFAULT_FILES = [
  "c:/Users/furka/Downloads/06-2025 SAC STOK.xlsx",
  "c:/Users/furka/Downloads/07-2025 BORU MIL STOK LISTESI.xlsx",
  "c:/Users/furka/Downloads/08-2025 DOKUM STOK LİSTESİ.xlsx",
  "c:/Users/furka/Downloads/09-2025 PROFIL STOK LISTESI.xlsx",
  "c:/Users/furka/Downloads/10-2025 IZOLASYON ELEKTROD SALMASTRA.xlsx",
];

const filePaths = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_FILES;

for (const fp of filePaths) {
  if (!existsSync(fp)) {
    console.error("Dosya bulunamadı:", fp);
    process.exit(1);
  }
}

function generateQr() {
  return `OZMK-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function toRow(p) {
  const isSac = p.product_type === "sac";
  return {
    qr_code: generateQr(),
    name: p.name,
    product_type: p.product_type,
    unit_cost: 0,
    default_unit: isSac ? "kg" : p.default_unit,
    stock_quantity: p.stock_quantity,
    sac_en_mm: isSac ? p.sac_en_mm : null,
    sac_boy_mm: isSac ? p.sac_boy_mm : null,
    sac_derinlik_mm: isSac ? p.sac_derinlik_mm : null,
    sac_adet: isSac ? (p.sac_adet ?? 1) : null,
    is_active: true,
  };
}

async function wipeInventory(supabase) {
  console.log("Mevcut sarfiyat kayıtları siliniyor…");
  const { error: cErr } = await supabase
    .from("consumption_records")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (cErr) throw new Error(cErr.message);

  console.log("Stok giriş kayıtları siliniyor…");
  const { error: sErr } = await supabase
    .from("stock_additions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (sErr && !sErr.message.includes("does not exist")) {
    throw new Error(sErr.message);
  }

  console.log("Mevcut ürünler siliniyor…");
  const { error: pErr } = await supabase
    .from("products")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (pErr) throw new Error(pErr.message);
}

async function main() {
  const products = parseAllStockExcels(filePaths);
  console.log(`Excel'den ${products.length} ürün okundu.`);

  const bySource = {};
  for (const p of products) {
    bySource[p.source] = (bySource[p.source] ?? 0) + 1;
  }
  console.log("Kaynak dağılımı:", bySource);

  if (products.length === 0) {
    console.error("İçe aktarılacak ürün bulunamadı.");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  await wipeInventory(supabase);

  const rows = products.map(toRow);
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("products").insert(batch);
    if (error) throw new Error(error.message);
    inserted += batch.length;
    console.log(`  ${inserted}/${rows.length} ürün eklendi…`);
  }

  console.log(`\nTamamlandı: ${inserted} ürün yüklendi.`);
  console.log("Projeler ve sipariş kalemleri korundu.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
