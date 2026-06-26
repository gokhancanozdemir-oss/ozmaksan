"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Product, Unit } from "@/lib/types/database";
import { UNITS } from "@/lib/supabase/consumption";
import { formatSacDimensions } from "@/lib/sac";

type StockAddFormProps = {
  qrCode: string;
  product: Product | null;
  productLoading: boolean;
  isSaving: boolean;
  onSave: (data: {
    qrCode: string;
    quantity: number;
    unit: Unit;
    notes: string;
  }) => void;
  onCancel: () => void;
};

export default function StockAddForm({
  qrCode,
  product,
  productLoading,
  isSaving,
  onSave,
  onCancel,
}: StockAddFormProps) {
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (product?.default_unit) {
      setUnit(product.default_unit as Unit);
    }
  }, [product]);

  const formDisabled = isSaving || productLoading || !product;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    const parsed = parseFloat(quantity);
    if (!quantity || isNaN(parsed) || parsed <= 0) return;

    onSave({
      qrCode,
      quantity: parsed,
      unit,
      notes,
    });
  }

  const isSac = product?.product_type === "sac";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-lg flex-col gap-6 rounded-2xl border-2 border-emerald-600/40 bg-ozmaksan-surface-elevated p-6 shadow-xl shadow-black/30 sm:p-8"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-emerald-400">
          + Stok Ekle
        </span>
      </div>

      {/* Product info */}
      <div className="border-b border-ozmaksan-border pb-4">
        <p className="text-sm font-medium uppercase tracking-wider text-ozmaksan-muted">
          Okunan Ürün
        </p>
        {productLoading ? (
          <p className="mt-2 text-lg text-ozmaksan-muted">Ürün aranıyor…</p>
        ) : product ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xl font-semibold text-ozmaksan-text">
                {product.name}
              </p>
              {isSac && (
                <span className="rounded-lg bg-ozmaksan-accent/20 px-2 py-0.5 text-xs font-bold uppercase text-ozmaksan-accent">
                  Sac
                </span>
              )}
            </div>
            <p className="mt-1 break-all font-mono text-sm text-ozmaksan-accent">
              {qrCode}
            </p>
            {isSac &&
              product.sac_en_mm &&
              product.sac_boy_mm &&
              product.sac_derinlik_mm && (
                <p className="mt-1 text-sm text-ozmaksan-muted">
                  Levha:{" "}
                  <span className="font-semibold text-ozmaksan-text">
                    {formatSacDimensions(
                      product.sac_en_mm,
                      product.sac_boy_mm,
                      product.sac_derinlik_mm
                    )}
                  </span>
                </p>
              )}
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-ozmaksan-border bg-ozmaksan-bg px-4 py-2 text-sm">
              <span className="text-ozmaksan-muted">Mevcut stok:</span>
              <span className="font-bold text-ozmaksan-text">
                {product.stock_quantity}{" "}
                {isSac ? "kg" : product.default_unit}
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 break-all font-mono text-lg text-ozmaksan-accent">
              {qrCode}
            </p>
            <p className="mt-2 text-base text-red-400">
              Bu QR kodu sistemde kayıtlı değil. Depo yöneticisine bildirin.
            </p>
          </>
        )}
      </div>

      {/* Quantity */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="stock-qty"
          className="text-base font-semibold text-ozmaksan-text"
        >
          Eklenecek Miktar
        </label>
        <input
          id="stock-qty"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          required
          disabled={formDisabled}
          placeholder="0.00"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="h-14 w-full rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-xl text-ozmaksan-text placeholder:text-ozmaksan-muted focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Unit */}
      <div className="flex flex-col gap-3">
        <span className="text-base font-semibold text-ozmaksan-text">Birim</span>
        <div className="grid grid-cols-3 gap-3">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              disabled={formDisabled}
              onClick={() => setUnit(u)}
              className={`h-14 rounded-xl border-2 text-lg font-semibold transition-colors disabled:opacity-50 ${
                unit === u
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-ozmaksan-border bg-ozmaksan-bg text-ozmaksan-muted hover:border-ozmaksan-steel hover:text-ozmaksan-text"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="stock-notes"
          className="text-base font-semibold text-ozmaksan-text"
        >
          Not <span className="font-normal text-ozmaksan-muted">(irsaliye no, tedarikçi…)</span>
        </label>
        <input
          id="stock-notes"
          type="text"
          disabled={formDisabled}
          placeholder="Opsiyonel"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-12 w-full rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-ozmaksan-text placeholder:text-ozmaksan-muted/40 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Buttons */}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-16 flex-1 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg text-lg font-semibold text-ozmaksan-muted transition-colors hover:border-ozmaksan-steel hover:text-ozmaksan-text active:scale-[0.98] disabled:opacity-50"
        >
          Yeni Tarama
        </button>
        <button
          type="submit"
          disabled={formDisabled || !quantity}
          className="h-16 flex-1 rounded-xl bg-emerald-600 text-lg font-bold text-white transition-colors hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Kaydediliyor…" : "Stok Ekle"}
        </button>
      </div>
    </form>
  );
}
