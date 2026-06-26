/**
 * sip.xlsx dosyasını Supabase'e aktarır.
 * Kullanım: node scripts/import-sip-projects.mjs [dosya-yolu]
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx-js-style";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const filePath = process.argv[2] || "c:/Users/furka/Desktop/sip.xlsx";

function excelColorToStatus(fill) {
  if (!fill) return "not_started";
  const upper = fill.toUpperCase();
  if (upper === "FFFF00") return "completed";
  if (upper === "92D050" || upper === "00B0F0") return "active";
  return "not_started";
}

function deriveProjectStatus(items) {
  if (!items.length) return "not_started";
  if (items.every((i) => i.status === "completed")) return "completed";
  if (items.some((i) => i.status === "active")) return "active";
  return "not_started";
}

function cellFill(ws, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col });
  const cell = ws[addr];
  const fg = cell?.s?.fgColor;
  if (!fg) return null;
  if (fg.rgb) return fg.rgb;
  if (fg.theme != null) return `theme:${fg.theme}`;
  return null;
}

function rowDominantFill(ws, excelRow) {
  for (let c = 0; c < 10; c++) {
    const fill = cellFill(ws, excelRow, c);
    if (fill && fill !== "theme:0") return fill;
  }
  return cellFill(ws, excelRow, 0);
}

function formatDelivery(val) {
  if (val == null || val === "") return "";
  if (typeof val === "number" && val > 40000) {
    return new Date((val - 25569) * 86400 * 1000).toLocaleDateString("tr-TR");
  }
  return String(val).trim();
}

function parseWorkbook(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let year = null;
  const map = new Map();
  let sort = 0;

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const excelRow = r + 1;
    const sipRaw = row[0];
    const customer = String(row[1] ?? "").trim();
    if (typeof sipRaw === "number" && sipRaw > 2000 && sipRaw === row[1]) {
      year = sipRaw;
      continue;
    }
    if (!sipRaw && !customer) continue;
    if (String(sipRaw).toUpperCase() === "STOK") continue;
    if (year == null) continue;

    const orderNumber = String(sipRaw).trim();
    const key = `${year}-${orderNumber}`;
    if (!map.has(key)) {
      map.set(key, {
        order_number: orderNumber,
        order_year: year,
        customer,
        name: `Sip. ${orderNumber}/${year} · ${customer}`,
        items: [],
      });
    }

    const status = excelColorToStatus(rowDominantFill(ws, excelRow));
    map.get(key).items.push({
      sort_order: sort++,
      spec: String(row[2] ?? "").trim() || null,
      product_name: String(row[3] ?? "").trim() || "—",
      quantity: row[5] ? Number(row[5]) || null : null,
      status,
      order_delivery: formatDelivery(row[6]) || null,
      factory_delivery: formatDelivery(row[7]) || null,
      notes: String(row[8] ?? "").trim() || null,
      destination: String(row[9] ?? "").trim() || null,
    });
  }

  return [...map.values()].map((p) => {
    const status = deriveProjectStatus(p.items);
    return { ...p, status, is_active: status !== "completed" };
  });
}

const supabase = createClient(url, key);
const wb = XLSX.read(readFileSync(filePath), { type: "buffer", cellStyles: true });
const projects = parseWorkbook(wb);

console.log(`Aktarılacak sipariş: ${projects.length}`);

for (const p of projects) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("order_year", p.order_year)
    .eq("order_number", p.order_number)
    .maybeSingle();

  let projectId = existing?.id;

  const row = {
    name: p.name,
    customer: p.customer,
    order_number: p.order_number,
    order_year: p.order_year,
    status: p.status,
    is_active: p.is_active,
  };

  if (projectId) {
    await supabase.from("projects").update(row).eq("id", projectId);
    await supabase.from("project_items").delete().eq("project_id", projectId);
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    projectId = data.id;
  }

  if (p.items.length) {
    const { error } = await supabase.from("project_items").insert(
      p.items.map((item) => ({ project_id: projectId, ...item }))
    );
    if (error) throw error;
  }

  console.log(`✓ ${p.order_number}/${p.order_year} ${p.customer} (${p.items.length} kalem)`);
}

console.log("Tamamlandı.");
