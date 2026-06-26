"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Product, Project, Unit } from "@/lib/types/database";
import { UNITS } from "@/lib/supabase/consumption";
import {
  calcSacWeightKg,
  formatSacDimensions,
  formatWeightKg,
} from "@/lib/sac";
import { getStockUnit, isLowStock } from "@/lib/stockAlert";

export type { ConsumptionData } from "@/lib/types/database";

type ConsumptionFormProps = {
  qrCode: string;
  product: Product | null;
  productLoading: boolean;
  projects: Project[];
  projectsLoading: boolean;
  isSaving: boolean;
  onSave: (data: {
    qrCode: string;
    productId: string;
    productName: string;
    miktar: number;
    birim: Unit;
    projeId: string;
    projeAdi: string;
    sacUsedEnMm?: number;
    sacUsedBoyMm?: number;
  }) => void;
  onCancel: () => void;
};

export default function ConsumptionForm({
  qrCode,
  product,
  productLoading,
  projects,
  projectsLoading,
  isSaving,
  onSave,
  onCancel,
}: ConsumptionFormProps) {
  const [miktar, setMiktar] = useState("");
  const [birim, setBirim] = useState<Unit>("kg");
  const [projeId, setProjeId] = useState("");
  const [sacUsedEn, setSacUsedEn] = useState("");
  const [sacUsedBoy, setSacUsedBoy] = useState("");

  const isSac = product?.product_type === "sac";

  const calculatedSacKg = useMemo(() => {
    if (!isSac || !product?.sac_derinlik_mm) return null;
    const en = parseFloat(sacUsedEn);
    const boy = parseFloat(sacUsedBoy);
    if (!en || !boy || en <= 0 || boy <= 0) return null;
    return calcSacWeightKg(en, boy, product.sac_derinlik_mm);
  }, [isSac, product?.sac_derinlik_mm, sacUsedEn, sacUsedBoy]);

  useEffect(() => {
    if (product?.default_unit && !isSac) {
      setBirim(product.default_unit);
    }
    if (isSac) {
      setBirim("kg");
    }
  }, [product, isSac]);

  useEffect(() => {
    if (projects.length > 0 && !projeId) {
      setProjeId(projects[0].id);
    }
  }, [projects, projeId]);

  const selectedProject = projects.find((p) => p.id === projeId);
  const formDisabled =
    isSaving || productLoading || projectsLoading || !product || !projeId;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product || !selectedProject) return;

    if (isSac) {
      const en = parseFloat(sacUsedEn);
      const boy = parseFloat(sacUsedBoy);
      if (!en || !boy || en <= 0 || boy <= 0 || !calculatedSacKg) return;

      onSave({
        qrCode,
        productId: product.id,
        productName: product.name,
        miktar: calculatedSacKg,
        birim: "kg",
        projeId: selectedProject.id,
        projeAdi: selectedProject.name,
        sacUsedEnMm: en,
        sacUsedBoyMm: boy,
      });
      return;
    }

    const parsedMiktar = parseFloat(miktar);
    if (!miktar || isNaN(parsedMiktar) || parsedMiktar <= 0) return;

    onSave({
      qrCode,
      productId: product.id,
      productName: product.name,
      miktar: parsedMiktar,
      birim,
      projeId: selectedProject.id,
      projeAdi: selectedProject.name,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-lg flex-col gap-6 rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-6 shadow-xl shadow-black/30 sm:p-8"
    >
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
                <p className="mt-2 text-sm text-ozmaksan-muted">
                  Levha:{" "}
                  <span className="font-semibold text-ozmaksan-text">
                    {formatSacDimensions(
                      product.sac_en_mm,
                      product.sac_boy_mm,
                      product.sac_derinlik_mm
                    )}
                  </span>
                  {" · "}
                  Kalınlık sabit:{" "}
                  <span className="font-semibold text-ozmaksan-text">
                    {product.sac_derinlik_mm} mm
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
            {isLowStock(product) && (
              <div
                role="status"
                className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/90"
              >
                <p className="font-semibold text-amber-300">
                  Stok düşük seviyede
                </p>
                <p className="mt-1 text-amber-200/75">
                  Mevcut stok ({product.stock_quantity}{" "}
                  {getStockUnit(product)}), minimum seviyenin (
                  {product.min_stock_threshold} {getStockUnit(product)}) altında
                  veya eşit. İşleminize devam edebilirsiniz.
                </p>
              </div>
            )}
            <p className="mt-2 text-sm text-ozmaksan-muted">
              {isSac ? "Kg başı maliyet: " : "Birim maliyet: "}
              <span className="font-semibold text-ozmaksan-text">
                {product.unit_cost.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
              </span>
            </p>
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

      {isSac ? (
        <>
          <div className="rounded-xl border border-ozmaksan-border bg-ozmaksan-bg px-4 py-3 text-sm text-ozmaksan-muted">
            Kalınlık ({product?.sac_derinlik_mm ?? "—"} mm) sac etiketinden
            alınır. Sadece kullanılan <strong className="text-ozmaksan-text">en</strong> ve{" "}
            <strong className="text-ozmaksan-text">boy</strong> girin; ağırlık
            otomatik hesaplanır (yoğunluk 7,85 g/cm³).
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="sac-en" className="font-semibold text-ozmaksan-text">
                Kullanılan En (mm)
              </label>
              <input
                id="sac-en"
                type="number"
                min="0"
                step="1"
                required
                disabled={formDisabled}
                placeholder="En (mm)"
                value={sacUsedEn}
                onChange={(e) => setSacUsedEn(e.target.value)}
                className="h-14 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-xl text-ozmaksan-text placeholder:text-ozmaksan-muted/35 focus:border-ozmaksan-accent focus:outline-none disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="sac-boy" className="font-semibold text-ozmaksan-text">
                Kullanılan Boy (mm)
              </label>
              <input
                id="sac-boy"
                type="number"
                min="0"
                step="1"
                required
                disabled={formDisabled}
                placeholder="Boy (mm)"
                value={sacUsedBoy}
                onChange={(e) => setSacUsedBoy(e.target.value)}
                className="h-14 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-xl text-ozmaksan-text placeholder:text-ozmaksan-muted/35 focus:border-ozmaksan-accent focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="rounded-xl border-2 border-ozmaksan-accent/40 bg-ozmaksan-accent/10 px-5 py-4 text-center">
            <p className="text-sm text-ozmaksan-muted">Hesaplanan ağırlık</p>
            <p className="mt-1 text-2xl font-bold text-ozmaksan-accent">
              {calculatedSacKg != null
                ? formatWeightKg(calculatedSacKg)
                : "—"}
            </p>
            {calculatedSacKg != null && product?.unit_cost != null && (
              <p className="mt-1 text-sm text-ozmaksan-muted">
                Tahmini maliyet:{" "}
                {(calculatedSacKg * product.unit_cost).toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="miktar" className="text-base font-semibold text-ozmaksan-text">
              Kullanılan Miktar
            </label>
            <input
              id="miktar"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              disabled={formDisabled}
              placeholder="0.00"
              value={miktar}
              onChange={(e) => setMiktar(e.target.value)}
              className="h-14 w-full rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-xl text-ozmaksan-text placeholder:text-ozmaksan-muted focus:border-ozmaksan-accent focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-base font-semibold text-ozmaksan-text">Birim</span>
            <div className="grid grid-cols-3 gap-3">
              {UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  disabled={formDisabled}
                  onClick={() => setBirim(unit)}
                  className={`h-14 rounded-xl border-2 text-lg font-semibold transition-colors disabled:opacity-50 ${
                    birim === unit
                      ? "border-ozmaksan-accent bg-ozmaksan-accent text-white"
                      : "border-ozmaksan-border bg-ozmaksan-bg text-ozmaksan-muted hover:border-ozmaksan-steel hover:text-ozmaksan-text"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="proje" className="text-base font-semibold text-ozmaksan-text">
          Kullanılan Proje Adı
        </label>
        {projectsLoading ? (
          <div className="flex h-14 items-center rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-ozmaksan-muted">
            Projeler yükleniyor…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-amber-200">
            Aktif proje bulunamadı.
          </div>
        ) : (
          <select
            id="proje"
            required
            disabled={formDisabled}
            value={projeId}
            onChange={(e) => setProjeId(e.target.value)}
            className="h-14 w-full appearance-none rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-lg text-ozmaksan-text focus:border-ozmaksan-accent focus:outline-none disabled:opacity-50"
          >
            {projects.map((proje) => (
              <option key={proje.id} value={proje.id}>
                {proje.name}
              </option>
            ))}
          </select>
        )}
      </div>

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
          disabled={formDisabled || (isSac && !calculatedSacKg)}
          className="h-16 flex-1 rounded-xl bg-ozmaksan-red text-lg font-bold text-white transition-colors hover:bg-ozmaksan-red-hover active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
