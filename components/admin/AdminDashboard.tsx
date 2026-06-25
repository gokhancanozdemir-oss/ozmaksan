"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  adminDeleteProduct,
  adminDeleteProject,
  adminFetchAllProducts,
  adminFetchAllProjects,
  adminFetchConsumptionRecords,
  adminUpsertProduct,
  adminUpsertProject,
  UNITS,
} from "@/lib/supabase/consumption";
import type { ConsumptionRecord, Product, ProductType, Project, Unit } from "@/lib/types/database";
import AppHeader from "@/components/AppHeader";
import QrCodePreview from "@/components/admin/QrCodePreview";
import { downloadQrPng, generateProductQrCode } from "@/lib/qr";
import {
  calcSacWeightKg,
  formatSacDimensions,
  formatWeightKg,
} from "@/lib/sac";

type Tab = "projects" | "products" | "consumption";

const inputClass =
  "h-12 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-ozmaksan-text placeholder:text-ozmaksan-muted/35 focus:border-ozmaksan-accent focus:outline-none";

const emptyProject = (): Partial<Project> & { name: string } => ({
  name: "",
  customer: "",
  description: "",
  is_active: true,
});

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
});

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingProject, setEditingProject] = useState<
    (Partial<Project> & { name: string }) | null
  >(null);
  const [editingProduct, setEditingProduct] = useState<
    (Partial<Product> & {
      qr_code: string;
      name: string;
      default_unit: Unit;
      product_type?: ProductType;
    }) | null
  >(null);

  const editingSacKg =
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, r] = await Promise.all([
        adminFetchAllProjects(),
        adminFetchAllProducts(),
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
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveProject() {
    if (!editingProject?.name.trim() || !editingProject?.customer?.trim()) return;
    try {
      await adminUpsertProject(editingProject);
      setEditingProject(null);
      setSuccess("Proje kaydedildi.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Bu projeyi silmek istediğinize emin misiniz?")) return;
    try {
      await adminDeleteProject(id);
      setSuccess("Proje silindi.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    }
  }

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
        !editingProduct.sac_derinlik_mm
      ) {
        setError("Sac için en, boy ve kalınlık (mm) zorunludur.");
        return;
      }
      payload = {
        ...payload,
        stock_quantity: calcSacWeightKg(
          editingProduct.sac_en_mm,
          editingProduct.sac_boy_mm,
          editingProduct.sac_derinlik_mm
        ),
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

  async function handleDeleteProduct(id: string) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    try {
      await adminDeleteProduct(id);
      setSuccess("Ürün silindi.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "projects", label: "Projeler" },
    { id: "products", label: "Ürünler" },
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

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSuccess(null);
                setError(null);
              }}
              className={`h-12 rounded-xl px-5 text-base font-semibold transition-colors ${
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
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setEditingProject(emptyProject())}
              className="h-12 rounded-xl bg-ozmaksan-accent px-5 font-semibold text-white"
            >
              + Yeni Proje
            </button>

            {editingProject && (
              <div className="rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-6">
                <h3 className="mb-4 text-lg font-bold text-ozmaksan-text">
                  {editingProject.id ? "Proje Düzenle" : "Yeni Proje"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    placeholder="Proje adı"
                    value={editingProject.name}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, name: e.target.value })
                    }
                    className={inputClass}
                  />
                  <input
                    placeholder="Müşteri"
                    value={editingProject.customer ?? ""}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        customer: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                  <input
                    placeholder="Açıklama"
                    value={editingProject.description ?? ""}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        description: e.target.value,
                      })
                    }
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <label className="flex h-12 items-center gap-3 text-ozmaksan-text">
                    <input
                      type="checkbox"
                      checked={editingProject.is_active ?? true}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-5 w-5"
                    />
                    Aktif proje
                  </label>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className="h-12 rounded-xl bg-ozmaksan-accent px-6 font-semibold text-white"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="h-12 rounded-xl border-2 border-ozmaksan-border px-6 text-ozmaksan-muted"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border-2 border-ozmaksan-border">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-ozmaksan-surface text-ozmaksan-muted">
                  <tr>
                    <th className="px-4 py-3">Proje</th>
                    <th className="px-4 py-3">Müşteri</th>
                    <th className="px-4 py-3">Açıklama</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-ozmaksan-border text-ozmaksan-text"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="text-ozmaksan-text hover:text-ozmaksan-accent hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ozmaksan-accent">
                        {p.customer || "—"}
                      </td>
                      <td className="px-4 py-3 text-ozmaksan-muted">
                        {p.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {p.is_active ? (
                          <span className="text-emerald-400">Aktif</span>
                        ) : (
                          <span className="text-ozmaksan-muted">Pasif</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/projects/${p.id}`}
                            className="rounded-lg border border-emerald-600/50 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40"
                          >
                            Detay
                          </Link>
                          <button
                            type="button"
                            onClick={() => setEditingProject(p)}
                            className="rounded-lg border border-ozmaksan-border px-3 py-1.5 text-xs font-semibold hover:border-ozmaksan-accent"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(p.id)}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "products" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
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
                  <input
                    placeholder="Ürün adı"
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        name: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={
                      editingProduct.product_type === "sac"
                        ? "Kg başı maliyet (TRY)"
                        : "Maliyet"
                    }
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

                  {editingProduct.product_type === "sac" ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="En (mm)"
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
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Boy (mm)"
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
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Kalınlık / derinlik (mm)"
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
                      <div className="flex h-12 items-center rounded-xl border-2 border-ozmaksan-accent/30 bg-ozmaksan-accent/10 px-4 text-ozmaksan-text">
                        <span className="text-sm">
                          Hesaplanan ağırlık:{" "}
                          <strong className="text-ozmaksan-accent">
                            {editingSacKg != null
                              ? formatWeightKg(editingSacKg)
                              : "—"}
                          </strong>
                          <span className="ml-2 text-xs text-ozmaksan-muted">
                            (ρ = 7,85 g/cm³)
                          </span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="Stok"
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
                    </>
                  )}

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

            <div className="overflow-x-auto rounded-2xl border-2 border-ozmaksan-border">
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
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-ozmaksan-border text-ozmaksan-text"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-ozmaksan-accent">
                        {p.qr_code}
                      </td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
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
                          </span>
                        ) : (
                          "Standart"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.stock_quantity}{" "}
                        {p.product_type === "sac" ? "kg" : p.default_unit}
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
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-ozmaksan-border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-ozmaksan-surface text-ozmaksan-muted">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Proje</th>
                  <th className="px-4 py-3">Miktar</th>
                  <th className="px-4 py-3">Maliyet</th>
                  <th className="px-4 py-3">Personel</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-ozmaksan-muted"
                    >
                      Henüz sarfiyat kaydı yok
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-ozmaksan-border text-ozmaksan-text"
                    >
                      <td className="px-4 py-3 text-ozmaksan-muted">
                        {new Date(r.created_at).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">{r.products?.name ?? "—"}</td>
                      <td className="px-4 py-3">{r.projects?.name ?? "—"}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
