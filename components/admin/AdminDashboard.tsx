"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  adminActivateProduct,
  adminDeactivateProduct,
  adminDeleteConsumptionRecord,
  adminFetchAllProducts,
  adminFetchAllProjects,
  adminFetchConsumptionRecords,
  adminUpsertProduct,
  UNITS,
} from "@/lib/supabase/consumption";
import type { ConsumptionRecord, Product, ProductType, Project, Unit } from "@/lib/types/database";
import AppHeader from "@/components/AppHeader";
import ProjectsPanel from "@/components/admin/ProjectsPanel";
import QrCodePreview from "@/components/admin/QrCodePreview";
import SearchInput from "@/components/admin/SearchInput";
import StockAlertBanner from "@/components/admin/StockAlertBanner";
import { downloadQrPng, generateProductQrCode } from "@/lib/qr";
import { formatProjectItemLabel } from "@/lib/projectStatus";
import { matchesSearch } from "@/lib/search";
import {
  getLowStockProducts,
  getStockUnit,
  isLowStock,
} from "@/lib/stockAlert";
import {
  calcSacWeightKg,
  formatSacDimensions,
  formatWeightKg,
} from "@/lib/sac";

type Tab = "projects" | "products" | "consumption";

const inputClass =
  "h-12 w-full rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-ozmaksan-text placeholder:text-ozmaksan-muted/35 focus:border-ozmaksan-accent focus:outline-none";

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-sm font-semibold text-ozmaksan-text">{label}</span>
      {children}
    </div>
  );
}

const emptyProduct = (): Partial<Product> & {
  qr_code: string;
  name: string;
  default_unit: Unit;
  product_type: ProductType;
} => ({
  qr_code: generateProductQrCode(),
  name: "",
  product_type: "standard",
  default_unit: "kg",
});

