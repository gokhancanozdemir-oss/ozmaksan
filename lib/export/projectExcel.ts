import type { ConsumptionRecord, Project } from "@/lib/types/database";
import XLSX from "xlsx-js-style";

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { fgColor: { rgb: "E85D04" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

const TITLE_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
  fill: { fgColor: { rgb: "1A2535" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const LABEL_STYLE = {
  font: { bold: true, color: { rgb: "1A2535" }, sz: 10 },
  fill: { fgColor: { rgb: "F3F4F6" } },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  },
};

const CELL_STYLE = {
  font: { sz: 10, color: { rgb: "111827" } },
  alignment: { vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } },
  },
};

const ALT_CELL_STYLE = {
  ...CELL_STYLE,
  fill: { fgColor: { rgb: "F9FAFB" } },
};

const TOTAL_STYLE = {
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "3D5A80" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "1A2535" } },
    bottom: { style: "medium", color: { rgb: "1A2535" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

function styleCell(
  ws: XLSX.WorkSheet,
  ref: string,
  style: object,
  value?: string | number
) {
  if (!ws[ref]) ws[ref] = { t: "s", v: value ?? "" };
  ws[ref].s = style;
  if (value !== undefined) ws[ref].v = value;
}

function formatCurrency(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function exportProjectToExcel(
  project: Project,
  records: ConsumptionRecord[]
) {
  const totalCost = records.reduce((sum, r) => sum + Number(r.total_cost), 0);
  const headers = [
    "Tarih",
    "Malzeme",
    "QR Kod",
    "Miktar",
    "Birim",
    "Birim Maliyet (₺)",
    "Toplam Maliyet (₺)",
    "Personel",
  ];

  const dataRows = records.map((r) => [
    new Date(r.created_at).toLocaleString("tr-TR"),
    r.products?.name ?? "—",
    r.products?.qr_code ?? "—",
    Number(r.quantity),
    r.unit,
    Number(r.unit_cost),
    Number(r.total_cost),
    r.profiles?.full_name || r.profiles?.email || "—",
  ]);

  const ws: XLSX.WorkSheet = {};
  const colCount = headers.length;

  ws["A1"] = { t: "s", v: "ÖZMAKSAN — Proje Malzeme Kullanım Raporu" };
  ws["A1"].s = TITLE_STYLE;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
  ];

  const infoRows: [string, string][] = [
    ["Proje Adı", project.name],
    ["Müşteri", project.customer ?? "—"],
    ["Açıklama", project.description ?? "—"],
    ["Durum", project.is_active !== false ? "Aktif" : "Pasif"],
    ["Rapor Tarihi", new Date().toLocaleString("tr-TR")],
    ["Toplam Kayıt", String(records.length)],
    ["Toplam Maliyet (₺)", formatCurrency(totalCost)],
  ];

  let row = 2;
  for (const [label, value] of infoRows) {
    const labelRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    const valueRef = XLSX.utils.encode_cell({ r: row, c: 1 });
    styleCell(ws, labelRef, LABEL_STYLE, label);
    styleCell(ws, valueRef, CELL_STYLE, value);
    ws["!merges"] = [
      ...(ws["!merges"] ?? []),
      { s: { r: row, c: 1 }, e: { r: row, c: colCount - 1 } },
    ];
    row++;
  }

  row++;
  const headerRow = row;
  headers.forEach((h, c) => {
    styleCell(
      ws,
      XLSX.utils.encode_cell({ r: headerRow, c }),
      HEADER_STYLE,
      h
    );
  });

  dataRows.forEach((dataRow, i) => {
    const r = headerRow + 1 + i;
    const style = i % 2 === 0 ? CELL_STYLE : ALT_CELL_STYLE;
    dataRow.forEach((val, c) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      const isMoney = c === 5 || c === 6;
      const isNumber = c === 3;
      ws[ref] = {
        t: typeof val === "number" ? "n" : "s",
        v: val,
        s: {
          ...style,
          alignment: {
            ...style.alignment,
            horizontal: isMoney || isNumber ? "right" : "left",
          },
          numFmt: isMoney ? '#,##0.00" ₺"' : undefined,
        },
      };
    });
  });

  const totalRow = headerRow + 1 + dataRows.length;
  for (let c = 0; c < colCount - 2; c++) {
    styleCell(ws, XLSX.utils.encode_cell({ r: totalRow, c }), TOTAL_STYLE, c === 0 ? "GENEL TOPLAM" : "");
  }
  styleCell(
    ws,
    XLSX.utils.encode_cell({ r: totalRow, c: colCount - 2 }),
    TOTAL_STYLE,
    totalCost
  );
  styleCell(ws, XLSX.utils.encode_cell({ r: totalRow, c: colCount - 1 }), TOTAL_STYLE, "");

  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: totalRow, c: colCount - 1 },
  });

  ws["!cols"] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 8 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
  ];

  ws["!rows"] = [{ hpt: 28 }, ...Array(row).fill({ hpt: 20 }), { hpt: 24 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Malzeme Kullanımı");

  const safeName = project.name
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  XLSX.writeFile(wb, `ozmaksan-${safeName}-malzeme.xlsx`);
}
