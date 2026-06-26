"use client";

import type { Product } from "@/lib/types/database";
import {
  formatStockAmount,
  getLowStockProducts,
  getStockUnit,
} from "@/lib/stockAlert";

type StockAlertBannerProps = {
  products: Product[];
  onViewProducts?: () => void;
  onDismiss?: () => void;
};

export default function StockAlertBanner({
  products,
  onViewProducts,
  onDismiss,
}: StockAlertBannerProps) {
  const lowStock = getLowStockProducts(products);
  if (lowStock.length === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-950/20 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl shrink-0" aria-hidden>
          📋
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-200">
            {lowStock.length === 1
              ? "1 ürünün stoğu düşük seviyede"
              : `${lowStock.length} ürünün stoğu düşük seviyede`}
          </p>
          <p className="mt-1 text-sm text-amber-200/75">
            Üretim ve sarfiyat devam edebilir. Sipariş veya tedarik planlaması
            için aşağıdaki ürünleri kontrol etmenizi öneririz.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {lowStock.slice(0, 5).map((p) => {
              const unit = getStockUnit(p);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-950/25 px-3 py-2"
                >
                  <span className="font-medium text-ozmaksan-text">{p.name}</span>
                  <span className="text-amber-300">
                    {formatStockAmount(Number(p.stock_quantity), unit)}
                    <span className="mx-1 text-amber-200/50">/</span>
                    min. {formatStockAmount(Number(p.min_stock_threshold), unit)}
                  </span>
                </li>
              );
            })}
            {lowStock.length > 5 && (
              <li className="text-xs text-amber-200/60 pl-1">
                +{lowStock.length - 5} ürün daha…
              </li>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {onViewProducts && (
              <button
                type="button"
                onClick={onViewProducts}
                className="h-10 rounded-xl bg-amber-600/30 px-4 text-sm font-semibold text-amber-100 hover:bg-amber-600/45"
              >
                Ürün listesine git
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="h-10 rounded-xl border border-amber-500/30 px-4 text-sm font-semibold text-amber-200/80 hover:bg-amber-950/30"
              >
                Tamam, anladım
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
