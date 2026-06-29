"use client";

import { useRef, useState, Fragment, useMemo } from "react";
import Link from "next/link";
import type { Project, ProjectItem, ProjectItemStatus } from "@/lib/types/database";
import {
  adminDeleteProject,
  adminUpsertProjectWithItems,
  type ProjectInput,
} from "@/lib/supabase/projects";
import { parseSipFile } from "@/lib/import/parseSipExcel";
import { matchesSearch } from "@/lib/search";
import SearchInput from "@/components/admin/SearchInput";
import {
  ProjectStatusBadge,
  ProjectStatusLegend,
  itemRowClass,
  projectRowClass,
} from "@/components/admin/ProjectStatusBadge";

const inputClass =
  "h-11 w-full rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-3 text-sm text-ozmaksan-text focus:border-ozmaksan-accent focus:outline-none";

const STATUS_OPTIONS: { value: ProjectItemStatus; label: string }[] = [
  { value: "not_started", label: "Başlanmadı (beyaz)" },
  { value: "active", label: "Aktif (yeşil)" },
  { value: "completed", label: "Bitmiş (sarı)" },
];

type DraftItem = Omit<ProjectItem, "id" | "project_id">;

type DraftProject = {
  id?: string;
  order_number: string;
  order_year: number;
  customer: string;
  description: string;
  items: DraftItem[];
};

function emptyItem(): DraftItem {
  return {
    sort_order: 0,
    spec: "",
    product_name: "",
    quantity: null,
    status: "not_started",
    order_delivery: "",
    factory_delivery: "",
    notes: "",
    destination: "",
  };
}

function emptyProject(): DraftProject {
  return {
    order_number: "",
    order_year: new Date().getFullYear(),
    customer: "",
    description: "",
    items: [emptyItem()],
  };
}

function projectToDraft(p: Project): DraftProject {
  return {
    id: p.id,
    order_number: p.order_number ?? "",
    order_year: p.order_year ?? new Date().getFullYear(),
    customer: p.customer ?? "",
    description: p.description ?? "",
    items:
      p.items?.length
        ? p.items.map((item) => ({
            sort_order: item.sort_order,
            spec: item.spec ?? "",
            product_name: item.product_name,
            quantity: item.quantity,
            status: item.status,
            order_delivery: item.order_delivery ?? "",
            factory_delivery: item.factory_delivery ?? "",
            notes: item.notes ?? "",
            destination: item.destination ?? "",
          }))
        : [emptyItem()],
  };
}

type ProjectsPanelProps = {
  projects: Project[];
  onRefresh: () => Promise<void>;
  onMessage: (msg: { type: "success" | "error"; text: string }) => void;
};

