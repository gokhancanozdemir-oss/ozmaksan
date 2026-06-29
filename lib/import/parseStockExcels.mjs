import XLSX from "xlsx-js-style";

function parseNum(v) {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v ?? "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function cleanName(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/** Ürün adından "yıl sonu" / "YIL SONU" ifadesini temizler */
export function sanitizeProductName(name) {
  return cleanName(name)
    .replace(/\by[ıi]l\s+sonu\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s*·\s*/g, " · ")
    .trim()
    .replace(/^·\s*/, "")
    .replace(/\s*·\s*·/g, " · ");
}

function shortSection(title) {
  let t = cleanName(title)
    .replace(/^\d{4}\s+YILI\s+/i, "")
    .replace(/^\d{4}\s+/i, "");
  t = sanitizeProductName(t);
  if (!t) return "ÜRÜN";
  const m = t.match(/(.+?)\s+STOK/i);
  return m ? sanitizeProductName(m[1]) : t.slice(0, 40);
}

function isSkipName(name) {
  const u = name.toUpperCase();
  return (
    !name ||
    u === "TİP" ||
    u === "TIP" ||
    u.startsWith("TOPLAM") ||
    u.includes("STOK LİSTESİ") ||
    u.includes("STOK LISTESI")
  );
}

/** @typedef {{ name: string; product_type: 'standard'|'sac'; default_unit: 'kg'|'m'|'adet'; stock_quantity: number; unit_cost?: number; sac_en_mm?: number; sac_boy_mm?: number; sac_derinlik_mm?: number; sac_adet?: number; source: string }} StockProduct */

/**
 * @param {unknown[][]} rows
 * @param {string} source
 * @returns {StockProduct[]}
 */
function parseSacSheet(rows, source) {
  /** @type {StockProduct[]} */
  const out = [];
  for (const row of rows) {
    const depth = parseNum(row[0]);
    const en = parseNum(row[3]);
    const boy = parseNum(row[5]);
    const desc = cleanName(row[6]);
    const adet = parseNum(row[8]);
    const kg = parseNum(row[9]);
    if (!depth || !en || !boy || !desc) continue;
    if (String(row[1]).toUpperCase() !== "MM") continue;
    const name = `${depth}mm ${desc} ${en}x${boy}`;
    out.push({
      name,
      product_type: "sac",
      default_unit: "kg",
      stock_quantity: kg,
      sac_derinlik_mm: depth,
      sac_en_mm: en,
      sac_boy_mm: boy,
      sac_adet: adet || 1,
      source,
    });
  }
  return out;
}

/**
 * @param {unknown[][]} rows
 * @param {string} source
 * @returns {StockProduct[]}
 */
function parseBoruMilSheet(rows, source) {
  /** @type {StockProduct[]} */
  const out = [];
  let section = "BORU";
  let mode = "boru"; // boru | mil

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const c0 = cleanName(row[0]);
    const upper = c0.toUpperCase();

    if (upper.includes("MİL STOK") || upper.includes("MIL STOK")) {
      section = "MİL";
      mode = "mil";
      continue;
    }
    if (upper.includes("BORU STOK")) {
      section = "BORU";
      mode = "boru";
      continue;
    }
    if (isSkipName(c0)) continue;
    if (c0 === "TİP") continue;
    if (row[1] === "(BOY)" || row[1] === "(mt.)") continue;

    if (c0 === "BAKIR BORU") {
      const kgText = String(row[6] ?? row[3] ?? "");
      const kg = parseNum(kgText) || parseNum(row[0] === "BAKIR BORU" ? row[6] : 0);
      const m = kgText.match(/([\d.,]+)\s*kg/i);
      out.push({
        name: "BORU · BAKIR BORU",
        product_type: "standard",
        default_unit: "kg",
        stock_quantity: m ? parseNum(m[1]) : kg,
        source,
      });
      continue;
    }

    if (mode === "boru") {
      const totalM = parseNum(row[6]);
      if (totalM <= 0) continue;
      out.push({
        name: `BORU · ${c0}`,
        product_type: "standard",
        default_unit: "m",
        stock_quantity: totalM,
        source,
      });
    } else {
      const totalKg = parseNum(row[6]);
      if (totalKg <= 0) continue;
      out.push({
        name: `MİL · ${c0}`,
        product_type: "standard",
        default_unit: "kg",
        stock_quantity: totalKg,
        source,
      });
    }
  }
  return out;
}

/**
 * @param {unknown[][]} rows
 * @param {string} source
 * @param {{ stockCol: number; unit: 'kg'|'m'|'adet'; stockFromCol1?: boolean }} opts
 * @returns {StockProduct[]}
 */
