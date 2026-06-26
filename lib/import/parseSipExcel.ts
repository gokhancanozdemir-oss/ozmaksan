import * as XLSX from "xlsx-js-style";
import { excelColorToStatus, deriveProjectStatus } from "@/lib/projectStatus";
import type { ProjectItemStatus } from "@/lib/types/database";

export type ParsedSipItem = {
  sort_order: number;
  spec: string;
  product_name: string;
  quantity: number | null;
  status: ProjectItemStatus;
  order_delivery: string;
  factory_delivery: string;
  notes: string;
  destination: string;
};

export type ParsedSipProject = {
  order_number: string;
  order_year: number;
  customer: string;
  name: string;
  status: ProjectItemStatus;
  is_active: boolean;
  items: ParsedSipItem[];
};

function cellFill(
  ws: XLSX.WorkSheet,
  row: number,
  col: number
): string | null {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col });
  const cell = ws[addr] as { s?: { fgColor?: { rgb?: string; theme?: number } } };
  const fg = cell?.s?.fgColor;
  if (!fg) return null;
  if (fg.rgb) return fg.rgb;
  if (fg.theme != null) return `theme:${fg.theme}`;
  return null;
}

function rowDominantFill(ws: XLSX.WorkSheet, excelRow: number): string | null {
  for (let c = 0; c < 10; c++) {
    const fill = cellFill(ws, excelRow, c);
    if (fill && fill !== "theme:0") return fill;
  }
  return cellFill(ws, excelRow, 0);
}

function formatDelivery(val: unknown): string {
  if (val == null || val === "") return "";
  if (typeof val === "number" && val > 40000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toLocaleDateString("tr-TR");
  }
  return String(val).trim();
}

function buildNotes(a: unknown, b: unknown): string {
  return [a, b].filter((x) => x != null && String(x).trim()).join(" · ");
}

export function parseSipWorkbook(wb: XLSX.WorkBook): ParsedSipProject[] {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
  }) as unknown[][];

  let year: number | null = null;
  const map = new Map<string, ParsedSipProject>();
  let sortCounter = 0;

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const excelRow = r + 1;
    const sipRaw = row[0];
    const customer = String(row[1] ?? "").trim();

    if (
      typeof sipRaw === "number" &&
      sipRaw > 2000 &&
      sipRaw === row[1]
    ) {
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
        status: "not_started",
        is_active: true,
        items: [],
      });
    }

    const fill = rowDominantFill(ws, excelRow);
    const status = excelColorToStatus(fill);

    map.get(key)!.items.push({
      sort_order: sortCounter++,
      spec: String(row[2] ?? "").trim(),
      product_name: String(row[3] ?? "").trim() || "—",
      quantity:
        row[5] != null && row[5] !== "" ? Number(row[5]) || null : null,
      status,
      order_delivery: formatDelivery(row[6]),
      factory_delivery: formatDelivery(row[7]),
      notes: buildNotes(row[8], ""),
      destination: String(row[9] ?? "").trim(),
    });
  }

  for (const project of map.values()) {
    project.status = deriveProjectStatus(project.items);
    project.is_active = project.status !== "completed";
  }

  return [...map.values()].sort((a, b) => {
    if (a.order_year !== b.order_year) return b.order_year - a.order_year;
    return Number(a.order_number) - Number(b.order_number);
  });
}

export function parseSipFile(buffer: ArrayBuffer): ParsedSipProject[] {
  const wb = XLSX.read(buffer, { type: "array", cellStyles: true });
  return parseSipWorkbook(wb);
}