export default function ProjectsPanel({
  projects,
  onRefresh,
  onMessage,
}: ProjectsPanelProps) {
  const [editing, setEditing] = useState<DraftProject | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    return projects.filter((p) => {
      const orderLabel =
        p.order_number && p.order_year
          ? `${p.order_number}/${p.order_year}`
          : p.name;
      const itemFields =
        p.items?.flatMap((i) => [
          i.spec,
          i.product_name,
          i.destination,
        ]) ?? [];
      return matchesSearch(
        searchQuery,
        orderLabel,
        p.customer,
        p.name,
        ...itemFields
      );
    });
  }, [projects, searchQuery]);

  async function handleSave() {
    if (!editing?.order_number.trim() || !editing.customer.trim()) {
      onMessage({ type: "error", text: "Sipariş no ve müşteri zorunludur." });
      return;
    }
    const validItems = editing.items.filter((i) => i.product_name.trim());
    if (!validItems.length) {
      onMessage({ type: "error", text: "En az bir kalem ekleyin." });
      return;
    }

    const payload: ProjectInput = {
      id: editing.id,
      order_number: editing.order_number.trim(),
      order_year: editing.order_year,
      customer: editing.customer.trim(),
      description: editing.description.trim() || null,
      items: validItems.map((item, index) => ({
        ...item,
        sort_order: index,
        spec: item.spec || null,
        order_delivery: item.order_delivery || null,
        factory_delivery: item.factory_delivery || null,
        notes: item.notes || null,
        destination: item.destination || null,
      })),
    };

    try {
      await adminUpsertProjectWithItems(payload);
      setEditing(null);
      onMessage({ type: "success", text: "Sipariş kaydedildi." });
      await onRefresh();
    } catch (err) {
      onMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Kayıt başarısız.",
      });
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Bu siparişi ve tüm kalemlerini silmek istiyor musunuz? Bağlı sarfiyat kayıtları da silinir ve kullanılan miktarlar ürün stoğuna geri eklenir."
      )
    )
      return;
    try {
      await adminDeleteProject(id);
      onMessage({ type: "success", text: "Sipariş silindi." });
      await onRefresh();
    } catch (err) {
      onMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Silme başarısız.",
      });
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSipFile(buffer);
      let count = 0;
      for (const p of parsed) {
        await adminUpsertProjectWithItems({
          order_number: p.order_number,
          order_year: p.order_year,
          customer: p.customer,
          description: null,
          items: p.items.map((item) => ({
            sort_order: item.sort_order,
            spec: item.spec || null,
            product_name: item.product_name,
            quantity: item.quantity,
            status: item.status,
            order_delivery: item.order_delivery || null,
            factory_delivery: item.factory_delivery || null,
            notes: item.notes || null,
            destination: item.destination || null,
          })),
        });
        count++;
      }
      onMessage({
        type: "success",
        text: `${count} sipariş ve kalemleri içe aktarıldı.`,
      });
      await onRefresh();
    } catch (err) {
      onMessage({
        type: "error",
        text: err instanceof Error ? err.message : "İçe aktarma başarısız.",
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    if (!editing) return;
    const items = [...editing.items];
    items[index] = { ...items[index], ...patch };
    setEditing({ ...editing, items });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProjectStatusLegend />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(emptyProject())}
            className="h-11 rounded-xl bg-ozmaksan-accent px-4 text-sm font-semibold text-white"
          >
            + Yeni Sipariş
          </button>
          <label className="flex h-11 cursor-pointer items-center rounded-xl border-2 border-ozmaksan-border px-4 text-sm font-semibold text-ozmaksan-text hover:border-ozmaksan-accent">
            {importing ? "Aktarılıyor…" : "Excel İçe Aktar"}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
              }}
            />
          </label>
        </div>
      </div>

      {editing && (
        <div className="rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-6">
          <h3 className="mb-4 text-lg font-bold text-ozmaksan-text">
            {editing.id ? "Sipariş Düzenle" : "Yeni Sipariş"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Sipariş No</span>
              <input
                className={inputClass}
                value={editing.order_number}
                onChange={(e) =>
                  setEditing({ ...editing, order_number: e.target.value })
                }
                placeholder="Örn. 75"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Yıl</span>
              <input
                type="number"
                className={inputClass}
                value={editing.order_year}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    order_year: parseInt(e.target.value, 10) || 2026,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Müşteri</span>
              <input
                className={inputClass}
                value={editing.customer}
                onChange={(e) =>
                  setEditing({ ...editing, customer: e.target.value })
                }
                placeholder="Örn. MUTLU MAKARNA"
              />
            </label>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-bold text-ozmaksan-blue-light">Kalemler</h4>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    items: [...editing.items, emptyItem()],
                  })
                }
                className="text-sm font-semibold text-ozmaksan-accent hover:underline"
              >
                + Kalem ekle
              </button>
            </div>
            <div className="space-y-3">
              {editing.items.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-xl border border-ozmaksan-border p-4 ${itemRowClass(item.status)}`}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      className={inputClass}
                      placeholder="İmalat (örn. 2000 KG/H)"
                      value={item.spec ?? ""}
                      onChange={(e) =>
                        updateItem(index, { spec: e.target.value })
                      }
                    />
                    <input
                      className={inputClass}
                      placeholder="Cins (örn. BUHAR KAZANI) *"
                      value={item.product_name}
                      onChange={(e) =>
                        updateItem(index, { product_name: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="Adet"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          quantity:
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value) || null,
                        })
                      }
                    />
                    <select
                      className={inputClass}
                      value={item.status}
                      onChange={(e) =>
                        updateItem(index, {
                          status: e.target.value as ProjectItemStatus,
                        })
                      }
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      placeholder="Sip. teslim"
                      value={item.order_delivery ?? ""}
                      onChange={(e) =>
                        updateItem(index, { order_delivery: e.target.value })
                      }
                    />
                    <input
                      className={inputClass}
                      placeholder="Fabr. teslim"
                      value={item.factory_delivery ?? ""}
                      onChange={(e) =>
                        updateItem(index, { factory_delivery: e.target.value })
                      }
                    />
                    <input
                      className={inputClass}
                      placeholder="Gideceği yer (ATÜ)"
                      value={item.destination ?? ""}
                      onChange={(e) =>
                        updateItem(index, { destination: e.target.value })
                      }
                    />
                    <input
                      className={inputClass}
                      placeholder="Açıklama"
                      value={item.notes ?? ""}
                      onChange={(e) =>
                        updateItem(index, { notes: e.target.value })
                      }
                    />
                  </div>
                  {editing.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          items: editing.items.filter((_, i) => i !== index),
                        })
                      }
                      className="mt-2 text-xs font-semibold text-red-400 hover:underline"
                    >
                      Kalemi sil
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              className="h-11 rounded-xl bg-ozmaksan-accent px-6 font-semibold text-white"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-11 rounded-xl border-2 border-ozmaksan-border px-6 text-ozmaksan-muted"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Sipariş no, müşteri veya kalem ara…"
      />

      <div className="overflow-x-auto rounded-2xl border-2 border-ozmaksan-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ozmaksan-surface text-ozmaksan-muted">
            <tr>
              <th className="px-4 py-3">Sipariş</th>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Kalem</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-ozmaksan-muted"
                >
                  Sonuç bulunamadı
                </td>
              </tr>
            ) : (
            filteredProjects.map((p) => {
              const status = p.status ?? "not_started";
              const itemCount = p.items?.length ?? 0;
              const expanded = expandedId === p.id;
              return (
                <Fragment key={p.id}>
                  <tr
                    className={`border-t border-ozmaksan-border ${projectRowClass(status)}`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-ozmaksan-text">
                      {p.order_number && p.order_year
                        ? `${p.order_number}/${p.order_year}`
                        : p.name}
                    </td>
                    <td className="px-4 py-3 text-ozmaksan-accent">
                      {p.customer ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expanded ? null : p.id)
                        }
                        className="font-semibold text-ozmaksan-blue-light hover:underline"
                      >
                        {itemCount} kalem {expanded ? "▲" : "▼"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="rounded-lg border border-emerald-600/50 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                        >
                          Detay
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditing(projectToDraft(p))}
                          className="rounded-lg border border-ozmaksan-border px-3 py-1.5 text-xs font-semibold hover:border-ozmaksan-accent"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && p.items && p.items.length > 0 && (
                    <tr className="border-t border-ozmaksan-border/50">
                      <td colSpan={5} className="bg-ozmaksan-bg/50 px-4 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-ozmaksan-muted">
                              <th className="py-1 text-left">İmalat</th>
                              <th className="py-1 text-left">Cins</th>
                              <th className="py-1 text-left">Adet</th>
                              <th className="py-1 text-left">Durum</th>
                              <th className="py-1 text-left">Teslim</th>
                              <th className="py-1 text-left">ATÜ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.items.map((item) => (
                              <tr
                                key={item.id}
                                className={itemRowClass(item.status)}
                              >
                                <td className="py-1.5 pr-2">{item.spec || "—"}</td>
                                <td className="py-1.5 pr-2 font-medium">
                                  {item.product_name}
                                </td>
                                <td className="py-1.5 pr-2">
                                  {item.quantity ?? "—"}
                                </td>
                                <td className="py-1.5 pr-2">
                                  <ProjectStatusBadge status={item.status} />
                                </td>
                                <td className="py-1.5 pr-2 text-ozmaksan-muted">
                                  {[item.order_delivery, item.factory_delivery]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </td>
                                <td className="py-1.5">{item.destination || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