const emptySacProduct = (): Partial<Product> & {
  qr_code: string;
  name: string;
  default_unit: Unit;
  product_type: ProductType;
} => ({
  qr_code: generateProductQrCode(),
  name: "Sac",
  product_type: "sac",
  default_unit: "kg",
  sac_adet: 1,
});

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stockAlertDismissed, setStockAlertDismissed] = useState(false);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [consumptionSearch, setConsumptionSearch] = useState("");

  const [editingProduct, setEditingProduct] = useState<
    (Partial<Product> & {
      qr_code: string;
      name: string;
      default_unit: Unit;
      product_type?: ProductType;
    }) | null
  >(null);

  const editingSacSheetKg =
    editingProduct?.product_type === "sac" &&
    editingProduct.sac_en_mm &&
    editingProduct.sac_boy_mm &&
    editingProduct.sac_derinlik_mm
      ? calcSacWeightKg(
          editingProduct.sac_en_mm,
          editingProduct.sac_boy_mm,
          editingProduct.sac_derinlik_mm
        )
      : null;

  const editingSacAdet = editingProduct?.sac_adet ?? 1;
  const editingSacTotalKg =
    editingSacSheetKg != null ? editingSacSheetKg * editingSacAdet : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, r] = await Promise.all([
        adminFetchAllProjects(),
        adminFetchAllProducts(showInactiveProducts),
        adminFetchConsumptionRecords(),
      ]);
      setProjects(p);
      setProducts(pr);
      setRecords(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [showInactiveProducts]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveProduct() {
    if (!editingProduct?.qr_code.trim() || !editingProduct.name.trim()) return;
    const isNew = !editingProduct.id;
    const isSac = editingProduct.product_type === "sac";

    let payload = {
      ...editingProduct,
      product_type: editingProduct.product_type ?? "standard",
      unit_cost: editingProduct.unit_cost ?? 0,
      default_unit: (isSac ? "kg" : editingProduct.default_unit) as Unit,
      stock_quantity: editingProduct.stock_quantity ?? 0,
    };

    if (isSac) {
      if (
        !editingProduct.sac_en_mm ||
        !editingProduct.sac_boy_mm ||
        !editingProduct.sac_derinlik_mm ||
        !editingProduct.sac_adet ||
        editingProduct.sac_adet <= 0
      ) {
        setError("Sac için en, boy, kalınlık (mm) ve adet zorunludur.");
        return;
      }
      const perSheet = calcSacWeightKg(
        editingProduct.sac_en_mm,
        editingProduct.sac_boy_mm,
        editingProduct.sac_derinlik_mm
      );
      payload = {
        ...payload,
        sac_adet: editingProduct.sac_adet,
        stock_quantity: perSheet * editingProduct.sac_adet,
      };
    }

    try {
      await adminUpsertProduct(payload);
      if (isNew) {
        await downloadQrPng(
          payload.qr_code,
          payload.name,
          `etiket-${payload.name.replace(/\s+/g, "-").toLowerCase()}`
        );
      }
      setEditingProduct(null);
      setSuccess(
        isNew
          ? "Ürün kaydedildi ve QR etiketi PNG olarak indirildi."
          : "Ürün kaydedildi."
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    }
  }

  async function handleDeactivateProduct(id: string) {
    if (
      !confirm(
        "Bu ürünü pasife almak istiyor musunuz? Sarfiyat kayıtları korunur; QR kodu artık okutulamaz."
      )
    )
      return;
    try {
      await adminDeactivateProduct(id);
      setSuccess("Ürün pasife alındı.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    }
  }

  async function handleActivateProduct(id: string) {
    try {
      await adminActivateProduct(id);
      setSuccess("Ürün tekrar aktifleştirildi.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    }
  }

  async function handleDeleteConsumption(id: string) {
    if (
      !confirm(
        "Bu sarfiyat kaydını silmek istiyor musunuz? Silinen miktar ürün stoğuna geri eklenecek."
      )
    )
      return;
    try {
      await adminDeleteConsumptionRecord(id);
      setSuccess("Sarfiyat kaydı silindi, stok güncellendi.");
      setError(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
      setSuccess(null);
    }
  }

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active !== false),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter((p) =>
      matchesSearch(
        productSearch,
        p.name,
        p.qr_code,
        p.product_type === "sac" ? "sac" : "standart"
      )
    );
  }, [products, productSearch]);

  const filteredRecords = useMemo(() => {
    if (!consumptionSearch.trim()) return records;
    return records.filter((r) =>
      matchesSearch(
        consumptionSearch,
        r.products?.name,
        r.projects?.name,
        r.project_items
          ? formatProjectItemLabel(r.project_items)
          : null,
        r.profiles?.full_name,
        r.profiles?.email
      )
    );
  }, [records, consumptionSearch]);

  const lowStockProducts = getLowStockProducts(activeProducts);

  const tabs: { id: Tab; label: string }[] = [
    { id: "projects", label: "Projeler" },
    {
      id: "products",
      label:
        lowStockProducts.length > 0
          ? `Ürünler · ${lowStockProducts.length} düşük stok`
          : "Ürünler",
    },
    { id: "consumption", label: "Sarfiyat Kayıtları" },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
      <AppHeader subtitle="Yönetim Paneli" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ozmaksan-text">
              Veritabanı Yönetimi
            </h2>
            <p className="text-ozmaksan-muted">
              Proje, ürün ve sarfiyat kayıtlarını düzenleyin
            </p>
          </div>
          <Link
            href="/"
            className="flex h-12 items-center rounded-xl border-2 border-ozmaksan-border px-5 font-semibold text-ozmaksan-text hover:border-ozmaksan-accent"
          >
            ← QR Okutucuya Dön
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-emerald-300">
            {success}
          </div>
        )}

        {!loading && !stockAlertDismissed && lowStockProducts.length > 0 && (
          <StockAlertBanner
            products={activeProducts}
            onViewProducts={() => {
              setTab("products");
              setStockAlertDismissed(false);
            }}
            onDismiss={() => setStockAlertDismissed(true)}
          />
        )}

        <div className="mb-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSuccess(null);
                setError(null);
              }}
              className={`min-h-12 rounded-xl px-2 text-xs font-semibold transition-colors sm:h-12 sm:px-5 sm:text-base ${
                tab === t.id
                  ? "bg-ozmaksan-accent text-white"
                  : "border-2 border-ozmaksan-border text-ozmaksan-muted hover:text-ozmaksan-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-ozmaksan-muted">Yükleniyor…</p>
        ) : tab === "projects" ? (
          <ProjectsPanel
            projects={projects}
            onRefresh={loadData}
            onMessage={(msg) => {
              if (msg.type === "success") {
                setSuccess(msg.text);
                setError(null);
              } else {
                setError(msg.text);
                setSuccess(null);
              }
            }}
          />
        ) : tab === "products" ? (
          <div className="space-y-4">
            <SearchInput
              value={productSearch}
              onChange={setProductSearch}
              placeholder="Ürün adı, QR veya tip ara…"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingProduct(emptyProduct())}
                className="h-12 rounded-xl bg-ozmaksan-accent px-5 font-semibold text-white"
              >
                + Yeni Ürün
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(emptySacProduct())}
                className="h-12 rounded-xl border-2 border-ozmaksan-accent px-5 font-semibold text-ozmaksan-accent hover:bg-ozmaksan-accent hover:text-white"
              >
                + Yeni Sac
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ozmaksan-muted">
                <input
                  type="checkbox"
                  checked={showInactiveProducts}
                  onChange={(e) => setShowInactiveProducts(e.target.checked)}
                  className="h-4 w-4 rounded border-ozmaksan-border"
                />
                Pasif ürünleri göster
              </label>
            </div>

            {editingProduct && (
              <div className="rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-6">
                <h3 className="mb-4 text-lg font-bold text-ozmaksan-text">
                  {editingProduct.id
                    ? "Ürün Düzenle"
                    : editingProduct.product_type === "sac"
                      ? "Yeni Sac"
                      : "Yeni Ürün"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Ürün adı">
                    <input
                      placeholder="Ürün veya sac adı"
                      value={editingProduct.name}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          name: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </FormField>
                  <FormField
                    label={
                      editingProduct.product_type === "sac"
                        ? "Kg başı maliyet (TRY)"
                        : "Birim maliyet (TRY)"
                    }
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={
                        editingProduct.unit_cost != null
                          ? editingProduct.unit_cost
                          : ""
                      }
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          unit_cost:
                            e.target.value === ""
                              ? undefined
                              : parseFloat(e.target.value) || 0,
                        })
                      }
                      className={inputClass}
                    />
                  </FormField>

                  {editingProduct.product_type === "sac" ? (
                    <>
                      <FormField label="En (mm)">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="2000"
                          value={editingProduct.sac_en_mm ?? ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              sac_en_mm:
                                e.target.value === ""
                                  ? undefined
                                  : parseFloat(e.target.value) || 0,
                            })
                          }
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Boy (mm)">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="1000"
                          value={editingProduct.sac_boy_mm ?? ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              sac_boy_mm:
                                e.target.value === ""
                                  ? undefined
                                  : parseFloat(e.target.value) || 0,
                            })
                          }
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Kalınlık (mm)">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="5"
                          value={editingProduct.sac_derinlik_mm ?? ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              sac_derinlik_mm:
                                e.target.value === ""
                                  ? undefined
                                  : parseFloat(e.target.value) || 0,
                            })
                          }
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Adet (levha sayısı)">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          value={editingProduct.sac_adet ?? ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              sac_adet:
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className={inputClass}
                        />
                      </FormField>
                      <div className="sm:col-span-2 rounded-xl border-2 border-ozmaksan-accent/30 bg-ozmaksan-accent/10 px-4 py-3 text-sm text-ozmaksan-text">
                        <p>
                          Levha başı:{" "}
                          <strong className="text-ozmaksan-accent">
                            {editingSacSheetKg != null
                              ? formatWeightKg(editingSacSheetKg)
                              : "—"}
                          </strong>
                        </p>
                        <p className="mt-1">
                          Toplam stok ({editingSacAdet} adet):{" "}
                          <strong className="text-ozmaksan-accent">
                            {editingSacTotalKg != null
                              ? formatWeightKg(editingSacTotalKg)
                              : "—"}
                          </strong>
                          <span className="ml-2 text-xs text-ozmaksan-muted">
                            (yoğunluk 7,85 g/cm³)
                          </span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FormField label="Stok miktarı">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0"
                          value={
                            editingProduct.stock_quantity != null
                              ? editingProduct.stock_quantity
                              : ""
                          }
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              stock_quantity:
                                e.target.value === ""
                                  ? undefined
                                  : parseFloat(e.target.value) || 0,
                            })
                          }
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Birim">
                        <select
                          value={editingProduct.default_unit}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              default_unit: e.target.value as Unit,
                            })
                          }
                          className={inputClass}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </>
                  )}

                  <div className="sm:col-span-2 rounded-xl border border-ozmaksan-border bg-ozmaksan-bg/50 p-4">
                    <p className="mb-3 text-sm font-bold text-ozmaksan-blue-light">
                      Alt stok uyarısı
                    </p>
                    <FormField label="Minimum stok seviyesi">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="Örn. 10 — boş bırakılırsa uyarı verilmez"
                        value={editingProduct.min_stock_threshold ?? ""}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            min_stock_threshold:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value) || 0,
                          })
                        }
                        className={inputClass}
                      />
                    </FormField>
                    <p className="mt-2 text-xs leading-relaxed text-ozmaksan-muted">
                      Stok bu değere veya altına düştüğünde yönetici panelinde
                      bilgilendirme gösterilir. Sarfiyat ve stok girişi{" "}
                      <strong className="text-ozmaksan-text">engellenmez</strong>.
                    </p>
                  </div>

                  <QrCodePreview
                    value={editingProduct.qr_code}
                    productName={editingProduct.name || editingProduct.qr_code}
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveProduct}
                    className="h-12 rounded-xl bg-ozmaksan-accent px-6 font-semibold text-white"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="h-12 rounded-xl border-2 border-ozmaksan-border px-6 text-ozmaksan-muted"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            {/* Mobil kart görünümü */}
            <div className="space-y-3 sm:hidden">
              {filteredProducts.length === 0 ? (
                <p className="rounded-xl border border-ozmaksan-border px-4 py-8 text-center text-ozmaksan-muted">
                  Sonuç bulunamadı
                </p>
              ) : (
                filteredProducts.map((p) => {
                  const unit = getStockUnit(p);
                  const low = isLowStock(p);
                  const inactive = p.is_active === false;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border-2 border-ozmaksan-border p-4 ${
                        inactive ? "opacity-60" : ""
                      } ${low ? "border-amber-500/30" : ""}`}
                    >
                      <p className="font-semibold text-ozmaksan-text">{p.name}</p>
                      <p className="mt-1 font-mono text-xs text-ozmaksan-accent">
                        {p.qr_code}
                      </p>
                      <p className="mt-2 text-sm text-ozmaksan-muted">
                        Stok: {p.stock_quantity} {unit}
                        {inactive && (
                          <span className="ml-2 rounded bg-ozmaksan-muted/20 px-2 py-0.5 text-xs font-semibold text-ozmaksan-muted">
                            Pasif
                          </span>
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void downloadQrPng(
                              p.qr_code,
                              p.name,
                              `etiket-${p.name.replace(/\s+/g, "-").toLowerCase()}`
                            )
                          }
                          className="rounded-lg border border-ozmaksan-accent/50 px-3 py-2 text-xs font-semibold text-ozmaksan-accent"
                        >
                          PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="rounded-lg border border-ozmaksan-border px-3 py-2 text-xs font-semibold"
                        >
                          Düzenle
                        </button>
                        {inactive ? (
                          <button
                            type="button"
                            onClick={() => void handleActivateProduct(p.id)}
                            className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-400"
                          >
                            Aktifleştir
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeactivateProduct(p.id)}
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400"
                          >
                            Pasife Al
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border-2 border-ozmaksan-border sm:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-ozmaksan-surface text-ozmaksan-muted">
                  <tr>
                    <th className="px-4 py-3">QR</th>
                    <th className="px-4 py-3">Ürün</th>
                    <th className="px-4 py-3">Tip / Ölçü</th>
                    <th className="px-4 py-3">Stok</th>
                    <th className="px-4 py-3">Maliyet</th>
                    <th className="px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-ozmaksan-muted"
                      >
                        Sonuç bulunamadı
                      </td>
                    </tr>
                  ) : (
                  filteredProducts.map((p) => {
                    const unit = getStockUnit(p);
                    const low = isLowStock(p);
                    const inactive = p.is_active === false;
                    return (
                    <tr
                      key={p.id}
                      className={`border-t border-ozmaksan-border text-ozmaksan-text ${
                        low ? "bg-amber-950/10" : ""
                      } ${inactive ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-ozmaksan-accent">
                        {p.qr_code}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.name}
                        {inactive && (
                          <span className="ml-2 rounded bg-ozmaksan-muted/20 px-2 py-0.5 text-xs font-semibold text-ozmaksan-muted">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-ozmaksan-muted">
                        {p.product_type === "sac" &&
                        p.sac_en_mm &&
                        p.sac_boy_mm &&
                        p.sac_derinlik_mm ? (
                          <span>
                            <span className="font-semibold text-ozmaksan-accent">
                              Sac
                            </span>
                            <br />
                            {formatSacDimensions(
                              p.sac_en_mm,
                              p.sac_boy_mm,
                              p.sac_derinlik_mm
                            )}
                            {p.sac_adet && p.sac_adet > 1 && (
                              <>
                                <br />
                                {p.sac_adet} adet levha
                              </>
                            )}
                          </span>
                        ) : (
                          "Standart"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={low ? "font-semibold text-amber-300" : ""}>
                            {p.stock_quantity} {unit}
                          </span>
                          {low && (
                            <span className="rounded-md bg-amber-950/40 px-2 py-0.5 text-xs font-semibold text-amber-300">
                              Düşük stok
                            </span>
                          )}
                          {p.min_stock_threshold != null &&
                            Number(p.min_stock_threshold) > 0 && (
                              <span className="text-xs text-ozmaksan-muted">
                                min. {p.min_stock_threshold} {unit}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {Number(p.unit_cost).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                        {p.product_type === "sac" && (
                          <span className="text-xs text-ozmaksan-muted"> /kg</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void downloadQrPng(
                                p.qr_code,
                                p.name,
                                `etiket-${p.name.replace(/\s+/g, "-").toLowerCase()}`
                              )
                            }
                            className="rounded-lg border border-ozmaksan-accent/50 px-3 py-1.5 text-xs font-semibold text-ozmaksan-accent"
                          >
                            PNG
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="rounded-lg border border-ozmaksan-border px-3 py-1.5 text-xs font-semibold hover:border-ozmaksan-accent"
                          >
                            Düzenle
                          </button>
                          {inactive ? (
                            <button
                              type="button"
                              onClick={() => void handleActivateProduct(p.id)}
                              className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                            >
                              Aktifleştir
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleDeactivateProduct(p.id)}
                              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400"
                            >
                              Pasife Al
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SearchInput
              value={consumptionSearch}
              onChange={setConsumptionSearch}
              placeholder="Ürün, proje, kalem veya personel ara…"
            />

            <div className="space-y-3 sm:hidden">
              {filteredRecords.length === 0 ? (
                <p className="rounded-xl border border-ozmaksan-border px-4 py-8 text-center text-ozmaksan-muted">
                  {records.length === 0
                    ? "Henüz sarfiyat kaydı yok"
                    : "Sonuç bulunamadı"}
                </p>
              ) : (
                filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border-2 border-ozmaksan-border p-4"
                  >
                    <p className="text-xs text-ozmaksan-muted">
                      {new Date(r.created_at).toLocaleString("tr-TR")}
                    </p>
                    <p className="mt-1 font-semibold text-ozmaksan-text">
                      {r.products?.name ?? "—"}
                    </p>
                    <p className="text-sm text-ozmaksan-muted">
                      {r.projects?.name ?? "—"}
                    </p>
                    {r.project_items && (
                      <p className="mt-1 text-sm text-ozmaksan-blue-light">
                        {formatProjectItemLabel(r.project_items)}
                      </p>
                    )}
                    <p className="mt-2 text-sm">
                      {r.quantity} {r.unit} ·{" "}
                      {Number(r.total_cost).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-ozmaksan-muted">
                      {r.profiles?.full_name || r.profiles?.email || "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDeleteConsumption(r.id)}
                      className="mt-3 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400"
                    >
                      Sil
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border-2 border-ozmaksan-border sm:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-ozmaksan-surface text-ozmaksan-muted">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Proje</th>
                  <th className="px-4 py-3">Kalem</th>
                  <th className="px-4 py-3">Miktar</th>
                  <th className="px-4 py-3">Maliyet</th>
                  <th className="px-4 py-3">Personel</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-ozmaksan-muted"
                    >
                      {records.length === 0
                        ? "Henüz sarfiyat kaydı yok"
                        : "Sonuç bulunamadı"}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-ozmaksan-border text-ozmaksan-text"
                    >
                      <td className="px-4 py-3 text-ozmaksan-muted">
                        {new Date(r.created_at).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">{r.products?.name ?? "—"}</td>
                      <td className="px-4 py-3">{r.projects?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-ozmaksan-blue-light">
                        {r.project_items
                          ? formatProjectItemLabel(r.project_items)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="px-4 py-3">
                        {Number(r.total_cost).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </td>
                      <td className="px-4 py-3 text-ozmaksan-muted">
                        {r.profiles?.full_name || r.profiles?.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleDeleteConsumption(r.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
