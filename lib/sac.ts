/** Çelik yoğunluğu (g/cm³) */
export const STEEL_DENSITY_G_CM3 = 7.85;

export type ProductType = "standard" | "sac";

/** en × boy × derinlik (mm) → kg */
export function calcSacWeightKg(
  enMm: number,
  boyMm: number,
  derinlikMm: number
): number {
  return (enMm * boyMm * derinlikMm * STEEL_DENSITY_G_CM3) / 1_000_000;
}

export function formatSacDimensions(
  enMm: number,
  boyMm: number,
  derinlikMm: number
): string {
  return `${enMm} × ${boyMm} × ${derinlikMm} mm`;
}

export function formatWeightKg(kg: number): string {
  return `${kg.toLocaleString("tr-TR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
}
