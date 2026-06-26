import type { Product } from "@/lib/types/database";

export function getStockUnit(product: Pick<Product, "product_type" | "default_unit">): string {
  return product.product_type === "sac" ? "kg" : product.default_unit;
}

/** Eşik tanımlı ve stok eşiğe eşit veya altındaysa true */
export function isLowStock(
  product: Pick<Product, "stock_quantity" | "min_stock_threshold">
): boolean {
  const threshold = product.min_stock_threshold;
  if (threshold == null || Number(threshold) <= 0) return false;
  return Number(product.stock_quantity) <= Number(threshold);
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products
    .filter(isLowStock)
    .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity));
}

export function formatStockAmount(
  quantity: number,
  unit: string
): string {
  return `${quantity} ${unit}`;
}