function parseSectionedSheet(rows, source, opts) {
  /** @type {StockProduct[]} */
  const out = [];
  let prefix = "ÜRÜN";
  let inData = false;

  for (const row of rows) {
    const c0 = cleanName(row[0]);
    const upper = c0.toUpperCase();

    if (upper.includes("STOK LİSTESİ") || upper.includes("STOK LISTESI")) {
      prefix = shortSection(c0);
      inData = false;
      continue;
    }

    if (c0 === "TİP") {
      inData = true;
      continue;
    }

    if (!inData || isSkipName(c0)) continue;

    const sub = cleanName(row[1]);
    if (
      sub === "(BOY)" ||
      sub === "(ADET)" ||
      sub === "(PK)" ||
      sub === "(top)" ||
      sub === "(kg)" ||
      sub === "(mt.)"
    ) {
      continue;
    }

    let stock = parseNum(row[opts.stockCol]);
    let unit = opts.unit;

    if (opts.stockFromCol1 && stock <= 0) {
      stock = parseNum(row[1]);
      unit = "adet";
    }

    if (stock <= 0) continue;

    out.push({
      name: `${prefix} · ${c0}`,
      product_type: "standard",
      default_unit: unit,
      stock_quantity: stock,
      source,
    });
  }

  return out;
}

/**
 * @param {unknown[][]} rows
 * @param {string} source
 * @returns {StockProduct[]}
 */
function parseIzolasyonSheet(rows, source) {
  /** @type {StockProduct[]} */
  const out = [];
  let prefix = "İZOLASYON";
  let inData = false;
  let mode = "adet"; // adet | kg

  for (const row of rows) {
    const c0 = cleanName(row[0]);
    const upper = c0.toUpperCase();

    if (upper.includes("STOK LİSTESİ") || upper.includes("STOK LISTESI")) {
      prefix = shortSection(c0);
      inData = false;
      if (upper.includes("İZOLE TOPRAĞI") || upper.includes("SALMASTRA")) {
        mode = "kg";
      } else if (upper.includes("ELEKTROD") || upper.includes("TAŞLAMA") || upper.includes("KESİCİ")) {
        mode = "adet";
      } else {
        mode = "adet";
      }
      continue;
    }

    if (c0 === "TİP") {
      inData = true;
      continue;
    }

    if (!inData || isSkipName(c0) || c0 === ",") continue;

    if (mode === "kg") {
      const kg = parseNum(row[3]);
      const adet = parseNum(row[1]);
      if (kg > 0) {
        out.push({
          name: `${prefix} · ${c0}`,
          product_type: "standard",
          default_unit: "kg",
          stock_quantity: kg,
          source,
        });
      } else if (adet > 0) {
        out.push({
          name: `${prefix} · ${c0}`,
          product_type: "standard",
          default_unit: "adet",
          stock_quantity: adet,
          source,
        });
      }
    } else {
      const adet = parseNum(row[1]);
      if (adet <= 0) continue;
      out.push({
        name: `${prefix} · ${c0}`,
        product_type: "standard",
        default_unit: "adet",
        stock_quantity: adet,
        source,
      });
    }
  }

  return out;
}

/**
 * @param {string} filePath
 * @returns {StockProduct[]}
 */
export function parseStockExcelFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const base = filePath.split(/[/\\]/).pop() ?? filePath;

  if (/SAC STOK/i.test(base)) {
    const dataRows = rows.filter(
      (r) => parseNum(r[0]) > 0 && String(r[1]).toUpperCase() === "MM"
    );
    return parseSacSheet(dataRows, base);
  }

  if (/BORU MIL/i.test(base)) {
    return parseBoruMilSheet(rows, base);
  }

  if (/IZOLASYON/i.test(base)) {
    return parseIzolasyonSheet(rows, base);
  }

  if (/DOKUM/i.test(base)) {
    return parseSectionedSheet(rows, base, { stockCol: 3, unit: "kg" });
  }

  if (/PROFIL/i.test(base)) {
    return parseSectionedSheet(rows, base, { stockCol: 3, unit: "kg" });
  }

  return [];
}

/**
 * @param {string[]} filePaths
 * @returns {StockProduct[]}
 */
export function parseAllStockExcels(filePaths) {
  /** @type {StockProduct[]} */
  const all = [];
  const seen = new Set();

  for (const fp of filePaths) {
    const items = parseStockExcelFile(fp);
    for (const item of items) {
      item.name = sanitizeProductName(item.name);
      const key = `${item.product_type}|${item.name}|${item.sac_en_mm ?? ""}|${item.sac_boy_mm ?? ""}|${item.sac_derinlik_mm ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }
  }

  return all;
}
