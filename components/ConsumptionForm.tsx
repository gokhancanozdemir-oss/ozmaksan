"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Product, Project, Unit } from "@/lib/types/database";
import { UNITS } from "@/lib/supabase/consumption";

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

  useEffect(() => {
    if (product?.default_unit) {
      setBirim(product.default_unit);
    }
  }, [product]);

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
    const parsedMiktar = parseFloat(miktar);
    if (
      !product ||
      !selectedProject ||
      !miktar ||
      isNaN(parsedMiktar) ||
      parsedMiktar <= 0
    ) {
      return;
    }

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
            <p className="mt-1 text-xl font-semibold text-ozmaksan-text">
              {product.name}
            </p>
            <p className="mt-1 break-all font-mono text-sm text-ozmaksan-accent">
              {qrCode}
            </p>
            <p className="mt-2 text-sm text-ozmaksan-muted">
              Stok:{" "}
              <span className="font-semibold text-ozmaksan-text">
                {product.stock_quantity} {product.default_unit}
              </span>
              {" · "}
              Birim maliyet:{" "}
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

      <div className="flex flex-col gap-2">
        <label
          htmlFor="miktar"
          className="text-base font-semibold text-ozmaksan-text"
        >
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
        <span className="text-base font-semibold text-ozmaksan-text">
          Birim
        </span>
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

      <div className="flex flex-col gap-2">
        <label
          htmlFor="proje"
          className="text-base font-semibold text-ozmaksan-text"
        >
          Kullanılan Proje Adı
        </label>
        {projectsLoading ? (
          <div className="flex h-14 items-center rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-ozmaksan-muted">
            Projeler yükleniyor…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-amber-200">
            Aktif proje bulunamadı. Supabase&apos;de projects tablosunu kontrol
            edin.
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
          disabled={formDisabled}
          className="h-16 flex-1 rounded-xl bg-ozmaksan-accent text-lg font-bold text-white transition-colors hover:bg-ozmaksan-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
